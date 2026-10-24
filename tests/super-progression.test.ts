import assert from "node:assert/strict";
import test from "node:test";
import {
  canEnter,
  nextStory,
  prerequisite,
  readCompleted,
} from "../src/super/progression";

test("scenes unlock in story order and completed scenes stay replayable", () => {
  const completed = readCompleted([]);
  assert.equal(nextStory(completed), "streets");
  assert.equal(canEnter("streets", completed), true);
  assert.equal(canEnter("palace", completed), false);
  assert.equal(canEnter("house", completed), false);
  assert.equal(canEnter("trade", completed), false);
  assert.equal(canEnter("night", completed), false);
  assert.equal(prerequisite("house", completed), "streets");

  completed.add("streets");
  assert.equal(nextStory(completed), "palace");
  assert.equal(canEnter("streets", completed), true);
  assert.equal(canEnter("palace", completed), true);
  assert.equal(canEnter("house", completed), false);
  assert.equal(prerequisite("house", completed), "palace");

  completed.add("palace");
  assert.equal(nextStory(completed), "house");
  assert.equal(canEnter("house", completed), true);
  completed.add("house");
  assert.equal(nextStory(completed), "trade");
  assert.equal(canEnter("trade", completed), true);
  assert.equal(canEnter("night", completed), false);
  completed.add("trade");
  assert.equal(nextStory(completed), "night");
  assert.equal(prerequisite("night", completed), null);
  completed.add("night");
  assert.equal(nextStory(completed), "tree");
  assert.equal(canEnter("tree", completed), true);
  completed.add("tree");
  assert.equal(nextStory(completed), "broken-bow");
  assert.equal(canEnter("bountiful", completed), false);
  completed.add("broken-bow");
  assert.equal(nextStory(completed), "bountiful");
  assert.equal(canEnter("bountiful", completed), true);
  assert.equal(canEnter("voyage", completed), false);
  completed.add("bountiful");
  assert.equal(nextStory(completed), "voyage");
  assert.equal(canEnter("voyage", completed), true);
  completed.add("voyage");
  assert.equal(nextStory(completed), "promised");
  assert.equal(canEnter("promised", completed), true);
  assert.equal(canEnter("vineyard", completed), false);
  completed.add("promised");
  assert.equal(nextStory(completed), "vineyard");
  assert.equal(canEnter("vineyard", completed), true);
  completed.add("vineyard");
  assert.equal(nextStory(completed), null);
  assert.equal(canEnter("bountiful", completed), true);
});

test("older out-of-order saves keep completed replay access without opening gaps", () => {
  const completed = readCompleted(["house", "unknown", "house"]);
  assert.deepEqual([...completed], ["house"]);
  assert.equal(canEnter("house", completed), true);
  assert.equal(canEnter("palace", completed), false);
  assert.equal(prerequisite("house", completed), null);
  assert.equal(nextStory(completed), "streets");

  completed.add("streets");
  assert.equal(canEnter("palace", completed), true);
  assert.equal(nextStory(completed), "palace");
});
