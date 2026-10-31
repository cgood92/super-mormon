import test from "node:test";
import assert from "node:assert/strict";
import { navigateGuard } from "./guard-navigation";
import type { Solid } from "./physics";

const corridor = { minX: 0, maxX: 6, minZ: 0, maxZ: 0 };
const blocker: Solid = { x: 1.5, y: 0, z: 0, w: 1, h: 2, d: 1 };

test("guard routes use rounded grid positions and stop one cell before the target", () => {
  assert.deepEqual(navigateGuard({ x: 0.6, z: 0.2 }, { x: 6.2, z: 0.1 }, []), [
    { x: 1.5, z: 0 },
    { x: 3, z: 0 },
    { x: 4.5, z: 0 },
  ]);
  assert.deepEqual(navigateGuard({ x: 0, z: 0 }, { x: 1.5, z: 0 }, []), []);
});

test("guard routes go around solids with the existing deterministic detour order", () => {
  assert.deepEqual(
    navigateGuard({ x: 0, z: 0 }, { x: 6, z: 0 }, [blocker], {
      ...corridor,
      maxZ: 1.5,
    }),
    [
      { x: 0, z: 1.5 },
      { x: 1.5, z: 1.5 },
      { x: 3, z: 1.5 },
      { x: 4.5, z: 1.5 },
      { x: 6, z: 1.5 },
    ],
  );
});

test("an unreachable guard route keeps the direct target fallback without rounding", () => {
  assert.deepEqual(
    navigateGuard({ x: 0, z: 0 }, { x: 6.2, z: 0.1 }, [blocker], corridor),
    [{ x: 6.2, z: 0.1 }],
  );
});

test("guard routes ignore floors and overhead solids at their height boundaries", () => {
  for (const solid of [
    { ...blocker, h: 0.44 },
    { ...blocker, y: 1.65 },
  ]) {
    assert.deepEqual(
      navigateGuard({ x: 0, z: 0 }, { x: 6, z: 0 }, [solid], corridor),
      [
        { x: 1.5, z: 0 },
        { x: 3, z: 0 },
        { x: 4.5, z: 0 },
      ],
    );
  }
  for (const solid of [
    { ...blocker, h: 0.440001 },
    { ...blocker, y: 1.649 },
  ]) {
    assert.deepEqual(
      navigateGuard({ x: 0, z: 0 }, { x: 6, z: 0 }, [solid], corridor),
      [{ x: 6, z: 0 }],
    );
  }
});

test("guard routes retain clearance from solid edges without blocking exact tangency", () => {
  assert.deepEqual(
    navigateGuard(
      { x: 0, z: 0 },
      { x: 6, z: 0 },
      [{ ...blocker, z: 0.9 }],
      corridor,
    ),
    [
      { x: 1.5, z: 0 },
      { x: 3, z: 0 },
      { x: 4.5, z: 0 },
    ],
  );
  assert.deepEqual(
    navigateGuard(
      { x: 0, z: 0 },
      { x: 6, z: 0 },
      [{ ...blocker, z: 0.899 }],
      corridor,
    ),
    [{ x: 6, z: 0 }],
  );
});

test("guard routes respect supplied bounds and retain the default world limits", () => {
  assert.deepEqual(navigateGuard({ x: 39, z: 0 }, { x: 45, z: 0 }, []), [
    { x: 45, z: 0 },
  ]);
  assert.deepEqual(
    navigateGuard({ x: 39, z: 0 }, { x: 45, z: 0 }, [], {
      minX: 39,
      maxX: 45,
      minZ: 0,
      maxZ: 0,
    }),
    [
      { x: 40.5, z: 0 },
      { x: 42, z: 0 },
      { x: 43.5, z: 0 },
    ],
  );
});

test("guard route searches remain bounded and fall back when the target is too distant", () => {
  assert.deepEqual(
    navigateGuard({ x: 0, z: 0 }, { x: 999, z: 999 }, [], {
      minX: -1000,
      maxX: 1000,
      minZ: -1000,
      maxZ: 1000,
    }),
    [{ x: 999, z: 999 }],
  );
});

test("planning a guard route leaves actor positions, solids, and bounds unchanged", () => {
  const start = { x: 0, z: 0 },
    target = { x: 6, z: 0 };
  const solids = [{ ...blocker }],
    bounds = { ...corridor, maxZ: 1.5 };
  const before = structuredClone({ start, target, solids, bounds });
  navigateGuard(start, target, solids, bounds);
  assert.deepEqual({ start, target, solids, bounds }, before);
});
