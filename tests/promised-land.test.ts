import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildPromisedLand } from "../src/super/promised-land";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function setup() {
  const scene = new T.Scene(),
    world = buildPromisedLand(scene);
  let completed = 0,
    dialogs = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_a, _b, _c, next) {
      dialogs++;
      next();
    },
  });
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      following: boolean;
      lehi: { x: number; y: number; z: number };
      grave: { x: number; y: number; z: number };
      settlement: { x: number; y: number; z: number };
      followers: { x: number; y: number; z: number }[];
    };
  const tick = (dt = 0.1) => {
    world.update?.(dt, player);
    runtime.update(dt, player, idle);
  };
  return {
    scene,
    world,
    runtime,
    player,
    state,
    tick,
    completed: () => completed,
    dialogs: () => dialogs,
  };
}
function walk(h: ReturnType<typeof setup>, x: number, z: number) {
  for (let i = 0; i < 1600; i++) {
    const dx = x - h.player.x,
      dz = z - h.player.z,
      d = Math.hypot(dx, dz);
    if (d < 0.3) return;
    stepPlayer(
      h.player,
      {
        x: (-dx / d) * Math.min(1, d),
        y: (dz / d) * Math.min(1, d),
        jump: false,
        jumpHeld: false,
      },
      1 / 60,
      0,
      h.world.solids,
    );
    h.tick(1 / 60);
  }
  assert.fail(
    `route blocked to ${x},${z}: ${h.player.x},${h.player.y},${h.player.z}`,
  );
}
function burial(h: ReturnType<typeof setup>) {
  for (let i = 0; i < 1800 && h.state().phase !== "burial"; i++) h.tick();
  assert.equal(h.state().phase, "burial");
  Object.assign(h.player, h.state().grave, { x: h.state().grave.x + 2 });
  h.runtime.update(0.016, h.player, { ...idle, interact: true });
  assert.equal(h.state().phase, "journey");
}

test("Lehi walks inland, rests, and one burial interaction begins the journey without dialogs", () => {
  const h = setup();
  assert.equal(h.state().phase, "shore");
  Object.assign(h.player, h.state().settlement);
  h.runtime.update(0.1, h.player, {
    ...idle,
    interact: true,
    interactHeld: true,
  });
  assert.equal(
    h.completed(),
    0,
    "finding the future settlement before the burial cannot complete",
  );
  Object.assign(h.player, h.world.spawn);
  const start = { ...h.state().lehi };
  for (let i = 0; i < 60; i++) h.tick();
  assert.ok(
    Math.hypot(h.state().lehi.x - start.x, h.state().lehi.z - start.z) > 1,
  );
  assert.equal(h.completed(), 0);
  burial(h);
  assert.equal(h.state().following, true);
  const count = h.world.solids.length;
  h.runtime.update(0.1, h.player, { ...idle, interact: true });
  assert.equal(
    h.world.solids.length,
    count,
    "repeated action cannot bury Lehi twice",
  );
  assert.equal(h.dialogs(), 0);
  assert.equal(h.scene.getObjectByName("lehi-character")!.visible, false);
  assert.ok(h.scene.getObjectByName("Quiet memorial stone")!.visible);
  assert.equal(h.scene.getObjectByName("Temple foundation"), undefined);
  assert.equal(
    h.scene.getObjectByName("Blue next task beacon")!.visible,
    false,
  );
  h.world.dispose!();
});

test("branching mountain valleys support two ordinary routes and complete only at the settlement circle", () => {
  for (const side of [-1, 1]) {
    const h = setup();
    burial(h);
    assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
    walk(h, -15, 12);
    walk(h, side * 20, 12);
    walk(h, side * 20, -18);
    walk(h, 0, -18);
    walk(h, 0, -54);
    walk(h, side * 20, -54);
    walk(h, side * 20, -91);
    walk(h, 25, -91);
    assert.equal(h.completed(), 0);
    for (let i = 0; i < 600; i++) h.tick();
    assert.ok(
      h.state().followers.every((p) => p.z < -50),
      "willing families physically follow the chosen branch",
    );
    walk(h, 25, -105);
    assert.equal(h.completed(), 1);
    for (let i = 0; i < 10; i++) h.tick();
    assert.equal(h.completed(), 1);
    assert.equal(h.dialogs(), 0);
    h.runtime.dispose();
    h.world.dispose!();
  }
});

test("promised-land resources release once and mountain surfaces have fitted collision", () => {
  const h = setup();
  let released = 0;
  const instances: T.InstancedMesh[] = [];
  h.scene.traverse((o) => {
    if (o instanceof T.InstancedMesh) {
      instances.push(o);
      o.addEventListener("dispose", () => released++);
    }
  });
  assert.ok(instances.length > 0);
  const ascent = createPlayer(0, 0, 14);
  for (let i = 0; i < 170; i++)
    stepPlayer(
      ascent,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(
    ascent.y > 5 && ascent.z < 1,
    "fitted mountain terraces support an ordinary ascent",
  );
  const p = createPlayer(0, 20, 0);
  for (let i = 0; i < 180; i++)
    stepPlayer(
      p,
      { x: 0, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
  assert.ok(p.grounded && p.y > 4, "mountain top supports a landing");
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  h.runtime.dispose();
  h.world.dispose!();
  h.world.dispose!();
  assert.equal(released, instances.length);
  assert.equal(h.scene.children.length, 0);
});
