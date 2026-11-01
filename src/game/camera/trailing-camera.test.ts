import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { FollowCamera, cameraSegmentClear } from "./camera";
import { createPlayer, stepPlayer } from "../physics/physics";
const still = { x: 0, y: 0, jump: false, jumpHeld: false };

test("held side input circles the trailing camera while forward input pulls it along", () => {
  const p = createPlayer();
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);
  follow.reset(p);
  const start = camera.position.clone();
  let turn = 0,
    previousYaw = follow.yaw;
  for (let i = 0; i < 600; i++) {
    stepPlayer(p, { ...still, x: -1 }, 1 / 60, follow.yaw, []);
    follow.update(1 / 60, p, []);
    turn += Math.atan2(
      Math.sin(follow.yaw - previousYaw),
      Math.cos(follow.yaw - previousYaw),
    );
    previousYaw = follow.yaw;
  }
  assert.ok(turn > Math.PI * 2, `held left turned only ${turn} radians`);
  assert.ok(
    camera.position.distanceTo(start) < 2,
    "camera should remain near the circle center",
  );
  const straight = createPlayer();
  follow.reset(straight);
  for (let i = 0; i < 120; i++) {
    stepPlayer(straight, { ...still, y: 1 }, 1 / 60, follow.yaw, []);
    follow.update(1 / 60, straight, []);
  }
  assert.ok(straight.z > 10 && Math.abs(straight.x) < 0.01);
  assert.ok(
    camera.position.z > 2,
    "straight running must pull the camera forward",
  );
  assert.ok(
    camera.position.y - straight.y < 3,
    "view should be near the player, with a visible horizon",
  );
});

test("a nearby wall cannot trap a trailing camera after the wall moves into its eye", () => {
  const p = createPlayer();
  const camera = new T.PerspectiveCamera(58, 1, 0.08, 200);
  const follow = new FollowCamera(camera);
  follow.reset(p);
  const wall = {
    x: camera.position.x,
    y: 0,
    z: camera.position.z,
    w: 2,
    h: 6,
    d: 2,
  };
  for (let i = 0; i < 30; i++) follow.update(1 / 60, p, [wall]);
  assert.ok(
    cameraSegmentClear(camera.position, camera.position, [wall], 0.18),
    "recover embedded eye",
  );
  const recovered = camera.position.clone();
  follow.update(1 / 60, p, [wall]);
  assert.ok(
    cameraSegmentClear(recovered, camera.position, [wall], 0.18),
    "recovered eye must continue moving without crossing the wall",
  );
  follow.update(1 / 60, p, []);
  assert.equal(follow.obstructed, false);
});

test("trailing camera motion stays clear while orbiting around a solid corner", () => {
  const p = createPlayer(),
    camera = new T.PerspectiveCamera(58, 1, 0.08, 200),
    follow = new FollowCamera(camera);
  follow.reset(p);
  const wall = { x: -3, y: 0, z: -5, w: 2, h: 6, d: 2 };
  for (let i = 0; i < 100; i++) {
    const previous = camera.position.clone();
    follow.update(1 / 60, p, [wall], {
      orbitX: 0.025,
      orbitY: 0,
      recenter: false,
    });
    assert.ok(
      cameraSegmentClear(camera.position, camera.position, [wall], 0.18),
      `eye clear frame ${i}`,
    );
    assert.ok(
      cameraSegmentClear(previous, camera.position, [wall], 0.16),
      `swept eye clear frame ${i}`,
    );
  }
});

test("follow resumes from an authored view without immediately jumping to full distance", () => {
  const p = createPlayer(),
    camera = new T.PerspectiveCamera(58, 1, 0.08, 200),
    follow = new FollowCamera(camera);
  follow.reset(p);
  camera.position.set(3, 2, 0);
  camera.lookAt(0, 1, 0);
  follow.yaw = -Math.PI / 2;
  const previous = camera.position.clone();
  follow.update(1 / 60, p, []);
  assert.ok(
    camera.position.distanceTo(previous) < 0.7,
    "authored view should ease back to follow distance",
  );
  assert.ok(
    Math.abs(follow.yaw + Math.PI / 2) < 0.03,
    "movement reference should follow visible view",
  );
});

test("camera frames standing and jumping players on phone and desktop", () => {
  for (const aspect of [16 / 9, 390 / 844]) {
    const p = createPlayer(),
      camera = new T.PerspectiveCamera(58, aspect, 0.08, 200),
      follow = new FollowCamera(camera);
    follow.reset(p);
    for (let i = 0; i < 100; i++) {
      stepPlayer(
        p,
        { ...still, y: 1, jump: i === 20, jumpHeld: i >= 20 && i < 35 },
        1 / 60,
        follow.yaw,
        [],
      );
      follow.update(1 / 60, p, []);
      camera.updateMatrixWorld();
      for (const y of [p.y + 0.08, p.y + 1.65]) {
        const point = new T.Vector3(p.x, y, p.z).project(camera);
        assert.ok(
          Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.95 && point.z < 1,
          `aspect ${aspect}, frame ${i}: ${point.toArray()}`,
        );
      }
    }
  }
});
