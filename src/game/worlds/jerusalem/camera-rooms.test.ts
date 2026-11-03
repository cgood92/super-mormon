import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildJerusalem, JERUSALEM_PALACE_ROOMS } from "./jerusalem.ts";
import { createPlayer, stepPlayer } from "../../physics/physics.ts";
import { FollowCamera, cameraSegmentClear } from "../../camera/camera.ts";
import { StoryMeshObstacles } from "../../camera/cinematic.ts";
import { selectCameraRoom } from "../../camera/camera-rooms.ts";

test("palace room anchors occupy clear volumes and see their actual doorways", () => {
  const world = buildJerusalem("palace", new T.Scene());
  try {
    assert.equal(JERUSALEM_PALACE_ROOMS.length, 4);
    const geometry = new StoryMeshObstacles(world.actorParent, []);
    const doors: Record<
      string,
      { entry: [number, number][]; exit: [number, number][] }
    > = {
      "palace-west-passage": {
        entry: [
          [-15, -9.6],
          [-12.8, -14],
        ],
        exit: [
          [-15, -8.3],
          [-11.2, -14],
        ],
      },
      "palace-audience": {
        entry: [
          [-11.2, -14],
          [0, -9.6],
          [7.2, -14],
        ],
        exit: [
          [-12.8, -14],
          [0, -8.3],
          [8.8, -14],
        ],
      },
      "palace-treasury-entry": {
        entry: [
          [8.8, -14],
          [14, -17.5],
          [14, -9.6],
        ],
        exit: [
          [7.2, -14],
          [14, -18.5],
          [14, -8.3],
        ],
      },
      "palace-treasury": {
        entry: [[14, -18.5]],
        exit: [[14, -17.5]],
      },
    };
    for (const room of JERUSALEM_PALACE_ROOMS) {
      const door = doors[room.id];
      assert.ok(door, `unrecognized palace room ${room.id}`);
      for (const kind of ["entry", "exit"] as const) {
        const eyes = kind === "entry" ? room.entryEyes : room.exitEyes;
        assert.equal(eyes.length, door[kind].length);
        for (let i = 0; i < eyes.length; i++) {
          const eye = new T.Vector3().copy(eyes[i]);
          const [x, z] = door[kind][i];
          const focus = new T.Vector3(x, 1, z);
          assert.ok(
            cameraSegmentClear(eye, eye, world.solids, 0.28),
            `${room.id} ${kind}${i} intersects solid`,
          );
          assert.ok(
            geometry.clear(eye, eye, 0.28),
            `${room.id} ${kind}${i} intersects opaque geometry`,
          );
          assert.ok(
            cameraSegmentClear(eye, focus, world.solids, 0.03),
            `${room.id} ${kind}${i} cannot see doorway`,
          );
          assert.ok(
            geometry.clear(eye, focus),
            `${room.id} ${kind}${i} opaque doorway sightline`,
          );
        }
      }
    }
  } finally {
    world.dispose?.();
  }
});

test("a player can walk from the city spawn around the west corner through the palace rooms", () => {
  const world = buildJerusalem("palace", new T.Scene());
  try {
    assert.ok(JERUSALEM_PALACE_ROOMS.length);
    const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
    let active: string | undefined;
    const visited = new Set<string>();
    const waypoints = [
      [-15, 25],
      [-15, 5],
      [-15, -6],
      [-15, -12],
      [-15, -14],
      [-10.5, -14],
      [-6, -14],
      [2, -14],
      [6, -14],
      [11, -14],
      [14, -14],
      [14, -21],
    ];
    for (const [x, z] of waypoints) {
      let reached = false;
      for (let frame = 0; frame < 900; frame++) {
        const dx = x - player.x,
          dz = z - player.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 0.12 && player.runSpeed < 0.2) {
          reached = true;
          break;
        }
        const gain = Math.min(1, distance * 0.8);
        stepPlayer(
          player,
          {
            x: distance > 0.05 ? (-dx / distance) * gain : 0,
            y: distance > 0.05 ? (dz / distance) * gain : 0,
            jump: false,
            jumpHeld: false,
          },
          1 / 60,
          0,
          world.solids,
        );
        active = selectCameraRoom(JERUSALEM_PALACE_ROOMS, player, active)?.id;
        if (visited.size)
          assert.ok(
            active,
            `room view dropped inside doorway at ${player.x},${player.z}`,
          );
        if (active) visited.add(active);
      }
      assert.ok(
        reached,
        `route blocked toward ${x},${z} at ${player.x},${player.z}`,
      );
    }
    assert.deepEqual(
      [...visited],
      [
        "palace-west-passage",
        "palace-audience",
        "palace-treasury-entry",
        "palace-treasury",
      ],
    );
    assert.equal(active, "palace-treasury");
  } finally {
    world.dispose?.();
  }
});

