import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { createMotionDriver } from "../src/super/character-motion.ts";
import type {
  CharacterMove,
  CharacterState,
} from "../src/super/character-types.ts";

const forward = new T.Vector3(0, 0, 1);
const state: CharacterState = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  grounded: true,
  runSpeed: 0,
  move: "idle",
};
const direction = (yaw: number) =>
  new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

for (const move of [
  "idle",
  "crawl",
  "swim",
  "backflip",
  "sideflip",
  "wallKick",
  "groundPound",
  "climb",
] as CharacterMove[]) {
  test(`${move} preserves heading through a posed body at cardinal and diagonal angles`, () => {
    for (const yaw of [
      0,
      Math.PI / 4,
      Math.PI / 2,
      Math.PI,
      (3 * Math.PI) / 2,
    ]) {
      const driver = createMotionDriver("nephi");
      driver.update(1 / 60, {
        ...state,
        yaw,
        vx: 1.5 * Math.sin(yaw),
        vz: 1.5 * Math.cos(yaw),
        runSpeed: move === "crawl" ? 1.5 : 0,
        crouching: move === "crawl",
        move,
        moveTime: move === "backflip" || move === "sideflip" ? 0.175 : 0.1,
      });
      driver.group.updateMatrixWorld(true);
      const body = driver.group.getObjectByName("body")!;
      const head = driver.group.getObjectByName("head")!;
      const bodyCenter = body.getWorldPosition(new T.Vector3());
      const headCenter = head.getWorldPosition(new T.Vector3());
      const heading = direction(yaw);
      if (move === "crawl") {
        const headOffset = headCenter.clone().sub(bodyCenter).setY(0);
        assert.ok(
          headOffset.dot(heading) > 0.8,
          `crawl head ahead at yaw ${yaw}: ${headOffset.toArray()}`,
        );
        const face = forward
          .clone()
          .transformDirection(head.matrixWorld)
          .setY(0)
          .normalize();
        assert.ok(
          face.dot(heading) > 0.98,
          `crawl face along heading at yaw ${yaw}: ${face.toArray()}`,
        );
      } else {
        const localForward = forward
          .clone()
          .transformDirection(driver.group.matrixWorld)
          .setY(0)
          .normalize();
        assert.ok(
          localForward.dot(heading) > 0.99,
          `${move} heading at yaw ${yaw}`,
        );
      }
      driver.dispose();
    }
  });
}

test("crawl support and facing recover after turning and returning upright", () => {
  const driver = createMotionDriver("nephi");
  driver.update(1 / 60, state);
  for (const yaw of [Math.PI / 4, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    for (let frame = 0; frame < 24; frame++)
      driver.update(1 / 60, {
        ...state,
        x: frame * 0.02 * Math.sin(yaw),
        z: frame * 0.02 * Math.cos(yaw),
        vx: 1.5 * Math.sin(yaw),
        vz: 1.5 * Math.cos(yaw),
        yaw,
        runSpeed: 1.5,
        crouching: true,
        move: "crawl",
      });
    driver.group.updateMatrixWorld(true);
    const body = driver.group.getObjectByName("body")!;
    const head = driver.group.getObjectByName("head")!;
    const displacement = head
      .getWorldPosition(new T.Vector3())
      .sub(body.getWorldPosition(new T.Vector3()))
      .setY(0);
    const visibleHeading = forward
      .clone()
      .transformDirection(driver.group.matrixWorld)
      .setY(0)
      .normalize();
    assert.ok(
      displacement.dot(visibleHeading) > 0.8,
      `head stays ahead through turn ${yaw}`,
    );
  }
  driver.update(1 / 60, { ...state, yaw: Math.PI });
  driver.group.updateMatrixWorld(true);
  const head = driver.group.getObjectByName("head")!;
  assert.ok(
    head.getWorldPosition(new T.Vector3()).y > 1.2,
    "upright head restored",
  );
  driver.dispose();
});
