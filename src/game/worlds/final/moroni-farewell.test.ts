import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildMoroniFarewell, MORONI_ROUTE } from "./moroni-farewell";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function setup() {
  const scene = new T.Scene(),
    world = buildMoroniFarewell(scene),
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
  function walk(x: number, z: number) {
    let i = 0;
    while (Math.hypot(p.x - x, p.z - z) > 0.3 && i++ < 3000) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        p,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      runtime.update(1 / 60, p, idle);
    }
    assert.ok(i < 3000, `blocked ${p.x},${p.y},${p.z} to ${x},${z}`);
  }
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
test("continuous inherited-record journey with physical bridge puzzle, shelter and dawn", () => {
  const h = setup();
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  h.runtime.update(0.01, h.p, { ...idle, interact: true });
  for (const p of MORONI_ROUTE.toLever) h.walk(p.x, p.z);
  assert.equal((h.runtime.snapshot() as any).carrying, true);
  h.runtime.update(0.01, h.p, { ...idle, interact: true });
  assert.equal((h.runtime.snapshot() as any).bridge, true);
  for (const p of MORONI_ROUTE.toShelter) h.walk(p.x, p.z);
  h.runtime.update(0.01, h.p, { ...idle, interact: true });
  assert.equal((h.runtime.snapshot() as any).written, true);
  for (const p of MORONI_ROUTE.toDawn) h.walk(p.x, p.z);
  assert.equal(h.completed, 1);
  for (const p of MORONI_ROUTE.discoveries) h.walk(p.x, p.z);
  assert.equal((h.runtime.snapshot() as any).discoveries.length, 3);
  assert.equal(h.completed, 1);
  h.world.dispose();
  assert.equal(h.scene.children.length, 0);
});
test("idle cannot finish, carrier attachment, checkpoint recovery and stopped callbacks", () => {
  const h = setup();
  for (let i = 0; i < 90; i++)
    h.runtime.update(0.05, h.p, { ...idle, interact: true });
  assert.equal(h.completed, 0);
  h.p.yaw = 1;
  h.runtime.update(0.01, h.p, idle);
  assert.equal(
    h.scene.getObjectByName("Inherited plates carrier")!.rotation.y,
    1,
  );
  h.p.y = -9;
  h.runtime.update(0.01, h.p, idle);
  assert.equal(h.p.z, 49);
  assert.equal((h.runtime.snapshot() as any).carrying, true);
  h.world.dispose();
  const s = h.runtime.snapshot();
  h.runtime.update(100, h.p, idle);
  assert.deepEqual(h.runtime.snapshot(), s);
});

test("bank blocks direct walking, broad stair detour and crossing have supported landings", () => {
  const h = setup();
  h.walk(0, 35);
  for (let i = 0; i < 180; i++)
    stepPlayer(
      h.p,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(h.p.z > 26, "high bank blocks ground approach");
  h.walk(0, 35);
  for (const p of MORONI_ROUTE.toLever) h.walk(p.x, p.z);
  h.runtime.update(0.01, h.p, { ...idle, interact: true });
  for (const p of MORONI_ROUTE.toShelter.slice(0, 5)) h.walk(p.x, p.z);
  for (let i = 0; i < 60; i++)
    stepPlayer(
      h.p,
      { x: 0, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(h.p.grounded && Math.abs(h.p.y - 3) < 0.01);
  h.world.dispose();
});
test("materials, geometry and instance buffers dispose once", () => {
  const h = setup();
  let geometry = 0,
    material = 0,
    instances = 0;
  const gs = new Set<T.BufferGeometry>(),
    ms = new Set<T.Material>();
  h.scene.traverse((o) => {
    if (o instanceof T.InstancedMesh)
      o.addEventListener("dispose", () => instances++);
    if (o instanceof T.Mesh) {
      gs.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        ms.add(m);
    }
  });
  for (const g of gs) g.addEventListener("dispose", () => geometry++);
  for (const m of ms) m.addEventListener("dispose", () => material++);
  h.world.dispose();
  h.world.dispose();
  assert.equal(geometry, gs.size);
  assert.equal(material, ms.size);
  assert.equal(instances, 1);
});
