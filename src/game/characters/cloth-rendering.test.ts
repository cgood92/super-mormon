import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { createClothNormalUpdater } from "./cloth-normals.ts";

test("deformed cloth keeps continuous lighting across duplicated triangle seams", () => {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0.3],
      3,
    ),
  );
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute("normal");
  assert.ok(
    new T.Vector3()
      .fromBufferAttribute(normal, 0)
      .distanceTo(new T.Vector3().fromBufferAttribute(normal, 3)) > 0.1,
    "fixture exposes a visible hard seam",
  );
  const update = createClothNormalUpdater(geometry);
  const positions = geometry.getAttribute("position") as T.BufferAttribute;
  for (const bend of [0.1, 0.4, 0.7]) {
    positions.setZ(5, bend);
    update();
    for (const [a, b] of [
      [0, 3],
      [2, 4],
    ]) {
      const first = new T.Vector3().fromBufferAttribute(normal, a),
        second = new T.Vector3().fromBufferAttribute(normal, b);
      assert.ok(
        first.distanceTo(second) < 1e-6,
        "shared cloth seam changes highlights between triangles",
      );
      assert.ok(Math.abs(first.length() - 1) < 1e-6);
    }
  }
  geometry.dispose();
});
