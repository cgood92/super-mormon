import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPlayer } from "../src/super/physics";
import { createStoryScene, findStoryPath } from "../src/super/story-scenes";
import type { WorldData } from "../src/super/worlds";

function fixture(): WorldData {
  return {
    name: "test",
    subtitle: "test",
    spawn: { x: 0, y: 0, z: 10 },
    solids: [],
    bounds: { minX: -30, maxX: 30, minZ: -35, maxZ: 75 },
    story: {
      laban: { x: 0, y: 0, z: -20 },
      gate: { x: 0, y: 0, z: 40 },
      cave: { x: -8, y: 0, z: 64 },
      brothers: { x: 0, y: 0, z: 43 },
      treasury: { x: 14, y: 0, z: -17 },
      plates: { x: 14, y: 0, z: -22 },
    },
    goal: { x: 0, y: 0, z: -20 },
    pursuers: [{ x: -25, y: 0, z: -25 }],
  };
}

test("night mission requires the account, Zoram, plates, gate, and return in order", () => {
  const scene = new T.Scene();
  const world = fixture();
  world.story!.gate.z = 28;
  const player = createPlayer(0, 0, 43);
  const dialogs: { title: string; next: () => void }[] = [];
  let completed = 0;
  let disguise = false;
  const mission = createStoryScene("night", scene, world, {
    dialog: (_kicker, title, _body, next) => dialogs.push({ title, next }),
    toast: () => {},
    complete: () => completed++,
    checkpoint: () => {},
    setMarker: () => {},
    setDisguise: (value) => {
      disguise = value;
    },
    caught: () => {},
  });
  const interact = () => mission.update(0.016, player, { interact: true });
  interact();
  assert.equal(dialogs.length, 0);
  player.z = -20;
  interact();
  assert.equal(dialogs[0].title, "A difficult account");
  assert.equal(disguise, false);
  dialogs.shift()!.next();
  assert.equal(disguise, true);
  assert.equal((mission.snapshot() as { phase: string }).phase, "zoram");
  player.x = 14;
  player.z = -22;
  interact();
  assert.equal(dialogs.length, 0);
  player.z = -17;
  interact();
  assert.equal(dialogs[0].title, "Meet Zoram");
  dialogs.shift()!.next();
  player.z = -22;
  for (let i = 0; i < 25; i++) mission.update(0.1, player, { interact: false });
  interact();
  assert.equal((mission.snapshot() as { phase: string }).phase, "escape");
  player.x = 0;
  player.z = 43;
  interact();
  assert.equal(completed, 0);
  player.z = 28;
  mission.update(0.016, player, { interact: false });
  assert.equal(
    (mission.snapshot() as { passedGate: boolean }).passedGate,
    false,
  );
  player.z = 30;
  mission.update(0.016, player, { interact: false });
  assert.equal(
    (mission.snapshot() as { passedGate: boolean }).passedGate,
    true,
  );
  player.z = 40;
  for (let i = 0; i < 220; i++)
    mission.update(0.1, player, { interact: false });
  interact();
  assert.equal(dialogs[0].title, "Together outside the city");
  assert.equal(completed, 0);
  dialogs.shift()!.next();
  assert.equal(completed, 1);
  mission.dispose();
});

