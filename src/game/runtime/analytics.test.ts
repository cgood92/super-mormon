import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsAllowed,
  activeFrameSeconds,
  browserAnalytics,
  GameplayAnalytics,
  movementActions,
} from "./analytics";
import { createPlayer } from "../physics/physics";

test("analytics requires production at the exact game entry and excludes developer sessions", () => {
  const live = "https://cgood92.github.io/super-mormon/";
  assert.equal(analyticsAllowed(true, live, "G-TEST123"), true);
  for (const url of [
    "http://localhost:5173/",
    "https://example.com/super-mormon/",
    live + "tools/cast/index.html",
    live + "?scene=broken-bow",
    live + "?performance",
    live + "?playtest",
    live + "?anything=private",
    "https://cgood92.github.io/another/",
  ])
    assert.equal(analyticsAllowed(true, url, "G-TEST123"), false, url);
  assert.equal(analyticsAllowed(false, live, "G-TEST123"), false);
  assert.equal(analyticsAllowed(true, live, ""), false);
});

test("active durations are incremental, complete once, and do not become gallery exits", () => {
  const sent: {
    name: string;
    params: Record<string, string | number | boolean>;
  }[] = [];
  const a = new GameplayAnalytics((name, params) =>
    sent.push({ name, params }),
  );
  a.start("broken-bow", "painting", "keyboard");
  a.tick(12);
  a.flush();
  a.flush();
  a.tick(4);
  a.finish();
  a.finish();
  a.exit("gallery");
  assert.equal(sent.filter((e) => e.name === "level_start").length, 1);
  assert.equal(sent.filter((e) => e.name === "level_end").length, 1);
  assert.equal(sent.filter((e) => e.name === "level_exit").length, 0);
  assert.equal(
    sent
      .filter((e) => e.name === "play_time")
      .reduce((n, e) => n + Number(e.params.active_seconds), 0),
    16,
  );
  assert.equal(
    sent.find((e) => e.name === "level_end")?.params.total_active_seconds,
    16,
  );
});

test("gallery returns, retries and replay attempts keep distinct timing", () => {
  const sent: {
    name: string;
    params: Record<string, string | number | boolean>;
  }[] = [];
  const a = new GameplayAnalytics((name, params) =>
    sent.push({ name, params }),
  );
  a.start("streets", "painting", "touch");
  a.tick(5);
  a.retry("checkpoint");
  a.tick(3);
  a.exit("gallery");
  a.exit("pagehide");
  assert.equal(sent.filter((e) => e.name === "level_retry").length, 1);
  assert.equal(sent.filter((e) => e.name === "level_exit").length, 1);
  assert.equal(
    sent.find((e) => e.name === "level_exit")?.params.total_active_seconds,
    8,
  );
  a.start("streets", "restart", "touch");
  a.tick(2);
  a.finish();
  assert.equal(
    sent.filter((e) => e.name === "level_end")[0].params.total_active_seconds,
    2,
  );
});

test("fullscreen changes split active time and carry the current mode on every event", () => {
  const sent: {
    name: string;
    params: Record<string, string | number | boolean>;
  }[] = [];
  const a = new GameplayAnalytics((name, params) =>
    sent.push({ name, params }),
  );
  a.start("broken-bow", "painting", "keyboard");
  a.tick(12);
  a.setFullscreen(true);
  a.setFullscreen(true);
  a.move("jump");
  a.tick(7);
  a.setFullscreen(false);
  a.tick(3);
  a.finish();

  assert.deepEqual(
    sent.map(({ name, params }) => [name, params.fullscreen_mode]),
    [
      ["level_start", "windowed"],
      ["play_time", "windowed"],
      ["fullscreen_changed", "fullscreen"],
      ["move_used", "fullscreen"],
      ["play_time", "fullscreen"],
      ["fullscreen_changed", "windowed"],
      ["play_time", "windowed"],
      ["level_end", "windowed"],
    ],
  );
  assert.deepEqual(
    sent
      .filter(({ name }) => name === "play_time")
      .map(({ params }) => params.active_seconds),
    [12, 7, 3],
  );
});

