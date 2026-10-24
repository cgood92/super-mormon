import test from "node:test";
import assert from "node:assert/strict";
import {
  spyCanSeePlayer,
  spySightLineClear,
  spyEyePosition,
  type SpyVision,
} from "../src/super/spy-vision";

const base: SpyVision = {
  eye: { x: 0, y: 1.485, z: 0 },
  headYaw: 0,
  headPitch: 0,
  playerPosition: { x: 0, y: 0, z: 6 },
  solids: [],
};
const sees = (patch: Partial<SpyVision> = {}) =>
  spyCanSeePlayer({ ...base, ...patch });
test("head gaze sees front but excludes sides, behind, and proximity", () => {
  assert.equal(sees(), true);
  assert.equal(sees({ playerPosition: { x: 6, y: 0, z: 0 } }), false);
  assert.equal(sees({ playerPosition: { x: 0, y: 0, z: -6 } }), false);
  assert.equal(sees({ playerPosition: { x: 0, y: 0, z: -0.5 } }), false);
  assert.equal(sees({ headYaw: Math.PI }), false);
  assert.equal(
    sees({ headYaw: Math.PI, playerPosition: { x: 0, y: 0, z: -6 } }),
    true,
  );
});
test("walls and tree trunks block every visible body target", () => {
  assert.equal(
    sees({ solids: [{ x: 0, y: 0, z: 3, w: 3, h: 4, d: 0.3 }] }),
    false,
  );
  assert.equal(
    sees({ solids: [{ x: 0, y: 0, z: 3, w: 0.6, h: 4, d: 0.6 }] }),
    false,
  );
  assert.equal(
    sees({ solids: [{ x: 2, y: 0, z: 3, w: 0.6, h: 4, d: 0.6 }] }),
    true,
  );
  assert.equal(
    sees({ solids: [{ x: 0, y: 0, z: 3, w: 3, h: 1.2, d: 0.3 }] }),
    true,
  );
});
test("vertical alignment and floor occlusion use the head pitch", () => {
  const above = { x: 0, y: 5, z: 6 };
  assert.equal(sees({ playerPosition: above }), false);
  assert.equal(
    sees({ playerPosition: above, headPitch: Math.atan2(5, 6) }),
    true,
  );
  assert.equal(
    sees({
      playerPosition: above,
      headPitch: Math.atan2(5, 6),
      solids: [{ x: 0, y: 3, z: 3, w: 8, h: 0.4, d: 8 }],
    }),
    false,
  );
});
test("narrow cone boundary, target width and distance are deterministic", () => {
  const a = (8 * Math.PI) / 180;
  const p = (angle: number) => ({
    x: 6 * Math.sin(angle),
    y: 0,
    z: 6 * Math.cos(angle),
  });
  assert.equal(sees({ playerRadius: 0, playerPosition: p(a) }), true);
  assert.equal(sees({ playerRadius: 0, playerPosition: p(a + 0.0001) }), false);
  assert.equal(sees({ playerPosition: p(a + 0.015) }), true);
  assert.equal(sees({ playerPosition: { x: 0, y: 0, z: 19 } }), false);
  assert.equal(
    sees({ playerRadius: 0, playerPosition: p(0.3), halfAngleRadians: 0.4 }),
    true,
  );
});
test("closed segment detects embedded eyes and tangent occlusion", () => {
  const solid = { x: 0, y: 0, z: 0, w: 2, h: 2, d: 2 };
  assert.equal(
    spySightLineClear({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 5 }, [solid]),
    false,
  );
  assert.equal(
    spySightLineClear({ x: 1, y: 1, z: -5 }, { x: 1, y: 1, z: 5 }, [solid]),
    false,
  );
  assert.deepEqual(spyEyePosition({ x: 2, y: 3, z: 4 }), {
    x: 2,
    y: 4.65,
    z: 4,
  });
});

test("nearby forward head remains visible at standing eye height", () => {
  assert.equal(
    sees({
      eye: { x: 0, y: 1.65, z: 0 },
      playerPosition: { x: 0, y: 0, z: 0.5 },
    }),
    true,
  );
});