test("trade cannot complete at the gate without reaching the cave with the brothers", () => {
  const scene = new T.Scene();
  const world = fixture();
  const player = createPlayer(0, 0, -20);
  const dialogs: (() => void)[] = [];
  let completed = 0;
  const mission = createStoryScene("trade", scene, world, {
    dialog: (_kicker, _title, _body, next) => dialogs.push(next),
    toast: () => {},
    complete: () => completed++,
    checkpoint: () => {},
    setMarker: () => {},
    setDisguise: () => {},
    caught: () => {},
  });
  mission.update(0.016, player, { interact: true });
  assert.equal(dialogs.length, 1);
  dialogs.shift()!();
  player.z = 35;
  mission.update(0.016, player, { interact: true });
  assert.equal((mission.snapshot() as { phase: string }).phase, "flee");
  player.z = 42;
  mission.update(0.016, player, { interact: true });
  assert.equal((mission.snapshot() as { phase: string }).phase, "cave");
  assert.equal(completed, 0);
  player.x = -8;
  player.z = 64;
  mission.update(0.016, player, { interact: true });
  assert.equal(dialogs.length, 0);
  assert.equal(completed, 0);
  player.x = 20;
  player.z = 20;
  mission.respawn(player);
  assert.equal((mission.snapshot() as { phase: string }).phase, "cave");
  assert.equal(player.z, 44);
  assert.equal(player.x, 0);
  mission.dispose();
});

test("story guards catch at ground height but not when the player is airborne", () => {
  const scene = new T.Scene();
  const world = fixture();
  world.pursuers = [{ x: 0, y: 0, z: 0 }];
  const player = createPlayer(0, 3, 0);
  let catches = 0;
  const mission = createStoryScene("night", scene, world, {
    dialog: () => {},
    toast: () => {},
    complete: () => {},
    checkpoint: () => {},
    setMarker: () => {},
    setDisguise: () => {},
    caught: () => catches++,
  });
  for (let i = 0; i < 28; i++) mission.update(0.1, player, { interact: false });
  assert.equal(catches, 0);
  player.y = 0;
  mission.update(0.1, player, { interact: false });
  assert.equal(catches, 1);
  mission.dispose();
});

test("NPC route goes around a wall through an opening", () => {
  const world = fixture();
  world.solids = [
    { x: -8, y: 0, z: 0, w: 12, h: 4, d: 1 },
    { x: 8, y: 0, z: 0, w: 12, h: 4, d: 1 },
  ];
  const path = findStoryPath({ x: -8, z: -8 }, { x: -8, z: 8 }, world);
  assert.ok(path.length > 0);
  assert.ok(path.some((p) => Math.abs(p.x) < 1.4 && Math.abs(p.z) < 2));
  assert.ok(
    path.every((p) =>
      world.solids.every(
        (s) =>
          Math.abs(p.x - s.x) >= s.w / 2 + 0.39 ||
          Math.abs(p.z - s.z) >= s.d / 2 + 0.39,
      ),
    ),
  );
});

function hooksForTest() {
  const dialogs: (() => void)[] = [];
  const toasts: string[] = [];
  let catches = 0;
  return {
    dialogs,
    toasts,
    get catches() {
      return catches;
    },
    hooks: {
      dialog: (_k: string, _t: string, _b: string, next: () => void) =>
        dialogs.push(next),
      toast: (text: string) => toasts.push(text),
      complete: () => {},
      checkpoint: () => {},
      setMarker: () => {},
      setDisguise: () => {},
      caught: () => {
        catches++;
      },
    },
  };
}

test("four treasure parcels follow their carriers, then stay seized by Laban", () => {
  const scene = new T.Scene(),
    world = fixture(),
    events = hooksForTest();
  const mission = createStoryScene("trade", scene, world, events.hooks);
  const player = createPlayer(0, 0, -20);
  player.yaw = Math.PI / 2;
  mission.update(0.1, player, { interact: true });
  let state = mission.snapshot() as {
    treasureHeld: boolean;
    treasure: { x: number; y: number; z: number }[];
  };
  assert.equal(state.treasureHeld, true);
  assert.equal(state.treasure.length, 4);
  assert.ok(Math.abs(state.treasure[0].x - 0.78) < 0.001);
  assert.ok(state.treasure.every((item) => item.y > 1));
  events.dialogs.shift()!();
  state = mission.snapshot() as typeof state;
  assert.equal(state.treasureHeld, false);
  const seized = state.treasure;
  assert.ok(
    seized.every((item) => Math.abs(item.z - world.story!.laban.z) < 2),
  );
  assert.ok(events.toasts.some((toast) => toast.includes("seized")));
  player.x = 20;
  mission.update(0.1, player, { interact: false });
  assert.deepEqual((mission.snapshot() as typeof state).treasure, seized);
  mission.respawn(player);
  assert.equal((mission.snapshot() as typeof state).treasureHeld, false);
  mission.dispose();
  assert.equal(
    scene.children.filter((item) => item.name.startsWith("family-treasure-"))
      .length,
    0,
  );
});

