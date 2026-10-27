import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildAuditorium } from "../src/super/conference-auditorium";

test("seating chunks retain every chair near the camera and simplify distant views", () => {
  const parent = new THREE.Group();
  buildAuditorium(parent);
  parent.updateMatrixWorld(true);
  const chunks: THREE.LOD[] = [];
  parent.traverse((object) => {
    if (
      object instanceof THREE.LOD &&
      object.name === "auditorium seating chunk"
    )
      chunks.push(object);
  });
  assert.ok(chunks.length > 20, "separate banks must be independently culled");
  let chairs = 0,
    fullTriangles = 0,
    distantTriangles = 0;
  for (const chunk of chunks) {
    const near = chunk.levels[0].object;
    const far = chunk.levels[1].object;
    const camera = new THREE.PerspectiveCamera();
    camera.position.copy(chunk.position);
    camera.updateMatrixWorld(true);
    chunk.update(camera);
    assert.ok(near.visible && !far.visible);
    camera.position.z += 150;
    camera.updateMatrixWorld(true);
    chunk.update(camera);
    assert.ok(!near.visible && far.visible);
    const parts = near.children as THREE.InstancedMesh[];
    chairs += parts[0].count;
    for (const part of parts) {
      const triangles =
        (part.geometry.index?.count ??
          part.geometry.attributes.position.count) / 3;
      fullTriangles += triangles * part.count;
      part.computeBoundingBox();
      assert.ok(part.boundingBox!.getSize(new THREE.Vector3()).length() < 40);
    }
    for (const part of far.children as THREE.InstancedMesh[]) {
      const triangles =
        (part.geometry.index?.count ??
          part.geometry.attributes.position.count) / 3;
      distantTriangles += triangles * part.count;
      assert.equal((part.material as THREE.Material).side, THREE.DoubleSide);
      assert.equal(part.count, parts[0].count);
      const detailedTransform = new THREE.Matrix4();
      const distantTransform = new THREE.Matrix4();
      for (let i = 0; i < part.count; i++) {
        parts[1].getMatrixAt(i, detailedTransform);
        part.getMatrixAt(i, distantTransform);
        assert.ok(
          Math.abs(
            detailedTransform.elements[12] - distantTransform.elements[12],
          ) < 0.0001,
        );
        assert.ok(
          Math.abs(
            detailedTransform.elements[14] - distantTransform.elements[14],
          ) < 0.0001,
        );
        assert.ok(
          Math.abs(
            detailedTransform.elements[13] -
              0.44 -
              distantTransform.elements[13],
          ) < 0.0001,
        );
      }
    }
  }
  assert.ok(chairs > 10000);
  assert.ok(
    distantTriangles < fullTriangles / 5,
    `${fullTriangles} -> ${distantTriangles}`,
  );
});
