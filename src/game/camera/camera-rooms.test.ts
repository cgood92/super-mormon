import assert from "node:assert/strict";
import test from "node:test";
import { selectCameraRoom, type CameraRoom } from "./camera-rooms.ts";
const rooms: CameraRoom[] = [
  {
    id: "passage",
    bounds: { minX: -5, maxX: 0, minZ: -10, maxZ: 0 },
    distance: 3,
    elevation: 0.25,
    targetHeight: 1,
    entryEyes: [],
    exitEyes: [],
  },
  {
    id: "hall",
    bounds: { minX: 0, maxX: 10, minZ: -10, maxZ: 0 },
    distance: 5,
    elevation: 0.3,
    targetHeight: 1,
    entryEyes: [],
    exitEyes: [],
  },
];
test("room camera activates only after entering the room core", () => {
  assert.equal(selectCameraRoom(rooms, { x: -0.1, z: -5 }), undefined);
  assert.equal(selectCameraRoom(rooms, { x: -0.16, z: -5 })?.id, "passage");
  assert.equal(selectCameraRoom(rooms, { x: -2, z: -0.1 }), undefined);
  assert.equal(selectCameraRoom(rooms, { x: -2, z: -0.16 })?.id, "passage");
});
test("active room holds across doorway jitter and releases beyond the exit margin", () => {
  for (const x of [-0.1, 0.1, -0.05, 0.44])
    assert.equal(
      selectCameraRoom([rooms[0]], { x, z: -5 }, "passage")?.id,
      "passage",
    );
  assert.equal(
    selectCameraRoom(rooms, { x: -5.46, z: -5 }, "passage"),
    undefined,
  );
  assert.equal(
    selectCameraRoom(rooms, { x: -2, z: 0.46 }, "passage"),
    undefined,
  );
});
test("entering a different room core takes precedence over retaining the previous room", () => {
  assert.equal(
    selectCameraRoom(rooms, { x: 0.16, z: -5 }, "passage")?.id,
    "hall",
  );
  assert.equal(
    selectCameraRoom(rooms, { x: -0.16, z: -5 }, "hall")?.id,
    "passage",
  );
  assert.equal(selectCameraRoom(rooms, { x: 5, z: -5 }, "missing")?.id, "hall");
  assert.equal(selectCameraRoom(rooms, { x: 30, z: 30 }, "hall"), undefined);
});
