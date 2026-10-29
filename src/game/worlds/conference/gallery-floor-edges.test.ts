import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { gallery } from "./conference-center";

test("gallery tiles stay on supported floors at stair wells and every perimeter", () => {
  const scene = new THREE.Scene();
  const world = gallery(scene);
  scene.updateMatrixWorld(true);
  const tiles: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh && o.name.includes("limestone checkerboard"))
      tiles.push(o);
  });
  let overhangs = 0;
  const matrix = new THREE.Matrix4();
  const p = new THREE.Vector3();
  for (const mesh of tiles) {
    const count = mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
    const vertices = mesh.geometry.getAttribute("position");
    for (let instance = 0; instance < count; instance++) {
      if (mesh instanceof THREE.InstancedMesh)
        mesh.getMatrixAt(instance, matrix);
      else matrix.identity();
      matrix.premultiply(mesh.matrixWorld);
      for (let i = 0; i < vertices.count; i++) {
        p.fromBufferAttribute(vertices, i).applyMatrix4(matrix);
        const e = 0.0001;
        const outside =
          Math.abs(p.x) > 88 + e ||
          p.z < (p.y > 10 ? -100 : -102) - e ||
          p.z > 53 + e;
        const auditorium = p.z < 1 - e && Math.abs(p.x) < 67 - e;
        const well =
          p.y > 10 &&
          p.z > 6 + e &&
          p.z < 40 - e &&
          Math.abs(p.x) > 50 + e &&
          Math.abs(p.x) < 62 - e;
        if (outside || auditorium || well) overhangs++;
      }
    }
  }
  assert.equal(overhangs, 0, "tile vertices must never project into open air");
  const ray = new THREE.Raycaster();
  for (const y of [0, 12, 24]) {
    for (const [x, z] of [
      [49.99, 20],
      [-56, 5.99],
      [56, 5.99],
      [0, 3],
      [62.01, 20],
      [-49.99, 20],
      [-62.01, 20],
      [70, 0.99],
      [0, 40.01],
    ]) {
      ray.set(new THREE.Vector3(x!, y + 1, z!), new THREE.Vector3(0, -1, 0));
      const hits = ray
        .intersectObjects(tiles)
        .filter((h) => Math.abs(h.point.y - (y + 0.0425)) < 0.001);
      assert.equal(
        hits.length,
        1,
        `one continuous tile surface at ${x},${y},${z}`,
      );
    }
  }
  world.dispose?.();
});
