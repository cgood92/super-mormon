import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { applyAdventureCamera } from "../src/super/adventure-camera";
import { cameraSegmentClear } from "../src/super/camera";

test("authored aiming view settles at its shoulder endpoint", () => {
  const camera = new T.PerspectiveCamera();
  camera.position.set(0, 3, -8);
  const shot = {
    position: { x: 0.4, y: 1.9, z: -0.75 },
    focus: { x: 0, y: 1.5, z: 30 },
  };
  for (let i = 0; i < 180; i++) applyAdventureCamera(camera, shot, [], 1 / 60);
  assert.ok(
    camera.position.distanceTo(new T.Vector3(0.4, 1.9, -0.75)) < 0.00001,
  );
  const projected = new T.Vector3(0, 1.5, 30).project(camera);
  assert.ok(Math.abs(projected.x) < 1e-6 && Math.abs(projected.y) < 1e-6);
});
test("authored camera transition avoids entering a wall and recovers unsafe endpoints", () => {
  const camera = new T.PerspectiveCamera();
  camera.position.set(0, 2, -2);
  const solids = [{ x: 0, y: 0, z: 0, w: 4, h: 4, d: 0.5 }];
  const shot = { position: { x: 0, y: 2, z: 2 }, focus: { x: 0, y: 2, z: 10 } };
  for (let i = 0; i < 80; i++) {
    applyAdventureCamera(camera, shot, solids, 1 / 60);
    assert.ok(
      cameraSegmentClear(camera.position, camera.position, solids, 0.2),
    );
  }
  applyAdventureCamera(
    camera,
    { ...shot, position: { x: 0, y: 2, z: 0 } },
    solids,
    1,
  );
  assert.ok(cameraSegmentClear(camera.position, camera.position, solids, 0.2));
});