test("night guards detect at short range, move slowly, and stop outside their leash", () => {
  const world = fixture();
  world.pursuers = [{ x: 0, y: 0, z: 0 }];
  const events = hooksForTest();
  const mission = createStoryScene("night", new T.Scene(), world, events.hooks);
  const player = createPlayer(5, 0, 0);
  for (let i = 0; i < 30; i++) mission.update(0.1, player, { interact: false });
  type Guards = { guards: { x: number; z: number; speed: number }[] };
  assert.equal((mission.snapshot() as Guards).guards[0].x, 0);
  player.x = 3;
  mission.update(0.1, player, { interact: false });
  const pursuing = (mission.snapshot() as Guards).guards[0];
  assert.ok(pursuing.speed > 0 && pursuing.speed <= 2.2 + 0.001);
  player.x = 7;
  mission.update(0.1, player, { interact: false });
  assert.equal((mission.snapshot() as Guards).guards[0].speed, 0);
  mission.dispose();
  const tradeEvents = hooksForTest();
  const trade = createStoryScene(
    "trade",
    new T.Scene(),
    world,
    tradeEvents.hooks,
  );
  player.x = 0;
  player.z = -20;
  trade.update(0.1, player, { interact: true });
  tradeEvents.dialogs.shift()!();
  player.x = 3;
  player.z = 0;
  trade.update(0.1, player, { interact: false });
  assert.ok((trade.snapshot() as Guards).guards[0].speed > pursuing.speed);
  trade.dispose();
});

test("courtyard walls block guard contact and Laban prompts and dialogue", () => {
  const world = fixture();
  world.pursuers = [{ x: 0, y: 0, z: 0 }];
  world.solids = [{ x: 0.45, y: 0, z: 0, w: 0.2, h: 4, d: 6 }];
  const events = hooksForTest();
  const mission = createStoryScene("night", new T.Scene(), world, events.hooks);
  const player = createPlayer(0.9, 0, 0);
  for (let i = 0; i < 40; i++) mission.update(0.1, player, { interact: false });
  assert.equal(events.catches, 0);
  world.story!.laban.x = 0;
  world.story!.laban.z = 0;
  const result = mission.update(0.1, player, { interact: true });
  assert.equal(result.prompt, "");
  assert.equal(events.dialogs.length, 0);
  mission.dispose();
});

test("brothers keep distinct procession positions before enough breadcrumbs exist", () => {
  const world = fixture();
  world.spawn.yaw = Math.PI;
  const events = hooksForTest();
  const mission = createStoryScene("trade", new T.Scene(), world, events.hooks);
  const player = createPlayer(world.spawn.x, 0, world.spawn.z);
  player.yaw = Math.PI;
  for (let i = 0; i < 90; i++) mission.update(0.1, player, { interact: false });
  const state = mission.snapshot() as {
    brothers: { x: number; z: number }[];
    treasure: { x: number; z: number }[];
  };
  for (let i = 0; i < state.brothers.length; i++) {
    const brother = state.brothers[i];
    assert.ok(Math.hypot(brother.x - player.x, brother.z - player.z) > 2);
    for (let j = i + 1; j < state.brothers.length; j++)
      assert.ok(
        Math.hypot(
          brother.x - state.brothers[j].x,
          brother.z - state.brothers[j].z,
        ) > 1.2,
      );
  }
  assert.equal(state.treasure.length, 4);
  for (let i = 0; i < state.treasure.length; i++)
    for (let j = i + 1; j < state.treasure.length; j++)
      assert.ok(
        Math.hypot(
          state.treasure[i].x - state.treasure[j].x,
          state.treasure[i].z - state.treasure[j].z,
        ) > 1,
      );
  mission.dispose();
});

