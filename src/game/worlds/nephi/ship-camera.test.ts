import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildShip } from "./ship";
import { FollowCamera, cameraSegmentClear } from "../../camera/camera";
import { selectCameraRoom } from "../../camera/camera-rooms";
import { createPlayer, stepPlayer } from "../../physics/physics";

const neutral = { orbitX: 0, orbitY: 0, recenter: false };

test("underdeck camera rooms activate below deck and release on the upper deck", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: 0 });
  assert.equal(ship.cameraRooms.length, 2);

  // Upper deck at y=4.2 is outside underdeck rooms
  const onUpperDeck = { x: 2, y: 4.2, z: 2 };
  assert.equal(selectCameraRoom(ship.cameraRooms, onUpperDeck), undefined);

  // Stern helm on upper deck (z=17, y=4.2) shares XZ with common room below, but is excluded by height
  const atHelm = { x: 0, y: 4.2, z: 17 };
  assert.equal(selectCameraRoom(ship.cameraRooms, atHelm), undefined);

  // Below deck in the common room (z=15, y=0) activates ship-common-room
  const inCommonRoom = { x: -1, y: 0, z: 15 };
  const roomAft = selectCameraRoom(ship.cameraRooms, inCommonRoom);
  assert.equal(roomAft?.id, "ship-common-room");
  assert.ok(
    roomAft.distance <= 3.5,
    "room distance is close for indoor navigation",
  );

  // Below deck in fore-cabins (z=-6, y=0) activates ship-fore-cabins
  const inForeCabins = { x: 0, y: 0, z: -6 };
  const roomFore = selectCameraRoom(ship.cameraRooms, inForeCabins);
  assert.equal(roomFore?.id, "ship-fore-cabins");
  assert.ok(roomFore.distance <= 3.5);
});

test("child avatar descending stairs to underdeck brings camera below deck and above floor", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: 0 });
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);

  // Child begins on upper deck near top of stairs (x=6, z=-1, y=4.2)
  const player = createPlayer(6, 4.2, -1);
  player.yaw = 0; // facing forward down the stairs
  follow.reset({ ...player, role: "child" }, player.yaw, "streets");

  // Camera on upper deck starts above deck
  assert.ok(camera.position.y > 4.2, "initial camera is above upper deck");

  // Child walks down the stairs (z from -1 to 11)
  for (let frame = 0; frame < 180; frame++) {
    stepPlayer(
      player,
      { x: 0, y: 1, jump: false, jumpHeld: false, traversal: false },
      1 / 60,
      0,
      ship.solids,
    );
    const room = selectCameraRoom(ship.cameraRooms, player, follow.roomId);
    follow.update(
      1 / 60,
      { ...player, role: "child" },
      ship.solids,
      neutral,
      "streets",
      room,
    );

    // Camera must stay behind player while descending stairs, never flipping 180
    if (player.z <= 10) {
      assert.ok(
        camera.position.z <= player.z + 0.5,
        `camera flipped ahead of player at frame ${frame}: cam.z=${camera.position.z}, player.z=${player.z}`,
      );
      assert.ok(
        Math.abs(follow.yaw) < 1.0,
        `camera yaw flipped at frame ${frame}: yaw=${follow.yaw}`,
      );
    }
    assert.ok(
      camera.position.y >= player.y + 0.2,
      `camera dipped below player floor at frame ${frame}: cam.y=${camera.position.y}, player.y=${player.y}`,
    );
    assert.ok(
      camera.position.y >= -0.01,
      `camera dipped below world baseline at frame ${frame}`,
    );
  }

  // Player has reached the bottom of the stairs
  assert.ok(player.y < 0.1, `player reached lower deck: y=${player.y}`);

  // Walk along the corridor to the doorway at x=0, z=11, then enter common room
  const waypoints = [
    { x: 0, z: 11 },
    { x: -1, z: 15 },
  ];
  for (const wp of waypoints) {
    for (let frame = 0; frame < 90; frame++) {
      const dx = wp.x - player.x,
        dz = wp.z - player.z;
      const dist = Math.hypot(dx, dz);
      stepPlayer(
        player,
        {
          x: dist > 0.1 ? -dx / dist : 0,
          y: dist > 0.1 ? dz / dist : 0,
          jump: false,
          jumpHeld: false,
          traversal: false,
        },
        1 / 60,
        0,
        ship.solids,
      );
      const room = selectCameraRoom(ship.cameraRooms, player, follow.roomId);
      follow.update(
        1 / 60,
        { ...player, role: "child" },
        ship.solids,
        neutral,
        "streets",
        room,
      );
    }
  }

  // Child is in the common room below deck
  assert.equal(follow.roomId, "ship-common-room");

  // Camera must be below the upper deck (deck is at y=3.95 to 4.2)
  assert.ok(
    camera.position.y < 3.8,
    `camera must be below upper deck: cam.y=${camera.position.y}`,
  );
  // Camera must be safely above the lower deck floor
  assert.ok(
    camera.position.y >= 0.25,
    `camera must be above lower floor: cam.y=${camera.position.y}`,
  );
  // Camera eye must be clear in solids
  assert.ok(
    cameraSegmentClear(camera.position, camera.position, ship.solids, 0.2),
    "camera eye is clear inside cabin",
  );
});

