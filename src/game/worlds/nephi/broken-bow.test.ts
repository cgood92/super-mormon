import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildBrokenBow } from "./broken-bow";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
test("broken bow: summit practice, automatic crafting, ordered counsel and return", () => {
  const world = buildBrokenBow(new T.Scene()),
    player = createPlayer(0, 0, -22);
  let completed = 0;
  const texts: string[] = [];
  const runtime = world.adventure!({
    setAvatar: () => {},
    toast: () => {},
    complete: () => completed++,
    dialog: (_ref, _title, body, next) => {
      texts.push(body);
      next();
    },
  });
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      effort: number;
      practiceShots: number;
      food: number;
      aiming: boolean;
      target: { x: number; y: number; z: number };
      animals: { id: string; position: T.Vector3; taken: boolean }[];
    };
  function walk(x: number, z: number) {
    for (let i = 0; i < 2400; i++) {
      const dx = x - player.x,
        dz = z - player.z,
        d = Math.hypot(dx, dz);
      if (d < 0.18 && Math.hypot(player.vx, player.vz) < 0.3) return;
      stepPlayer(
        player,
        {
          x: (-dx / Math.max(d, 0.001)) * Math.min(1, d),
          y: (dz / Math.max(d, 0.001)) * Math.min(1, d),
          jump: false,
          jumpHeld: false,
        },
        1 / 60,
        0,
        world.solids,
      );
      runtime.update(1 / 60, player, idle);
    }
    assert.fail(`Blocked at ${player.x},${player.y},${player.z} to ${x},${z}`);
  }
  function climb() {
    walk(0, 10.5);
    for (const [x, z, top] of [
      [0, 14, 0.85],
      [-1, 18, 1.7],
      [0.8, 22, 2.6],
      [1.3, 26, 3.5],
      [-0.7, 30, 4.45],
      [-1.2, 34, 5.4],
      [0.6, 38, 6.35],
      [0.2, 42, 7.3],
      [0, 46, 8],
    ]) {
      let arrived = false;
      for (let i = 0; i < 400; i++) {
        const dx = x - player.x,
          dz = z - player.z,
          d = Math.hypot(dx, dz);
        if (d < 0.4 && Math.abs(player.y - top) < 0.15 && player.grounded) {
          arrived = true;
          break;
        }
        const jump = player.grounded && player.y < top - 0.3 && d < 3.1;
        stepPlayer(
          player,
          {
            x: -dx / Math.max(d, 0.001),
            y: dz / Math.max(d, 0.001),
            jump,
            jumpHeld: jump || !player.grounded,
          },
          1 / 60,
          0,
          world.solids,
        );
        runtime.update(1 / 60, player, idle);
      }
      assert.ok(
        arrived,
        `Could not land on ${x},${top},${z}; at ${player.x},${player.y},${player.z}`,
      );
    }
  }
  assert.deepEqual(
    sceneryCollisionErrors(world.actorParent!, world.solids),
    [],
  );
  world.actorParent!.updateWorldMatrix(true, true);
  for (const x of [-8, 0, 8]) {
    const ray = new T.Raycaster(
      new T.Vector3(x, 15, 48),
      new T.Vector3(0, -1, 0),
    );
    const topOwners = new Set(
      ray
        .intersectObject(world.actorParent!, true)
        .filter((hit) => Math.abs(hit.point.y - 8) < 0.02)
        .map((hit) => hit.object),
    );
    assert.equal(
      topOwners.size,
      1,
      `summit top at x=${x} has one visible owner`,
    );
    const drop = createPlayer(x, 13, 48);
    for (let i = 0; i < 120; i++)
      stepPlayer(
        drop,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(drop.grounded && Math.abs(drop.y - 8) < 0.05);
  }
  const blocked = createPlayer(0, 0, 10);
  for (let i = 0; i < 120; i++)
    stepPlayer(
      blocked,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(
    blocked.z < 12.1,
    "walking straight into the first boulder is blocked",
  );
  for (let i = 0; i < 90; i++)
    stepPlayer(
      blocked,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  for (let i = 0; i < 90; i++)
    stepPlayer(
      blocked,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(blocked.z > 15, "the boulder has a walkable way around it");
  assert.equal(state().phase, "practice");
  climb();
  assert.ok(Math.abs(player.y - 8) < 0.05);
  for (let shot = 1; shot <= 3; shot++) {
    runtime.update(1, player, { ...idle, interactHeld: true });
    runtime.update(1 / 60, player, idle);
    assert.equal(state().practiceShots, shot);
    assert.equal(state().phase, shot < 3 ? "practice" : "snapped");
  }
  runtime.update(0.85, player, idle);
  assert.equal(state().phase, "wood");
  walk(0, 8);
  walk(0, -13);
  for (const phase of ["wood", "arrow", "counsel", "guide"]) {
    assert.equal(state().phase, phase);
    const t = state().target;
    walk(t.x, t.z);
    runtime.update(1 / 60, player, { ...idle, interact: true });
  }
  assert.equal(state().phase, "hunt");
  climb();
  assert.ok(Math.abs(player.y - 8) < 0.05);
  // Walk around a solid trunk rather than through it on the camp route.
  assert.ok(texts.some((t) => t.includes("steel bow")));
  assert.ok(texts.some((t) => t.includes("humbles")));
  // Use moving targets and gravity-compensated aim, without a direct-hit shortcut.
  for (let attempts = 0; state().food < 3 && attempts < 35; attempts++) {
    const target = state().animals.find((a) => !a.taken)!;
    const dx = target.position.x - player.x,
      dz = target.position.z - player.z,
      d = Math.hypot(dx, dz);
    player.yaw = Math.atan2(dx, dz);
    // Fresh draw starts from the last pitch, so adjust through the actual aiming input.
    let snap = runtime.snapshot() as { pitch: number };
    const desired =
      Math.atan2(target.position.y - (player.y + 1.35), d) + 0.055;
    runtime.update(0.01, player, { ...idle, interactHeld: true });
    runtime.update(0.8, player, {
      ...idle,
      interactHeld: true,
      y: Math.max(-1, Math.min(1, (desired - snap.pitch) / (0.8 * 0.7))),
    });
    runtime.update(0.3, player, { ...idle, interactHeld: true });
    const shot = runtime.camera?.();
    assert.ok(shot);
    for (const solid of world.solids) {
      const b = new T.Box3(
        new T.Vector3(solid.x - solid.w / 2, solid.y, solid.z - solid.d / 2),
        new T.Vector3(
          solid.x + solid.w / 2,
          solid.y + solid.h,
          solid.z + solid.d / 2,
        ),
      );
      assert.equal(
        b.containsPoint(
          new T.Vector3(shot.position.x, shot.position.y, shot.position.z),
        ),
        false,
      );
    }
    for (const aspect of [16 / 9, 9 / 16]) {
      const camera = new T.PerspectiveCamera(52, aspect, 0.1, 150);
      camera.position.set(shot.position.x, shot.position.y, shot.position.z);
      camera.lookAt(shot.focus.x, shot.focus.y, shot.focus.z);
      camera.updateMatrixWorld();
      const center = new T.Vector3(
        shot.focus.x,
        shot.focus.y,
        shot.focus.z,
      ).project(camera);
      assert.ok(Math.abs(center.x) < 0.01 && Math.abs(center.y) < 0.01);
    }

    runtime.update(0.01, player, idle);
    for (let i = 0; i < 160; i++) runtime.update(1 / 120, player, idle);
  }
  assert.equal(state().food, 3);
  assert.equal(state().phase, "return");
  const returnPose = runtime.update(1 / 60, player, idle);
  assert.equal(returnPose.holdingBow, true);
  assert.equal(returnPose.carrying, false);
  assert.equal(
    world.actorParent!.getObjectByName("Curved hunting bow")!.visible,
    true,
  );
  const summitPosition = { x: player.x, y: player.y, z: player.z };
  Object.assign(player, { x: 0, y: 8, z: -13, grounded: false });
  runtime.update(1 / 60, player, idle);
  assert.equal(
    completed,
    0,
    "crossing over camp in the air cannot complete the story",
  );
  Object.assign(player, summitPosition);
  walk(0, 8);
  walk(0, -13);
  runtime.update(1 / 60, player, idle);
  assert.equal(completed, 1);
  assert.equal(state().phase, "done");
  runtime.update(1 / 60, player, idle);
  assert.equal(completed, 1);
  runtime.dispose();
  world.dispose?.();
});
