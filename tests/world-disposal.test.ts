import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildWorld, type WorldId } from "../src/super/worlds";

for (const id of ["hub", "house", "streets", "tree"] satisfies WorldId[]) {
  test(`${id} releases rendered shadow textures exactly once`, () => {
    const scene = new T.Scene();
    const world = buildWorld(id, scene);
    let targets = 0;
    let releases = 0;
    scene.traverse((object) => {
      if (
        !(
          object instanceof T.DirectionalLight ||
          object instanceof T.SpotLight ||
          object instanceof T.PointLight
        ) ||
        !object.castShadow
      )
        return;
      for (const key of ["map", "mapPass"] as const) {
        const target = new T.WebGLRenderTarget(1, 1);
        target.addEventListener("dispose", () => releases++);
        object.shadow[key] = target;
        targets++;
      }
    });
    assert.ok(targets > 0, "world should include a shadow-casting light");
    world.dispose?.();
    assert.equal(releases, targets);
    world.dispose?.();
    assert.equal(
      releases,
      targets,
      "repeated disposal must not release targets twice",
    );
    assert.equal(scene.children.length, 0);
  });
}

for (const id of ["bountiful", "broken-bow"] satisfies WorldId[]) {
  test(`${id} releases tent rope geometry and material exactly once`, () => {
    const scene = new T.Scene();
    const world = buildWorld(id, scene);
    let count = 0,
      released = 0;
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    scene.traverse((o) => {
      if (o instanceof T.LineSegments) {
        count++;
        geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          materials.add(m);
      }
    });
    for (const g of geometries) g.addEventListener("dispose", () => released++);
    for (const m of materials) m.addEventListener("dispose", () => released++);
    assert.ok(count > 0);
    world.dispose?.();
    assert.equal(released, geometries.size + materials.size);
    world.dispose?.();
    assert.equal(released, geometries.size + materials.size);
  });
}