test("camera in underdeck cabin remains inside ship bounds and above floor during manual orbit", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: 0 });
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);

  // Position player in center of common room below deck
  const player = {
    x: -1,
    y: 0,
    z: 15,
    yaw: Math.PI,
    runSpeed: 0,
    grounded: true,
    role: "child",
  };
  const room = selectCameraRoom(ship.cameraRooms, player);
  assert.equal(room?.id, "ship-common-room");

  follow.reset(player, player.yaw, "streets");
  follow.update(1 / 60, player, ship.solids, neutral, "streets", room);

  // Test full 360 degree orbit around the child
  for (let step = 0; step < 40; step++) {
    follow.update(
      1 / 60,
      player,
      ship.solids,
      { orbitX: Math.PI / 10, orbitY: 0, recenter: false },
      "streets",
      room,
    );

    // Camera stays above floor
    assert.ok(
      camera.position.y >= 0.22,
      `orbit step ${step}: camera below floor at y=${camera.position.y}`,
    );
    // Camera stays below upper deck ceiling
    assert.ok(
      camera.position.y < 3.8,
      `orbit step ${step}: camera clipped into ceiling at y=${camera.position.y}`,
    );
    // Camera eye remains clear
    assert.ok(
      cameraSegmentClear(camera.position, camera.position, ship.solids, 0.2),
      `orbit step ${step}: camera eye collided with solid`,
    );
  }
});

test("adult avatar ascending stairs from underdeck releases room camera back to open deck view", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: -40 });
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);

  // Nephi starts in the underdeck common room in Bountiful (origin z = -40)
  const player = createPlayer(0, 0, -26);
  player.yaw = Math.PI;
  const initialRoom = selectCameraRoom(ship.cameraRooms, player);
  assert.equal(initialRoom?.id, "ship-common-room");

  follow.reset({ ...player, role: "nephi" }, player.yaw, "streets");
  follow.update(
    1 / 60,
    { ...player, role: "nephi" },
    ship.solids,
    neutral,
    "streets",
    initialRoom,
  );

  // Walk out of common room to stairs at (6, 0, -29)
  const waypoints = [
    { x: 0, z: -29 },
    { x: 6, z: -29 },
    { x: 6, z: -41 }, // top of stairs on upper deck (y=4.2)
  ];
  for (const wp of waypoints) {
    for (let frame = 0; frame < 150; frame++) {
      const dx = wp.x - player.x,
        dz = wp.z - player.z;
      const dist = Math.hypot(dx, dz);
      stepPlayer(
        player,
        {
          x: dist > 0.1 ? -dx / dist : 0,
          y: dist > 0.1 ? dz / dist : 0,
          jump: false,
          jumpHeld: false,
          traversal: false,
        },
        1 / 60,
        0,
        ship.solids,
      );
      const room = selectCameraRoom(ship.cameraRooms, player, follow.roomId);
      follow.update(
        1 / 60,
        { ...player, role: "nephi" },
        ship.solids,
        neutral,
        "streets",
        room,
      );
    }
  }

  // Player has reached the upper deck (y=4.2, z=-41)
  assert.ok(player.y >= 4.1, `player reached upper deck: y=${player.y}`);
  // Room camera must be released
  assert.equal(follow.roomId, undefined, "room camera released on upper deck");
  // Camera must be above deck
  assert.ok(
    camera.position.y > 4.2,
    `camera restored above deck: cam.y=${camera.position.y}`,
  );
});

test("approaching the stairs from below deck maintains smooth camera without jumps", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: 0 });
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);

  // Player starts in cabin passage below deck (x=0, y=0, z=11)
  const player = createPlayer(0, 0, 11);
  player.yaw = -Math.PI / 2; // facing east towards stairs
  const initialRoom = selectCameraRoom(ship.cameraRooms, player);
  assert.equal(initialRoom?.id, "ship-fore-cabins");

  follow.reset({ ...player, role: "child" }, player.yaw, "streets");
  follow.update(
    1 / 60,
    { ...player, role: "child" },
    ship.solids,
    neutral,
    "streets",
    initialRoom,
  );

  const prevPos = camera.position.clone();
  // Walk east towards stairs (x from 0 to 6)
  for (let frame = 0; frame < 120; frame++) {
    stepPlayer(
      player,
      { x: -1, y: 0, jump: false, jumpHeld: false, traversal: false },
      1 / 60,
      0,
      ship.solids,
    );
    const room = selectCameraRoom(ship.cameraRooms, player, follow.roomId);
    follow.update(
      1 / 60,
      { ...player, role: "child" },
      ship.solids,
      neutral,
      "streets",
      room,
    );

    const dPos = camera.position.distanceTo(prevPos);
    assert.ok(
      dPos < 0.45,
      `camera jumped drastically at frame ${frame} while approaching stairs: delta=${dPos}`,
    );
    prevPos.copy(camera.position);
  }

  assert.ok(player.x > 5.0, `player reached stair landing: x=${player.x}`);
});
