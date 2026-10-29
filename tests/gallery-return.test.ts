import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { gallery } from "../src/super/conference-center";
import { galleryReturnSpawn } from "../src/super/gallery-entry";
import { createPlayer, stepPlayer } from "../src/super/physics";

test("story returns land safely in front of every painting with a walkable exit", () => {
  const world = gallery(new THREE.Scene());
  for (const portal of world.portals!) {
    const spawn = galleryReturnSpawn(world, portal.id);
    assert.equal(spawn.x, portal.x);
    assert.equal(spawn.z, portal.z + 3);
    assert.equal(spawn.yaw, 0);
    const player = createPlayer(spawn.x, spawn.y, spawn.z);
    for (let frame = 0; frame < 90; frame++) {
      stepPlayer(
        player,
        { x: 0, y: 1, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      Math.abs(player.y - spawn.y) < 0.1,
      `${portal.id}: return floor ${player.y}`,
    );
    assert.ok(player.z > spawn.z + 4, `${portal.id}: walk away from painting`);
  }
  assert.deepEqual(galleryReturnSpawn(world, undefined), world.spawn);
});
