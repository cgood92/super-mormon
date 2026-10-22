import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { FollowCamera, resolveCameraPosition } from "../src/super/camera.ts";
import { createCharacter } from "../src/super/character.ts";
import { createPlayer, stepPlayer } from "../src/super/physics.ts";

test("camera ray stops in front of solid walls without clipping through them", () => {
  const target = new T.Vector3(0, 1.2, 0);
  const desired = new T.Vector3(0, 3.5, -5.5);
  const wall = { x: 0, y: 0, z: -2.4, w: 3, h: 5, d: 0.5 };
  const safe = resolveCameraPosition(target, desired, [wall]);
  assert.ok(safe.z > -1.9, `camera z ${safe.z} crossed the wall`);
  assert.ok(safe.distanceTo(target) > 0.5);
});

test("follow camera responds to manual orbit and recenters behind player", () => {
  const camera = new T.PerspectiveCamera(65, 1, 0.08, 100);
  const follow = new FollowCamera(camera);
  const p = { x: 1, y: 0, z: 2, yaw: 0, grounded: true, runSpeed: 0 };
  follow.reset(p);
  assert.ok(camera.position.z < p.z);
  follow.update(
    1 / 60,
    p,
    [],
    { orbitX: Math.PI / 2, orbitY: 0, recenter: false },
    "hub",
  );
  assert.ok(Math.abs(follow.yaw - Math.PI / 2) < 0.01);
  follow.update(1 / 60, p, [], { orbitX: 0, orbitY: 0, recenter: true }, "hub");
  for (let i = 0; i < 180; i++)
    follow.update(
      1 / 60,
      p,
      [],
      { orbitX: 0, orbitY: 0, recenter: false },
      "hub",
    );
  assert.ok(Math.abs(follow.yaw) < 0.05);
});

test("world cameras frame the character from an elevated exploration distance", () => {
  const p = { x: 0, y: 0, z: 0, yaw: 0, grounded: true, runSpeed: 0 };
  for (const [mode, minimum] of [
    ["hub", 7.3],
    ["streets", 6.9],
    ["house", 6.0],
    ["palace", 6.9],
  ] as const) {
    const camera = new T.PerspectiveCamera(58, 1, 0.08, 150);
    const follow = new FollowCamera(camera);
    follow.reset(p, 0, mode);
    assert.ok(
      camera.position.distanceTo(new T.Vector3(0, 1.1, 0)) >= minimum,
      `${mode} too close`,
    );
    assert.ok(follow.pitch >= 0.5, `${mode} camera too low`);
  }
});

test("camera zoom steps closer and farther without changing its aim", () => {
  const camera = new T.PerspectiveCamera(65, 1, 0.08, 100);
  const follow = new FollowCamera(camera);
  const p = { x: 0, y: 0, z: 0, yaw: 0, runSpeed: 0 };
  const target = new T.Vector3(0, 1.1, 0);
  const orbit = (zoom: number) => ({
    orbitX: 0,
    orbitY: 0,
    recenter: false,
    zoom,
  });
  follow.reset(p);
  const originalDistance = camera.position.distanceTo(target);
  const originalPitch = follow.pitch;
  follow.update(1 / 60, p, [], orbit(-1));
  const nearDistance = camera.position.distanceTo(target);
  assert.ok(
    nearDistance < originalDistance,
    "C-Up should move the camera closer",
  );
  assert.equal(follow.pitch, originalPitch);
  assert.equal(follow.yaw, 0);
  follow.update(1 / 60, p, [], orbit(1));
  for (let i = 0; i < 180; i++) follow.update(1 / 60, p, [], orbit(0));
  assert.ok(
    Math.abs(camera.position.distanceTo(target) - originalDistance) < 0.05,
  );
  follow.update(1 / 60, p, [], orbit(1));
  for (let i = 0; i < 180; i++) follow.update(1 / 60, p, [], orbit(0));
  assert.ok(camera.position.distanceTo(target) > originalDistance + 2);
});

