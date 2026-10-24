import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildBrokenBow } from "../src/super/broken-bow";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
test("broken bow: family, meaningful craft work, counsel and a traversable mountain hunt", () => {
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
  assert.deepEqual(
    sceneryCollisionErrors(world.actorParent!, world.solids),
    [],
  );
  for (const phase of ["camp", "wood", "arrow", "craft", "counsel", "guide"]) {
    assert.equal(state().phase, phase);
    const t = state().target;
    walk(t.x, t.z);
    runtime.update(1 / 60, player, { ...idle, interact: true });
    if (phase === "craft") {
      assert.equal(state().phase, "craft");
      runtime.update(1 / 60, player, { ...idle, interact: true });
      assert.equal(state().phase, "craft");
      runtime.update(1 / 60, player, { ...idle, interact: true });
    }
  }
  assert.equal(state().phase, "hunt");
  walk(0, 8);
  walk(0, 41);
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
  walk(0, 41);
  walk(0, 8);
  walk(0, -13);
  runtime.update(1 / 60, player, { ...idle, interact: true });
  assert.equal(completed, 1);
  assert.equal(state().phase, "done");
  runtime.dispose();
  world.dispose?.();
});
