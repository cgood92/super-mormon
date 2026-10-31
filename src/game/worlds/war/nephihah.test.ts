import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildNephihah } from "./nephihah";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
import type { Point } from "../../runtime/worlds";

function harness() {
  const scene = new T.Scene(),
    world = buildNephihah(scene);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let completed = 0,
    dialogs = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog() {
      dialogs++;
    },
  });
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      ladderZ: number;
      entered: number;
      soldiers: { position: Point; escaped: boolean }[];
      followers: { position: Point }[];
    };
  const tick = (interact = false) => {
    world.update?.(1 / 60, player);
    return runtime.update(1 / 60, player, {
      x: 0,
      y: 0,
      interact,
      interactHeld: interact,
    });
  };
  const walk = (target: Point, jump = false) => {
    for (let frame = 0; frame < 1800; frame++) {
      const dx = target.x - player.x,
        dz = target.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35 && Math.abs(player.y - target.y) < 0.15 && player.grounded)
        break;
      stepPlayer(
        player,
        {
          x: d > 0.2 ? (-dx / d) * Math.min(1, d * 1.8) : 0,
          y: d > 0.2 ? (dz / d) * Math.min(1, d * 1.8) : 0,
          jump: jump && (player.grounded || !!player.ledge) && frame % 20 === 0,
          jumpHeld: jump,
        },
        1 / 60,
        0,
        world.solids,
        world.climbables,
      );
      tick();
    }
    assert.ok(
      Math.hypot(player.x - target.x, player.z - target.z) < 0.55 &&
        Math.abs(player.y - target.y) < 0.2,
      `blocked toward ${JSON.stringify(target)} at ${JSON.stringify({ x: player.x, y: player.y, z: player.z })}`,
    );
  };
  const enter = (z = 8, hopAfterDeployment = false) => {
    walk({ x: -28, y: 0, z: -17 });
    walk({ x: -25.6, y: 1.4, z: -16 }, true);
    walk({ x: -25.6, y: 2.8, z: -13.6 }, true);
    walk({ x: -25.6, y: 4.2, z: -11.2 }, true);
    walk({ x: -24, y: 5.6, z: -11.2 }, true);
    assert.equal(state().phase, "return");
    walk({ x: -29, y: 0, z: -11.2 });
    walk({ x: -42, y: 0, z: 0 });
    assert.equal(state().phase, "deploy");
    walk({ x: -36, y: 0, z });
    tick(true);
    assert.equal(state().phase, "cross");
    if (hopAfterDeployment) {
      for (let f = 0; f < 70; f++) {
        stepPlayer(
          player,
          { x: 0, y: 0, jump: f === 0, jumpHeld: f < 18 },
          1 / 60,
          0,
          world.solids,
        );
        tick();
      }
    }
    z = state().ladderZ;
    walk({ x: -36, y: 0, z });
    walk({ x: -24, y: 5.6, z });
    walk({ x: -12, y: 0, z });
    walk({ x: -5, y: 0, z: 0 });
    for (let f = 0; f < 1200 && state().phase !== "drive"; f++) tick();
    assert.equal(state().phase, "drive", JSON.stringify(state()));
  };
  return {
    scene,
    world,
    player,
    runtime,
    state,
    tick,
    walk,
    enter,
    completed: () => completed,
    dialogs: () => dialogs,
  };
}

test("three wall hops, automatic rally, and one ladder action bring a following army inside", () => {
  const h = harness();
  h.tick(true);
  assert.equal(h.state().phase, "scout");
  h.enter(4);
  assert.equal(h.state().entered, 6);
  assert.ok(
    h.state().followers.every((s) => s.position.x > -23 && s.position.y < 0.5),
  );
  assert.equal(h.dialogs(), 0);
  assert.equal(h.completed(), 0);
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  h.scene.updateMatrixWorld(true);
  // Each visible walking surface owns a single hit, even where ladders meet the wall.
  for (const surface of [
    { x: -25.53, z: -15.83, top: 1.4 },
    { x: -24.13, z: 0.17, top: 5.6 },
    { x: -30.62, z: h.state().ladderZ + 0.17, top: 2.8 },
  ]) {
    const ray = new T.Raycaster(
      new T.Vector3(surface.x, 12, surface.z),
      new T.Vector3(0, -1, 0),
    );
    const hits = ray
      .intersectObjects(h.scene.children, true)
      .filter((hit) => Math.abs(hit.point.y - surface.top) < 0.001);
    assert.equal(
      hits.length,
      1,
      `duplicate surface at ${surface.x},${surface.z}`,
    );
  }

  h.world.dispose?.();
  assert.equal(h.scene.children.length, 0);
});

test("defenders need directional player pressure, leave through the gate, and complete without a conversation", () => {
  const h = harness();
  h.enter();
  const start = h.state().soldiers.map((s) => ({ ...s.position }));
  for (let f = 0; f < 600; f++) h.tick();
  assert.equal(h.completed(), 0);
  assert.ok(
    h
      .state()
      .soldiers.every(
        (s, i) =>
          Math.hypot(s.position.x - start[i].x, s.position.z - start[i].z) < 2,
      ),
  );
  // Exercise pressure from the wrong side before steering each straggler out.
  const first = h.state().soldiers[0].position;
  Object.assign(h.player, { x: first.x + 2, y: 0, z: first.z });
  for (let f = 0; f < 30; f++) h.tick();
  assert.ok(h.state().soldiers[0].position.x < first.x);
  for (let i = 0; i < 5; i++) {
    for (let f = 0; f < 3600 && !h.state().soldiers[i].escaped; f++) {
      const s = h.state().soldiers[i].position;
      // Stand opposite the gate, then directly behind once aligned with its opening.
      const dz = Math.abs(s.z) > 2 ? -s.z : 0;
      const dx = 28 - s.x,
        length = Math.hypot(dx, dz);
      Object.assign(h.player, {
        x: s.x - (dx / length) * 2,
        y: 0,
        z: s.z - (dz / length) * 2,
      });
      h.tick();
      const now = h.state().soldiers[i].position;
      assert.ok(
        now.x < 22.9 || Math.abs(now.z) < 5.3,
        "soldier crossed a gate wall",
      );
    }
    assert.equal(
      h.state().soldiers[i].escaped,
      true,
      JSON.stringify(h.state()),
    );
  }
  assert.equal(h.completed(), 1);
  for (let f = 0; f < 60; f++) h.tick(true);
  assert.equal(h.completed(), 1);
  assert.equal(h.dialogs(), 0);
  h.world.dispose?.();
});

test("the west wall blocks walking, its three blocks require jumps, and the east gate stays open", () => {
  const h = harness();
  const west = createPlayer(-29, 0, 0),
    east = createPlayer(29, 0, 0);
  for (let f = 0; f < 150; f++) {
    stepPlayer(
      west,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
    stepPlayer(
      east,
      { x: 1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  }
  assert.ok(west.x < -24.8);
  assert.ok(east.x < 21);
  const walker = createPlayer(-28, 0, -16);
  for (let f = 0; f < 120; f++)
    stepPlayer(
      walker,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.equal(walker.y, 0);
  assert.ok(walker.x < -26.7);
  h.world.dispose?.();
});

test("a jump beside the placed ladder cannot strand the following army", () => {
  const h = harness();
  h.enter(8, true);
  assert.equal(h.state().entered, 6);
  h.world.dispose?.();
});

test("deployment from both ends of the west wall selects a crossing clear of houses", () => {
  for (const z of [-18, 18]) {
    const h = harness();
    h.enter(z);
    assert.equal(h.state().entered, 6);
    h.world.dispose?.();
  }
});
