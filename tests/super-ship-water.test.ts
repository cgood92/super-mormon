import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildShip } from "../src/super/ship";
import { createPlayer, stepPlayer } from "../src/super/physics";
const water = [{ minX: -78, maxX: 63, minZ: -68, maxZ: -50, surfaceY: -0.35 }];
const idle = { x: 0, y: 0, jump: false, jumpHeld: false };
test("lower ship rooms and board seams stay dry over Bountiful water; open sea still swims", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: -40 });
  for (const z of [-55, -60, -60.5]) {
    const end = createPlayer(0, 0, z);
    for (let i = 0; i < 60; i++)
      stepPlayer(end, idle, 1 / 60, 0, ship.solids, [], water);
    assert.notEqual(end.move, "swim", `dry tapered lower hull at ${z}`);
    assert.equal(end.y, 0);
  }
  const player = createPlayer(0, 0, -55);
  for (let i = 0; i < 60; i++)
    stepPlayer(player, idle, 1 / 60, 0, ship.solids, [], water);
  assert.notEqual(player.move, "swim");
  assert.equal(player.y, 0);
  for (let i = 0; i < 70; i++)
    stepPlayer(player, { ...idle, y: 1 }, 1 / 60, 0, ship.solids, [], water);
  assert.ok(player.z > -50, "walks across the dry cabin board seams");
  assert.notEqual(player.move, "swim");
  const swimmer = createPlayer(20, 0, -55);
  stepPlayer(swimmer, idle, 1 / 60, 0, ship.solids, [], water);
  assert.equal(swimmer.move, "swim");
});
