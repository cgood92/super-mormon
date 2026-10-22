import test from "node:test";
import assert from "node:assert/strict";
import { hasLineOfSight } from "../src/super/interactions";
test("a treasure on a tall chest remains visible from a clear standing approach", () => {
  assert.equal(
    hasLineOfSight(
      { x: -10.65, y: 0, z: -15.6 },
      { x: -12.4, y: 1.05, z: -15.6 },
      [{ x: -12.4, y: 0, z: -15.6, w: 2.5, h: 1.05, d: 1.2 }],
    ),
    true,
  );
});
test("nearby treasures cannot be searched through a full wall or an upper floor", () => {
  assert.equal(
    hasLineOfSight({ x: 0, y: 0, z: 0 }, { x: 2, y: 0.85, z: 0 }, [
      { x: 1, y: 0, z: 0, w: 0.3, h: 4, d: 5 },
    ]),
    false,
  );
  assert.equal(
    hasLineOfSight({ x: 0, y: 0, z: 0 }, { x: 0, y: 4.1, z: 0 }, [
      { x: 0, y: 3, z: 0, w: 5, h: 0.28, d: 5 },
    ]),
    false,
  );
});
