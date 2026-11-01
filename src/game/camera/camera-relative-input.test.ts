import assert from "node:assert/strict";
import test from "node:test";
import { CameraRelativeInput } from "./camera-relative-input";
import { createPlayer, stepPlayer } from "../physics/physics";

const forward = { x: 0, y: 1 };
test("holding forward through a half-turn room cut preserves world movement until released", () => {
  const relative = new CameraRelativeInput();
  const beforeCut = relative.yaw(forward, 0);
  relative.hold(forward, beforeCut);
  const player = createPlayer();
  for (let frame = 0; frame < 30; frame++)
    stepPlayer(
      player,
      { ...forward, jump: false, jumpHeld: false },
      1 / 60,
      relative.yaw(forward, Math.PI),
      [],
    );
  assert.ok(
    player.z > 2,
    "held input must continue forward in the pre-cut world frame",
  );
  assert.equal(relative.yaw({ x: 0, y: 0 }, Math.PI), Math.PI);
  assert.equal(relative.yaw(forward, Math.PI), Math.PI);
});

test("stick magnitude and slight direction changes preserve a held room-cut frame", () => {
  const relative = new CameraRelativeInput();
  relative.hold(forward, 0.4);
  assert.equal(relative.yaw({ x: 0.04, y: 0.5 }, 2), 0.4);
  assert.equal(relative.yaw({ x: 0.1, y: 0.6 }, 2), 0.4);
});

test("a deliberate new direction releases the room-cut frame", () => {
  const relative = new CameraRelativeInput();
  relative.hold(forward, 0.4);
  assert.equal(relative.yaw({ x: 0.3, y: 1 }, 2), 2);
  assert.equal(relative.yaw(forward, 2.1), 2.1);
});

for (const manual of [
  { cameraX: 0.01 },
  { cameraY: -0.01 },
  { recenter: true },
]) {
  test(`manual camera input ${JSON.stringify(manual)} releases the room-cut frame`, () => {
    const relative = new CameraRelativeInput();
    relative.hold(forward, 0.4);
    assert.equal(relative.yaw({ ...forward, ...manual }, 2), 2);
    assert.equal(relative.yaw(forward, 2.1), 2.1);
  });
}

test("idle cuts, manual camera input, and resets cannot leave stale held frames", () => {
  const relative = new CameraRelativeInput();
  relative.hold({ x: 0, y: 0 }, 0.4);
  assert.equal(relative.yaw(forward, 2), 2);
  relative.hold({ ...forward, cameraX: 0.02 }, 0.4);
  assert.equal(relative.yaw(forward, 2), 2);
  relative.hold(forward, 0.4);
  relative.reset();
  assert.equal(relative.yaw(forward, 2), 2);
});
