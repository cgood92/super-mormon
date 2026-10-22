import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  createCharacter,
  type CharacterState,
} from "../src/super/character.ts";

const standing: CharacterState = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  grounded: true,
  runSpeed: 0,
};

function bounds(character: ReturnType<typeof createCharacter>) {
  character.group.updateMatrixWorld(true);
  return new T.Box3().setFromObject(character.group);
}

test("crouch and crawl visibly fit beneath a 0.9 high opening", () => {
  const character = createCharacter("nephi");
  character.update(1 / 60, { ...standing, crouching: true, move: "crouch" });
  const crouch = bounds(character);
  assert.ok(crouch.max.y <= 0.9, `crouch reaches ${crouch.max.y}`);
  assert.ok(crouch.min.y >= -0.02, `crouch feet sink to ${crouch.min.y}`);
  character.update(1 / 60, {
    ...standing,
    crouching: true,
    move: "crawl",
    runSpeed: 1.5,
    moveTime: 0.2,
  });
  const crawl = bounds(character);
  assert.ok(crawl.max.y <= 0.9, `crawl reaches ${crawl.max.y}`);
  assert.ok(crawl.min.y >= -0.02, `crawl feet sink to ${crawl.min.y}`);
  character.dispose();
});

test("mid-flip poses rotate around the character center and clear the floor", () => {
  const character = createCharacter("nephi");
  for (const move of ["backflip", "sideflip"] as const) {
    character.update(1 / 60, {
      ...standing,
      grounded: false,
      move,
      moveTime: 0.35,
    });
    const box = bounds(character);
    assert.ok(box.min.y >= -0.05, `${move} sinks to ${box.min.y}`);
    assert.ok(box.max.y > 0.4, `${move} no longer has a body silhouette`);
  }
  character.dispose();
});

test("carrying keeps both hands raised in front of the body", () => {
  const character = createCharacter("nephi");
  character.update(1 / 60, { ...standing, carrying: true });
  const left = character.group.getObjectByName("left-arm")!;
  const right = character.group.getObjectByName("right-arm")!;
  assert.ok(left.rotation.x < -0.5);
  assert.ok(right.rotation.x < -0.5);
  character.dispose();
});

test("all character roles keep crouch and flip poses above the floor", () => {
  for (const role of ["nephi", "lehi", "laman", "guard"] as const) {
    const character = createCharacter(role);
    for (const move of ["crouch", "crawl"] as const) {
      character.update(1 / 60, {
        ...standing,
        crouching: true,
        move,
        runSpeed: move === "crawl" ? 1.5 : 0,
      });
      const box = bounds(character);
      assert.ok(
        box.min.y >= -0.02,
        `${role} ${move} feet sink to ${box.min.y}`,
      );
      assert.ok(box.max.y <= 0.9, `${role} ${move} reaches ${box.max.y}`);
    }
    for (const move of ["backflip", "sideflip", "tripleJump"] as const) {
      for (const moveTime of [0, 0.175, 0.35, 0.525, 0.7]) {
        character.update(1 / 60, {
          ...standing,
          grounded: false,
          move,
          moveTime,
        });
        const box = bounds(character);
        assert.ok(
          box.min.y >= -0.05,
          `${role} ${move} at ${moveTime} sinks to ${box.min.y}`,
        );
      }
    }
    character.dispose();
  }
});

test("jump stage selects the airborne pose when move is omitted", () => {
  const character = createCharacter("nephi");
  character.update(1 / 60, { ...standing, grounded: false, jumpStage: 2 });
  assert.ok(character.group.getObjectByName("left-arm")!.rotation.x < -1);
  character.update(1 / 60, {
    ...standing,
    grounded: false,
    jumpStage: 3,
    moveTime: 0.175,
  });
  const body = character.group.children[0];
  assert.ok(body.rotation.x > 1);
  character.dispose();
});

test("forced crouch stays compact during airborne moves under a ceiling", () => {
  for (const role of ["nephi", "lehi", "laman", "guard"] as const) {
    const character = createCharacter(role);
    for (const move of ["jump", "longJump", "backflip", "sideflip"] as const) {
      character.update(1 / 60, {
        ...standing,
        grounded: false,
        crouching: true,
        move,
        moveTime: 0.35,
      });
      const box = bounds(character);
      assert.ok(box.max.y <= 0.9, `${role} ${move} reaches ${box.max.y}`);
      assert.ok(box.min.y >= -0.02, `${role} ${move} sinks to ${box.min.y}`);
    }
    character.dispose();
  }
});
