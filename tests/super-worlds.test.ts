import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createPlayer,
  stepPlayer,
  type PlayerState,
} from "../src/super/physics";
import { buildWorld, type Solid, type WorldId } from "../src/super/worlds";

function world(id: WorldId) {
  const scene = new THREE.Scene();
  const data = buildWorld(id, scene);
  return { data, scene };
}

function go(
  player: PlayerState,
  x: number,
  z: number,
  solids: Solid[],
  within = 0.75,
) {
  let best = Infinity;
  let stalled = 0;
  for (let frame = 0; frame < 900; frame++) {
    const dx = x - player.x;
    const dz = z - player.z;
    const distance = Math.hypot(dx, dz);
    if (distance < within) return;
    const input = {
      x: -dx / distance,
      y: dz / distance,
      jump: false,
      jumpHeld: false,
    };
    stepPlayer(player, input, 1 / 60, 0, solids);
    if (distance < best - 0.08) {
      best = distance;
      stalled = 0;
    } else if (++stalled > 180) break;
  }
  assert.fail(
    `blocked en route to (${x}, ${z}) at (${player.x.toFixed(2)}, ${player.y.toFixed(2)}, ${player.z.toFixed(2)}), ${best.toFixed(2)} m away`,
  );
}

function standingClear(x: number, y: number, z: number, solids: Solid[]) {
  return solids.every(
    (s) =>
      x + 0.32 <= s.x - s.w / 2 ||
      x - 0.32 >= s.x + s.w / 2 ||
      z + 0.32 <= s.z - s.d / 2 ||
      z - 0.32 >= s.z + s.d / 2 ||
      y >= s.y + s.h - 0.0001 ||
      y + 1.65 <= s.y,
  );
}

test("house route reaches the upper gallery and every treasure has a clear approach", () => {
  const { data } = world("house");
  const player = createPlayer(data.spawn.x, data.spawn.y, data.spawn.z);
  // A complete path from the gate, up the real stairs, across the upper floor.
  for (const [x, z] of [
    [6.5, 16.5],
    [6.5, 7.2],
    [9, 2],
    [9, -4.2],
  ] as const)
    go(player, x, z, data.solids);
  go(player, 10.9, -4.8, data.solids, 0.25);
  assert.ok(player.y >= 3.25, `upper gallery feet are ${player.y}`);
  assert.ok(Math.hypot(player.x - 12.2, player.z + 5.9) < 2.1);
  const approaches: Record<string, [number, number, number]> = {
    silver: [-9, 0, -7.7],
    gold: [-10.4, 0, -15.6],
    "family-necklace": [-8, 0, 8],
    "fine-goods": [1, 0, -8.9],
    "upper-chest": [10.9, 3.28, -4.8],
  };
  for (const treasure of data.treasures ?? []) {
    const at = approaches[treasure.id];
    assert.ok(at, `approach defined for ${treasure.id}`);
    assert.ok(
      standingClear(...at, data.solids),
      `${treasure.id} approach intersects a wall or furniture`,
    );
    assert.ok(Math.hypot(treasure.x - at[0], treasure.z - at[2]) < 2.6);
  }
});

test("Jerusalem alley leads from spawn to Lehi’s door", () => {
  const { data } = world("streets");
  const player = createPlayer(data.spawn.x, data.spawn.y, data.spawn.z);
  for (const [x, z] of [
    [0, -7],
    [-20, -7],
    [-21.5, -15],
  ] as const)
    go(player, x, z, data.solids);
  assert.ok(Math.hypot(player.x - data.goal.x, player.z - data.goal.z) < 1);
});

test("Jerusalem roof stairs provide a climbable optional route", () => {
  const { data } = world("streets");
  const player = createPlayer(data.spawn.x, data.spawn.y, data.spawn.z);
  go(player, 8, 23, data.solids);
  go(player, 8, 9, data.solids);
  assert.ok(player.y >= 4.1, `roof landing feet are ${player.y}`);
});

