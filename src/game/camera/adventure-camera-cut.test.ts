import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { applyAdventureCamera } from "./adventure-camera";
test("authored cutaway cuts directly to the clear endpoint rather than traveling through canopy", () => {
  const camera = new T.PerspectiveCamera();
  camera.position.set(-30, 4, 0);
  const shot = {
    cut: true,
    position: { x: 30, y: 6, z: 0 },
    focus: { x: 30, y: 2, z: -4 },
  };
  applyAdventureCamera(camera, shot, [], 1 / 60);
  assert.deepEqual(camera.position.toArray(), [30, 6, 0]);
});
