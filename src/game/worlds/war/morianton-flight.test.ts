import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildMoriantonFlight } from "./morianton-flight";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function harness() {
  const scene = new T.Scene(),
    world = buildMoriantonFlight(scene);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let completed = 0;
  const dialogs: string[] = [];
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_ref, _title, body, next) {
      dialogs.push(body);
      next();
    },
  });
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      placed: { x: number; z: number; soldier: number }[];
      enemies: { x: number; z: number }[];
      attempts: number;
      held: number;
    };
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) runtime.update(1 / 60, player, idle);
  };
  const walk = (x: number, z: number) => {
    let frames = 0;
    while (Math.hypot(player.x - x, player.z - z) > 0.35 && frames++ < 1800) {
      const dx = x - player.x,
        dz = z - player.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      runtime.update(1 / 60, player, idle);
    }
    assert.ok(frames < 1800, `blocked at ${player.x},${player.z}`);
  };
  const use = () => runtime.update(1 / 60, player, { ...idle, interact: true });
  const start = () => {
    walk(3, -47);
    use();
    walk(-8, -8);
    walk(-8, 0);
  };
  return {
    scene,
    world,
    player,
    runtime,
    state,
    tick,
    walk,
    use,
    start,
    dialogs,
    get completed() {
      return completed;
    },
  };
}
const ring = [
  [-11, 2],
  [11, 2],
  [13, 30],
  [0, 36],
  [-13, 30],
  [-14, 15],
];

test("Teancum walks the pass, deploys six stationary soldiers and contains every fleeing opponent", () => {
  const h = harness();
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  h.start();
  assert.equal(h.state().phase, "surround");
  for (const [x, z] of ring) {
    h.walk(x, z);
    h.use();
  }
  assert.equal(h.state().placed.length, 6);
  assert.equal(
    h.completed,
    0,
    "closure must hold while enemies actively try the rope",
  );
  const posts = structuredClone(h.state().placed);
  h.tick(300);
  assert.equal(h.completed, 1);
  assert.deepEqual(
    h.state().placed,
    posts,
    "deployed soldiers remain stationary",
  );
  assert.match(h.dialogs.join(" "), /peace/i);
  h.tick(300);
  assert.equal(h.completed, 1);
  h.world.dispose?.();
  h.world.dispose?.();
  assert.equal(h.scene.children.length, 0);
});

test("placing soldiers needs fresh action presses; a nearby soldier can be recalled and redeployed", () => {
  const h = harness();
  h.start();
  h.walk(-11, 2);
  h.use();
  assert.equal(h.state().placed.length, 1);
  h.runtime.update(0.1, h.player, { ...idle, interactHeld: true });
  assert.equal(h.state().placed.length, 1);
  h.use();
  assert.equal(h.state().placed.length, 0);
  h.walk(-12, 5);
  h.use();
  assert.equal(h.state().placed.length, 1);
  h.world.dispose?.();
});

test("six soldiers elsewhere cannot win; an escape fairly resets the patrol without repeating the report", () => {
  const h = harness();
  h.start();
  for (const [x, z] of [
    [-11, 0],
    [-6, 0],
    [-1, 0],
    [-1, 5],
    [-6, 5],
    [-11, 5],
  ]) {
    h.walk(x, z);
    h.use();
  }
  h.tick(600);
  assert.equal(h.completed, 0);
  h.tick(6000);
  assert.equal(h.state().attempts, 1);
  assert.equal(h.state().placed.length, 0);
  assert.equal(h.state().phase, "approach");
  assert.equal(h.dialogs.length, 1);
  h.world.dispose?.();
});

test("a disposed patrol cannot deploy, advance, or complete from a delayed report callback", () => {
  const scene = new T.Scene(),
    world = buildMoriantonFlight(scene);
  let next = () => {};
  let completed = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_r, _t, _b, advance) {
      next = advance;
    },
  });
  const p = createPlayer(3, 0, -47);
  runtime.update(1 / 60, p, { ...idle, interact: true });
  runtime.dispose();
  next();
  runtime.update(0.1, p, { ...idle, interact: true });
  assert.equal(completed, 0);
  assert.equal((runtime.snapshot() as { placed: unknown[] }).placed.length, 0);
  world.dispose?.();
});

test("a soldier is placed beside Teancum on clear ground even near the coastal ridge", () => {
  const h = harness();
  h.start();
  h.walk(14.4, 22);
  h.use();
  const post = h.state().placed[0];
  assert.ok(post);
  assert.ok(
    Math.hypot(post.x - h.player.x, post.z - h.player.z) > 0.8,
    "soldier and player bodies stay separate",
  );
  assert.equal(
    h.world.solids.some(
      (s) =>
        s.y + s.h > 0.43 &&
        s.y < 1.65 &&
        Math.abs(post.x - s.x) < s.w / 2 + 0.32 &&
        Math.abs(post.z - s.z) < s.d / 2 + 0.32,
    ),
    false,
    "stationed soldier must not overlap a rock",
  );
  h.world.dispose?.();
});
