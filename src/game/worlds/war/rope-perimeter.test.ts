import test from "node:test";
import assert from "node:assert/strict";
import {
  pointInRopeRing,
  ropeBlocksMove,
  validRopeRing,
  ropeRingContainsAll,
  type Point2,
} from "./rope-perimeter";

const ring: Point2[] = [
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  { x: 6, z: 3 },
  { x: 4, z: 6 },
  { x: 0, z: 6 },
  { x: -2, z: 3 },
];
const concave: Point2[] = [
  { x: 0, z: 0 },
  { x: 6, z: 0 },
  { x: 6, z: 2 },
  { x: 2, z: 2 },
  { x: 2, z: 6 },
  { x: 0, z: 6 },
];

test("rope rings contain convex and concave interiors, with boundary inside", () => {
  assert.equal(pointInRopeRing({ x: 2, z: 3 }, ring), true);
  assert.equal(pointInRopeRing({ x: 7, z: 3 }, ring), false);
  assert.equal(pointInRopeRing({ x: 2, z: 0 }, ring), true);
  assert.equal(pointInRopeRing(ring[2], ring), true);
  assert.equal(pointInRopeRing({ x: 1, z: 5 }, concave), true);
  assert.equal(pointInRopeRing({ x: 5, z: 1 }, concave), true);
  assert.equal(pointInRopeRing({ x: 4, z: 4 }, concave), false);
  assert.equal(pointInRopeRing({ x: 0, z: 0 }, ring.slice(0, 2)), false);
});

test("placed rope spans block enemy movement while an unfinished gap stays open", () => {
  const open = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
    { x: 0, z: 4 },
  ];
  assert.equal(
    ropeBlocksMove({ x: 2, z: 2 }, { x: 2, z: -2 }, open, false),
    true,
  );
  assert.equal(
    ropeBlocksMove({ x: 2, z: 2 }, { x: -2, z: 2 }, open, false),
    false,
  );
  assert.equal(
    ropeBlocksMove({ x: 2, z: 2 }, { x: -2, z: 2 }, open, true),
    true,
  );
  assert.equal(
    ropeBlocksMove({ x: 2, z: 2 }, { x: 3, z: 3 }, open, true),
    false,
  );
  // A whole-ring leap still crosses a rope even though both endpoints are outside.
  assert.equal(
    ropeBlocksMove({ x: -1, z: 2 }, { x: 9, z: 2 }, open, true),
    true,
  );
  assert.equal(
    ropeBlocksMove({ x: -1, z: -1 }, { x: 9, z: -1 }, open, true),
    false,
  );

  assert.equal(
    ropeBlocksMove({ x: 2, z: 2 }, { x: 9, z: 2 }, open, false),
    true,
  );
  assert.equal(
    ropeBlocksMove({ x: 2, z: 2 }, { x: 9, z: 2 }, open.slice(0, 1), true),
    false,
  );
});

test("rope intersection includes endpoints and collinear overlap but excludes separated lines", () => {
  const rope = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
  ];
  assert.equal(
    ropeBlocksMove({ x: 2, z: -1 }, { x: 4, z: 0 }, rope, false),
    true,
  );
  assert.equal(
    ropeBlocksMove({ x: 1, z: 0 }, { x: 5, z: 0 }, rope, false),
    true,
  );
  assert.equal(
    ropeBlocksMove({ x: 5, z: 0 }, { x: 6, z: 0 }, rope, false),
    false,
  );
  assert.equal(
    ropeBlocksMove({ x: 1, z: 1 }, { x: 3, z: 1 }, rope, false),
    false,
  );
});

test("a valid ring uses exactly six separated posts and a simple nonzero polygon", () => {
  assert.equal(validRopeRing(ring), true);
  assert.equal(validRopeRing([...ring].reverse()), true);
  assert.equal(validRopeRing(concave), true);
  assert.equal(validRopeRing(ring.slice(0, 5)), false);
  assert.equal(validRopeRing([...ring, { x: -1, z: 1 }]), false);
  assert.equal(
    validRopeRing([{ x: 0, z: 0 }, { x: 0.5, z: 0 }, ...ring.slice(2)]),
    false,
  );
  assert.equal(
    validRopeRing([ring[0], ring[2], ring[1], ...ring.slice(3)]),
    false,
  );
  assert.equal(
    validRopeRing(Array.from({ length: 6 }, (_, x) => ({ x, z: 0 }))),
    false,
  );
  assert.equal(
    validRopeRing([
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 2, z: 0 },
      { x: 4, z: 4 },
      { x: 0, z: 4 },
      { x: -2, z: 2 },
    ]),
    false,
  );
  assert.equal(validRopeRing([...ring.slice(0, 5), { x: NaN, z: 3 }]), false);
  assert.equal(
    validRopeRing([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 4 },
      { x: 0, z: 4 },
      { x: -2, z: 2 },
    ]),
    true,
  );
});

test("capture requires a valid complete ring containing every enemy", () => {
  const enemies = [
    { x: 1, z: 1 },
    { x: 3, z: 3 },
    { x: 2, z: 0 },
  ];
  assert.equal(ropeRingContainsAll(ring, enemies), true);
  assert.equal(ropeRingContainsAll(ring, [...enemies, { x: 12, z: 3 }]), false);
  assert.equal(ropeRingContainsAll(ring.slice(0, 5), enemies), false);
  assert.equal(ropeRingContainsAll(concave, [{ x: 4, z: 4 }]), false);
});
