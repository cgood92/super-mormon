import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { FollowCamera } from "./camera";

function rig() {
  const follow = new FollowCamera(new T.PerspectiveCamera());
  const player = { x: 0, y: 0, z: 0, yaw: Math.PI / 2, runSpeed: 0 };
  follow.reset(player, 0);
  return { follow, player };
}
test("a stopped character gently brings the camera behind its facing direction", () => {
  const { follow, player } = rig();
  for (let i = 0; i < 60; i++) follow.update(1 / 60, player, []);
  assert.ok(Math.abs(follow.yaw - (42.1875 * Math.PI) / 180) < 0.001);
  for (let i = 0; i < 180; i++) follow.update(1 / 60, player, []);
  assert.ok(Math.abs(follow.yaw - player.yaw) < 0.001);
});
test("held input against a wall uses the slower Mario stationary turn", () => {
  const { follow, player } = rig();
  for (let i = 0; i < 60; i++)
    follow.update(1 / 60, player, [], {
      orbitX: 0,
      orbitY: 0,
      recenter: false,
      movementIntent: true,
    });
  assert.ok(Math.abs(follow.yaw - (5.2734375 * Math.PI) / 180) < 0.001);
});
test("manual camera positioning stays put until movement resumes", () => {
  const { follow, player } = rig();
  follow.update(1 / 60, player, [], {
    orbitX: 0.2,
    orbitY: 0,
    recenter: false,
  });
  const yaw = follow.yaw;
  for (let i = 0; i < 180; i++) follow.update(1 / 60, player, []);
  assert.ok(Math.abs(follow.yaw - yaw) < 0.001);
  follow.update(1 / 60, { ...player, runSpeed: 1 }, []);
  for (let i = 0; i < 60; i++) follow.update(1 / 60, player, []);
  assert.ok(follow.yaw > yaw + 0.5);
});

test("running adds a gentle heading turn beyond the geometric trailing pivot", () => {
  const { follow, player } = rig();
  const p = { ...player, runSpeed: 6.5, grounded: true };
  for (let frame = 0; frame < 60; frame++) {
    p.x += p.runSpeed / 60;
    const geometricYaw = Math.atan2(
      p.x - follow.camera.position.x,
      p.z - follow.camera.position.z,
    );
    follow.update(1 / 60, p, []);
    const extraTurn = follow.yaw - geometricYaw;
    assert.ok(
      extraTurn > 0.001 && extraTurn < 0.006,
      `moving camera correction ${extraTurn}`,
    );
  }
});

test("manual orbit controls take priority over moving heading assistance", () => {
  const { follow, player } = rig();
  const p = { ...player, runSpeed: 6.5, grounded: true };
  p.x += p.runSpeed / 60;
  const geometricYaw = Math.atan2(
    p.x - follow.camera.position.x,
    p.z - follow.camera.position.z,
  );
  follow.update(1 / 60, p, [], { orbitX: -0.1, orbitY: 0, recenter: false });
  assert.ok(Math.abs(follow.yaw - (geometricYaw - 0.1)) < 1e-8);
});
