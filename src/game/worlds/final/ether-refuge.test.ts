import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildEtherRefuge, ETHER_ROUTE } from "./ether-refuge";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { x: 0, y: 0, interact: false, interactHeld: false, crouch: true };
function setup() {
  const scene = new T.Scene(),
    world = buildEtherRefuge(scene),
    p = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let completed = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    dialog(_k, _t, _b, n) {
      n();
    },
    complete() {
      completed++;
    },
  });
  const walk = (x: number, z: number, crouch = true) => {
    let i = 0;
    while (Math.hypot(p.x - x, p.z - z) > 0.35 && i++ < 3000) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        p,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false, crouch },
        1 / 60,
        0,
        world.solids,
      );
      runtime.update(1 / 60, p, { ...idle, crouch });
    }
    assert.ok(i < 3000, `blocked ${p.x},${p.z} to ${x},${z}`);
  };
  return {
    scene,
    world,
    p,
    runtime,
    walk,
    get completed() {
      return completed;
    },
  };
}
test("continuous night observation routes, return writing and optional places", () => {
  const h = setup();
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  for (let i = 0; i < 100; i++)
    h.runtime.update(0.05, h.p, { ...idle, interact: true });
  assert.equal(h.completed, 0);
  for (const p of ETHER_ROUTE.west) h.walk(p.x, p.z);
  for (const p of ETHER_ROUTE.east) h.walk(p.x, p.z);
  for (const p of ETHER_ROUTE.discoveries) h.walk(p.x, p.z);
  h.walk(0, 47);
  h.runtime.update(0.01, h.p, { ...idle, interact: true });
  assert.equal(h.completed, 1);
  assert.equal((h.runtime.snapshot() as any).discoveries.length, 3);
  h.runtime.update(0.05, h.p, { ...idle, interact: true });
  assert.equal(h.completed, 1);
  h.world.dispose();
  assert.equal(h.scene.children.length, 0);
});
test("exposed movement raises awareness; fair recovery and disposed callbacks", () => {
  const h = setup();
  Object.assign(h.p, { x: 0, z: 0 });
  for (let i = 0; i < 70; i++)
    h.runtime.update(0.05, h.p, { ...idle, crouch: false });
  assert.ok((h.runtime.snapshot() as any).recoveries > 0);
  assert.equal(h.p.z, 47);
  h.world.dispose();
  const s = h.runtime.snapshot();
  h.runtime.update(99, h.p, idle);
  assert.deepEqual(h.runtime.snapshot(), s);
});

test("ruin walls block walking, covered detour and stairs provide real support", () => {
  const h = setup();
  h.walk(-18, 47);
  h.walk(-18, 24);
  h.walk(-18, 0);
  for (let i = 0; i < 150; i++)
    stepPlayer(
      h.p,
      { x: 1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(h.p.x > -19.2, "ruin wall blocks direct movement");
  h.walk(-18, 24);
  h.walk(-29, 24);
  h.walk(-29, -18);
  h.walk(-18, -17.4);
  h.walk(-18, -29);
  for (let i = 0; i < 60; i++)
    stepPlayer(
      h.p,
      { x: 0, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(
    h.p.grounded && Math.abs(h.p.y - 2) < 0.01,
    "landed on fitted lookout terrace",
  );
  h.world.dispose();
});
test("crouching lowers open-court awareness and cover clears it", () => {
  const h = setup();
  Object.assign(h.p, { x: 0, y: 0, z: 0 });
  for (let i = 0; i < 10; i++)
    h.runtime.update(0.05, h.p, { ...idle, crouch: false });
  const standing = (h.runtime.snapshot() as any).awareness;
  Object.assign(h.p, { x: 29, y: 0, z: 0 });
  for (let i = 0; i < 20; i++) h.runtime.update(0.05, h.p, idle);
  assert.equal((h.runtime.snapshot() as any).awareness, 0);
  Object.assign(h.p, { x: 0, y: 0, z: 0 });
  for (let i = 0; i < 10; i++) h.runtime.update(0.05, h.p, idle);
  assert.ok((h.runtime.snapshot() as any).awareness < standing / 3);
  const elapsed = (h.runtime.snapshot() as any).elapsed;
  h.runtime.update(Infinity, h.p, idle);
  assert.equal((h.runtime.snapshot() as any).elapsed, elapsed);
  h.world.dispose();
});
