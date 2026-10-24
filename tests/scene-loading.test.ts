import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("runtime starts without eagerly importing story or world builders", () => {
  const main = readFileSync("src/main.ts", "utf8");
  assert.doesNotMatch(main, /^import \{ create(?:Story|TreeOfLife)Scene \}/m);
  assert.doesNotMatch(main, /^import \{ buildWorld/m);
});
test("gallery uses small painting derivatives", () => {
  const source = readFileSync("src/super/conference-center.ts", "utf8");
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

test("later chapters prepare their own interactive worlds and leave no scene resources", async () => {
  const { prepareWorld } = await import("../src/super/world-loading");
  const { Scene } = await import("three");
  for (const [id, phase] of [
    ["broken-bow", "camp"],
    ["promised", "camp"],
    ["vineyard", "learn"],
    ["jacob", "settlement"],
    ["waters", "city"],
  ] as const) {
    const scene = new Scene();
    const prepared = await prepareWorld(id);
    assert.equal(scene.children.length, 0);
    const world = prepared.buildWorld(id, scene);
    assert.ok(world.adventure, id + " must expose interactive progression");
    let role = "";
    const runtime = world.adventure!({
      setAvatar: (value) => {
        role = value;
      },
      toast: () => {},
      complete: () => {},
      dialog: (_k, _t, _b, next) => next(),
    });
    assert.equal((runtime.snapshot() as { phase: string }).phase, phase);
    assert.equal(
      role,
      id === "vineyard"
        ? "child"
        : id === "jacob"
          ? "jacob"
          : id === "waters"
            ? "convert"
            : "nephi",
    );
    runtime.dispose();
    world.dispose?.();
    assert.equal(scene.children.length, 0);
  }
});