test("palace allows approach to Laban and escape beyond the city gate", () => {
  const { data } = world("palace");
  const player = createPlayer(data.spawn.x, data.spawn.y, data.spawn.z);
  // The benches offer broad routes around either side during both legs.
  for (const [x, z] of [
    [9, 18],
    [9, -6],
    [0, -18],
  ] as const)
    go(player, x, z, data.solids, 1.3);
  assert.ok(player.y >= 0.39, `dais was not climbed: ${player.y}`);
  for (const [x, z] of [
    [-9, -6],
    [-9, 27],
    [0, 39],
  ] as const)
    go(player, x, z, data.solids);
  assert.ok(player.z > 28, "brothers should be beyond the gate");
});

test("palace cedar bench can be jumped during escape", () => {
  const { data } = world("palace");
  const player = createPlayer(-2, 0, -4);
  go(player, -2, -0.6, data.solids, 0.2);
  let rose = false;
  for (let frame = 0; frame < 85; frame++) {
    stepPlayer(
      player,
      { x: 0, y: 1, jump: frame === 0, jumpHeld: frame < 25 },
      1 / 60,
      0,
      data.solids,
    );
    if (player.y > 0.85) rose = true;
  }
  assert.ok(rose, "jump rises above the cedar bench");
  assert.ok(
    player.z > 4.1,
    `bench stopped the jump at z=${player.z.toFixed(2)}`,
  );
});

test("gallery paintings have reachable jump launch points close to their planes", () => {
  const { data } = world("hub");
  for (const portal of data.portals ?? []) {
    const side = portal.id === "trade" || portal.id === "night";
    assert.ok(
      standingClear(
        side ? portal.x - 0.7 : portal.x,
        0.18,
        side ? portal.z : portal.z + 0.6,
        data.solids,
      ),
    );
    const player = createPlayer(
      side ? portal.x - 1.3 : portal.x,
      0.18,
      side ? portal.z : portal.z + 1.3,
    );
    for (let frame = 0; frame < 20; frame++)
      stepPlayer(
        player,
        {
          x: side ? -1 : 0,
          y: side ? 0 : -1,
          jump: frame === 0,
          jumpHeld: true,
        },
        1 / 60,
        0,
        data.solids,
      );
    assert.ok(Math.hypot(player.x - portal.x, player.z - portal.z) < 1.2);
    assert.ok(player.y > 0.45, "jump should enter the painting trigger");
  }
});

test("gallery movement studio has an open left entry and solid practice surfaces", () => {
  const { data } = world("hub");
  const player = createPlayer(data.spawn.x, data.spawn.y, data.spawn.z);
  for (const [x, z] of [
    [-13, 10],
    [-22, 10],
    [-24, 13],
  ] as const)
    go(player, x, z, data.solids);
  assert.ok(player.x < -20.5, "player passed through the side-room entrance");
  assert.equal(data.tutorials?.length, 9);
  assert.ok(data.tutorials?.every((station) => station.x < -20.5));
  assert.ok(data.tokens?.every((token) => token.x < -20.5));
  assert.ok(data.delivery && data.delivery.x < -20.5);
  for (const portal of data.portals ?? [])
    assert.ok(
      data.solids.some(
        (solid) =>
          solid.h < 0.3 &&
          Math.abs(solid.x - portal.x) < (portal.x > 15 ? 1 : 0.1) &&
          Math.abs(solid.z - portal.z) < 2.5,
      ),
      `${portal.id} painting has a solid platform`,
    );
});

test("the treasure offer has an open route from Laban through the gate to the cave", () => {
  const { data } = world("trade");
  assert.ok(data.story?.cave);
  const player = createPlayer(data.spawn.x, 0, data.spawn.z);
  for (const [x, z] of [
    [0, 0],
    [0, -20],
    [0, 5],
    [0, 40],
    [-8, 50],
    [-8, 64],
  ] as const)
    go(player, x, z, data.solids, 1.3);
  assert.ok(Math.hypot(player.x + 8, player.z - 64) < 1.3);
});

test("night route reaches Laban, the treasury, plates and brothers", () => {
  const { data } = world("night");
  assert.ok(data.story?.treasury && data.story.plates);
  const player = createPlayer(data.spawn.x, 0, data.spawn.z);
  for (const [x, z] of [
    [0, 28],
    [0, 0],
    [-18, -12],
    [0, -12],
    [14, -17],
    [14, -22],
    [0, -12],
    [0, 28],
    [0, 43],
  ] as const)
    go(player, x, z, data.solids, 1.4);
  assert.ok(Math.hypot(player.x, player.z - 43) < 1.4);
});
