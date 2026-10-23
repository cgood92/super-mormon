import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  softBoxGeometry,
  softSeatBackGeometry,
  mountainGeometry,
} from "../src/super/soft-geometry";

test("soft construction preserves bounds, flat walking surfaces and shared low cost profiles", () => {
  const wall = softBoxGeometry(4, 3, 0.6, "plaster wall");
  assert.equal(wall, softBoxGeometry(4, 3, 0.6, "plaster wall"));
  wall.computeBoundingBox();
  assert.deepEqual(wall.boundingBox!.min.toArray(), [-0.5, -0.5, -0.5]);
  assert.deepEqual(wall.boundingBox!.max.toArray(), [0.5, 0.5, 0.5]);
  assert.equal(wall.attributes.position.count / 3, 44);
  const floor = softBoxGeometry(10, 0.5, 10, "floor");
  assert.equal(floor.userData.softConstruction, false);
  assert.equal(
    softBoxGeometry(5, 8, 1, "mountain prayer trail").userData.softConstruction,
    false,
  );
  assert.equal(softSeatBackGeometry().attributes.position.count / 3, 20);
});
test("mountain skyline uses rounded segmented slopes rather than square cones", () => {
  const g = mountainGeometry(2);
  g.computeBoundingBox();
  assert.ok(g.attributes.position.count > 60);
  assert.ok(Math.abs(g.boundingBox!.min.y) < 1e-5);
  assert.equal(g.boundingBox!.max.y, 1);
  const p = g.attributes.position;
  let middle = 0;
  for (let i = 0; i < p.count; i++)
    if (p.getY(i) > 0.1 && p.getY(i) < 0.9) middle++;
  assert.ok(middle > 20);
  g.dispose();
});
