import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { gallery, CONFERENCE_ESCALATORS } from "../src/super/conference-center";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { canJumpIntoPainting } from "../src/super/gallery-entry";

test("Conference Center has eight reachable canvases and nine optional lessons", () => {
  const world = gallery(new THREE.Scene());
  assert.equal(world.portals?.length, 8);
  assert.equal(world.tutorials?.length, 9);
  for (const portal of world.portals!) {
    const player = createPlayer(world.spawn.x, 0, world.spawn.z);
    for (const target of [
      { x: portal.x, z: 36 },
      { x: portal.x, z: portal.z + 2 },
    ]) {
      for (let i = 0; i < 500; i++) {
        const dx = target.x - player.x,
          dz = target.z - player.z,
          distance = Math.hypot(dx, dz);
        if (distance < 0.12) break;
        stepPlayer(
          player,
          { x: -dx / distance, y: dz / distance, jump: false, jumpHeld: false },
          1 / 60,
          0,
          world.solids,
        );
      }
      assert.ok(
        Math.hypot(player.x - target.x, player.z - target.z) < 0.15,
        `spawn route to ${portal.id}`,
      );
    }
    let entered = false;
    for (let i = 0; i < 100; i++) {
      stepPlayer(
        player,
        { x: 0, y: -1, jump: i === 30, jumpHeld: i >= 30 && i < 45 },
        1 / 60,
        0,
        world.solids,
      );
      entered ||= canJumpIntoPainting(player, portal);
    }
    assert.ok(entered, portal.id);
  }
  world.dispose?.();
  world.dispose?.();
});

