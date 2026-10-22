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
