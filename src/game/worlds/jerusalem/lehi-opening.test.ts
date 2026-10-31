import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildJerusalem } from "./jerusalem";
import { createCharacter } from "../../characters/character";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { cameraSegmentClear } from "../../camera/camera";
import { StoryMeshObstacles } from "../../camera/cinematic";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function setup(aspect = 16 / 9) {
  const scene = new T.Scene();
  const world = buildJerusalem("streets", scene);
  const avatar = createCharacter("lehi");
  scene.add(avatar.group);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  player.yaw = world.spawn.yaw!;
  avatar.update(0, player);
  const runtime = world.adventure!({
    avatar: avatar.group,
    viewAspect: () => aspect,
    setAvatar() {},
    toast() {},
    complete() {},
    dialog() {},
  });
  return { scene, world, avatar, player, runtime };
}

test("Lehi's opening holds the chase, shows the warning and blue door, then releases control", () => {
  const s = setup();
  const beats = new Set<string>();
  const start = { x: s.player.x, z: s.player.z };
  assert.equal(s.runtime.movementLocked!(), true);
  for (let i = 0; i < 151; i++) {
    s.runtime.update(0.1, s.player, { ...idle, interact: true });
    const state = s.runtime.snapshot() as { movieBeat?: string };
    if (state.movieBeat) beats.add(state.movieBeat);
    assert.deepEqual({ x: s.player.x, z: s.player.z }, start);
  }
  assert.deepEqual(
    [...beats],
    ["warning", "angry-crowd", "blue-door", "escape"],
  );
  assert.equal(s.runtime.movementLocked!(), false);
  assert.equal(s.runtime.camera!(), undefined);
  assert.match(s.runtime.update(0, s.player, idle).objective, /blue door/i);
  s.runtime.dispose();
  s.avatar.dispose();
  s.world.dispose?.();
});

for (const aspect of [16 / 9, 9 / 16]) {
  test(`Lehi opening cameras clear opaque city geometry throughout every shot (${aspect})`, () => {
    const s = setup(aspect);
    const scenery = new StoryMeshObstacles(s.world.actorParent, [
      { group: s.avatar.group },
      ...[1, 2, 3].map((i) => ({
        group: s.scene.getObjectByName(`Jerusalem listener ${i} · imagined`)!,
      })),
    ]);
    const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
    let sawDoor = false;
    for (let i = 0; i < 150; i++) {
      s.runtime.update(0.1, s.player, idle);
      const shot = s.runtime.camera!();
      if (!shot) continue;
      const eye = new T.Vector3().copy(shot.position);
      const focus = new T.Vector3().copy(shot.focus);
      assert.ok(cameraSegmentClear(eye, eye, s.world.solids, 0.28));
      assert.ok(cameraSegmentClear(eye, focus, s.world.solids, 0.03));
      assert.ok(scenery.clear(eye, eye, 0.28));
      assert.ok(scenery.clear(eye, focus));
      camera.position.copy(eye);
      camera.lookAt(focus);
      camera.updateMatrixWorld();
      if ((s.runtime.snapshot() as any).movieBeat === "angry-crowd") {
        for (const actor of [
          s.avatar.group,
          s.scene.getObjectByName("Jerusalem listener 1 · imagined")!,
        ]) {
          const chest = actor
            .getWorldPosition(new T.Vector3())
            .add(new T.Vector3(0, 1.05, 0))
            .project(camera);
          assert.ok(
            Math.abs(chest.x) < 0.85 && Math.abs(chest.y) < 0.85,
            `confrontation actor outside shot: ${chest.toArray()}`,
          );
        }
      }
      if ((s.runtime.snapshot() as any).movieBeat === "blue-door") {
        const door = new T.Vector3(-32.14, 1.4, -15).project(camera);
        assert.ok(Math.abs(door.x) < 0.85 && Math.abs(door.y) < 0.85);
        sawDoor = true;
      }
    }
    assert.ok(sawDoor);
    s.runtime.dispose();
    s.avatar.dispose();
    s.world.dispose?.();
  });
}

test("after the opening, normal player movement can reach the home around the western houses", () => {
  const s = setup();
  for (let i = 0; i < 151; i++) s.runtime.update(0.1, s.player, idle);
  for (const target of [
    { x: -19, z: 25 },
    { x: -19, z: 25 },
    { x: -33.2, z: 25 },
    { x: -33.2, z: -15 },
  ]) {
    for (
      let i = 0;
      i < 1500 &&
      Math.hypot(target.x - s.player.x, target.z - s.player.z) > 0.2;
      i++
    ) {
      const dx = target.x - s.player.x,
        dz = target.z - s.player.z;
      const d = Math.hypot(dx, dz);
      stepPlayer(
        s.player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        s.world.solids,
      );
      s.runtime.update(1 / 60, s.player, idle);
    }
    assert.ok(
      Math.hypot(target.x - s.player.x, target.z - s.player.z) < 0.25,
      `blocked en route to ${JSON.stringify(target)}`,
    );
  }
  assert.ok(
    Math.hypot(s.player.x - s.world.goal.x, s.player.z - s.world.goal.z) < 1.25,
  );
  s.runtime.dispose();
  s.avatar.dispose();
  s.world.dispose?.();
});
