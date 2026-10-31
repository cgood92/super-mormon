import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildLehontiMountain, ANTIPAS_ROUTE } from "./lehonti-mountain";

// Adjacent full-height trail boxes formerly shared overlapping outward walls.
// Sample the middle of a straight run, away from corners and triangle edges.
test("Antipas brown terrace walls have one visible owner at overlapping steps", () => {
  const scene = new T.Scene();
  const world = buildLehontiMountain(scene);
  scene.updateMatrixWorld(true);
  const point = ANTIPAS_ROUTE[3];
  const ray = new T.Raycaster(
    new T.Vector3(point.x + 2.5, 0.4, point.z + 12),
    new T.Vector3(0, 0, -1),
    0,
    15,
  );
  const hits = ray
    .intersectObject(scene, true)
    .filter((hit) => /Mount Antipas walkable spiral/.test(hit.object.name));
  const coincident = hits.filter(
    (hit) => Math.abs(hit.point.z - (point.z + 2.85)) < 0.01,
  );
  assert.equal(
    coincident.length,
    1,
    "overlapping vertical brown walls must be removed, not depth-biased",
  );
  world.dispose?.();
});

test("Antipas terrace tops match their support without duplicate floor hits", () => {
  const scene = new T.Scene();
  const world = buildLehontiMountain(scene);
  scene.updateMatrixWorld(true);
  const terrace = scene.getObjectByName(
    "Mount Antipas walkable spiral terraces",
  ) as T.Mesh;
  const supports = terrace.userData.scenery.solids as {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
  }[];
  for (const p of ANTIPAS_ROUTE) {
    // Avoid triangle diagonals and authored post positions.
    const x = p.x + 0.137,
      z = p.z + 0.213;
    const expected = Math.max(
      ...supports
        .filter(
          (s) => Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2,
        )
        .map((s) => s.y + s.h),
    );
    const ray = new T.Raycaster(
      new T.Vector3(x, 100, z),
      new T.Vector3(0, -1, 0),
    );
    const hits = ray.intersectObject(terrace);
    assert.equal(hits.length, 1, "each walk surface has one visible owner");
    assert.ok(
      Math.abs(hits[0].point.y - expected) < 0.0001,
      "visible top matches the physical terrace",
    );
  }
  assert.ok(
    terrace.geometry.attributes.position.count < 50_000,
    "the entire spiral is one bounded mesh",
  );
  world.dispose?.();
});

import { createPlayer } from "../../physics/physics";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };
test("Lehonti opening establishes summit and valley before releasing a fresh race", () => {
  const scene = new T.Scene(),
    world = buildLehontiMountain(scene);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog() {},
  });
  assert.equal(runtime.movementLocked?.(), true);
  const captions = new Set<string>();
  for (let i = 0; i < 159; i++) {
    captions.add(runtime.update(0.1, player, idle).objective);
    const state = runtime.snapshot() as {
      timer: number;
      messengerProgress: number;
      retries: number;
    };
    assert.equal(state.timer, 0);
    assert.equal(state.messengerProgress, 0);
    assert.equal(state.retries, 0);
    assert.ok(runtime.camera?.());
  }
  assert.ok([...captions].some((s) => /Lehonti.*summit/.test(s)));
  assert.ok([...captions].some((s) => /Amalickiah/.test(s)));
  assert.ok([...captions].some((s) => /trap/.test(s)));
  runtime.update(0.1, player, idle);
  runtime.update(0.1, player, idle);
  assert.equal(runtime.movementLocked?.(), false);
  assert.equal(runtime.camera?.(), undefined);
  runtime.update(0.1, player, idle);
  assert.ok(
    (runtime.snapshot() as { messengerProgress: number }).messengerProgress > 0,
  );
  runtime.dispose();
  world.dispose?.();
});

import { cameraSegmentClear } from "../../camera/camera";
import { StoryMeshObstacles } from "../../camera/cinematic";
import { createCharacter } from "../../characters/character";
test("opening cuts frame summit, valley and runner safely on phone and desktop", () => {
  for (const aspect of [16 / 9, 390 / 844]) {
    const scene = new T.Scene(),
      world = buildLehontiMountain(scene);
    const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
    const avatar = createCharacter("warning-runner");
    const runtime = world.adventure!({
      viewAspect: () => aspect,
      setAvatar() {
        world.actorParent!.add(avatar.group);
        avatar.update(0, player);
      },
      toast() {},
      complete() {},
      dialog() {},
    });
    const actors = [
      "Lehonti · leader at the summit",
      "Amalickiah sends a secret embassy from the valley",
      "Lehonti guard 1",
      "Lehonti guard 2",
      ...[1, 2, 3].map((i) => `Actual embassy messenger ${i}`),
    ].map((name) => ({ group: scene.getObjectByName(name)! }));
    actors.push({ group: avatar.group });
    const meshes = new StoryMeshObstacles(world.actorParent, actors);
    for (let frame = 0; frame < 160; frame++) {
      world.update?.(0.1, player);
      const shot = runtime.camera!();
      assert.ok(shot);
      const position = new T.Vector3().copy(shot.position);
      const focus = new T.Vector3().copy(shot.focus);
      assert.equal(
        shot.cut,
        true,
        "distant beats use edited cuts, never a flight through the mountain",
      );
      assert.ok(cameraSegmentClear(position, position, world.solids));
      assert.ok(meshes.clear(position, position, 0.28));
      assert.ok(cameraSegmentClear(position, focus, world.solids, 0.035));
      assert.ok(meshes.clear(position, focus));
      const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
      camera.position.copy(position);
      camera.lookAt(focus);
      camera.updateMatrixWorld(true);
      const opening = runtime.snapshot() as { openingBeat: string };
      const subject =
        opening.openingBeat === "summit"
          ? actors[0].group
          : opening.openingBeat === "embassy"
            ? actors[1].group
            : avatar.group;
      for (const height of [0.3, 1.05, 1.65]) {
        const bodyPoint = subject
          .getWorldPosition(new T.Vector3())
          .add(new T.Vector3(0, height, 0));
        assert.ok(cameraSegmentClear(position, bodyPoint, world.solids, 0.035));
        assert.ok(meshes.clear(position, bodyPoint));
        const bodyNdc = bodyPoint.project(camera);
        assert.ok(
          Math.abs(bodyNdc.x) < 0.95 &&
            Math.abs(bodyNdc.y) < 0.95 &&
            bodyNdc.z < 1,
          "the subject's body stays framed",
        );
      }
      const projected = focus.clone().project(camera);
      assert.ok(Math.abs(projected.x) < 0.95 && Math.abs(projected.y) < 0.95);
      runtime.update(0.1, player, idle);
    }
    runtime.dispose();
    avatar.dispose();
    world.dispose?.();
  }
});
