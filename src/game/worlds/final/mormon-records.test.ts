import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildMormonRecords, MORMON_ROUTE } from "./mormon-records";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function setup() {
  const scene = new T.Scene(),
    world = buildMormonRecords(scene),
    player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let completed = 0;
  const dialogs: string[] = [];
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_k, t, b, n) {
      dialogs.push(t + " " + b);
      n();
    },
  });
  const state = () =>
    runtime.snapshot() as {
      carrying: boolean;
      completed: boolean;
      recoveries: number;
      elapsed: number;
      discoveries: string[];
      checkpoint: { x: number; y: number; z: number };
    };
  const walk = (x: number, z: number) => {
    let i = 0;
    while (Math.hypot(player.x - x, player.z - z) > 0.35 && i++ < 2400) {
      const dx = x - player.x,
        dz = z - player.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
        world.climbables,
      );
      runtime.update(1 / 60, player, idle);
    }
    assert.ok(
      i < 2400,
      `blocked ${player.x},${player.y},${player.z} toward ${x},${z}`,
    );
    for (let j = 0; j < 20; j++) {
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
    state,
    walk,
    dialogs,
    get completed() {
      return completed;
    },
  };
}
test("full supported outward and distinct carrying return route; optional exploration and completion once", () => {
  const h = setup();
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  for (let i = 0; i < 90; i++)
    h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
  assert.equal(h.completed, 0);
  for (const p of MORMON_ROUTE.outward) h.walk(p.x, p.z);
  assert.ok(h.player.y > 5.8);
  h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
  assert.equal(h.state().carrying, true);
  assert.equal(h.scene.getObjectByName("Secured record bundle")!.visible, true);
  for (const p of MORMON_ROUTE.return) h.walk(p.x, p.z);
  assert.equal(h.completed, 1);
  assert.equal(h.state().carrying, false);
  assert.ok(
    h.dialogs.some((s) => s.includes("few plates") && s.includes("son Moroni")),
  );
  for (const p of MORMON_ROUTE.discoveries) h.walk(p.x, p.z);
  assert.equal(h.state().discoveries.length, 3);
  h.runtime.update(1, h.player, { ...idle, interact: true });
  assert.equal(h.completed, 1);
  h.world.dispose();
  h.world.dispose();
  assert.equal(h.scene.children.length, 0);
});
test("bounded hazard clock, fair bundle recovery, and inert disposed runtime", () => {
  const h = setup();
  for (const p of MORMON_ROUTE.outward) h.walk(p.x, p.z);
  h.runtime.update(0, h.player, { ...idle, interact: true });
  const before = h.state().elapsed;
  h.runtime.update(Infinity, h.player, idle);
  assert.equal(h.state().elapsed, before);
  h.runtime.update(100, h.player, idle);
  assert.ok(h.state().elapsed - before <= 0.051);
  h.player.y = -5;
  h.runtime.update(0.01, h.player, idle);
  assert.equal(h.state().recoveries, 1);
  assert.equal(h.state().carrying, true);
  assert.equal(h.player.y, h.state().checkpoint.y);
  h.world.dispose();
  const s = h.state();
  h.runtime.update(10, h.player, { ...idle, interact: true });
  assert.deepEqual(h.state(), s);
});
test("ridge and trunk block movement; open valley bypass and ladder support an alternate ascent", () => {
  const h = setup();
  h.walk(0, 40);
  h.walk(0, 16);
  for (let i = 0; i < 160; i++)
    stepPlayer(
      h.player,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(h.player.z > 11, "ridge blocks its direct ground approach");
  h.walk(-24.2, 16);
  h.walk(-24.2, -22);
  let climbed = false;
  for (let i = 0; i < 260; i++) {
    stepPlayer(
      h.player,
      { x: 0, y: climbed ? 1 : -1, jump: i === 0, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
      h.world.climbables,
    );
    if (h.player.move === "climb") climbed = true;
    if (h.player.y >= 8.3) break;
  }
  assert.ok(climbed);
  assert.ok(h.player.y >= 6, `ladder height ${h.player.y}`);
  // Release at the top and move onto the hill's own supported terrace.
  stepPlayer(
    h.player,
    { x: -1, y: 0, jump: true, jumpHeld: false },
    1 / 60,
    0,
    h.world.solids,
    h.world.climbables,
  );
  h.walk(-21, -23);
  assert.ok(h.player.grounded && Math.abs(h.player.y - 6) < 0.01);
  // Return via the full west stair route and test the trunk at the path edge.
  h.walk(-16, -19);
  h.walk(-16, 14);
  h.walk(-29, 20);
  h.walk(-29, 27);
  for (let i = 0; i < 100; i++)
    stepPlayer(
      h.player,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(h.player.z < 29.3, "solid trunk blocks walking");
  h.walk(-32, 27);
  h.walk(-32, 34);
  h.world.dispose();
});
test("spillway warns before surge, recovers to dry bank with carrier, and east bypass stays dry", () => {
  const h = setup();
  for (const p of MORMON_ROUTE.outward) h.walk(p.x, p.z);
  h.runtime.update(0, h.player, { ...idle, interact: true });
  for (const p of MORMON_ROUTE.return.slice(0, 4)) h.walk(p.x, p.z);
  h.walk(30, 14);
  while (h.state().elapsed % 10 < 5 || h.state().elapsed % 10 > 7)
    h.runtime.update(0.05, h.player, idle);
  Object.assign(h.player, { x: 30, y: 0, z: 26 });
  h.runtime.update(0.01, h.player, idle);
  assert.equal(h.state().recoveries, 1);
  assert.equal(h.state().carrying, true);
  assert.equal(h.player.z, 14);
  assert.equal(h.player.x, 30);
  h.walk(42, 14);
  h.walk(42, 35);
  assert.equal(h.state().recoveries, 1);
  h.world.dispose();
});
test("carrier follows player yaw and ladder attempts retain ownership at the safe checkpoint", () => {
  const h = setup();
  for (const p of MORMON_ROUTE.outward) h.walk(p.x, p.z);
  h.runtime.update(0, h.player, { ...idle, interact: true });
  h.player.yaw = Math.PI / 2;
  h.runtime.update(0.01, h.player, idle);
  const bundle = h.scene.getObjectByName("Secured record bundle")!;
  assert.ok(Math.abs(bundle.position.x - (h.player.x - 0.45)) < 0.001);
  assert.equal(bundle.rotation.y, h.player.yaw);
  h.player.climbId = "shim-ladder";
  h.runtime.update(0.01, h.player, idle);
  assert.equal(h.state().carrying, true);
  assert.equal(h.state().recoveries, 1);
  assert.equal(h.player.climbId, undefined);
  assert.equal(h.player.x, h.state().checkpoint.x);
  assert.equal(h.player.y, h.state().checkpoint.y);
  h.world.dispose();
});
