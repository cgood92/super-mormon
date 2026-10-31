import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { createMotionDriver } from "./character-motion.ts";
import type { CharacterState } from "./character-types.ts";

const running: CharacterState = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 6.5,
  yaw: 0,
  grounded: true,
  runSpeed: 6.5,
  move: "run",
};
function tilt(driver: ReturnType<typeof createMotionDriver>) {
  driver.group.updateMatrixWorld(true);
  const body = driver.group.getObjectByName("body")!;
  return new T.Vector3(0, 1, 0).transformDirection(body.matrixWorld);
}

// A heading-dependent pitch or incorrect bank sign must not rotate travel lean away from velocity.
test("full-speed travel leans about seventeen degrees in the same world direction at every heading", () => {
  for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const driver = createMotionDriver("nephi");
    for (let frame = 0; frame < 120; frame++)
      driver.update(1 / 60, {
        ...running,
        yaw,
        vx: Math.sin(yaw) * 6.5,
        vz: Math.cos(yaw) * 6.5,
      });
    const up = tilt(driver);
    assert.ok(
      Math.abs(Math.acos(up.y) - 0.2925) < 0.01,
      `yaw ${yaw}: tilt ${Math.acos(up.y)}`,
    );
    assert.ok(
      up
        .clone()
        .setY(0)
        .normalize()
        .dot(new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw))) > 0.999,
    );
    driver.dispose();
  }
});

// Deriving acceleration from a rotating local speed invents braking on a turn.
test("turns and reversals preserve velocity-directed lean while facing catches up", () => {
  for (const yaw of [Math.PI / 2, Math.PI, (-Math.PI * 3) / 4]) {
    const driver = createMotionDriver("sam");
    for (let frame = 0; frame < 120; frame++) driver.update(1 / 60, running);
    for (let frame = 0; frame < 24; frame++) {
      driver.update(1 / 60, { ...running, yaw });
      const up = tilt(driver);
      assert.ok(
        up.z > 0.22,
        `turn ${yaw} frame ${frame}: travel lean ${up.toArray()}`,
      );
      assert.ok(
        Math.abs(up.x) < 0.085,
        `turn ${yaw} frame ${frame}: sideways lean ${up.x}`,
      );
      assert.ok(Math.acos(up.y) < 0.36);
    }
    driver.dispose();
  }
});

test("travel lean releases smoothly and settles upright after stopping", () => {
  const driver = createMotionDriver("nephi");
  for (let frame = 0; frame < 90; frame++) driver.update(1 / 60, running);
  const before = tilt(driver).z;
  const stopped = { ...running, vz: 0, runSpeed: 0, move: "idle" as const };
  driver.update(1 / 60, stopped);
  const first = tilt(driver).z;
  assert.ok(first > 0.2 && first < before, `first release ${first}`);
  let previous = first;
  for (let frame = 0; frame < 60; frame++) {
    driver.update(1 / 60, stopped);
    const next = tilt(driver).z;
    assert.ok(next >= 0 && next <= previous + 1e-8);
    previous = next;
  }
  assert.ok(previous < 0.001);
  driver.dispose();
});

test("crawl clears prior travel lean before returning upright", () => {
  const driver = createMotionDriver("nephi");
  for (let frame = 0; frame < 90; frame++) driver.update(1 / 60, running);
  driver.update(1 / 60, {
    ...running,
    yaw: Math.PI / 2,
    crouching: true,
    move: "crawl",
  });
  driver.update(1 / 60, {
    ...running,
    vx: 0,
    vz: 0,
    runSpeed: 0,
    move: "idle",
    yaw: Math.PI / 2,
  });
  const up = tilt(driver);
  assert.ok(
    Math.hypot(up.x, up.z) < 0.001,
    `crawl retained travel tilt ${up.toArray()}`,
  );
  driver.dispose();
});
