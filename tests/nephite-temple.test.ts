import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildJacobSherem } from "../src/super/jacob-sherem";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";

function walk(
  player: ReturnType<typeof createPlayer>,
  solids: ReturnType<typeof buildJacobSherem>["solids"],
  x: number,
  z: number,
) {
  for (
    let frame = 0;
    frame < 1800 && Math.hypot(player.x - x, player.z - z) > 0.35;
    frame++
  ) {
    const dx = x - player.x,
      dz = z - player.z,
      length = Math.hypot(dx, dz);
    stepPlayer(
      player,
      { x: -dx / length, y: dz / length, jump: false, jumpHeld: false },
      1 / 60,
      0,
      solids,
    );
  }
  assert.ok(
    Math.hypot(player.x - x, player.z - z) < 0.45,
    `blocked at ${player.x.toFixed(2)},${player.z.toFixed(2)} approaching ${x},${z}`,
  );
}

test("Solomon-pattern temple is discoverable, physically registered, and enterable by ordinary walking", () => {
  const scene = new T.Scene(),
    world = buildJacobSherem(scene);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  assert.ok(world.landmarks?.some((item) => item.name.includes("temple")));
  const player = createPlayer(0, 0, -17);
  for (const [x, z] of [
    [0, -34],
    [0, -37],
    [0, -41],
    [0, -48],
    [0, -58],
    [0, -72],
    [0, -75],
  ] as const)
    walk(player, world.solids, x, z);
  assert.ok(
    player.y >= 0.59 && player.y < 0.7,
    `temple floor support ${player.y}`,
  );
  const blocked = createPlayer(0, 0.6, -56);
  for (let i = 0; i < 120; i++)
    stepPlayer(
      blocked,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(blocked.x > -5.2, `side wall failed to block ${blocked.x}`);
  walk(player, world.solids, 0, -37);
  walk(player, world.solids, 3.5, -34);
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});

test("temple uses 60:20:30 proportions and omits an invented Ark", () => {
  const scene = new T.Scene(),
    world = buildJacobSherem(scene);
  const temple = scene.getObjectByName(
    "Nephi's temple · Solomon-pattern interpretation",
  )!;
  const floor = temple.getObjectByName(
    "Temple hall and inner-room floor",
  ) as T.Mesh;
  const wall = temple.getObjectByName("Temple solid side wall") as T.Mesh;
  assert.deepEqual([floor.scale.x, floor.scale.z, wall.scale.y], [12, 36, 18]);
  assert.equal(temple.getObjectByName("Ark"), undefined);
  assert.ok(
    temple.getObjectByName("Porch bronze pillar · Boaz (Solomon pattern)"),
  );
  assert.ok(
    temple.getObjectByName("Porch bronze pillar · Jachin (Solomon pattern)"),
  );
  world.dispose?.();
});
