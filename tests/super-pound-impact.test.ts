import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPoundImpact } from "../src/super/pound-impact";
test("ground-pound dust reuses one effect, fades away, and disposes once", () => {
  const scene = new T.Scene(),
    effect = createPoundImpact(scene),
    group = scene.children[0];
  const meshes = group.children as T.Mesh[];
  let geometryDisposed = 0,
    materialDisposed = 0;
  meshes[0].geometry.addEventListener("dispose", () => geometryDisposed++);
  (meshes[0].material as T.Material).addEventListener(
    "dispose",
    () => materialDisposed++,
  );
  assert.equal(group.visible, false);
  effect.trigger({ x: 3, y: 2, z: -1 });
  effect.update(0.1);
  assert.equal(group.visible, true);
  assert.equal(group.position.x, 3);
  const extent = Math.abs(meshes[0].position.x);
  effect.update(0.1);
  assert.ok(Math.abs(meshes[0].position.x) > extent);
  effect.trigger({ x: 0, y: 0, z: 0 });
  assert.equal(scene.children.length, 1);
  assert.equal(group.children.length, 8);
  effect.update(1);
  assert.equal(group.visible, false);
  effect.dispose();
  effect.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(geometryDisposed, 1);
  assert.equal(materialDisposed, 1);
});
