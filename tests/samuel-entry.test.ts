import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { sceneEntry, WAR_CHAPTERS } from "../src/super/scene-entry";
import {
  STORY_ORDER,
  STORY_TITLES,
  canEnter,
  nextStory,
} from "../src/super/progression";
import { laterPainting } from "../src/super/gallery-layout";
import { prepareWorld } from "../src/super/world-loading";

test("Samuel follows the Alma chapters and has a private direct trial entry", () => {
  assert.equal(STORY_ORDER.at(-1), "samuel");
  assert.equal(sceneEntry("?scene=samuel"), "samuel");
  assert.equal(STORY_TITLES.samuel, "Samuel the Lamanite");
  assert.match(WAR_CHAPTERS.samuel!, /HELAMAN 13–16/);
  const completed = new Set(STORY_ORDER.slice(0, -1));
  assert.equal(nextStory(completed), "samuel");
  assert.equal(canEnter("samuel", completed), true);
  assert.equal(canEnter("samuel", new Set()), false);
  assert.equal(completed.has("samuel"), false);
  const location = laterPainting("samuel", STORY_ORDER.indexOf("samuel") - 6);
  assert.ok(Math.abs(location.x) > 67, "painting stays in a side hallway");
  assert.equal(location.y, 12, "later story occupies the second floor");
});

test("Samuel loads lazily as an interactive world and releases scene resources", async () => {
  const scene = new T.Scene();
  const prepared = await prepareWorld("samuel");
  assert.equal(scene.children.length, 0);
  const world = prepared.buildWorld("samuel", scene);
  let avatar = "";
  const runtime = world.adventure!({
    setAvatar: (role) => {
      avatar = role;
    },
    toast: () => {},
    complete: () => {},
    dialog: (_k, _t, _b, next) => next(),
  });
  assert.equal(avatar, "samuel");
  assert.ok(world.solids.length > 0);
  assert.match(world.subtitle, /Helaman/i);
  runtime.dispose();
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});
