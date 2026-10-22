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

test("gallery paintings have reachable jump launch points close to their planes", () => {
  const { data } = world("hub");
  for (const portal of data.portals ?? []) {
    const side = portal.facing === "east";
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
          Math.abs(
            solid.x - (portal.facing === "east" ? portal.x - 0.6 : portal.x),
          ) <
            solid.w / 2 &&
          Math.abs(
            solid.z - (portal.facing === "east" ? portal.z : portal.z + 0.6),
          ) <
            solid.d / 2,
      ),
      `${portal.id} painting has a solid platform`,
    );
});

test("all four Jerusalem visits preserve exact city and palace collision geometry", () => {
  const base = world("streets").data;
  for (const id of ["palace", "trade", "night"] as const) {
    const data = world(id).data;
    assert.deepEqual(data.solids, base.solids);
    assert.deepEqual(data.bounds, base.bounds);
  }
});

test("shared streets reach Lehi's indigo door and optional roof stairs", () => {
  const { data } = world("streets");
  const player = createPlayer(data.spawn.x, 0, data.spawn.z);
  for (const [x, z] of [
    [-12, 25],
    [-19.5, 25],
    [-19.5, -15],
    [-21, -15],
  ])
    go(player, x, z, data.solids, 0.3);
  assert.ok(Math.hypot(player.x - data.goal.x, player.z - data.goal.z) < 1);
  const climber = createPlayer(12, 0, 25);
  for (const [x, z] of [
    [19, 25],
    [19, 10],
  ])
    go(climber, x, z, data.solids, 0.3);
  assert.ok(climber.y >= 4.1);
});

test("audience hall has an accessible dais and two ground-level exits into the city", () => {
  for (const id of ["palace", "trade"] as const)
    for (const west of [false, true]) {
      const { data } = world(id);
      const p = createPlayer(data.spawn.x, 0, data.spawn.z);
      for (const [x, z] of [
        [12, 25],
        [12, 6],
        [6, 6],
        [6, -6],
        [0, -6],
        [0, -15],
        [0, -18],
      ])
        go(p, x, z, data.solids, 0.3);
      assert.ok(p.y >= 0.79);
      const route = west
        ? [
            [-6, -14],
            [-15, -14],
            [-15, -6],
            [-19.5, -6],
            [-19.5, 25],
            [0, 25],
          ]
        : [
            [0, -14],
            [0, -6],
            [6, -6],
            [6, 6],
            [12, 6],
            [12, 25],
            [0, 25],
          ];
      for (const [x, z] of [
        ...route,
        [0, 40],
        [0, 46],
        [-8, 54],
        [-8, 62],
        [-8, 72],
      ])
        go(p, x, z, data.solids, 0.3);
      assert.ok(p.y < 0.05);
    }
});

test("night Laban is in the city; Zoram and plates occupy the separate palace treasury", () => {
  const { data } = world("night");
  assert.ok(data.story?.treasury && data.story.plates);
  const p = createPlayer(data.spawn.x, 0, data.spawn.z);
  for (const [x, z] of [
    [0, 40],
    [0, 25],
    [-19.5, 25],
    [-19.5, -6],
    [-15, -6],
    [-15, -14],
    [-6, -14],
    [6, -14],
    [10, -14],
    [14, -14],
    [14, -21],
    [14, -24],
    [14, -21],
    [14, -14],
    [6, -14],
    [0, -14],
    [0, -6],
    [6, -6],
    [6, 6],
    [12, 6],
    [12, 25],
    [0, 25],
    [0, 43],
  ]) {
    go(p, x, z, data.solids, 0.3);
    assert.ok(p.y < 0.05, "Zoram can follow the entire route on foot");
  }
  assert.ok(data.story.laban.z > -9);
  for (const point of [data.story.treasury, data.story.plates])
    assert.ok(point.x > 8 && point.z < -18);
});

test("Jerusalem actors and deep cave have full standing clearance within bounds", () => {
  for (const id of ["streets", "palace", "trade", "night"] as const) {
    const { data } = world(id);
    for (const p of [
      data.spawn,
      ...Object.values(data.story ?? {}),
      ...(data.pursuers ?? []),
    ]) {
      assert.ok(
        standingClear(p.x, p.y, p.z, data.solids),
        `${id} actor at ${p.x},${p.z} overlaps scenery`,
      );
      assert.ok(
        p.x > data.bounds!.minX &&
          p.x < data.bounds!.maxX &&
          p.z > data.bounds!.minZ &&
          p.z < data.bounds!.maxZ,
      );
    }
    for (const z of [59, 64, 69, 72, 75])
      for (const y of [0, 3]) assert.ok(standingClear(-8, y, z, data.solids));
  }
});
