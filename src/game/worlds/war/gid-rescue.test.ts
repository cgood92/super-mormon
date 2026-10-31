import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildGidRescue } from "./gid-rescue";
import { createPlayer, stepPlayer } from "../../physics/physics";

import { sceneryCollisionErrors } from "../shared/scenery";

import { applyAdventureCamera } from "../../camera/adventure-camera";
import { cameraSegmentClear } from "../../camera/camera";

import { createCharacter } from "../../characters/character";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function harness(aspect = 16 / 9) {
  const scene = new T.Scene(),
    world = buildGidRescue(scene);
  const player = createPlayer();
  let completed = 0;
  const runtime = world.adventure!({
    viewAspect: () => aspect,
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_r, _t, _b, next) {
      next();
    },
  });
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) runtime.update(0.1, player, idle);
  };
  const use = (x: number, z: number, y = 0) => {
    Object.assign(player, createPlayer(x, y, z));
    runtime.update(0.1, player, { ...idle, interact: true });
  };
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      delivered: number;
      carrying: boolean;
      collected: number;
      dawn: number;
      followers: { x: number; y: number; z: number }[];
    };
  const prepare = () => {
    use(-5, -44);
    use(0, -16);
    tick(30);
    use(-5, -44);
    use(-13, -30);
  };
  return {
    scene,
    world,
    player,
    runtime,
    tick,
    use,
    state,
    prepare,
    get completed() {
      return completed;
    },
  };
}

test("Gid guards lie fully on the ground after drinking", () => {
  const h = harness();
  h.use(-5, -44);
  h.use(0, -16);
  h.tick(30);
  const guards: T.Object3D[] = [];
  h.scene.traverse((o) => {
    if (/Gid guard|Sleeping city guard/.test(o.name)) guards.push(o);
  });
  assert.ok(guards.length >= 6);
  for (const guard of guards) {
    assert.ok(Math.abs(guard.rotation.z) > 1.5, guard.name);
    const box = new T.Box3().setFromObject(guard);
    assert.ok(
      box.min.y >= -0.03 && box.min.y < 0.07,
      `${guard.name}: ${box.min.y}`,
    );
    assert.ok(box.max.y < 1.15, `${guard.name} still upright`);
  }
  h.world.dispose?.();
});

test("two arbitrary interior drops collect automatically, open the gate, and require surrender interaction", () => {
  const h = harness();
  h.prepare();
  assert.equal(h.state().carrying, true);
  h.use(-8, 16);
  h.tick(20);
  assert.equal(h.state().delivered, 0, "outside throws rejected");
  h.use(0, 30, 5);
  h.tick(20);
  assert.equal(h.state().delivered, 0, "airborne throws rejected");
  h.use(-11, 42, 3);
  h.tick(20);
  assert.equal(h.state().delivered, 0, "roof drops rejected");
  h.use(12, 28);
  h.tick(150);
  assert.equal(h.state().delivered, 1);
  assert.equal(h.state().collected, 2);
  h.use(-13, -30);
  assert.equal(h.state().carrying, true);
  h.use(-13, 35);
  h.tick(150);
  assert.equal(h.state().delivered, 2);
  assert.equal(h.state().collected, 4);
  assert.equal(h.state().phase, "escort");
  assert.ok(
    !h.world.solids.some((s) => s.z === 21 && s.w === 4.5 && s.y < 2),
    "gate passage opens",
  );
  h.tick(150);
  assert.ok(
    h.state().followers.every((p) => p.z > 21),
    "prisoners wait to follow the player outside",
  );
  Object.assign(h.player, createPlayer(0, 0, 14));
  h.tick(250);
  assert.ok(
    h.state().followers.every((p) => p.z < 21),
    JSON.stringify(h.state().followers),
  );
  assert.equal(h.completed, 0);
  h.use(2, 16);
  assert.equal(h.completed, 1);
  assert.equal(h.state().phase, "done");
  h.use(2, 16);
  assert.equal(h.completed, 1);
  h.world.dispose?.();
  assert.equal(h.scene.children.length, 0);
});

test("Gid's full supply route is traversable with ordinary movement and wall-kicks", () => {
  const h = harness();
  Object.assign(h.player, h.world.spawn);
  const move = (x: number, z: number, jumping = false, max = 1600) => {
    let kicks = 0;
    for (let f = 0; f < max; f++) {
      const dx = x - h.player.x,
        dz = z - h.player.z,
        len = Math.hypot(dx, dz);
      if (len < 0.6 && h.player.grounded) return kicks;
      const event = stepPlayer(
        h.player,
        {
          x: len > 0.4 ? -dx / len : 0,
          y: len > 0.4 ? dz / len : 0,
          jump: jumping && f % 22 === 0,
          jumpHeld: jumping,
        },
        1 / 60,
        0,
        h.world.solids,
      );
      if (event.jumped && h.player.move === "wallKick") kicks++;
      h.runtime.update(1 / 60, h.player, idle);
    }
    assert.fail(`route blocked toward ${x},${z}: ${JSON.stringify(h.player)}`);
  };
  const use = () =>
    h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
  move(-5, -44);
  use();
  move(0, -16);
  use();
  h.tick(30);
  move(-5, -44);
  use();
  move(-13, -30);
  use();
  move(-15, 18);
  assert.ok(move(-15, 29, true) > 0);
  use();
  h.tick(120);
  assert.equal(h.state().delivered, 1);
  assert.ok(move(-15, 17, true) > 0);
  move(-15, -30);
  move(-13, -30);
  use();
  move(-15, 18);
  move(-15, 30, true);
  move(5, 33);
  use();
  for (let wait = 0; wait < 300 && h.state().phase !== "dawn"; wait++) h.tick();
  assert.equal(h.state().phase, "dawn");
  const gate = h.world.solids.find((s) => s.w === 4.5 && s.z === 21)!;
  assert.ok(gate.y < 0.1);
  h.tick(20);
  assert.ok(gate.y > 0.1 && gate.y < 5.1);
  h.tick(50);
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  move(0, 24);
  move(0, 15);
  h.tick(200);
  move(2, 16);
  use();
  assert.equal(h.completed, 1);
  h.world.dispose?.();
});

