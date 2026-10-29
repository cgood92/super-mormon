import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildShip } from "./ship.ts";
import { createPlayer, stepPlayer } from "../../physics/physics.ts";

const still = { x: 0, y: 0, jump: false, jumpHeld: false, traversal: false };
function walk(
  player: ReturnType<typeof createPlayer>,
  solids: ReturnType<typeof buildShip>["solids"],
  z: number,
  frames: number,
) {
  for (let i = 0; i < frames; i++)
    stepPlayer(player, { ...still, y: z }, 1 / 60, 0, solids);
}

test("the shared vessel translates geometry, collision and destinations together", () => {
  const a = buildShip(new T.Group(), { x: 0, y: 0, z: 0 });
  const b = buildShip(new T.Group(), { x: 0, y: 0, z: -40 });
  assert.equal(a.solids.length, b.solids.length);
  a.solids.forEach((solid, i) =>
    assert.deepEqual(b.solids[i], { ...solid, z: solid.z - 40 }),
  );
  assert.equal(b.points.helm.z, a.points.helm.z - 40);
  assert.ok(a.solids.every((s) => s.y >= -0.035));
  assert.ok(
    a.solids.some((s) => s.y === -0.035 && Math.abs(s.y + s.h) < 1e-8),
    "lower deck has physical board thickness below its dry walking surface",
  );
  assert.equal(a.climbables[0].height, 14);
});

test("walking reaches the upper deck through stairs without jumping and returns below", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: 0 });
  const p = createPlayer(6, 0, 11.5);
  walk(p, ship.solids, -1, 130);
  assert.ok(p.z < -1, `stopped at ${p.z}, height ${p.y}`);
  assert.ok(Math.abs(p.y - 4.2) < 0.02, `height ${p.y}`);
  walk(p, ship.solids, 0, 20);
  walk(p, ship.solids, 1, 150);
  walk(p, ship.solids, 0, 30);
  assert.ok(p.z > 11, `stopped at ${p.z}`);
  assert.ok(p.y < 0.02, `height ${p.y}`);
});

test("the aft cabin has a standing-height doorway from the common room", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: 0 });
  const p = createPlayer(-1.15, 0, 9);
  walk(p, ship.solids, 1, 55);
  assert.ok(p.z > 13.5);
  assert.equal(p.crouching, false);
});
