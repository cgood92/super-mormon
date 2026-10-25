import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { FollowCamera, resolveCameraPosition } from "../src/super/camera.ts";
import { createCharacter } from "../src/super/character.ts";
import { createPlayer, stepPlayer } from "../src/super/physics.ts";

test("conference view shows more of large rooms without changing story presets", () => {
  const camera = new T.PerspectiveCamera(58, 1, 0.08, 320);
  const follow = new FollowCamera(camera);
  const player = { x: 0, y: 0, z: 0, yaw: Math.PI, grounded: true };
  follow.reset(player, player.yaw, "conference");
  assert.ok(follow.pitch < 0.3);
  assert.ok(camera.position.distanceTo(new T.Vector3(0, 2, 0)) > 9);
  follow.reset(player, player.yaw, "streets");
  assert.equal(follow.pitch, 0.53);
});

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
  assert.ok(follow.yaw > 0 && follow.yaw < Math.PI / 2);
  for (let i = 0; i < 20; i++)
    follow.update(1 / 60, p, [], { orbitX: 0, orbitY: 0, recenter: false });
  assert.ok(Math.abs(follow.yaw - Math.PI / 2) < 0.02);
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
  assert.ok(nearDistance > 7.4 * 0.6 + 0.5, "zoom should ease inward");
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
  for (let i = 0; i < 60; i++) follow.update(1 / 60, p, [], orbit(0));
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

test("wall obstruction clamps immediately and clears as space opens", () => {
  const camera = new T.PerspectiveCamera(65, 1, 0.08, 100);
  const follow = new FollowCamera(camera);
  const p = { x: 0, y: 0, z: 0, yaw: 0, runSpeed: 0 };
  const wall = { x: 0, y: 0, z: -2.4, w: 3, h: 6, d: 0.5 };
  follow.reset(p);
  follow.update(1 / 60, p, [wall]);
  assert.ok(follow.obstructed);
  assert.ok(follow.obstructionAmount > 0);
  assert.ok(camera.position.z > -2, "camera crossed wall while easing");
  follow.update(1 / 60, p, []);
  assert.equal(follow.obstructed, false);
  assert.equal(follow.obstructionAmount, 0);
  assert.ok(camera.position.z > -7, "camera should ease back outward");
});

test("eased zoom stays outside walls while the camera orbits", () => {
  const camera = new T.PerspectiveCamera(65, 1, 0.08, 100);
  const follow = new FollowCamera(camera);
  const p = { x: 0, y: 0, z: 0, yaw: 0, runSpeed: 0 };
  const wall = { x: -2, y: 0, z: -5.5, w: 2, h: 8, d: 0.8 };
  const target = new T.Vector3(0, 1.1, 0);
  follow.reset(p);
  for (let frame = 0; frame < 30; frame++) {
    follow.update(1 / 60, p, [wall], {
      orbitX: frame === 0 ? Math.PI / 2 : 0,
      orbitY: 0,
      recenter: false,
      zoom: frame === 0 ? -1 : 0,
    });
    const safe = resolveCameraPosition(target, camera.position, [wall]);
    assert.ok(
      safe.distanceTo(camera.position) < 0.001,
      `camera crossed wall on orbit frame ${frame}`,
    );
  }
});

test("manual orbit drag interrupts an easing C-button step", () => {
  const camera = new T.PerspectiveCamera(65, 1, 0.08, 100);
  const follow = new FollowCamera(camera);
  const p = { x: 0, y: 0, z: 0, yaw: 0, runSpeed: 0 };
  follow.reset(p);
  follow.update(1 / 60, p, [], {
    orbitX: Math.PI / 4,
    orbitY: 0,
    recenter: false,
  });
  const afterStep = follow.yaw;
  follow.update(1 / 60, p, [], { orbitX: -0.05, orbitY: 0, recenter: false });
  assert.ok(follow.yaw < afterStep);
  for (let i = 0; i < 30; i++) follow.update(1 / 60, p, []);
  assert.ok(follow.yaw < afterStep);
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

test("character visibly faces its spawn heading on the first frame", () => {
  for (const yaw of [0, Math.PI / 2, Math.PI]) {
    const character = createCharacter("nephi");
    character.update(1 / 60, {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw,
      grounded: true,
      runSpeed: 0,
    });
    character.group.updateMatrixWorld(true);
    const head = character.group.getObjectByName("head")!;
    const face = new T.Vector3(0, 0, 1)
      .transformDirection(head.matrixWorld)
      .setY(0)
      .normalize();
    const heading = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    assert.ok(
      face.dot(heading) > 0.995,
      `spawn yaw ${yaw}: face ${face.toArray()}`,
    );
    character.dispose();
  }
});
