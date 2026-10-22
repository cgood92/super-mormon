import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { buildAuditorium } from "../src/super/conference-auditorium";

test("balcony fascia has one exposed material at every cream and wood band", () => {
  const root = new THREE.Group();
  buildAuditorium(root);
  root.updateMatrixWorld(true);
  for (const base of [12, 24]) {
    for (const x of [-59.3, -31.7, -1.3, 0.7, 30.3, 59.1]) {
      for (const [offset, color] of [
        [-6.9, 0xe6dcc9],
        [-6.3, 0x97552e],
        [-5.5, 0xe6dcc9],
      ]) {
        const ray = new THREE.Raycaster(
          new THREE.Vector3(x, base + offset, -65),
          new THREE.Vector3(0, 0, 1),
        );
        const hits = ray.intersectObject(root, true);
        assert.ok(hits.length > 0);
        const nearest = hits.filter(
          (hit) => Math.abs(hit.distance - hits[0].distance) < 1e-4,
        );
        assert.equal(
          nearest.length,
          1,
          "front skin must have no duplicate segment faces",
        );
        const colors = new Set(
          nearest.map((hit) =>
            (
              (hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial
            ).color.getHex(),
          ),
        );
        assert.deepEqual(
          [...colors],
          [color],
          `base ${base}, x ${x}, height ${offset}`,
        );
      }
    }
  }
});
