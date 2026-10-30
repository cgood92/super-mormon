import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildJaredCrossing, CROSSING_TARGETS } from "./jared-crossing";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };
test("walk work aisles, secure supply, feed animals and safely cycle vent before landing", () => {
  const scene = new T.Scene(),
    w = buildJaredCrossing(scene),
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
  const press = () => r.update(0, p, { ...idle, interact: true });
  walk(CROSSING_TARGETS.supply.x, CROSSING_TARGETS.supply.z);
  press();
  walk(0, 8);
  walk(CROSSING_TARGETS.socket.x, CROSSING_TARGETS.socket.z);
  press();
  walk(0, 8);
  walk(CROSSING_TARGETS.fodder.x, CROSSING_TARGETS.fodder.z);
  press();
  walk(0, 8);
  walk(0, -9);
  walk(CROSSING_TARGETS.animals.x, CROSSING_TARGETS.animals.z);
  press();
  walk(0, -9);
  walk(0, 0);
  walk(8, 0);
  walk(8, -12);
  walk(CROSSING_TARGETS.vent.x, CROSSING_TARGETS.vent.z);
  while ((r.snapshot() as any).phase !== "calm") r.update(0.05, p, idle);
  press();
  for (let i = 0; i < 50; i++) r.update(0.05, p, idle);
  press();
  for (let i = 0; i < 1500; i++) r.update(0.05, p, idle);
  assert.equal((r.snapshot() as any).landed, true);
  walk(8, -12);
  walk(8, 0);
  walk(0, 0);
  walk(0, 23);
  walk(0, 37);
  assert.equal(done, 1);
  w.dispose();
  const s = r.snapshot();
  r.update(1, p, idle);
  assert.deepEqual(r.snapshot(), s);
  assert.equal(scene.children.length, 0);
});

test("storm retries are harmless and idle interaction cannot complete the crossing", () => {
  const scene = new T.Scene(),
    w = buildJaredCrossing(scene),
    p = createPlayer(0, 0, 8);
  let completed = 0;
  const r = w.adventure!({
    setAvatar() {},
    toast() {},
    dialog() {},
    complete() {
      completed++;
    },
  });
  for (let i = 0; i < 1500; i++) r.update(0.05, p, { ...idle, interact: true });
  assert.equal(completed, 0);
  assert.equal((r.snapshot() as any).landed, false);
  Object.assign(p, CROSSING_TARGETS.vent);
  while ((r.snapshot() as any).phase !== "calm") r.update(0.05, p, idle);
  r.update(0, p, { ...idle, interact: true });
  assert.equal((r.snapshot() as any).ventOpen, true);
  for (let i = 0; i < 250; i++) r.update(0.05, p, idle);
  assert.equal((r.snapshot() as any).ventOpen, false);
  assert.equal((r.snapshot() as any).missedWindows, 1);
  assert.equal((r.snapshot() as any).closedSafely, false);
  const elapsed = (r.snapshot() as any).elapsed;
  r.update(Infinity, p, idle);
  assert.equal((r.snapshot() as any).elapsed, elapsed);
  r.update(100, p, idle);
  assert.ok((r.snapshot() as any).elapsed - elapsed <= 0.051);
  const stoneObjects: T.Object3D[] = [];
  scene.traverse((o) => {
    if (o.name === "One stone at each vessel end") stoneObjects.push(o);
  });
  assert.equal(stoneObjects.length, 2);
  w.dispose();
  w.dispose();
  assert.equal(scene.children.length, 0);
});

test("work aisle obstacles block walking and instance buffers release on disposal", () => {
  const scene = new T.Scene(),
    w = buildJaredCrossing(scene),
    p = createPlayer(7, 0, 12);
  let instanceDisposed = 0,
    geometryDisposed = 0;
  scene.traverse((o) => {
    if (o instanceof T.InstancedMesh)
      o.addEventListener("dispose", () => instanceDisposed++);
    if (o instanceof T.Mesh)
      o.geometry.addEventListener("dispose", () => geometryDisposed++);
  });
  for (let i = 0; i < 160; i++)
    stepPlayer(
      p,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      w.solids,
    );
  assert.ok(p.z < 14.8, "provision stack blocks the aisle");
  for (let i = 0; i < 120; i++)
    stepPlayer(
      p,
      { x: 1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      w.solids,
    );
  assert.ok(p.x < 4, "central aisle bypass remains open");
  w.dispose();
  assert.equal(instanceDisposed, 1);
  assert.ok(geometryDisposed > 20);
  assert.ok(Object.isFrozen(CROSSING_TARGETS.vent));
});
