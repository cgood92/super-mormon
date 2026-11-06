import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { createMotionDriver } from "./character-motion.ts";
import type { CharacterState } from "./character-types.ts";

test("character head articulates lookYaw and lookPitch independently of body heading", () => {
  const driver = createMotionDriver("nephi");
  const state: CharacterState = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    grounded: true,
    runSpeed: 0,
    move: "idle",
  };

  // Straight gaze
  driver.update(1 / 60, { ...state, lookYaw: 0, lookPitch: 0 });
  const head = driver.group.getObjectByName("head")!;
  assert.ok(Math.abs(head.rotation.y) < 0.05, "head yaw centered");
  assert.ok(Math.abs(head.rotation.x) < 0.05, "head pitch level");

  // Head looks 45 degrees to the right
  driver.update(1 / 60, { ...state, lookYaw: Math.PI / 4, lookPitch: 0 });
  assert.ok(
    head.rotation.y > 0.7 && head.rotation.y < 0.85,
    `head turned right: ${head.rotation.y}`,
  );

  // Head looks downward towards ground / dangerous drop
  driver.update(1 / 60, { ...state, lookYaw: 0, lookPitch: -0.4 });
  assert.ok(
    head.rotation.x > 0.35 && head.rotation.x < 0.45,
    `head tilted downward: ${head.rotation.x}`,
  );

  driver.dispose();
});
