import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildLehontiMountain, ANTIPAS_ROUTE } from "./lehonti-mountain";

// Adjacent full-height trail boxes formerly shared overlapping outward walls.
// Sample the middle of a straight run, away from corners and triangle edges.
test("Antipas brown terrace walls have one visible owner at overlapping steps", () => {
  const scene = new T.Scene();
  const world = buildLehontiMountain(scene);
  scene.updateMatrixWorld(true);
  const point = ANTIPAS_ROUTE[3];
  const ray = new T.Raycaster(
    new T.Vector3(point.x + 2.5, 0.4, point.z + 12),
    new T.Vector3(0, 0, -1),
    0,
    15,
  );
  const hits = ray
    .intersectObject(scene, true)
    .filter((hit) => /Mount Antipas walkable spiral/.test(hit.object.name));
  const coincident = hits.filter(
    (hit) => Math.abs(hit.point.z - (point.z + 2.85)) < 0.01,
  );
  assert.equal(
    coincident.length,
    1,
    "overlapping vertical brown walls must be removed, not depth-biased",
  );
  world.dispose?.();
});

test("Antipas terrace tops match their support without duplicate floor hits", () => {
  const scene = new T.Scene();
  const world = buildLehontiMountain(scene);
  scene.updateMatrixWorld(true);
  const terrace = scene.getObjectByName(
    "Mount Antipas walkable spiral terraces",
  ) as T.Mesh;
  const supports = terrace.userData.scenery.solids as {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
  }[];
  for (const p of ANTIPAS_ROUTE) {
    // Avoid triangle diagonals and authored post positions.
    const x = p.x + 0.137,
      z = p.z + 0.213;
    const expected = Math.max(
      ...supports
        .filter(
          (s) => Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2,
        )
        .map((s) => s.y + s.h),
    );
    const ray = new T.Raycaster(
      new T.Vector3(x, 100, z),
      new T.Vector3(0, -1, 0),
    );
    const hits = ray.intersectObject(terrace);
    assert.equal(hits.length, 1, "each walk surface has one visible owner");
    assert.ok(
      Math.abs(hits[0].point.y - expected) < 0.0001,
      "visible top matches the physical terrace",
    );
  }
  assert.ok(
    terrace.geometry.attributes.position.count < 50_000,
    "the entire spiral is one bounded mesh",
  );
  world.dispose?.();
});
