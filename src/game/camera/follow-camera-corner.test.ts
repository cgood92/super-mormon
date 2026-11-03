import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { FollowCamera, cameraSegmentClear } from "./camera";
import { createPlayer, stepPlayer } from "../physics/physics";
import type { Solid } from "../physics/physics";

test("follow camera navigates around a building corner without getting stranded", () => {
  // A solid dwelling building corner adjacent to a corridor
  const house: Solid = { x: -27, y: 0, z: 31, w: 10, h: 5.1, d: 10 };
  const westWall: Solid = { x: -36, y: 0, z: 5.5, w: 0.9, h: 8, d: 69 };
  const solids: Solid[] = [westWall, house];

  const player = createPlayer(-33.8, 0, 32);
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);
  player.yaw = Math.PI;
  follow.reset(player, Math.PI, "streets");

  // Step north along the alley past the house corner at z = 26
  for (let i = 0; i < 68; i++) {
    stepPlayer(
      player,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      follow.yaw,
      solids,
    );
    follow.update(
      1 / 60,
      player,
      solids,
      { orbitX: 0, orbitY: 0, recenter: false },
      "streets",
    );
  }

  assert.ok(
    player.z < 26.0,
    `player must have cleared the house corner: z=${player.z}`,
  );

  // Turn east (+X) into the street for 200 frames (over 3 seconds of running)
  for (let frame = 0; frame < 200; frame++) {
    const previous = camera.position.clone();
    const inputX = -Math.cos(follow.yaw);
    const inputY = Math.sin(follow.yaw);
    stepPlayer(
      player,
      { x: inputX, y: inputY, jump: false, jumpHeld: false },
      1 / 60,
      follow.yaw,
      solids,
    );
    follow.update(
      1 / 60,
      player,
      solids,
      { orbitX: 0, orbitY: 0, recenter: false },
      "streets",
    );

    assert.ok(
      cameraSegmentClear(previous, camera.position, solids, 0.18),
      `swept eye entered solid on turn frame ${frame}`,
    );

    const dist = camera.position.distanceTo(
      new T.Vector3(player.x, player.y + 1, player.z),
    );
    assert.ok(
      dist < 8.0,
      `camera stranded behind corner at turn frame ${frame}: dist=${dist.toFixed(2)}m, cam=(${camera.position.x.toFixed(2)}, ${camera.position.z.toFixed(2)}), player=(${player.x.toFixed(2)}, ${player.z.toFixed(2)})`,
    );
  }

  // Camera must be trailing behind the player heading east (+X)
  assert.ok(
    camera.position.x < player.x - 4,
    `camera must follow behind east-running player: cam.x=${camera.position.x}, player.x=${player.x}`,
  );
  assert.ok(
    Math.abs(camera.position.z - player.z) < 1.0,
    `camera must align with the street: cam.z=${camera.position.z}, player.z=${player.z}`,
  );
  assert.ok(
    Math.abs(follow.yaw - Math.PI / 2) < 0.15,
    `camera yaw must settle behind east heading: yaw=${follow.yaw}`,
  );
});

test("in Jerusalem streets, camera smoothly navigates the western house corner past the date palm", async () => {
  const scene = new T.Scene();
  const world = (await import("../worlds/jerusalem/jerusalem")).buildJerusalem(
    "streets",
    scene,
  );
  try {
    const player = createPlayer(-33.8, 0, 32);
    player.yaw = Math.PI;
    const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
    const follow = new FollowCamera(camera);
    follow.reset(player, Math.PI, "streets");

    // Run north down the alley past the house corner at z = 26
    for (let frame = 0; frame < 70; frame++) {
      stepPlayer(
        player,
        { x: 0, y: 1, jump: false, jumpHeld: false },
        1 / 60,
        follow.yaw,
        world.solids,
      );
      follow.update(
        1 / 60,
        player,
        world.solids,
        { orbitX: 0, orbitY: 0, recenter: false },
        "streets",
      );
    }

    assert.ok(player.z < 26.0, `player cleared corner: z=${player.z}`);

    // Turn east into the street running past the date palm tree
    for (let frame = 0; frame < 180; frame++) {
      const previous = camera.position.clone();
      const inputX = -Math.cos(follow.yaw);
      const inputY = Math.sin(follow.yaw);
      stepPlayer(
        player,
        { x: inputX, y: inputY, jump: false, jumpHeld: false },
        1 / 60,
        follow.yaw,
        world.solids,
      );
      follow.update(
        1 / 60,
        player,
        world.solids,
        { orbitX: 0, orbitY: 0, recenter: false },
        "streets",
      );

      assert.ok(
        cameraSegmentClear(previous, camera.position, world.solids, 0.18),
        `swept eye entered solid in Jerusalem on turn frame ${frame}`,
      );

      const dist = camera.position.distanceTo(
        new T.Vector3(player.x, player.y + 1, player.z),
      );
      assert.ok(
        dist < 8.0,
        `camera stranded behind corner in Jerusalem at frame ${frame}: dist=${dist.toFixed(2)}m`,
      );
    }

    // Lehi is far out in the courtyard/street; camera must have followed
    assert.ok(
      camera.position.x > -26.0,
      `camera must have turned into the east-running street: cam.x=${camera.position.x}`,
    );
    assert.ok(
      camera.position.z < 26.0,
      `camera must have cleared the house corner: cam.z=${camera.position.z}`,
    );
  } finally {
    world.dispose?.();
  }
});
