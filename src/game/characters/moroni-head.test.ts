import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { addMoroniHead } from "./moroni-head";
for (const quality of ["hero", "npc", "crowd"] as const)
  test(`Moroni ${quality} head has adult proportions, fitted eyes and owned geometry`, () => {
    const group = new T.Group(),
      owned: T.BufferGeometry[] = [],
      materials: T.Material[] = [];
    addMoroniHead(
      group,
      (g, m, n) => {
        owned.push(g);
        const mesh = new T.Mesh(g, m);
        mesh.name = n;
        group.add(mesh);
        return mesh;
      },
      materials,
      1.67,
      0,
      0.337,
      quality,
    );
    const face = group.getObjectByName("sculpted-face-neck-nose") as T.Mesh;
    face.geometry.computeBoundingBox();
    const b = face.geometry.boundingBox!;
    assert.ok(b.max.x - b.min.x > 0.5 && b.max.x - b.min.x < 0.66);
    assert.ok(b.min.y < 1.49 && b.max.z > 0.27);
    for (const side of ["left", "right"]) {
      const eye = group.getObjectByName(`${side}-eye`) as T.Mesh;
      assert.ok(eye);
      assert.ok(eye.position.z > 0.14 && eye.position.z < 0.22);
    }
    group.updateMatrixWorld(true);
    const hair = group.getObjectByName("single-sculpted-hair-cap") as T.Mesh;
    assert.ok(hair, "short flat hair covers the scalp");
    hair.geometry.computeBoundingBox();
    assert.ok(
      hair.geometry.boundingBox!.max.y <= b.max.y + 0.012,
      "hair stays close to the crown",
    );
    for (const x of [-0.1, 0, 0.1]) {
      const ray = new T.Raycaster(
        new T.Vector3(x, 1.92, 1),
        new T.Vector3(0, 0, -1),
      );
      const scalp = ray.intersectObject(face)[0],
        cap = ray.intersectObject(hair)[0];
      assert.ok(
        scalp && cap && cap.distance < scalp.distance,
        "hair covers the upper scalp",
      );
      assert.ok(
        scalp.distance - cap.distance < 0.02,
        "hair lies flat against the scalp",
      );
    }
    assert.ok(
      !group.children.some((o) => o.name.startsWith("moroni-swept-lock-")),
    );
    let vertices = 0;
    group.traverse((o) => {
      if (o instanceof T.Mesh) {
        assert.ok(owned.includes(o.geometry));
        const p = o.geometry.getAttribute("position");
        vertices += p.count;
        for (const v of p.array) assert.ok(Number.isFinite(v));
      }
    });
    assert.ok(
      vertices < (quality === "crowd" ? 550 : quality === "npc" ? 3500 : 10000),
      `${vertices} vertices`,
    );
    assert.ok(materials.length >= 4);
    let disposed = 0;
    for (const g of owned) {
      g.addEventListener("dispose", () => disposed++);
      g.dispose();
    }
    assert.equal(disposed, owned.length);
  });