test("camera zoom clamps at its closest and farthest preset and resets to default", () => {
  const camera = new T.PerspectiveCamera(65, 1, 0.08, 100);
  const follow = new FollowCamera(camera);
  const p = { x: 0, y: 0, z: 0, yaw: 0, runSpeed: 0 };
  const target = new T.Vector3(0, 1.1, 0);
  const orbit = (zoom: number) => ({
    orbitX: 0,
    orbitY: 0,
    recenter: false,
    zoom,
  });
  follow.reset(p);
  for (let i = 0; i < 10; i++) follow.update(1 / 60, p, [], orbit(-1));
  assert.ok(Math.abs(camera.position.distanceTo(target) - 7.4 * 0.6) < 0.05);
  for (let i = 0; i < 10; i++) follow.update(1 / 60, p, [], orbit(1));
  for (let i = 0; i < 180; i++) follow.update(1 / 60, p, [], orbit(0));
  assert.ok(Math.abs(camera.position.distanceTo(target) - 7.4 * 1.4) < 0.05);
  follow.reset(p);
  assert.ok(Math.abs(camera.position.distanceTo(target) - 7.4) < 0.001);
});

test("far zoom still stops in front of a wall", () => {
  const camera = new T.PerspectiveCamera(65, 1, 0.08, 100);
  const follow = new FollowCamera(camera);
  const p = { x: 0, y: 0, z: 0, yaw: 0, runSpeed: 0 };
  const wall = { x: 0, y: 0, z: -8.4, w: 3, h: 12, d: 0.5 };
  follow.reset(p);
  follow.update(1 / 60, p, [wall], {
    orbitX: 0,
    orbitY: 0,
    recenter: false,
    zoom: 1,
  });
  for (let i = 0; i < 180; i++)
    follow.update(1 / 60, p, [wall], { orbitX: 0, orbitY: 0, recenter: false });
  assert.ok(
    camera.position.z < -7.5,
    `camera z ${camera.position.z} ignored far zoom`,
  );
  assert.ok(
    camera.position.z > -8.15,
    `camera z ${camera.position.z} crossed wall`,
  );
});

test("character feet stay at player height and motion animates limbs", () => {
  const character = createCharacter("nephi");
  const still = {
    x: 2,
    y: 1.4,
    z: 3,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    grounded: true,
    runSpeed: 0,
  };
  character.update(1 / 60, still);
  assert.equal(character.group.position.y, still.y);
  const bounds = new T.Box3().setFromObject(character.group);
  assert.ok(
    bounds.max.y - still.y <= 1.66,
    `head exceeds collision height: ${bounds.max.y - still.y}`,
  );
  const initial = character.group.getObjectByName("left-leg")?.rotation.x;
  for (let i = 0; i < 12; i++)
    character.update(1 / 60, { ...still, vz: 5, runSpeed: 5 });
  assert.notEqual(
    character.group.getObjectByName("left-leg")?.rotation.x,
    initial,
  );
  character.dispose();
});

test("holding a lateral direction does not make the camera and player spiral", () => {
  const p = createPlayer();
  const follow = new FollowCamera(new T.PerspectiveCamera(65, 1, 0.08, 100));
  follow.reset(p);
  for (let i = 0; i < 360; i++) {
    stepPlayer(
      p,
      { x: 1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      follow.yaw,
      [],
    );
    follow.update(
      1 / 60,
      p,
      [],
      { orbitX: 0, orbitY: 0, recenter: false },
      "hub",
    );
  }
  assert.ok(Math.abs(follow.yaw) < 0.2, `camera rotated ${follow.yaw} radians`);
  assert.ok(Math.abs(p.z) < 2, `lateral movement curved ${p.z} units`);
});

test("character faces its spawn heading on the first frame", () => {
  const character = createCharacter("nephi");
  character.update(1 / 60, {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI,
    grounded: true,
    runSpeed: 0,
  });
  assert.ok(Math.abs(character.group.children[0].rotation.y - Math.PI) < 0.01);
  character.dispose();
});
