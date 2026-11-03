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

test("a completed balcony drop immediately moves a stale upper-floor eye to the lower floor", () => {
  const world = gallery(new T.Scene());
  try {
    const player = createPlayer(-56, 12, 25);
    player.yaw = 0;
    const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 320);
    const follow = new FollowCamera(camera);
    follow.reset(player, player.yaw, "conference");

    // This is the state just after physics resolves a drop through the open stairwell.
    player.y = 0;
    player.grounded = true;
    follow.update(1 / 60, player, world.solids, undefined, "conference");

    assert.ok(
      camera.position.y < player.y + 5,
      `camera stayed upstairs at ${camera.position.y}; player ${player.y}`,
    );
    assert.ok(
      cameraSegmentClear(camera.position, camera.position, world.solids, 0.22),
      "recovered eye must be physically clear",
    );
  } finally {
    world.dispose?.();
  }
});

test("entering the auditorium lowers camera under balcony and follows player without getting stuck", () => {
  const world = gallery(new T.Scene());
  try {
    const player = createPlayer(0, 0, 2);
    player.yaw = Math.PI;
    const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 320);
    const follow = new FollowCamera(camera);
    follow.reset(player, player.yaw, "conference");

    for (let frame = 0; frame < 180; frame++) {
      player.z -= 0.2;
      // Raked center aisle profile
      if (player.z <= -6.4 && player.z >= -13.6) {
        const i = Math.min(7, Math.floor((-6.4 - player.z) / 0.9));
        player.y = (i + 1) * 0.3;
      } else if (player.z < -13.6 && player.z >= -20) {
        player.y = 2.4;
      } else if (player.z < -20 && player.z >= -46) {
        player.y = Math.max(0, 2.4 - (-20 - player.z) * 0.04);
      } else if (player.z < -46) {
        player.y = 0;
      }

      follow.update(1 / 60, player, world.solids, undefined, "conference");

      assert.ok(
        cameraSegmentClear(camera.position, camera.position, world.solids, 0.18),
        `embedded eye at frame ${frame}, pos=(${camera.position.x}, ${camera.position.y}, ${camera.position.z})`,
      );

      // Under the balcony (z <= -10), camera must be safely under the ceiling (y < 4.45)
      // and cannot falsely signal obstruction or trigger Q/C camera cue flashing.
      if (player.z <= -6 && camera.position.z <= -4) {
        assert.equal(
          follow.obstructed,
          false,
          `camera marked obstructed at frame ${frame}, pos=(${camera.position.x}, ${camera.position.y}, ${camera.position.z})`,
        );
      }
      if (player.z <= -15 && camera.position.z <= -8) {
        assert.ok(
          camera.position.y <= 4.45,
          `camera too high under balcony: y=${camera.position.y}`,
        );
      }
    }

    // Player reached z = -34; camera must have followed into the auditorium
    assert.ok(
      camera.position.z < -20,
      `camera got stuck outside auditorium: cam.z=${camera.position.z}`,
    );
    const dist = camera.position.distanceTo(
      new T.Vector3(player.x, player.y + 1, player.z),
    );
    assert.ok(
      dist < 12,
      `camera must stay close to player, was ${dist}m away`,
    );
  } finally {
    world.dispose?.();
  }
});

test("walking straight into the auditorium while holding forward does not veer sideways or flash Q/C", () => {
  const world = gallery(new T.Scene());
  try {
    const player = createPlayer(0, 0, 4);
    player.yaw = Math.PI;
    const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 320);
    const follow = new FollowCamera(camera);
    follow.reset(player, player.yaw, "conference");

    for (let frame = 0; frame < 240; frame++) {
      const input = { x: 0, y: 1, jump: false, jumpHeld: false };
      stepPlayer(player, input, 1 / 60, follow.yaw, world.solids);
      follow.update(
        1 / 60,
        player,
        world.solids,
        {
          orbitX: 0,
          orbitY: 0,
          recenter: false,
          zoom: 0,
          movementIntent: true,
        },
        "conference",
      );

      // Once the player has entered the auditorium aisle (z <= -1.0), camera must not be obstructed
      // and player must not drift sideways into the chairs (x should stay close to 0).
      if (player.z <= -1.0) {
        assert.equal(
          follow.obstructed,
          false,
          `camera obstructed in auditorium aisle at frame ${frame}`,
        );
        assert.ok(
          Math.abs(player.x) < 0.5,
          `player drifted sideways in auditorium aisle: x=${player.x}`,
        );
        assert.ok(
          Math.abs(follow.yaw - Math.PI) < 0.05,
          `camera yaw drifted: ${((follow.yaw * 180) / Math.PI).toFixed(1)}°`,
        );
      }
    }
  } finally {
    world.dispose?.();
  }
});