test("collectors can reach dropped arms behind either house and beside the walls", () => {
  for (const [x, z] of [
    [-15.9, 46],
    [15.9, 46],
    [0, 47.9],
    [-16.5, 23],
    [14.45, 42],
  ]) {
    const h = harness();
    h.prepare();
    h.use(x, z);
    h.tick(350);
    assert.equal(h.state().collected, 2, `collection blocked at ${x},${z}`);
    h.world.dispose?.();
  }
});

test("dawn frames the player and opening gate on desktop and phone, including a rendered avatar", () => {
  for (const aspect of [16 / 9, 390 / 844]) {
    const h = harness(aspect);
    h.prepare();
    h.use(3, 32);
    h.tick(150);
    h.use(-13, -30);
    h.use(-14, 46);
    const avatar = new T.Mesh(
      new T.BoxGeometry(0.7, 1.65, 0.5),
      new T.MeshBasicMaterial(),
    );
    avatar.name = "moroni-character";
    avatar.position.set(-14, 0.825, 46);
    h.world.actorParent!.add(avatar);
    for (let i = 0; i < 300 && h.state().phase !== "dawn"; i++) h.tick();
    assert.equal(h.state().phase, "dawn");
    const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
    camera.position.set(-14, 0.6, 42); // initially embedded in the house
    for (let frame = 0; frame < 60; frame++) {
      const shot = h.runtime.camera!();
      assert.ok(shot);
      applyAdventureCamera(camera, shot, h.world.solids, 0.1);
      camera.updateMatrixWorld();
      for (const point of [
        new T.Vector3(-14, 1, 46),
        new T.Vector3(
          0,
          (h.world.solids.find((s) => s.w === 4.5 && s.z === 21)?.y ?? 0) +
            2.35,
          21.57,
        ),
      ]) {
        assert.ok(
          cameraSegmentClear(camera.position, point, h.world.solids, 0.04),
          JSON.stringify({ frame, aspect, eye: camera.position, point }),
        );
        const projected = point.clone().project(camera);
        assert.ok(
          Math.abs(projected.x) < 0.9 && Math.abs(projected.y) < 0.9,
          JSON.stringify(projected),
        );
      }
      h.tick();
    }
    assert.equal(h.runtime.camera!(), undefined);
    h.world.dispose?.();
  }
});

test("arms and prisoner swords stay attached to animated palms and world disposal owns equipment", () => {
  const scene = new T.Scene(),
    world = buildGidRescue(scene);
  let avatar = createCharacter("lamanite-laman", { quality: "npc" });
  world.actorParent!.add(avatar.group);
  const runtime = world.adventure!({
    setAvatar(role) {
      avatar.dispose();
      avatar = createCharacter(role, { quality: "npc" });
      world.actorParent!.add(avatar.group);
    },
    toast() {},
    complete() {},
    dialog(_r, _t, _b, next) {
      next();
    },
    attachEquipment(slot, object) {
      avatar.sockets[slot].add(object);
    },
  });
  const player = createPlayer();
  const use = (x: number, z: number) => {
    Object.assign(player, createPlayer(x, 0, z));
    runtime.update(0.1, player, { ...idle, interact: true });
  };
  use(-5, -44);
  use(0, -16);
  for (let i = 0; i < 30; i++) runtime.update(0.1, player, idle);
  use(-5, -44);
  use(-13, -30);
  const bundle = avatar.sockets.rightHand.getObjectByName(
    "Carried weapon bundle",
  )!;
  assert.ok(bundle);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0]) {
    player.yaw = yaw;
    player.vx = Math.sin(yaw) * 6;
    player.vz = Math.cos(yaw) * 6;
    player.runSpeed = 6;
    player.move = "run";
    avatar.update(1 / 60, { ...player, carrying: true });
    avatar.group.updateWorldMatrix(true, true);
    assert.ok(
      bundle
        .getWorldPosition(new T.Vector3())
        .distanceTo(
          avatar.sockets.rightHand.getWorldPosition(new T.Vector3()),
        ) < 1e-6,
    );
  }
  use(4, 32);
  for (let i = 0; i < 160; i++) runtime.update(0.1, player, idle);
  let swords = 0;
  scene.traverse((o) => {
    if (o.name === "Prisoner's held sword" && o.visible) {
      swords++;
      assert.equal(o.parent?.name, "right-hand-socket");
    }
  });
  assert.equal(swords, 2);
  use(-13, -30);
  assert.equal(bundle.parent, avatar.sockets.rightHand);
  let disposals = 0;
  bundle.traverse((o) => {
    if (o instanceof T.Mesh)
      o.geometry.addEventListener("dispose", () => disposals++);
  });
  runtime.dispose();
  assert.equal(bundle.parent, world.actorParent);
  avatar.dispose();
  world.dispose?.();
  assert.ok(disposals > 0);
  assert.equal(scene.children.length, 0);
});
