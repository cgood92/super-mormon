import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildSignsNight, SIGNS_ROUTE } from "../src/super/signs-night";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };

test("town route uses real stairs and movement; optional exploration and sign complete once", () => {
  const scene = new T.Scene(),
    world = buildSignsNight(scene);
  let complete = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    dialog(_k, _t, _b, next) {
      next();
    },
    complete() {
      complete++;
    },
  });
  const p = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  for (let i = 0; i < 100; i++)
    runtime.update(0.1, p, { ...idle, interact: true });
  assert.equal((runtime.snapshot() as any).stage, 0);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  const walk = (x: number, z: number) => {
    let frames = 0;
    while (Math.hypot(x - p.x, z - p.z) > 0.4 && frames++ < 1800) {
      const dx = x - p.x,
        dz = z - p.z,
        n = Math.hypot(dx, dz);
      stepPlayer(
        p,
        { x: -dx / n, y: dz / n, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      runtime.update(1 / 60, p, idle);
    }
    assert.ok(
      frames < 1800,
      `blocked at ${p.x},${p.y},${p.z} heading ${x},${z}`,
    );
  };
  for (const point of SIGNS_ROUTE.slice(0, 7)) walk(point.x, point.z);
  assert.ok(p.y > 3.8, "landed on solid overlook");
  assert.equal((runtime.snapshot() as any).stage, 3);
  for (let i = 0; i < 80; i++) runtime.update(0.1, p, idle);
  assert.equal((runtime.snapshot() as any).signVisible, true);
  walk(0, -26);
  walk(0, 12);
  assert.equal(complete, 1);
  for (let i = 0; i < 20; i++)
    runtime.update(0.1, p, { ...idle, interact: true });
  assert.equal(complete, 1);
  walk(-10, 12);
  walk(-20, 34);
  walk(-29, 34);
  walk(-29, 26.5);
  assert.ok(
    (runtime.snapshot() as any).discoveries.includes("Potter's courtyard"),
  );
  assert.ok(
    (runtime.snapshot() as any).discoveries.includes("Roof bridge vista"),
  );
  // Rear wall blocks a straight walk, while the open front is reachable.
  const blocked = createPlayer(18, 0, -17);
  for (let i = 0; i < 180; i++)
    stepPlayer(
      blocked,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(blocked.z < -12, "home wall is solid");
  runtime.dispose();
  const before = runtime.snapshot();
  world.dispose!();
  world.dispose!();
  runtime.update(100, p, idle);
  assert.deepEqual(runtime.snapshot(), before);
  assert.equal(scene.children.length, 0);
});

test("pending conversations cannot repeat and callbacks after disposal are harmless", () => {
  const world = buildSignsNight(new T.Scene());
  let count = 0;
  let next = () => {};
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_k, _t, _b, cb) {
      count++;
      next = cb;
    },
  });
  const p = createPlayer(2, 0, 12);
  runtime.update(0.1, p, { ...idle, interact: true });
  runtime.update(0.1, p, { ...idle, interact: true });
  assert.equal(count, 1);
  runtime.dispose();
  next();
  runtime.update(0.1, p, { ...idle, interact: true });
  assert.equal(count, 1);
  world.dispose!();
});

test("Nephi and every inhabitant stand on support without being buried in scenery", () => {
  const scene = new T.Scene(),
    world = buildSignsNight(scene);
  const names = [
    "Nephi, son of Nephi, grandson of Helaman",
    "Concerned parent",
    "Rooftop watcher",
    "Garden keeper",
    "Potter",
    "Weaver",
    "Terrace watcher",
  ];
  for (const name of names) {
    const actor = scene.getObjectByName(name);
    assert.ok(actor, `${name} exists`);
    const { x, y, z } = actor.position;
    assert.ok(
      world.solids.some(
        (s) =>
          Math.abs(x - s.x) < s.w / 2 &&
          Math.abs(z - s.z) < s.d / 2 &&
          Math.abs(y - (s.y + s.h)) < 0.01,
      ),
      `${name} has physical foot support at ${y}`,
    );
    assert.ok(
      !world.solids.some(
        (s) =>
          Math.abs(x - s.x) < s.w / 2 + 0.3 &&
          Math.abs(z - s.z) < s.d / 2 + 0.3 &&
          s.y < y + 1.6 &&
          s.y + s.h > y + 0.05,
      ),
      `${name} has clear standing space`,
    );
  }
  assert.equal(scene.getObjectByName(names[0])!.position.y, 4);
  world.dispose!();
});
