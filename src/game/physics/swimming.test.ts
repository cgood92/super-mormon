import test from "node:test";
import assert from "node:assert/strict";
import { createPlayer, stepPlayer, type SwimRegion } from "./physics";
const sea: SwimRegion = {
  minX: -12,
  maxX: 12,
  minZ: -20,
  maxZ: -2,
  surfaceY: -0.35,
};
const input = (y: number) => ({ x: 0, y, jump: false, jumpHeld: false });
test("shore entry floats with reduced movement, keeps head above water and returns to land", () => {
  const p = createPlayer(0, 0, 0);
  for (let i = 0; i < 150; i++)
    stepPlayer(p, input(-1), 1 / 60, 0, [], [], [sea]);
  assert.equal(p.move, "swim");
  assert.equal(p.grounded, false);
  assert.ok(p.y < -0.9 && p.y > -1.5);
  assert.ok(p.y + 1.65 > sea.surfaceY);
  assert.ok(p.runSpeed < 3);
  for (let i = 0; i < 400; i++)
    stepPlayer(p, input(1), 1 / 60, 0, [], [], [sea]);
  assert.ok(p.z > 0);
  assert.equal(p.y, 0);
  assert.equal(p.grounded, true);
});
test("swimming keeps physical obstacles solid and bounds offshore exploration", () => {
  const p = createPlayer(0, 0, -4);
  const wall = { x: 0, y: -2, z: -8, w: 12, h: 5, d: 1 };
  for (let i = 0; i < 600; i++)
    stepPlayer(p, input(-1), 1 / 60, 0, [wall], [], [sea]);
  assert.ok(p.z > -7.2);
  p.x = 9;
  for (let i = 0; i < 900; i++)
    stepPlayer(p, input(-1), 1 / 60, 0, [wall], [], [sea]);
  assert.ok(p.z >= sea.minZ + 0.31);
  assert.ok(p.y > -1.5);
  const deck = createPlayer(0, 4.2, -5);
  for (let i = 0; i < 20; i++)
    stepPlayer(
      deck,
      input(0),
      1 / 60,
      0,
      [{ x: 0, y: 4, z: -5, w: 10, h: 0.2, d: 10 }],
      [],
      [sea],
    );
  assert.notEqual(deck.move, "swim");
  assert.equal(deck.y, 4.2);
});
test("real stepped shore remains swimmable and permits walking back out", () => {
  const regions: SwimRegion[] = [
    { minX: -78, maxX: 63, minZ: -68, maxZ: -50, surfaceY: -0.35 },
  ];
  const solids = [
    { x: 0, y: -1, z: 20, w: 190, h: 1, d: 140 },
    { x: 0, y: -1.75, z: -52.5, w: 190, h: 1, d: 5 },
    { x: 0, y: -2.3, z: -58.5, w: 190, h: 1, d: 7 },
    { x: 0, y: -3.2, z: -66, w: 190, h: 1, d: 8 },
  ];
  const p = createPlayer(-27, 0, -48);
  for (let i = 0; i < 600; i++)
    stepPlayer(p, input(-1), 1 / 60, 0, solids, [], regions);
  assert.equal(p.move, "swim");
  assert.ok(p.z < -65, `offshore ${p.z}`);
  for (let i = 0; i < 650; i++)
    stepPlayer(p, input(1), 1 / 60, 0, solids, [], regions);
  assert.ok(p.z > -47, `return ${p.z}`);
  assert.equal(p.y, 0);
  assert.ok(p.grounded);
});