test("night Laban transfers his armor only after confirmation and remains covered after respawn", () => {
  const scene = new T.Scene(),
    world = fixture(),
    events = hooksForTest();
  const mission = createStoryScene("night", scene, world, events.hooks);
  const before = scene.getObjectByName("laban-character")!;
  assert.ok(before.getObjectByName("flowing-mantle"));
  let disposed = 0;
  before.traverse((object) => {
    if (object instanceof T.Mesh)
      object.geometry.addEventListener("dispose", () => disposed++);
  });
  const player = createPlayer(0, 0, -20);
  mission.update(0.016, player, { interact: true });
  assert.equal(scene.getObjectByName("laban-undressed-character"), undefined);
  const position = before.position.clone(),
    rotation = before.rotation.clone();
  events.dialogs.shift()!();
  const after = scene.getObjectByName("laban-undressed-character")!;
  const covering = after.getObjectByName(
    "continuous-robe-and-sleeves",
  ) as T.Mesh;
  assert.ok(covering, "Laban retains a continuous modest covering");
  assert.equal(after.getObjectByName("flowing-mantle"), undefined);
  // Laban is lying down; measure the covering in garment coordinates.
  covering.geometry.computeBoundingBox();
  const coveringBounds = covering.geometry.boundingBox!;
  assert.ok(coveringBounds.max.y - coveringBounds.min.y > 0.65);
  assert.equal(scene.getObjectByName("laban-character"), undefined);
  assert.ok(disposed > 0);
  assert.deepEqual(after.position, position);
  assert.deepEqual(after.rotation.toArray(), rotation.toArray());
  mission.respawn(player);
  assert.equal(scene.getObjectByName("laban-undressed-character"), after);
  let afterDisposed = 0;
  after.traverse((object) => {
    if (object instanceof T.Mesh)
      object.geometry.addEventListener("dispose", () => afterDisposed++);
  });
  mission.dispose();
  assert.ok(afterDisposed > 0);
  assert.equal(scene.children.length, 0);
});

test("trade pursuit waits through idle refusal and retry until the player moves", () => {
  const world = fixture();
  world.pursuers = [{ x: 0, y: 0, z: -15 }];
  const events = hooksForTest();
  const mission = createStoryScene("trade", new T.Scene(), world, events.hooks);
  const player = createPlayer(0, 0, -20);
  mission.update(0.1, player, { interact: true });
  events.dialogs.shift()!();
  type Snapshot = {
    pursuitArmed: boolean;
    guards: { x: number; z: number; speed: number }[];
  };
  const state = () => mission.snapshot() as Snapshot;
  for (let i = 0; i < 120; i++)
    mission.update(0.1, player, { interact: false });
  assert.equal(state().pursuitArmed, false);
  assert.deepEqual(state().guards, [{ x: 0, z: -15, speed: 0 }]);
  assert.equal(events.catches, 0);
  player.x += 0.3;
  mission.update(0.1, player, { interact: false });
  assert.equal(state().pursuitArmed, true);
  assert.ok(state().guards[0].speed > 0);
  for (let i = 0; i < 60; i++) mission.update(0.1, player, { interact: false });
  assert.equal(events.catches, 1);
  mission.respawn(player);
  const retryGuards = state().guards;
  for (let i = 0; i < 120; i++)
    mission.update(0.1, player, { interact: false });
  assert.equal(state().pursuitArmed, false);
  assert.deepEqual(state().guards, retryGuards);
  assert.equal(events.catches, 1);
  player.x += 0.3;
  mission.update(0.1, player, { interact: false });
  assert.equal(state().pursuitArmed, true);
  assert.ok(state().guards[0].speed > 0);
  assert.equal(events.catches, 1);
  mission.dispose();
});
