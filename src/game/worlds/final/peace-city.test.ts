import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildPeaceCity, peaceCityRoute } from "./peace-city";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";

test("peace city requires physical assembly, supplied bridge crossing, and survives disposal", () => {
  const scene = new T.Scene(),
    world = buildPeaceCity(scene);
  let completed = 0;
  const runtime = world.adventure!({
    toast() {},
    dialog(_k, _t, _b, next) {
      next();
    },
    setAvatar() {},
    complete() {
      completed++;
    },
  });
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  const tick = (interact = false) =>
    runtime.update(1 / 60, player, {
      x: 0,
      y: 0,
      interact,
      interactHeld: interact,
    });
  const walk = (x: number, z: number) => {
    for (let n = 0; n < 1800; n++) {
      const dx = x - player.x,
        dz = z - player.z,
        d = Math.hypot(dx, dz);
      if (d < 0.15) return;
      stepPlayer(
        player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      tick();
    }
    assert.fail(`blocked en route to ${x},${z} at ${player.x},${player.z}`);
  };
  for (let n = 0; n < 120; n++) tick(true);
  assert.equal(completed, 0);
  for (const beam of peaceCityRoute.beams) {
    walk(-8, 0);
    walk(-8, beam.z + 5);
    walk(beam.x, beam.z + 5);
    walk(beam.x, beam.z);
    tick(true);
    walk(beam.x, beam.z + 5);
    walk(-8, beam.z + 5);
    walk(-8, 0);
    walk(-3, 0);
    tick(true);
  }
  assert.equal((runtime.snapshot() as any).assembled, 2);
  walk(-8, 0);
  walk(-8, 12);
  walk(peaceCityRoute.supply.x, peaceCityRoute.supply.z);
  tick(true);
  // Ford access alone cannot satisfy the required bridge crossing.
  walk(-8, 22);
  walk(8, 22);
  walk(8, 0);
  walk(14, 0);
  tick(true);
  assert.equal(completed, 0);
  walk(8, 0);
  walk(3, 0);
  walk(-3, 0);
  walk(3, 0);
  walk(14, 0);
  tick(true);
  assert.equal(completed, 1);
  tick(true);
  assert.equal(completed, 1);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  runtime.dispose();
  world.dispose!();
  tick(true);
  assert.equal(completed, 1);
  assert.equal(scene.children.length, 0);
});

test("roof circuit, optional courts, blocked walls and trunks, safe carried retry", () => {
  const scene = new T.Scene(),
    world = buildPeaceCity(scene);
  let completed = 0;
  const runtime = world.adventure!({
    toast() {},
    dialog(_k, _t, _b, next) {
      next();
    },
    setAvatar() {},
    complete() {
      completed++;
    },
  });
  const player = createPlayer(-8, 0, 7);
  const tick = (interact = false) =>
    runtime.update(1000, player, {
      x: 0,
      y: 0,
      interact,
      interactHeld: interact,
    });
  const walk = (x: number, z: number) => {
    for (let n = 0; n < 1800; n++) {
      const dx = x - player.x,
        dz = z - player.z,
        d = Math.hypot(dx, dz);
      if (d < 0.13) return;
      stepPlayer(
        player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      tick();
    }
    assert.fail(`route blocked ${x},${z}: ${player.x},${player.y},${player.z}`);
  };
  walk(-8, -9);
  walk(-20, -9);
  walk(-20, -14);
  tick(true);
  assert.equal((runtime.snapshot() as any).carrying, 0);
  player.y = -4;
  tick();
  assert.equal((runtime.snapshot() as any).carrying, undefined);
  assert.equal(player.x, -8);
  walk(-8, 22);
  walk(-24, 22);
  assert.ok((runtime.snapshot() as any).discoveries.includes(1));
  walk(-28, 22);
  walk(-28, 26);
  walk(-32, 26);
  walk(-32, 3);
  walk(-29.6, 3);
  walk(-29.6, 1);
  walk(-29.6, -4.85);
  walk(-27.5, -4.85);
  walk(-25.7, -4.85);
  walk(-25.7, -6);
  assert.ok(player.y > 3);
  assert.ok((runtime.snapshot() as any).discoveries.includes(0));
  // The roof has a real landing and continuous support through to the workshop.
  walk(-25.7, -12);
  assert.ok(player.y > 3);
  // Ground-level trunk blocks a straight line; a broad surrounding lane remains clear.
  Object.assign(player, createPlayer(-10, 0, -19));
  for (let n = 0; n < 120; n++)
    stepPlayer(
      player,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(player.z > -21.3);
  walk(-7, -20);
  walk(-7, -25);
  walk(7, -25);
  walk(28, -25);
  walk(28, -17);
  walk(27, -17);
  assert.ok((runtime.snapshot() as any).discoveries.includes(2));
  Object.assign(player, createPlayer(17, 0, -9));
  for (let n = 0; n < 120; n++)
    stepPlayer(
      player,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(
    player.z > -17,
    "workshop back/side walls cannot be walked through",
  );
  assert.equal(completed, 0);
  let disposedGeometry = 0;
  scene.traverse((o) => {
    if (o instanceof T.Mesh)
      o.geometry.addEventListener("dispose", () => disposedGeometry++);
  });
  world.dispose!();
  world.dispose!();
  tick(true);
  assert.ok(disposedGeometry > 20);
  assert.equal(scene.children.length, 0);
});
