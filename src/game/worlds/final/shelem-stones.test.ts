import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildShelemStones, SHELEM_ROUTE } from "./shelem-stones";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };
test("sixteen prepared stones ascend continuously, illuminate once and return by east route", () => {
  const scene = new T.Scene(),
    w = buildShelemStones(scene),
    p = createPlayer(w.spawn.x, w.spawn.y, w.spawn.z);
  let done = 0;
  const r = w.adventure!({
    setAvatar() {},
    toast() {},
    dialog(_a, _b, _c, n) {
      n();
    },
    complete() {
      done++;
    },
  });
  const walk = (x: number, z: number) => {
    let n = 0;
    while (Math.hypot(p.x - x, p.z - z) > 0.3 && n++ < 3000) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        p,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        w.solids,
        w.climbables,
      );
      r.update(1 / 60, p, idle);
    }
    assert.ok(n < 3000, `blocked ${p.x},${p.y},${p.z} to ${x},${z}`);
  };
  assert.deepEqual(sceneryCollisionErrors(scene, w.solids), []);
  r.update(0, p, { ...idle, interact: true });
  for (const q of SHELEM_ROUTE.ascent) {
    walk(q.x, q.z);
    if (q.x === -16 && q.z === 5) {
      walk(-25, 5);
      walk(-16, 5);
    }
    if (q.x === 16 && q.z === -28) {
      walk(25, -28);
      walk(16, -28);
    }
  }
  assert.ok(p.y > 11.8);
  for (let i = 0; i < 240; i++) r.update(1 / 60, p, idle);
  assert.equal((r.snapshot() as any).illuminated, true);
  walk(10, -60);
  assert.equal((r.snapshot() as any).discoveries.length, 3);
  for (const q of SHELEM_ROUTE.return) walk(q.x, q.z);
  assert.equal(done, 1);
  r.update(1, p, idle);
  assert.equal(done, 1);
  w.dispose();
  const s = r.snapshot();
  r.update(100, p, idle);
  assert.deepEqual(r.snapshot(), s);
  assert.equal(scene.children.length, 0);
});

test("carrier recovery preserves all stones; shortcut warnings and disposed callbacks are safe", () => {
  const scene = new T.Scene(),
    w = buildShelemStones(scene),
    p = createPlayer(0, 0, 49);
  let complete = 0;
  let callbacks = 0;
  const r = w.adventure!({
    setAvatar() {},
    toast() {
      callbacks++;
    },
    dialog() {
      callbacks++;
    },
    complete() {
      complete++;
    },
  });
  r.update(0, p, { ...idle, interact: true });
  const before = (r.snapshot() as any).elapsed;
  r.update(Infinity, p, idle);
  assert.equal((r.snapshot() as any).elapsed, before);
  r.update(100, p, idle);
  assert.ok((r.snapshot() as any).elapsed - before <= 0.051);
  p.y = -5;
  r.update(0, p, idle);
  assert.equal((r.snapshot() as any).recoveries, 1);
  assert.equal((r.snapshot() as any).stones, 16);
  assert.equal((r.snapshot() as any).carrying, true);
  while ((r.snapshot() as any).elapsed % 12 < 7) r.update(0.05, p, idle);
  Object.assign(p, { x: -27.3, y: 4, z: -14 });
  r.update(0, p, idle);
  assert.equal((r.snapshot() as any).recoveries, 2);
  assert.equal(p.z, 49);
  assert.equal(complete, 0);
  w.dispose();
  const calls = callbacks;
  r.update(1, p, { ...idle, interact: true });
  assert.equal(callbacks, calls);
});
test("mountain buttress blocks passage and bypass works; optional ladder climbs and lands on terrace", () => {
  const w = buildShelemStones(new T.Scene()),
    p = createPlayer(26, 0, 36);
  for (let i = 0; i < 200; i++)
    stepPlayer(
      p,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      w.solids,
      w.climbables,
    );
  assert.ok(p.z < 45.3, "solid trunk blocks");
  const walk = (x: number, z: number) => {
    let n = 0;
    while (Math.hypot(p.x - x, p.z - z) > 0.3 && n++ < 3000) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        p,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        w.solids,
        w.climbables,
      );
    }
    assert.ok(n < 3000, `blocked ${p.x},${p.y},${p.z}`);
  };
  walk(30, 42);
  walk(30, 38);
  walk(-45, 34);
  walk(-45, 12);
  walk(-16, 38);
  walk(-16, 5);
  walk(-27.3, 5);
  walk(-27.3, -21.5);
  let climbed = false;
  for (let i = 0; i < 300; i++) {
    stepPlayer(
      p,
      { x: 0, y: climbed ? 1 : -1, jump: i === 0, jumpHeld: false },
      1 / 60,
      0,
      w.solids,
      w.climbables,
    );
    if (p.move === "climb") climbed = true;
    if (p.y > 11) break;
  }
  assert.ok(climbed);
  assert.ok(p.y > 8);
  stepPlayer(
    p,
    { x: -1, y: 0, jump: true, jumpHeld: false },
    1 / 60,
    0,
    w.solids,
    w.climbables,
  );
  walk(-24, -23);
  walk(-24, -27);
  for (let i = 0; i < 80; i++)
    stepPlayer(
      p,
      { x: 0, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      w.solids,
      w.climbables,
    );
  assert.ok(p.grounded && Math.abs(p.y - 8) < 0.01);
  w.dispose();
});

test("each mountain stair-to-terrace join has one visible and physical top owner", () => {
  const scene = new T.Scene(),
    w = buildShelemStones(scene);
  scene.updateMatrixWorld(true);
  for (const q of [
    { x: -16, y: 4, z: 8 },
    { x: 16, y: 8, z: -24.2 },
    { x: -16, y: 12, z: -56.2 },
    { x: 36, y: 12, z: -56.2 },
  ]) {
    const owners = w.solids.filter(
      (s) =>
        Math.abs(s.y + s.h - q.y) < 0.001 &&
        q.x > s.x - s.w / 2 &&
        q.x < s.x + s.w / 2 &&
        q.z > s.z - s.d / 2 &&
        q.z < s.z + s.d / 2,
    );
    assert.equal(
      owners.length,
      1,
      `physical top owners at ${JSON.stringify(q)}`,
    );
    const ray = new T.Raycaster(
      new T.Vector3(q.x, q.y + 2, q.z),
      new T.Vector3(0, -1, 0),
    );
    const hits = ray
      .intersectObjects(scene.children, true)
      .filter((hit) => Math.abs(hit.point.y - q.y) < 0.02);
    assert.equal(
      new Set(hits.map((hit) => hit.object)).size,
      1,
      `render top owners at ${JSON.stringify(q)}`,
    );
  }
  w.dispose();
});
