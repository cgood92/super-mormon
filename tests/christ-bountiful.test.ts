import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildChristBountiful,
  BOUNTIFUL_PLACES as p,
} from "../src/super/christ-bountiful";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function setup() {
  const scene = new T.Scene(),
    world = buildChristBountiful(scene);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let completions = 0;
  const dialogs: string[] = [];
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completions++;
    },
    dialog(_k, title, _b, next) {
      dialogs.push(title);
      next();
    },
  });
  const walk = (x: number, z: number) => {
    let i = 0;
    while (Math.hypot(player.x - x, player.z - z) > 0.45 && i++ < 1800) {
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
    assert.ok(i < 1800, `blocked at ${player.x},${player.z} toward ${x},${z}`);
    for (let i = 0; i < 20; i++) {
      stepPlayer(
        player,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      runtime.update(1 / 60, player, idle);
    }
  };
  return {
    scene,
    world,
    player,
    runtime,
    walk,
    dialogs,
    get completions() {
      return completions;
    },
    state: () =>
      runtime.snapshot() as {
        witnessed: boolean;
        escorted: boolean;
        following: boolean;
        watered: boolean;
        discoveries: string[];
      },
  };
}
test("Bountiful witness is independent of optional errands; actual east path escorts neighbor and completes once", () => {
  const h = setup();
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  for (let i = 0; i < 40; i++)
    h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
  assert.equal(h.state().witnessed, false);
  h.walk(0, -12);
  assert.equal(h.state().witnessed, true);
  assert.equal(h.state().watered, false);
  assert.equal(h.dialogs.length, 2);
  h.walk(31, -25);
  h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
  assert.equal(h.state().following, true);
  // Keep the neighbor in range, with wide clearance around the eastern garden beds.
  h.walk(42, -25);
  h.walk(42, 43);
  h.walk(30, 43);
  for (let i = 0; i < 180; i++) h.runtime.update(1 / 60, h.player, idle);
  assert.equal(h.state().escorted, true);
  assert.equal(h.completions, 1);
  for (let i = 0; i < 120; i++) h.runtime.update(1 / 60, h.player, idle);
  assert.equal(h.completions, 1);
  h.world.dispose!();
  assert.equal(h.scene.children.length, 0);
});
test("Bountiful stairs, rooms, optional carrying and landing use real traversal", () => {
  const h = setup();
  h.walk(-29, 25);
  h.walk(p.water.x, p.water.z);
  h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
  h.walk(-42, 25);
  h.walk(-42, -24);
  h.walk(-29, -24);
  assert.equal(h.state().watered, true);
  h.walk(-22, -10);
  h.walk(-22, -42);
  assert.ok(Math.abs(h.player.y - 3) < 0.1);
  assert.ok(h.state().discoveries.includes("terrace-vista"));
  // Step off east edge and land on the single earth surface.
  h.walk(-15, -42);
  assert.ok(Math.abs(h.player.y) < 0.1);
  h.walk(-15, -28);
  h.walk(25, -28);
  h.walk(25, -46);
  assert.ok(h.state().discoveries.includes("quiet-room"));
  h.world.dispose!();
});
test("Bountiful garden beds block direct movement, and leaving a pending dialog prevents callbacks", () => {
  const h = setup();
  h.walk(29, 27);
  for (let i = 0; i < 180; i++)
    stepPlayer(
      h.player,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(h.player.z > 21.3);
  h.world.dispose!();
  const world = buildChristBountiful(new T.Scene());
  let next = () => {},
    completed = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_k, _t, _b, cb) {
      next = cb;
    },
  });
  const player = createPlayer(0, 0, -12);
  runtime.update(0.1, player, idle);
  world.dispose!();
  next();
  runtime.update(0.1, player, idle);
  assert.equal((runtime.snapshot() as { witnessed: boolean }).witnessed, false);
  assert.equal(completed, 0);
});
