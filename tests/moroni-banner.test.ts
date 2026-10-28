import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCharacter } from "../src/super/character";
import { moroniHeight } from "../src/super/moroni-commander";
import { buildTitleOfLiberty } from "../src/super/title-of-liberty";
import { createPlayer } from "../src/super/physics";

for (const quality of ["hero", "npc"] as const)
  test(`Moroni ${quality} keeps his shield down and grips the flag through turns and waves`, () => {
    const actor = createCharacter("moroni", { quality });
    const equipment = new T.Group();
    actor.sockets.rightHand.add(equipment);
    for (let frame = 0; frame < 100; frame++) {
      const wave = frame > 60;
      const yaw = frame < 30 ? 0 : frame < 60 ? Math.PI : Math.PI / 4;
      actor.update(1 / 30, {
        x: frame * 0.02,
        y: 0,
        z: 0,
        vx: wave ? 0 : 2,
        vy: 0,
        vz: 0,
        yaw,
        grounded: true,
        runSpeed: wave ? 0 : 2,
        move: wave ? "idle" : "run",
        carrying: true,
        holdingBanner: true,
        wave,
      });
      const left = actor.group.getObjectByName("left-arm")!;
      const right = actor.group.getObjectByName("right-arm")!;
      assert.ok(Math.abs(left.rotation.x) < 0.25, "shield arm hangs down");
      assert.ok(right.rotation.x < -1.6, "right hand raised to hold flag");
      const up = new T.Vector3(0, 1, 0).transformDirection(
        equipment.matrixWorld,
      );
      assert.ok(
        up.y > 0.97,
        "pole remains upright through turns and body lean",
      );
      const hand = actor.group.getObjectByName("right-hand") as T.Mesh;
      hand.geometry.computeBoundingBox();
      const palm = hand.geometry.boundingBox!.getCenter(new T.Vector3());
      palm.y = moroniHeight(0.78);
      palm.z = 0.11;
      palm.applyMatrix4(hand.matrixWorld);
      assert.ok(
        palm.distanceTo(equipment.getWorldPosition(new T.Vector3())) < 0.08,
        "grip is in palm, not forearm",
      );
    }
    actor.dispose();
  });

test("Liberty banner is held in the right hand and returns to the world for disposal", () => {
  const world = buildTitleOfLiberty(new T.Scene());
  const actor = createCharacter("moroni", { quality: "npc" });
  const player = createPlayer(-14, 0, 17);
  const input = { x: 0, y: 0, interact: false, interactHeld: false };
  const runtime = world.adventure!({
    setAvatar() {
      world.actorParent!.add(actor.group);
    },
    attachEquipment(slot, object) {
      actor.sockets[slot].add(object);
    },
    toast() {},
    dialog() {},
    complete() {},
  });
  runtime.update(0.1, player, { ...input, interact: true });
  let result;
  for (let i = 0; i < 110; i++) {
    world.update?.(0.1, player);
    result = runtime.update(0.1, player, input);
    actor.update(0.1, { ...player, ...result });
  }
  const banner = actor.group.getObjectByName(
    "Carried title of liberty · rent coat on pole",
  );
  assert.ok(
    banner && banner.parent === actor.sockets.rightHand,
    "banner attached to actual hand socket",
  );
  assert.equal(result!.holdingBanner, true);
  const pole = banner.getObjectByName("Title of Liberty flagpole")!;
  assert.ok(pole);
  for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI]) {
    Object.assign(player, { x: player.x + 2, yaw });
    world.update?.(0.1, player);
    actor.update(0.1, { ...player, ...result });
    const a = pole.localToWorld(new T.Vector3(0, -2.45, 0)),
      b = pole.localToWorld(new T.Vector3(0, 2.45, 0));
    const grip = actor.sockets.rightHand.getWorldPosition(new T.Vector3());
    const closest = new T.Line3(a, b).closestPointToPoint(
      grip,
      true,
      new T.Vector3(),
    );
    assert.ok(
      grip.distanceTo(closest) < 0.001,
      "pole passes through grip on every heading",
    );
  }
  const roof = (
    runtime.snapshot() as { roofSites: { x: number; y: number; z: number }[] }
  ).roofSites[0];
  Object.assign(player, roof);
  const waving = runtime.update(0.1, player, { ...input, interactHeld: true });
  assert.equal(
    waving.wave,
    true,
    "rooftop signal uses the held-pole wave pose",
  );
  const fabric = banner.getObjectByName(
    "Rent coat banner fabric · Alma 46:12 inscription",
  ) as T.Mesh;
  const positions = fabric.geometry.getAttribute("position");
  const edge = fabric.localToWorld(
    new T.Vector3().fromBufferAttribute(positions, 0),
  );
  const low = pole.localToWorld(new T.Vector3(0, -2.45, 0)),
    high = pole.localToWorld(new T.Vector3(0, 2.45, 0));
  assert.ok(
    edge.distanceTo(
      new T.Line3(low, high).closestPointToPoint(edge, true, new T.Vector3()),
    ) < 0.03,
    "fluttering fabric remains fastened to pole",
  );
  runtime.dispose();
  assert.ok(
    banner.parent === world.actorParent,
    "world owns carried equipment for resource cleanup",
  );
  actor.dispose();
  world.dispose?.();
});
