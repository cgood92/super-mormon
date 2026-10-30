import test from "node:test";
import assert from "node:assert/strict";
import {
  createContest,
  tagHouse,
  visitHouse,
  advanceContest,
} from "./missionary-contest";
test("all sixteen doors must be blue; victory is immediate and permanent", () => {
  const game = createContest();
  for (let i = 0; i < 15; i++) tagHouse(game, i);
  assert.equal(game.won, false);
  tagHouse(game, 15);
  assert.equal(game.won, true);
  visitHouse(game, 0);
  assert.equal(game.houses[0], "blue");
});
test("opposition claims several doors within the opening minute", () => {
  const game = createContest();
  tagHouse(game, 0);
  for (let i = 0; i < 45 * 60; i++) advanceContest(game, 1 / 60);
  assert.ok(game.houses.filter((color) => color === "red").length >= 4);
});

import * as T from "three";
import { buildMissionaryNeighborhood } from "./missionary-neighborhood";
import { HOUSE_DOORS } from "./missionary-contest";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
test("normal movement can tag every door, win against visitors, retry, and collide with houses", () => {
  const scene = new T.Scene(),
    world = buildMissionaryNeighborhood(scene);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  const p = createPlayer(world.spawn.x, 0, world.spawn.z);
  const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
  let wins = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    complete() {},
    dialog() {},
    toast() {
      wins++;
    },
  });
  const tick = (x = 0, z = 0) => {
    stepPlayer(
      p,
      { x: -x, y: z, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
    runtime.update(1 / 60, p, idle);
  };
  const walk = (x: number, z: number) => {
    for (let n = 0; n < 1800; n++) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.35) return;
      tick(dx / d, dz / d);
    }
    assert.fail(`Blocked approaching ${x},${z} at ${p.x},${p.z}`);
  };
  walk(-36, 38);
  walk(-36, -18);
  walk(-27, -18);
  for (let pass = 0; pass < 3 && wins === 0; pass++) {
    for (let i = 0; i < 16; i++) {
      const door = HOUSE_DOORS[i];
      if (i === 0 && pass > 0) {
        walk(-36, p.z);
        walk(-36, door.z + 5);
      }
      if (i > 0 && door.z !== HOUSE_DOORS[i - 1].z) {
        const prev = HOUSE_DOORS[i - 1];
        walk(prev.x < 0 ? -36 : 36, prev.z + 5);
        walk(prev.x < 0 ? -36 : 36, door.z + 5);
      }
      walk(door.x, door.z + 5);
      walk(door.x, door.z + 1);
      walk(door.x, door.z + 5);
    }
  }
  assert.equal(
    wins,
    1,
    "An ordinary running route wins against the live visitors",
  );
  assert.equal((runtime.snapshot() as { won: boolean }).won, true);
  runtime.update(1 / 60, p, { ...idle, interact: true });
  assert.equal((runtime.snapshot() as { won: boolean }).won, false);
  // Walk straight into a front wall: the building must block the player.
  const door = HOUSE_DOORS[15];
  walk(door.x, door.z + 1);
  for (let i = 0; i < 120; i++) tick(0, -1);
  assert.ok(p.z > door.z - 1, "House wall blocks walking through it");
  world.dispose!();
  assert.equal(scene.children.length, 0);
});

import { buildWanderingElders } from "./missionary-actors";
test("elders begin together upstairs, wander to a lower floor, and stop for the player", () => {
  const root = new T.Group(),
    solids: import("../../physics/physics").Solid[] = [];
  const elders = buildWanderingElders(root, solids);
  elders.update(0);
  assert.equal(elders.point.y, 24);
  assert.equal(solids.length, 2);
  const player = createPlayer(elders.point.x + 0.6, 24, elders.point.z);
  const x = elders.point.x;
  for (let i = 0; i < 60; i++) elders.update(1 / 60, player);
  assert.equal(
    elders.point.x,
    x,
    "The pair wait rather than pass through a visitor",
  );
  let minY = 24;
  for (let i = 0; i < 24000; i++) {
    elders.update(1 / 60);
    minY = Math.min(minY, elders.point.y);
  }
  assert.equal(minY, 12, "Their authored promenade visits the second floor");
  assert.ok(
    Math.abs(solids[0].x - solids[1].x) < 1.31 &&
      Math.abs(solids[0].z - solids[1].z) < 1.31,
  );
});

import { gallery } from "../conference/conference-center";
test("elders follow the real Conference Center architecture to the lower landing", () => {
  const scene = new T.Scene(),
    world = gallery(scene),
    player = createPlayer(0, 0, 36);
  let minY = 24;
  for (let i = 0; i < 18000; i++) {
    world.update!(1 / 60, player);
    minY = Math.min(minY, world.secretEntrance!.y);
  }
  assert.equal(
    minY,
    12,
    "The complete authored route clears real floors, rails, walls, and stair treads",
  );
  world.dispose!();
});

import { missionaryActor } from "./missionary-actors";
import * as actors from "./missionary-actors";
test("visitors have blue shirts and brown trousers without changing elders", () => {
  const root = new T.Group();
  const elder = missionaryActor(root, true);
  const visitor = missionaryActor(root, false);
  const color = (actor: typeof elder, name: string) =>
    (
      (actor.group.getObjectByName(name) as T.Mesh)
        .material as T.MeshStandardMaterial
    ).color.getHex();
  assert.equal(color(visitor, "left-trouser"), 0x805b3b);
  assert.equal(color(visitor, "modern-waistband"), 0x805b3b);
  assert.equal(color(visitor, "continuous-robe-and-sleeves"), 0x4e91cf);
  assert.notEqual(color(elder, "left-trouser"), color(visitor, "left-trouser"));
  assert.equal(
    visitor.group.getObjectByName("missionary-name-tag")!.visible,
    false,
  );
  elder.dispose();
  visitor.dispose();
});
test("companion stays beside the player through turns and avoids buildings", () => {
  const root = new T.Group();
  const wall = { x: 1, y: 0, z: 0, w: 0.6, h: 3, d: 5 };
  const companion = actors.buildMissionaryCompanion(root, [wall]);
  const player = createPlayer(0, 0, 0);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4]) {
    player.yaw = yaw;
    companion.update(1 / 60, player);
    const p = companion.group.position;
    assert.ok(Math.hypot(p.x - player.x, p.z - player.z) <= 1.5);
    assert.ok(Math.hypot(p.x - player.x, p.z - player.z) >= 0.8);
    assert.ok(Math.abs(p.x - wall.x) >= 0.6 || Math.abs(p.z) >= 2.8);
  }
  player.x = 15;
  player.y = 2;
  player.z = 4;
  companion.update(1 / 60, player);
  assert.equal(companion.group.position.y, 2);
  assert.ok(
    companion.group.position.distanceTo(new T.Vector3(15, 2, 4)) <= 1.5,
  );
  companion.dispose();
  assert.equal(root.children.length, 0);
});
