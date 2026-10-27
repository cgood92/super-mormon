import assert from "node:assert/strict";
import test from "node:test";
import { createPlayer, stepPlayer, type Solid } from "../src/super/physics.ts";

const still = { x: 0, y: 0, jump: false, jumpHeld: false };
const water = [{ minX: -30, maxX: 30, minZ: -30, maxZ: 30, surfaceY: -0.35 }];
const floor: Solid = { x: 0, y: -0.4, z: 0, w: 10, h: 0.4, d: 10 };

test("a dry ship floor within the water region supports walking and landing", () => {
  for (const y of [0, 2]) {
    const player = createPlayer(0, y, 0);
    for (let i = 0; i < 120; i++)
      stepPlayer(player, still, 1 / 60, 0, [floor], [], water);
    assert.notEqual(player.move, "swim");
    assert.equal(player.y, 0);
    assert.equal(player.grounded, true);
  }
});

test("water beside the ship and above a submerged floor still requires swimming", () => {
  for (const [x, solids] of [
    [8, [floor]],
    [0, [{ ...floor, y: -2 }]],
  ] as const) {
    const player = createPlayer(x, 0, 0);
    stepPlayer(player, still, 1 / 60, 0, [...solids], [], water);
    assert.equal(player.move, "swim");
  }
});

test("a swimmer reaching a dry floor resumes walking", () => {
  const player = createPlayer(0, 0, 0);
  player.move = "swim";
  stepPlayer(player, still, 1 / 60, 0, [floor], [], water);
  assert.notEqual(player.move, "swim");
  assert.equal(player.grounded, true);
});

test("a player below the world's implicit ground recovers instead of falling forever", () => {
  const player = createPlayer(15, -0.05, 12);
  player.vy = -5;
  for (let i = 0; i < 60; i++) stepPlayer(player, still, 1 / 60, 0, []);
  assert.equal(player.y, 0);
  assert.equal(player.grounded, true);
});