test("escalators physically walk to all three floors and the roof without jumping", () => {
  const world = gallery(new THREE.Scene());
  for (const flight of CONFERENCE_ESCALATORS) {
    const direction = Math.sign(flight.endZ - flight.startZ);
    const player = createPlayer(
      flight.x,
      flight.y,
      flight.startZ - direction * 1.5,
    );
    let highest = player.y;
    for (let i = 0; i < 440; i++) {
      stepPlayer(
        player,
        { x: 0, y: direction, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      highest = Math.max(highest, player.y);
    }
    assert.ok(
      highest >= flight.y + 11.95,
      `flight ${flight.y}: ${JSON.stringify({ x: player.x, y: player.y, z: player.z })}`,
    );
  }
  world.dispose?.();
});

test("spawn connects through foyer landings to auditorium levels and roof", () => {
  const world = gallery(new THREE.Scene());
  const player = createPlayer(world.spawn.x, 0, world.spawn.z);
  function walk(x: number, z: number, y: number) {
    for (let i = 0; i < 1200; i++) {
      const dx = x - player.x,
        dz = z - player.z;
      if (Math.hypot(dx, dz) < 0.16) break;
      const length = Math.hypot(dx, dz);
      stepPlayer(
        player,
        { x: -dx / length, y: dz / length, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      Math.hypot(player.x - x, player.z - z) < 0.2,
      `route to ${x},${y},${z}: ${player.x},${player.y},${player.z}`,
    );
    assert.ok(Math.abs(player.y - y) < 0.32, `floor ${y}: ${player.y}`);
  }
  walk(30, 36, 0);
  walk(30, 4, 0);
  walk(0, 4, 0);
  walk(0, -2, 0);
  walk(0, 4, 0);
  walk(30, 4, 0);
  walk(30, 36, 0);
  walk(-5, 36, 0);
  walk(-5, 47, 0);
  walk(-56, 47, 0);
  walk(-56, 0, 12);
  walk(0, 0, 12);
  walk(0, -2, 12);
  walk(0, 0, 12);
  walk(56, 0, 12);
  walk(56, 47, 24);
  walk(5, 47, 24);
  walk(5, 4, 24);
  walk(0, -2, 24);
  walk(5, 4, 24);
  walk(-46, 4, 24);
  walk(-46, 47, 24);
  walk(-56, 47, 24);
  walk(-56, -1, 36);
  world.dispose?.();
});

test("moving escalator belts carry grounded feet and leave air and nearby halls alone", async () => {
  const { advanceEscalator } = await import("../src/super/conference-center");
  const player = { x: -56, y: 0.3, z: 39.5, grounded: true };
  assert.equal(advanceEscalator(player, 0.1), true);
  assert.ok(player.z < 39.5);
  const airborne = { ...player, grounded: false };
  assert.equal(advanceEscalator(airborne, 0.1), false);
  const hall = { x: 0, y: 0, z: 30, grounded: true };
  assert.equal(advanceEscalator(hall, 0.1), false);
  assert.equal(advanceEscalator(player, -1), false);
});

test("roof shaft rails stop ordinary walking while the north arrival stays open", () => {
  const world = gallery(new THREE.Scene());
  for (const start of [
    { x: -46, z: 20, input: { x: 1, y: 0 } },
    { x: -66, z: 20, input: { x: -1, y: 0 } },
    { x: -56, z: 43, input: { x: 0, y: -1 } },
  ]) {
    const player = createPlayer(start.x, 36, start.z);
    for (let i = 0; i < 180; i++)
      stepPlayer(
        player,
        { ...start.input, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(
      player.y >= 35.99,
      `roof edge retained feet: ${player.x},${player.y},${player.z}`,
    );
    assert.ok(
      player.x >= -48.59 || player.x <= -63.41 || player.z >= 40.41,
      "rail blocks shaft",
    );
  }
  const arrival = createPlayer(-56, 36, -2);
  for (let i = 0; i < 50; i++)
    stepPlayer(
      arrival,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(arrival.z > 0, "north arrival has no cross rail");
  world.dispose?.();
});

test("upper foyer shaft guards meet their floor edges on both sides", () => {
  const world = gallery(new THREE.Scene());
  for (const y of [12, 24])
    for (const [x, dx] of [
      [48, 1],
      [-48, -1],
      [64, -1],
      [-64, 1],
    ]) {
      const player = createPlayer(x, y, 20);
      for (let i = 0; i < 180; i++)
        stepPlayer(
          player,
          { x: -dx, y: 0, jump: false, jumpHeld: false },
          1 / 60,
          0,
          world.solids,
        );
      assert.ok(player.y >= y - 0.01, `level ${y} from ${x}: ${player.y}`);
    }
  world.dispose?.();
});

test("ground building walls stop ordinary walking out of the building", () => {
  const world = gallery(new THREE.Scene());
  for (const [x, z, dx, dz] of [
    [88, 30, 1, 0],
    [-88, 30, -1, 0],
    [78, -102, 0, -1],
    [10, 52, 0, 1],
  ]) {
    const player = createPlayer(x, 0, z);
    for (let i = 0; i < 180; i++)
      stepPlayer(
        player,
        { x: -dx, y: dz, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(
      Math.abs(player.x) < 90 && player.z > -105 && player.z < 55,
      JSON.stringify(player),
    );
  }
  world.dispose?.();
});

test("auditorium foyer wall keeps its central and side doorways open on all floors", () => {
  const world = gallery(new THREE.Scene());
  for (const y of [0, 12, 24]) {
    const wall = createPlayer(30, y, 0);
    for (let i = 0; i < 90; i++)
      stepPlayer(
        wall,
        { x: 0, y: -1, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(wall.z > -1.5, `boundary at level ${y}`);
    for (const x of [-56, 0, 56]) {
      const doorway = createPlayer(x, y, -0.5);
      for (let i = 0; i < 35; i++)
        stepPlayer(
          doorway,
          { x: 0, y: -1, jump: false, jumpHeld: false },
          1 / 60,
          0,
          world.solids,
        );
      assert.ok(doorway.z < -2.4, `open door ${x},${y}: ${doorway.z}`);
    }
  }
  world.dispose?.();
});

test("movement studio near spawn has a walk-in doorway and contains every practice activity", () => {
  const world = gallery(new THREE.Scene());
  assert.deepEqual(world.practiceBounds, {
    minX: -87,
    maxX: -69,
    minZ: 4,
    maxZ: 39,
  });
  for (const activity of [
    ...world.tutorials!,
    ...world.tokens!,
    ...world.carryables!,
    world.delivery!,
  ]) {
    assert.ok(activity.x >= -87 && activity.x <= -69);
    assert.ok(activity.z >= 4 && activity.z <= 39);
  }
  const player = createPlayer(world.spawn.x, 0, world.spawn.z);
  function walk(x: number, z: number) {
    for (let i = 0; i < 1500; i++) {
      const dx = x - player.x,
        dz = z - player.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.12) break;
      stepPlayer(
        player,
        {
          x: -dx / length,
          y: dz / length,
          jump: false,
          jumpHeld: false,
        },
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      Math.hypot(player.x - x, player.z - z) < 0.18,
      `studio walk to ${x},${z}: ${player.x},${player.y},${player.z}`,
    );
    assert.ok(Math.abs(player.y) < 0.1, "walk remains on ground floor");
  }
  // Cross behind the escalator, then enter through the open welcome space.
  for (const [x, z] of [
    [-5, 36],
    [-5, 47],
    [-65, 47],
    [-65, 31],
    [-67, 31],
    [-69.5, 31],
    [-74, 31],
    [-69.5, 35],
    [-74, 35],
    [-80, 35],
    [-80, 23],
    [-72, 23],
    [-72, 8],
    [-81, 6],
  ])
    walk(x, z);
  world.dispose?.();
});
