import assert from "node:assert/strict";
import test from "node:test";
import { adventureCameraYaw } from "../src/super/adventure-camera";
import { createPlayer, stepPlayer } from "../src/super/physics";

test("a wall shot uses screen-relative movement after any prior camera orbit", () => {
  const shot = { position: { x: 0, z: 10 }, focus: { x: 0, z: -4 } };
  for (const oldOrbit of [0, Math.PI / 2, Math.PI, -Math.PI / 3]) {
    const yaw = adventureCameraYaw(shot, oldOrbit);
    assert.equal(yaw, Math.PI);
    const p = createPlayer(0, 0, 0);
    const ground = [{ x: 0, y: -1, z: 0, w: 100, h: 1, d: 100 }];
    for (let i = 0; i < 15; i++)
      stepPlayer(p, { x: 1, y: 0, jump: false }, 1 / 60, yaw, ground);
    assert.ok(p.x > 0.4, "right on screen moves right along the wall");
    assert.ok(Math.abs(p.z) < 0.01);
    assert.equal(
      adventureCameraYaw(undefined, yaw),
      Math.PI,
      "return keeps aligned follow yaw",
    );
  }
});
test("absent or vertically aligned authored cameras preserve normal orbit", () => {
  assert.equal(adventureCameraYaw(undefined, 0.7), 0.7);
  assert.equal(
    adventureCameraYaw(
      { position: { x: 0, z: 0 }, focus: { x: 0, z: 0 } },
      0.7,
    ),
    0.7,
  );
});
