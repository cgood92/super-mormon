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

test("vertical room bounds isolate upper and lower floor spaces sharing XZ", () => {
  const multiFloorRooms: CameraRoom[] = [
    {
      id: "cabin-below",
      bounds: { minX: -5, maxX: 5, minZ: -10, maxZ: 10, minY: -0.5, maxY: 3.5 },
      distance: 3.2,
      elevation: 0.18,
      targetHeight: 0.85,
      entryEyes: [],
      exitEyes: [],
    },
  ];
  // Below deck at y=0 is inside the room
  assert.equal(
    selectCameraRoom(multiFloorRooms, { x: 0, y: 0, z: 0 })?.id,
    "cabin-below",
  );
  // Upper deck at y=4.2 is outside the room
  assert.equal(
    selectCameraRoom(multiFloorRooms, { x: 0, y: 4.2, z: 0 }),
    undefined,
  );
  // Active room holds across jitter but releases on the upper floor
  assert.equal(
    selectCameraRoom(multiFloorRooms, { x: 0, y: 3.8, z: 0 }, "cabin-below")?.id,
    "cabin-below",
  );
  assert.equal(
    selectCameraRoom(multiFloorRooms, { x: 0, y: 4.2, z: 0 }, "cabin-below"),
    undefined,
  );
});
