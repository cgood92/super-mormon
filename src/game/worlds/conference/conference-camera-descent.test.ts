import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { gallery, CONFERENCE_STAIRS } from "./conference-center";
import { FollowCamera, cameraSegmentClear } from "../../camera/camera";
import { createPlayer, stepPlayer } from "../../physics/physics";

for (const flight of CONFERENCE_STAIRS) {
  test(`camera follows a jump down the stairs from floor ${flight.y + 12}`, () => {
    const world = gallery(new T.Scene());
    try {
      const down = Math.sign(flight.startZ - flight.endZ);
      const player = createPlayer(
        flight.x,
        flight.y + 12,
        flight.endZ - down * 2,
      );
      player.yaw = down > 0 ? 0 : Math.PI;
      const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 320);
      const follow = new FollowCamera(camera);
      follow.reset(player, player.yaw, "conference");
      for (let frame = 0; frame < 480; frame++) {
        const moving = down * (flight.startZ + down * 3 - player.z) > 0;
        stepPlayer(
          player,
          {
            x: 0,
            y: moving ? down : 0,
            jump: frame === 0,
            jumpHeld: frame < 12,
          },
          1 / 60,
          0,
          world.solids,
        );
        follow.update(1 / 60, player, world.solids, undefined, "conference");
        assert.ok(
          cameraSegmentClear(
            camera.position,
            camera.position,
            world.solids,
            0.18,
          ),
          `embedded eye at frame ${frame}`,
        );
      }
      assert.ok(
        Math.abs(player.y - flight.y) < 0.1,
        `player did not reach lower landing: ${player.y}`,
      );
      assert.ok(
        camera.position.y < player.y + 6,
        `camera stranded at ${camera.position.y}, player ${player.y}`,
      );
      assert.ok(
        camera.position.distanceTo(
          new T.Vector3(player.x, player.y + 2, player.z),
        ) < 13,
        "camera must keep up after landing",
      );
    } finally {
      world.dispose?.();
    }
  });
}

for (const floor of [12, 24]) {
  test(`camera follows a sideways balcony jump into the stairwell at floor ${floor}`, () => {
    const world = gallery(new T.Scene());
    try {
      const side = floor === 12 ? -1 : 1;
      const player = createPlayer(side * 48, floor, 25);
      player.yaw = (side * Math.PI) / 2;
      const camera = new T.PerspectiveCamera(
        58,
        floor === 12 ? 9 / 16 : 16 / 9,
        0.08,
        320,
      );
      const follow = new FollowCamera(camera);
      follow.reset(player, player.yaw, "conference");
      for (let frame = 0; frame < 480; frame++) {
        const dx = side * 56 - player.x;
        stepPlayer(
          player,
          {
            x:
              Math.abs(dx) > 0.08
                ? -Math.sign(dx) * Math.min(1, Math.abs(dx))
                : 0,
            y: 0,
            jump: frame === 0,
            jumpHeld: frame < 12,
          },
          1 / 60,
          0,
          world.solids,
        );
        follow.update(1 / 60, player, world.solids, undefined, "conference");
        assert.ok(
          cameraSegmentClear(
            camera.position,
            camera.position,
            world.solids,
            0.18,
          ),
        );
      }
      assert.ok(
        player.y < floor - 4,
        `player must fall into stairwell: ${player.y}`,
      );
      assert.ok(
        camera.position.y < player.y + 6,
        `camera stranded at ${camera.position.y}; player ${player.y}`,
      );
      camera.updateMatrixWorld(true);
      for (const height of [0.1, 1.7]) {
        const ndc = new T.Vector3(
          player.x,
          player.y + height,
          player.z,
        ).project(camera);
        assert.ok(
          Math.abs(ndc.x) < 0.95 && Math.abs(ndc.y) < 0.95 && ndc.z < 1,
          "lower-floor view must frame the character",
        );
      }
    } finally {
      world.dispose?.();
    }
  });
}
