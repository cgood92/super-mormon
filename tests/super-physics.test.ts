import assert from "node:assert/strict";
import test from "node:test";
import { createPlayer, stepPlayer, type Solid } from "../src/super/physics.ts";

const still = { x: 0, y: 0, jump: false, jumpHeld: false };
function tick(
  player: ReturnType<typeof createPlayer>,
  input = still,
  solids: Solid[] = [],
  n = 1,
  yaw = 0,
) {
  for (let i = 0; i < n; i++) stepPlayer(player, input, 1 / 60, yaw, solids);
}

test("camera relative input accelerates into a run and slows when released", () => {
  const player = createPlayer();
  tick(player, { ...still, y: 1 }, [], 30, Math.PI / 2);
  assert.ok(player.x > 2);
  assert.ok(Math.abs(player.z) < 0.01);
  assert.ok(player.runSpeed > 0);
  const before = player.x;
  tick(player, still, [], 30);
  assert.ok(player.x > before);
  assert.ok(Math.hypot(player.vx, player.vz) < 0.1);
});

test("right input moves right on screen when the camera looks toward positive Z", () => {
  const player = createPlayer();
  tick(player, { ...still, x: 1 }, [], 15, 0);
  assert.ok(player.x < -0.5);
  assert.ok(Math.abs(player.z) < 0.01);
});

test("jump height responds to holding the button", () => {
  const short = createPlayer();
  const tall = createPlayer();
  tick(short, { ...still, jump: true, jumpHeld: true });
  tick(tall, { ...still, jump: true, jumpHeld: true });
  tick(short, still, [], 18);
  tick(tall, { ...still, jumpHeld: true }, [], 18);
  assert.ok(tall.y > short.y + 0.5);
});

test("jump buffer fires on landing and coyote time permits a late jump", () => {
  const ledge: Solid = { x: 0, y: 0, z: 0, w: 2, h: 2, d: 2 };
  const player = createPlayer(0, 2, 0);
  tick(player, { ...still, x: -1 }, [ledge], 20);
  assert.equal(player.grounded, false);
  tick(player, { ...still, jump: true, jumpHeld: true }, [ledge]);
  assert.ok(player.vy > 0);
  const falling = createPlayer(0, 0.35, 0);
  falling.vy = -5;
  tick(falling, { ...still, jump: true, jumpHeld: true }, [], 8);
  assert.ok(falling.vy > 0);
});

test("solid walls stop movement and short steps are climbable", () => {
  const wall: Solid = { x: 2, y: 0, z: 0, w: 1, h: 3, d: 3 };
  const p = createPlayer();
  tick(p, { ...still, x: -1 }, [wall], 70);
  assert.ok(p.x <= 1.19);
  const step: Solid = { x: 2, y: 0, z: 0, w: 1, h: 0.35, d: 3 };
  const q = createPlayer();
  tick(q, { ...still, x: -1 }, [step], 35);
  assert.ok(q.x > 1.6);
  assert.ok(Math.abs(q.y - 0.35) < 0.03);
});

test("player lands on raised platforms and cannot jump through ceilings", () => {
  const platform: Solid = { x: 0, y: 1, z: 0, w: 4, h: 0.4, d: 4 };
  const p = createPlayer(0, 4, 0);
  tick(p, still, [platform], 90);
  assert.ok(Math.abs(p.y - 1.4) < 0.02);
  assert.equal(p.grounded, true);
  const ceiling: Solid = { x: 0, y: 2, z: 0, w: 3, h: 0.5, d: 3 };
  const q = createPlayer();
  tick(q, { ...still, jump: true, jumpHeld: true }, [ceiling], 14);
  assert.ok(q.y <= 0.36);
});