test("room following frames an actual palace doorway route out and back on desktop and phone", () => {
  for (const aspect of [16 / 9, 9 / 16]) {
    const world = buildJerusalem("palace", new T.Scene());
    try {
      const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
      player.yaw = world.spawn.yaw ?? 0;
      const camera = new T.PerspectiveCamera(58, aspect, 0.08, 200);
      const follow = new FollowCamera(camera);
      follow.reset(player, player.yaw);
      const outward = [
        [-15, 25],
        [-15, 5],
        [-15, -6],
        [-15, -12],
        [-15, -14],
        [-10.5, -14],
        [-6, -14],
        [2, -14],
        [6, -14],
        [11, -14],
        [14, -14],
        [14, -21],
      ];
      const waypoints = [
        ...outward,
        ...outward.slice(0, -1).reverse(),
        [world.spawn.x, world.spawn.z],
      ];
      let active: string | undefined;
      let transitions = 0;
      let frameCount = 0;
      for (const [x, z] of waypoints) {
        let reached = false;
        for (let frame = 0; frame < 900; frame++) {
          const dx = x - player.x,
            dz = z - player.z;
          const distance = Math.hypot(dx, dz);
          if (distance < 0.12 && player.runSpeed < 0.2) {
            reached = true;
            break;
          }
          const gain = Math.min(1, distance * 0.8);
          stepPlayer(
            player,
            {
              x: distance > 0.05 ? (-dx / distance) * gain : 0,
              y: distance > 0.05 ? (dz / distance) * gain : 0,
              jump: false,
              jumpHeld: false,
            },
            1 / 60,
            0,
            world.solids,
          );
          const room = selectCameraRoom(JERUSALEM_PALACE_ROOMS, player, active);
          const changed = room?.id !== active;
          const previous = camera.position.clone();
          follow.update(1 / 60, player, world.solids, undefined, "hub", room);
          const context = `aspect ${aspect} frame ${frameCount} room ${room?.id} player ${player.x},${player.z} eye ${camera.position.toArray()}`;
          assert.ok(
            cameraSegmentClear(
              camera.position,
              camera.position,
              world.solids,
              0.18,
            ),
            `embedded eye: ${context}`,
          );
          if (!changed)
            assert.ok(
              cameraSegmentClear(previous, camera.position, world.solids, 0.18),
              `eye crossed solid between room cuts: ${context}`,
            );
          if (room) {
            const b = room.bounds;
            assert.ok(
              camera.position.x >= b.minX + 0.55 - 1e-5 &&
                camera.position.x <= b.maxX - 0.55 + 1e-5 &&
                camera.position.z >= b.minZ + 0.55 - 1e-5 &&
                camera.position.z <= b.maxZ - 0.55 + 1e-5,
              `eye escaped padded room bounds: ${context}`,
            );
          }
          if (changed) {
            transitions++;
            camera.updateMatrixWorld(true);
            for (const height of [0.05, 1.65]) {
              const ndc = new T.Vector3(
                player.x,
                player.y + height,
                player.z,
              ).project(camera);
              assert.ok(
                Math.abs(ndc.x) < 1 &&
                  Math.abs(ndc.y) < 1 &&
                  ndc.z > -1 &&
                  ndc.z < 1,
                `door crossing clips ${height === 0.05 ? "feet" : "head"} NDC ${ndc.toArray()}: ${context}`,
              );
            }
          }
          active = room?.id;
          frameCount++;
        }
        assert.ok(
          reached,
          `camera route blocked at aspect ${aspect}: ${player.x},${player.z} toward ${x},${z}`,
        );
      }
      assert.equal(
        transitions,
        8,
        `all four room handoffs should occur outbound and inbound at aspect ${aspect}`,
      );
      assert.equal(active, undefined);
    } finally {
      world.dispose?.();
    }
  }
});

test("streets and palace modes entering Laban's palace south doorway keep line of sight without wall stranding or control reversal", () => {
  for (const mode of ["streets", "palace", "trade", "night"] as const) {
    const world = buildJerusalem(mode, new T.Scene());
    try {
      const player = createPlayer(0, 0, -5);
      player.yaw = Math.PI;
      const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
      const follow = new FollowCamera(camera);
      follow.reset(player, player.yaw);

      // Walk north into the palace to z = -14
      for (let step = 0; step < 90; step++) {
        stepPlayer(
          player,
          { x: 0, y: 1, jump: false, jumpHeld: false },
          1 / 60,
          follow.yaw,
          world.solids,
        );
        follow.update(1 / 60, player, world.solids, undefined, "hub", undefined);
        assert.ok(
          cameraSegmentClear(
            camera.position,
            camera.position,
            world.solids,
            0.18,
          ),
          `${mode}: embedded eye at step ${step}: ${camera.position.toArray()}`,
        );
        // Ensure no 180-degree flip occurs (angular difference from North PI is small)
        const yawDiff = Math.abs(
          Math.atan2(Math.sin(follow.yaw - Math.PI), Math.cos(follow.yaw - Math.PI)),
        );
        assert.ok(
          yawDiff < 0.35,
          `${mode}: follow.yaw reversed control orientation: ${(follow.yaw * 180) / Math.PI}°`,
        );
      }
      assert.ok(player.z < -12, `${mode}: player should be inside palace: z=${player.z}`);
      assert.ok(
        camera.position.z < -7.5,
        `${mode}: camera must stay with player inside palace: cam.z=${camera.position.z}`,
      );

      // Turn west behind the palace south wall
      for (let step = 0; step < 60; step++) {
        stepPlayer(
          player,
          { x: -1, y: 0, jump: false, jumpHeld: false },
          1 / 60,
          follow.yaw,
          world.solids,
        );
        follow.update(1 / 60, player, world.solids, undefined, "hub", undefined);
        assert.ok(
          cameraSegmentClear(
            camera.position,
            camera.position,
            world.solids,
            0.18,
          ),
          `${mode}: embedded eye while turning west: ${camera.position.toArray()}`,
        );
      }
      assert.ok(player.x < -4, `${mode}: player turned west: x=${player.x}`);
      assert.ok(
        camera.position.z < -8.5,
        `${mode}: camera must remain inside palace with player: cam.z=${camera.position.z}`,
      );
    } finally {
      world.dispose?.();
    }
  }
});

