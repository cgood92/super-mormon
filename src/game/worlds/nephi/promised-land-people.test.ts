import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildPromisedLand } from "./promised-land";
import { createPlayer, stepPlayer } from "../../physics/physics";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function setup() {
  const scene = new T.Scene(),
    world = buildPromisedLand(scene);
  const player = createPlayer(0, 0, 51);
  let completed = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    dialog(_a, _b, _c, next) {
      next();
    },
    complete() {
      completed++;
    },
  });
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      lehi: { x: number; y: number; z: number };
      grave: { x: number; y: number; z: number };
      settlement: { x: number; y: number; z: number };
      followers: { x: number; y: number; z: number }[];
    };
  const tick = () => {
    world.update!(1 / 60, player);
    runtime.update(1 / 60, player, idle);
  };
  const bury = () => {
    for (let i = 0; i < 12000 && state().phase !== "burial"; i++) tick();
    assert.equal(state().phase, "burial");
    Object.assign(player, state().grave, { x: state().grave.x + 2 });
    runtime.update(1 / 60, player, { ...idle, interact: true });
  };
  return {
    scene,
    world,
    player,
    runtime,
    state,
    tick,
    bury,
    completed: () => completed,
  };
}
test("a player cannot walk through a stationary relative and can walk around them", () => {
  const h = setup();
  const p = h.state().followers[0];
  Object.assign(h.player, { x: p.x, y: 0, z: p.z + 2 });
  for (let i = 0; i < 120; i++)
    stepPlayer(
      h.player,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(h.player.z > p.z + 0.6, "relative blocks the player");
  for (let i = 0; i < 25; i++)
    stepPlayer(
      h.player,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  for (let i = 0; i < 65; i++)
    stepPlayer(
      h.player,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(h.player.z < p.z - 1, "route around relative is clear");
  h.world.dispose!();
});
test("Lehi stops before walking into the player", () => {
  const h = setup(),
    start = h.state().lehi;
  const length = Math.hypot(-15 - start.x, 21 - start.z);
  Object.assign(h.player, {
    x: start.x + ((-15 - start.x) / length) * 2,
    y: 0,
    z: start.z + ((21 - start.z) / length) * 2,
  });
  let nearest = Infinity;
  for (let i = 0; i < 240; i++) {
    h.tick();
    const p = h.state().lehi;
    nearest = Math.min(nearest, Math.hypot(p.x - h.player.x, p.z - h.player.z));
  }
  assert.ok(nearest >= 0.68, `Lehi overlaps the player: ${nearest}`);
  h.world.dispose!();
});
test("waiting after burial preserves the circle and followers never converge on the grave", () => {
  const h = setup();
  h.bury();
  const before = h.state().followers;
  for (let i = 0; i < 1800; i++) h.tick();
  const people = h.state().followers;
  people.forEach((p, i) => {
    assert.ok(
      Math.hypot(p.x - before[i].x, p.z - before[i].z) < 0.1,
      "holds their place until the leader departs",
    );
    assert.ok(Math.hypot(p.x + 15, p.z - 21) > 3, "keeps clear of grave");
    people
      .slice(i + 1)
      .forEach((q) =>
        assert.ok(
          Math.hypot(p.x - q.x, p.z - q.z) > 0.7,
          "relatives remain separate",
        ),
      );
  });
  h.world.dispose!();
});
test("reaching the settlement requires a deliberate arrival action", () => {
  const h = setup();
  h.bury();
  Object.assign(h.player, h.state().settlement);
  h.tick();
  assert.equal(
    h.completed(),
    0,
    "walking across the area cannot exit the chapter",
  );
  assert.equal(h.state().phase, "journey");
  h.world.dispose!();
});
