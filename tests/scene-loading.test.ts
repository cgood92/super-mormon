import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("runtime starts without eagerly importing story or world builders", () => {
  const main = readFileSync("src/main.ts", "utf8");
  assert.doesNotMatch(main, /^import \{ create(?:Story|TreeOfLife)Scene \}/m);
  assert.doesNotMatch(main, /^import \{ buildWorld/m);
});
test("gallery uses small painting derivatives", () => {
  const source = readFileSync("src/super/gallery-worlds.ts", "utf8");
  assert.doesNotMatch(source, /art\/.*\.png/);
});

test("preparing a world leaves the active scene untouched until its builder is called", async () => {
  const { prepareWorld } = await import("../src/super/world-loading");
  const { Scene } = await import("three");
  const scene = new Scene();
  const prepared = await prepareWorld("house");
  assert.equal(scene.children.length, 0);
  assert.equal(prepared.createTreeOfLifeScene, undefined);
  assert.equal(prepared.createStoryScene, undefined);
  const world = prepared.buildWorld("house", scene);
  assert.ok(scene.children.length > 0);
  assert.equal(world.treasures?.length, 5);
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});

test("initial load failures expose a retry action without resuming an absent world", () => {
  const main = readFileSync("src/main.ts", "utf8");
  assert.ok(
    main.includes('id="load-retry"'),
    "failure UI needs a real retry button",
  );
  assert.ok(
    main.includes('el("load-retry").onclick = () => void load(id)'),
    "retry must start a fresh load",
  );
  assert.ok(
    main.includes('el("load-error").hidden = !!world'),
    "existing scenes should resume without a blocking error screen",
  );
});
