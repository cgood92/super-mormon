import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildAuditorium } from "../src/super/conference-auditorium";

test("audience chair parts leave both rostrum stairs and approach landings clear", () => {
  const parent = new THREE.Group();
  buildAuditorium(parent);
  parent.updateMatrixWorld(true);
  const matrix = new THREE.Matrix4();
  let count = 0;
  parent.traverse((object) => {
    if (
      !(object instanceof THREE.InstancedMesh) ||
      object.name !== "auditorium seating"
    )
      return;
    count = object.count;
    object.geometry.computeBoundingBox();
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, matrix);
      matrix.premultiply(object.matrixWorld);
      const bounds = object.geometry.boundingBox!.clone().applyMatrix4(matrix);
      // Choir and officials are elevated behind the stairs; these checks cover audience parts.
      if (bounds.min.y >= 2.4) continue;
      for (const side of [-1, 1]) {
        const keepout = new THREE.Box3(
          new THREE.Vector3(side * 25 - 3.5, -1, -80.5),
          new THREE.Vector3(side * 25 + 3.5, 2.4, -69),
        );
        assert.ok(
          !bounds.intersectsBox(keepout),
          `Chair part ${i} overlaps stair approach on side ${side}`,
        );
      }
    }
  });
  assert.ok(count > 10000);
});

test("front apron and outer aisles have continuous red carpet above the foundation", () => {
  const parent = new THREE.Group();
  buildAuditorium(parent);
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(126, 0.4, 98),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  foundation.position.set(0, -0.2, -49);
  parent.add(foundation);
  parent.updateMatrixWorld(true);
  for (const [x, z] of [
    [0, -77],
    [-50, -85],
    [50, -85],
    [-62, -60],
    [62, -60],
    [-61, -97],
    [61, -97],
  ]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(x, 0.1, z),
      new THREE.Vector3(0, -1, 0),
    );
    const hit = ray.intersectObject(parent, true)[0];
    assert.ok(hit, `Missing floor at ${x}, ${z}`);
    assert.equal(
      (
        (hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial
      ).color.getHex(),
      0x7b3436,
      `Floor at ${x}, ${z}`,
    );
    assert.ok(hit.point.y > 0);
  }
});
