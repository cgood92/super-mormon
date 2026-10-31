import assert from "node:assert/strict";
import test from "node:test";
import { createPlayer, stepPlayer, type MoveInput } from "./physics.ts";
const idle: MoveInput = { x: 0, y: 0, jump: false, jumpHeld: false };
function run() {
  const p = createPlayer();
  for (let i = 0; i < 60; i++) stepPlayer(p, { ...idle, y: 1 }, 1 / 60, 0, []);
  return p;
}
test("starting a run builds speed gradually while retaining full running speed", () => {
  const p = createPlayer();
  for (let i = 0; i < 6; i++) stepPlayer(p, { ...idle, y: 1 }, 1 / 60, 0, []);
  assert.ok(p.runSpeed > 2 && p.runSpeed < 2.4, `${p.runSpeed}`);
  assert.ok(Math.abs(run().runSpeed - 6.5) < 0.001);
});
test("release stops a full run within a short step without snapping velocity", () => {
  const p = run(),
    start = p.z;
  stepPlayer(p, idle, 1 / 60, 0, []);
  assert.ok(p.runSpeed > 5.7 && p.runSpeed < 6);
  for (let i = 1; i < 12; i++) stepPlayer(p, idle, 1 / 60, 0, []);
  assert.equal(p.runSpeed, 0);
  assert.ok(p.z - start > 0.45 && p.z - start < 0.6);
});
test("reversal faces the requested direction before momentum catches up", () => {
  const p = run();
  stepPlayer(p, { ...idle, y: -1 }, 1 / 60, 0, []);
  assert.ok(p.vz > 5);
  assert.ok(Math.abs(Math.abs(p.yaw) - 0.3) < 0.001, `yaw ${p.yaw}`);
  for (let i = 1; i < 9; i++) stepPlayer(p, { ...idle, y: -1 }, 1 / 60, 0, []);
  assert.ok(p.vz < 0, `reversal still moving forward: ${p.vz}`);
});
test("quarter turns face intent promptly and recover their new running line", () => {
  const p = run();
  for (let i = 0; i < 6; i++) stepPlayer(p, { ...idle, x: -1 }, 1 / 60, 0, []);
  assert.ok(Math.abs(p.yaw - Math.PI / 2) < 0.001);
  assert.ok(p.vx > 3.1 && p.vz < 3.4, `velocity ${p.vx}, ${p.vz}`);
});
test("turning intent cannot redirect a stationary backflip launch", () => {
  const p = createPlayer();
  stepPlayer(
    p,
    { ...idle, x: -1, crouch: true, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [],
  );
  assert.equal(p.move, "backflip");
  assert.ok(Math.abs(p.vx) < 0.1, `backflip was redirected: ${p.vx}`);
  assert.ok(p.vz < -3.9);
});

test("a shallow descent beside a cabinet lands instead of grabbing its upper edge", () => {
  const p = createPlayer(0, 2.1, 0);
  p.vy = -0.5;
  const solids = [
    { x: 0, y: 0, z: 0, w: 6, h: 2, d: 6 },
    { x: 0, y: 2, z: 0.9, w: 2, h: 1.4, d: 1 },
  ];
  for (let frame = 0; frame < 10; frame++) {
    stepPlayer(p, { ...idle, y: 1 }, 1 / 60, 0, solids);
    assert.equal(
      p.ledge,
      undefined,
      "ordinary descent must not become a ledge hang",
    );
  }
  assert.equal(p.grounded, true);
  assert.equal(p.y, 2);
});
