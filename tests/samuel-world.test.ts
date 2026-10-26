import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
import { buildSamuelWall } from "../src/super/samuel-wall";
import {
  SAMUEL_CLIMB,
  SAMUEL_EXIT,
  SAMUEL_SPAWN,
  SAMUEL_WALL,
} from "../src/super/samuel-layout";

const input = (dx = 0, dz = 0, jump = false, jumpHeld = jump) => ({
  x: -dx,
  y: dz,
  jump,
  jumpHeld,
  traversal: false,
});

test("Samuel climbs every exterior stone by ordinary jumps and lands outside", () => {
  const scene = new T.Scene();
  const world = buildSamuelWall(scene);
  const player = createPlayer(SAMUEL_SPAWN.x, SAMUEL_SPAWN.y, SAMUEL_SPAWN.z);
  const tick = (dx = 0, dz = 0, jump = false, jumpHeld = jump) =>
    stepPlayer(player, input(dx, dz, jump, jumpHeld), 1 / 60, 0, world.solids);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  for (let i = 0; i < 180; i++) {
    const dz = SAMUEL_CLIMB[0].z - player.z;
    tick(0, Math.max(-1, Math.min(1, dz)));
  }
  assert.ok(
    player.grounded && player.y < 0.05,
    "approach begins at ground level",
  );
  for (const [index, target] of SAMUEL_CLIMB.entries()) {
    // Walk to the edge of the current stone before each jump, just as a player
    // would. This avoids granting impossible midair starting positions.
    if (index > 0) {
      const from = SAMUEL_CLIMB[index - 1];
      const dx = target.x - from.x,
        dz = target.z - from.z;
      const distance = Math.hypot(dx, dz);
      const edge = index === SAMUEL_CLIMB.length - 1 ? 0.48 : 0.72;
      const launch = {
        x: from.x + (dx / distance) * edge,
        z: from.z + (dz / distance) * edge,
      };
      for (let frame = 0; frame < 60; frame++) {
        const tx = launch.x - player.x,
          tz = launch.z - player.z;
        const d = Math.hypot(tx, tz);
        tick(d > 0.2 ? tx / d : 0, d > 0.2 ? tz / d : 0);
        if (d < 0.2 && Math.hypot(player.vx, player.vz) < 0.35) break;
      }
      assert.ok(
        player.grounded && player.y >= from.y - 0.05,
        `preparing jump ${index + 1} stays on stone`,
      );
    }
    let reached = false;
    for (let attempt = 0; attempt < 5 && !reached; attempt++) {
      for (let frame = 0; frame < 90; frame++) {
        const dx = target.x - player.x;
        const dz = target.z - player.z;
        const d = Math.hypot(dx, dz);
        const jumping = frame === 0 || (player.ledge && frame > 10);
        tick(
          d > 0.22 ? dx / d : 0,
          d > 0.22 ? dz / d : 0,
          !!jumping,
          frame < 16,
        );
        if (player.grounded && player.y >= target.y - 0.05 && d < 0.9) {
          reached = true;
          break;
        }
      }
    }
    assert.ok(
      reached,
      `jump ${index + 1} reached ${JSON.stringify(player)} toward ${JSON.stringify(target)}`,
    );
    for (let frame = 0; frame < 45; frame++) {
      const dx = target.x - player.x,
        dz = target.z - player.z;
      const d = Math.hypot(dx, dz);
      tick(d > 0.16 ? dx / d : 0, d > 0.16 ? dz / d : 0);
      if (d < 0.16 && Math.hypot(player.vx, player.vz) < 0.35) break;
    }
    assert.ok(
      player.grounded && player.y >= target.y - 0.05,
      `settling on jump ${index + 1} keeps support`,
    );
  }
  assert.ok(
    player.y >= SAMUEL_WALL.top - 0.05,
    "sermon takes place on wall top",
  );
  // The wall cannot be passed through from the exterior at ground level.
  const blocked = createPlayer(8, 0, 5);
  for (let i = 0; i < 100; i++)
    stepPlayer(blocked, input(0, -1), 1 / 60, 0, world.solids);
  assert.ok(blocked.z > SAMUEL_WALL.d / 2);
  // A visitor can still enter the open city streets by walking around the
  // end of this wall section; no invisible perimeter collider closes it off.
  for (const destination of [
    { x: 8, z: 6 },
    { x: 32, z: 6 },
    { x: 32, z: -10 },
    { x: 15, z: -10 },
  ]) {
    for (let frame = 0; frame < 420; frame++) {
      const dx = destination.x - blocked.x;
      const dz = destination.z - blocked.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6) break;
      stepPlayer(blocked, input(dx / d, dz / d), 1 / 60, 0, world.solids);
    }
    assert.ok(
      Math.hypot(destination.x - blocked.x, destination.z - blocked.z) < 0.7,
      `walk around wall reaches ${JSON.stringify(destination)}`,
    );
  }
  // Once the vigil is over, any clear exterior segment supports a safe jump down.
  for (let i = 0; i < 220; i++) {
    const dx = SAMUEL_EXIT.x - player.x;
    const dz = SAMUEL_EXIT.z - player.z;
    const d = Math.hypot(dx, dz);
    tick(d > 0.3 ? dx / d : 0, d > 0.3 ? dz / d : 0, i === 0);
  }
  assert.ok(player.grounded && player.y < 0.05);
  assert.ok(Math.hypot(player.x - SAMUEL_EXIT.x, player.z - SAMUEL_EXIT.z) < 2);
  world.dispose?.();
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});

test("Samuel's wall owns a single visible top, while the surroundings stay explorable", () => {
  const scene = new T.Scene();
  const world = buildSamuelWall(scene);
  const wall = scene.getObjectByName("Samuel solid city wall");
  assert.ok(wall instanceof T.Mesh);
  scene.updateMatrixWorld(true);
  const ray = new T.Raycaster(
    new T.Vector3(-10, 30, 0),
    new T.Vector3(0, -1, 0),
  );
  const hits = ray.intersectObject(wall);
  assert.equal(
    hits.filter((hit) => Math.abs(hit.point.y - SAMUEL_WALL.top) < 0.01).length,
    1,
  );
  assert.ok(world.solids.length < 100, "keeps collision workload bounded");
  assert.ok(world.bounds && world.bounds.maxZ > 25 && world.bounds.minZ < -25);
  world.dispose?.();
});
