import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { gallery } from "./conference-center";
import { galleryReturnSpawn } from "./gallery-entry";
import { createPlayer, stepPlayer } from "../../physics/physics";

test("story returns land safely in front of every painting with a walkable exit", () => {
  const world = gallery(new THREE.Scene());
  for (const portal of world.portals!) {
    const spawn = galleryReturnSpawn(world, portal.id);
    const side = portal.facing === "east" || portal.facing === "west";
    const direction = portal.facing === "east" ? -1 : 1;
    assert.equal(spawn.x, portal.x + (side ? direction * 3 : 0));
    assert.equal(spawn.z, portal.z + (side ? 0 : 3));
    assert.equal(spawn.yaw, side ? (direction * Math.PI) / 2 : 0);
    const player = createPlayer(spawn.x, spawn.y, spawn.z);
    for (let frame = 0; frame < 90; frame++) {
      stepPlayer(
        player,
        {
          x: side ? -direction : 0,
          y: side ? 0 : 1,
          jump: false,
          jumpHeld: false,
        },
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      Math.abs(player.y - spawn.y) < 0.1,
      `${portal.id}: return floor ${player.y}`,
    );
    assert.ok(
      side ? direction * (player.x - spawn.x) > 4 : player.z > spawn.z + 4,
      `${portal.id}: walk away from painting`,
    );
  }
  assert.deepEqual(galleryReturnSpawn(world, undefined), world.spawn);
  world.dispose?.();
});
