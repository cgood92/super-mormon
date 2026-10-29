import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { StoryCinematic } from "./cinematic";
import { buildBrokenBow } from "../worlds/nephi/broken-bow";
import { cameraSegmentClear } from "./camera";

test("story shot eases the camera, animates actors, then restores exact transforms", () => {
  const camera = new T.PerspectiveCamera();
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 1, 0);
  const initial = camera.position.clone(),
    rotation = camera.quaternion.clone();
  const actor = new T.Group(),
    arm = new T.Group();
  arm.name = "right-arm";
  actor.add(arm);
  const movie = new StoryCinematic(camera, {
    actors: [{ group: actor, gesture: "point" }],
  });
  assert.equal(movie.finish(), false);
  movie.update(0.1);
  assert.ok(camera.position.distanceTo(initial) < 1);
  assert.notEqual(arm.rotation.x, 0);
  for (let i = 0; i < 20; i++) movie.update(0.1);
  assert.equal(movie.ready, true);
  assert.equal(movie.finish(), true);
  assert.equal(arm.rotation.x, 0);
  for (let i = 0; i < 8; i++) movie.update(0.1);
  assert.ok(camera.position.distanceTo(initial) < 1e-9);
  assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
});
test("disposing a scene cancels its camera and pose changes", () => {
  const camera = new T.PerspectiveCamera();
  camera.position.set(2, 4, 9);
  const actor = new T.Group();
  actor.position.set(5, 0, 1);
  const movie = new StoryCinematic(camera, { actors: [{ group: actor }] });
  movie.update(0.1);
  movie.dispose();
  assert.deepEqual(actor.position.toArray(), [5, 0, 1]);
  assert.deepEqual(camera.position.toArray(), [2, 4, 9]);
});

test("story prop action is visible during watching and restored before narrative commits", () => {
  const camera = new T.PerspectiveCamera();
  camera.position.set(0, 4, 10);
  const parcel = new T.Group();
  parcel.position.set(-2, 1, 0);
  const movie = new StoryCinematic(camera, {
    props: [{ object: parcel, to: { x: 2, y: 0.2, z: 0 } }],
    focus: { x: 0, y: 0, z: 0 },
  });
  for (let i = 0; i < 20; i++) movie.update(0.1);
  assert.ok(parcel.position.x > 1.9);
  movie.finish();
  assert.deepEqual(parcel.position.toArray(), [-2, 1, 0]);
});

test("a staged turn compensates for the character body's existing heading", () => {
  const camera = new T.PerspectiveCamera();
  camera.position.set(0, 4, 9);
  const first = new T.Group(),
    body = new T.Group(),
    second = new T.Group();
  body.name = "body";
  body.rotation.y = Math.PI / 2;
  first.add(body);
  second.position.set(0, 0, 3);
  const movie = new StoryCinematic(camera, {
    actors: [{ group: first, speaker: true }, { group: second }],
  });
  for (let i = 0; i < 40; i++) movie.update(0.05);
  const yaw = new T.Euler().setFromQuaternion(
    body.getWorldQuaternion(new T.Quaternion()),
    "YXZ",
  ).y;
  assert.ok(Math.abs(yaw) < 0.01);
  movie.finish();
  assert.equal(first.rotation.y, 0);
  assert.equal(body.rotation.y, Math.PI / 2);
});

test("broken bow family cutaway safely frames camp and returns to the mountain", () => {
  const scene = new T.Scene(),
    world = buildBrokenBow(scene);
  const actors = world
    .actorParent!.children.filter((group) =>
      /^(lehi|laman|lemuel)-character$/.test(group.name),
    )
    .map((group, i) => ({ group, speaker: i === 1, gesture: "talk" as const }));
  assert.equal(actors.length, 3);
  for (const aspect of [16 / 9, 9 / 16])
    for (const x of [-5, 0, 5]) {
      const camera = new T.PerspectiveCamera(52, aspect, 0.1, 180);
      camera.position.set(x, 11, 40);
      camera.lookAt(0, 9, 46);
      const original = camera.position.clone(),
        rotation = camera.quaternion.clone();
      const movie = new StoryCinematic(
        camera,
        { cutaway: true, actors },
        world.solids,
        scene,
      );
      assert.equal(movie.snapshot().cutaway, true);
      for (let i = 0; i < 100; i++) {
        movie.update(1 / 60);
        const state = movie.snapshot();
        assert.equal(state.clear, true);
        assert.equal(state.actorVisible, true);
        assert.ok(Math.abs(state.actorFrame![0]) < 0.8);
      }
      assert.equal(movie.finish(), true);
      assert.equal(movie.update(1 / 60), true);
      assert.ok(camera.position.distanceTo(original) < 1e-8);
      assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
      movie.dispose();
    }
  const embedded = new T.PerspectiveCamera(52, 9 / 16, 0.1, 180);
  embedded.position.set(0, 4, 46);
  const rescue = new StoryCinematic(
    embedded,
    { cutaway: true, actors },
    world.solids,
    scene,
  );
  assert.equal(rescue.snapshot().clear, true);
  for (let i = 0; i < 100; i++) rescue.update(1 / 60);
  rescue.finish();
  assert.equal(rescue.update(1 / 60), true);
  assert.ok(
    cameraSegmentClear(
      embedded.position,
      embedded.position,
      world.solids,
      0.28,
    ),
  );
  rescue.dispose();
  world.dispose?.();
});