test("fullscreen initialization and changes outside attempts remain silent but persist", () => {
  const sent: {
    name: string;
    params: Record<string, string | number | boolean>;
  }[] = [];
  const a = new GameplayAnalytics((name, params) =>
    sent.push({ name, params }),
  );
  a.setFullscreen(true);
  a.start("hub", "initial", "keyboard");
  a.finish();
  a.setFullscreen(false);
  a.setFullscreen(false);
  a.start("broken-bow", "painting", "touch");
  a.exit("gallery");
  a.setFullscreen(true);
  a.start("streets", "painting", "touch");

  assert.deepEqual(
    sent
      .filter(({ name }) => name === "level_start")
      .map(({ params }) => params.fullscreen_mode),
    ["fullscreen", "windowed", "fullscreen"],
  );
  assert.equal(
    sent.filter(({ name }) => name === "fullscreen_changed").length,
    0,
  );
  assert.ok(
    sent.every(
      ({ params }) =>
        params.fullscreen_mode === "fullscreen" ||
        params.fullscreen_mode === "windowed",
    ),
  );
});

test("camera holds and repeated discoveries are bounded episodes", () => {
  const names: string[] = [];
  const a = new GameplayAnalytics((name) => names.push(name));
  a.start("hub", "initial", "keyboard");
  for (let i = 0; i < 120; i++) a.camera(true, false, 1 / 60);
  a.camera(false, false, 0.3);
  a.camera(true, false, 1 / 60);
  a.discover("organ");
  a.discover("organ");
  a.start("hub", "return", "touch");
  a.discover("organ");
  assert.equal(names.filter((n) => n === "camera_used").length, 2);
  assert.equal(names.filter((n) => n === "secret_found").length, 1);
});

test("movement counts successful changes, distinguishes trees, and rejects held buttons", () => {
  const p = createPlayer();
  const before = { move: p.move, climbId: p.climbId };
  assert.deepEqual(
    movementActions(before, p, { jumped: false, landed: false }),
    [],
  );
  p.move = "wallKick";
  assert.deepEqual(
    movementActions(before, p, { jumped: true, landed: false }),
    ["wall_kick"],
  );
  p.move = "crawl";
  p.grounded = true;
  p.runSpeed = 1;
  assert.deepEqual(
    movementActions(before, p, { jumped: false, landed: false }),
    ["crawl"],
  );
  assert.deepEqual(
    movementActions({ move: "crawl" }, p, { jumped: false, landed: false }),
    [],
  );
  p.move = "climb";
  p.climbId = "living-tree";
  assert.deepEqual(
    movementActions(before, p, { jumped: false, landed: false }),
    ["tree_climb"],
  );
  p.climbId = "gallery-pole";
  assert.deepEqual(
    movementActions(before, p, { jumped: false, landed: false }),
    ["climb"],
  );
});

test("telemetry transport failure never interrupts game logic", () => {
  const a = new GameplayAnalytics(() => {
    throw Error("blocked");
  });
  assert.doesNotThrow(() => {
    a.start("tree", "painting", "gamepad");
    a.tick(31);
    a.discover("fruit");
    a.finish();
  });
});

test("disabled analytics never touches document or creates a tag queue", () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { href: "http://localhost:5173/" },
  });
  try {
    // Node has no document/window: any attempt to initialize the tag would throw.
    assert.doesNotThrow(() =>
      browserAnalytics(true)("level_start", { level_id: "hub" }),
    );
    assert.equal(Object.hasOwn(globalThis, "dataLayer"), false);
  } finally {
    if (prior) Object.defineProperty(globalThis, "location", prior);
    else Reflect.deleteProperty(globalThis, "location");
  }
});

test("active time keeps ordinary low-fps frames but ignores sleep and invalid gaps", () => {
  assert.equal(activeFrameSeconds(0.2), 0.2);
  for (const n of [2, 90, -1, NaN, Infinity])
    assert.equal(activeFrameSeconds(n), 0);
});
