import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { FollowCamera, cameraSegmentClear } from "./camera";
import type { CameraRoom } from "./camera-rooms";

const room: CameraRoom = {
  id: "inside",
  bounds: { minX: -5, maxX: 5, minZ: -10, maxZ: -1 },
  distance: 4,
  elevation: 0.25,
  targetHeight: 1,
  entryEyes: [{ x: 0, y: 2, z: -4 }],
  exitEyes: [{ x: 0, y: 2, z: 2 }],
};
const walls = [
  { x: -5, y: 0, z: -5.5, w: 0.5, h: 6, d: 9 },
  { x: 5, y: 0, z: -5.5, w: 0.5, h: 6, d: 9 },
  { x: 0, y: 0, z: -10, w: 10, h: 6, d: 0.5 },
];
const neutral = { orbitX: 0, orbitY: 0, recenter: false };

test("entering a room cuts across a blocked exterior route to a clear interior eye", () => {
  const camera = new T.PerspectiveCamera();
  const follow = new FollowCamera(camera);
  const p = { x: 0, y: 0, z: -3, yaw: Math.PI / 2, runSpeed: 0 };
  follow.reset(p);
  assert.ok(camera.position.x < -5);
  follow.update(1 / 60, p, walls, neutral, "palace", room);
  assert.equal(follow.roomId, room.id);
  assert.ok(camera.position.x > -4.5 && camera.position.x < 4.5);
  assert.ok(cameraSegmentClear(camera.position, camera.position, walls));
  assert.ok(
    cameraSegmentClear(new T.Vector3(p.x, 1, p.z), camera.position, walls, 0),
  );
});

test("room following and manual orbit keep the eye inside; exiting restores an exterior eye", () => {
  const camera = new T.PerspectiveCamera();
  const follow = new FollowCamera(camera);
  const p = { x: 0, y: 0, z: -3, yaw: 0, runSpeed: 0 };
  follow.reset(p);
  for (let i = 0; i < 240; i++) {
    follow.update(
      1 / 60,
      { ...p, x: Math.sin(i / 50) * 3 },
      walls,
      { ...neutral, orbitX: i % 40 === 0 ? Math.PI / 4 : 0 },
      "palace",
      room,
    );
    assert.ok(camera.position.x >= -4.7 && camera.position.x <= 4.7);
    assert.ok(camera.position.z >= -9.7 && camera.position.z <= -1.3);
    assert.ok(
      cameraSegmentClear(camera.position, camera.position, walls, 0.22),
    );
  }
  follow.update(1 / 60, { ...p, z: 0 }, walls, neutral, "palace");
  assert.equal(follow.roomId, undefined);
  assert.ok(camera.position.z > 0);
});

test("a room entered away from its authored doors still recovers an interior eye", () => {
  const camera = new T.PerspectiveCamera();
  const follow = new FollowCamera(camera);
  const p = { x: -2, y: 0, z: -8, yaw: Math.PI / 2, runSpeed: 0 };
  follow.reset(p);
  const obstacle = { x: 0, y: 0, z: -4, w: 1, h: 5, d: 1 };
  follow.update(1 / 60, p, [...walls, obstacle], neutral, "palace", room);
  assert.ok(camera.position.x > -4.5);
  assert.ok(
    cameraSegmentClear(
      new T.Vector3(p.x, 1, p.z),
      camera.position,
      [...walls, obstacle],
      0.05,
    ),
  );
});
