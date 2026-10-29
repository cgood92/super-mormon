import test from "node:test";
import assert from "node:assert/strict";
import { createPlayer, type Solid } from "./physics";
import {
  createCarryObject,
  dropObject,
  nearestCarryObject,
  objectInTarget,
  pickUp,
  resetCarryObject,
  stepCarryObjects,
  throwObject,
} from "./objects";

test("pickup requires proximity and an unobstructed view", () => {
  const player = createPlayer();
  const object = createCarryObject("cube", 0, 0.28, 1.2);
  const wall: Solid = { x: 0, y: 0, z: 0.6, w: 3, h: 2.5, d: 0.2 };
  assert.equal(nearestCarryObject(player, [object], [wall]), null);
  assert.equal(pickUp(object, player, [wall]), false);
  assert.equal(nearestCarryObject(player, [object], []), object);
  assert.equal(pickUp(object, player, []), true);
  assert.equal(object.held, true);
  assert.equal(object.z, 0.8);
});

test("carried object stays on the near side of a wall when the owner moves", () => {
  const player = createPlayer();
  const object = createCarryObject("cube", 0, 0.28, 0.4);
  assert.equal(pickUp(object, player, []), true);
  const wall: Solid = { x: 0, y: 0, z: 1.3, w: 3, h: 2.5, d: 0.2 };
  player.z = 0.5;
  stepCarryObjects([object], player, 1 / 60, [wall]);
  assert.ok(object.z <= wall.z - wall.d / 2 - object.radius + 0.001);
});

test("a crouching player carries an object below a crawl ceiling", () => {
  const player = createPlayer();
  player.crouching = true;
  const object = createCarryObject("cube", 0, 0.28, 0.4);
  const ceiling: Solid = { x: 0, y: 1.02, z: 0.5, w: 3, h: 0.3, d: 3 };
  assert.equal(pickUp(object, player, [ceiling]), true);
  assert.equal(object.y, 0.6);
  player.z = 0.2;
  stepCarryObjects([object], player, 1 / 60, [ceiling]);
  assert.equal(object.y, 0.6);
  assert.ok(object.y + object.radius < ceiling.y);
});

test("a blocked throw stays held, and a fast loose throw cannot tunnel through a wall", () => {
  const player = createPlayer();
  const object = createCarryObject("cube", 0, 0.28, 0.3);
  assert.equal(pickUp(object, player, []), true);
  const nearWall: Solid = { x: 0, y: 0, z: 1.15, w: 3, h: 2.5, d: 0.08 };
  assert.equal(throwObject(object, player, [nearWall]), false);
  assert.equal(object.held, true);
  const farWall: Solid = { x: 0, y: 0, z: 3, w: 3, h: 2.5, d: 0.08 };
  assert.equal(throwObject(object, player, [farWall]), true);
  object.vz = 120;
  stepCarryObjects([object], player, 1 / 10, [farWall]);
  assert.ok(object.z <= farWall.z - farWall.d / 2 - object.radius + 0.001);
});

test("thrown object lands on a raised platform and target needs a slow grounded object", () => {
  const player = createPlayer();
  const object = createCarryObject("cube", 0, 3.5, 0);
  const platform: Solid = { x: 0, y: 0, z: 0, w: 3, h: 1.5, d: 3 };
  for (let i = 0; i < 180; i++)
    stepCarryObjects([object], player, 1 / 60, [platform]);
  assert.equal(object.grounded, true);
  assert.ok(
    Math.abs(object.y - (platform.y + platform.h + object.radius)) < 0.002,
  );
  const target = { x: 0, y: 1.5, z: 0, radius: 0.5 };
  assert.equal(objectInTarget(object, target), true);
  object.vx = 1;
  assert.equal(objectInTarget(object, target), false);
  object.vx = 0;
  object.held = true;
  assert.equal(objectInTarget(object, target), false);
  assert.equal(dropObject(object), true);
  resetCarryObject(object);
  assert.deepEqual([object.x, object.y, object.z], [0, 3.5, 0]);
});

test("an object loses grounded status when it rolls off a raised platform", () => {
  const player = createPlayer();
  const object = createCarryObject("cube", 0.8, 1.28, 0);
  const platform: Solid = { x: 0, y: 0, z: 0, w: 2, h: 1, d: 2 };
  object.grounded = true;
  object.vx = 8;
  stepCarryObjects([object], player, 0.2, [platform]);
  assert.ok(object.x > platform.w / 2 + object.radius);
  assert.equal(object.grounded, false);
  assert.ok(object.y < 1 + object.radius);
});
