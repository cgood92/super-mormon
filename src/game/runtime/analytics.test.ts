import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
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

test("a complete episode preserves every payload field and context insertion order", () => {
  const sent: {
    name: string;
    params: Record<string, string | number | boolean>;
  }[] = [];
  const a = new GameplayAnalytics((name, params) =>
    sent.push({ name, params }),
  );
  a.start("tree", "painting", "keyboard");
  a.storyStep("path");
  a.storyStep("path");
  a.move("long_jump");
  a.camera(true, true, 0.1);
  a.discover("fruit");
  a.discover("fruit");
  a.activity("rope");
  a.tick(8);
  a.setDevice("gamepad");
  a.retry("checkpoint");
  a.tick(2);
  a.setFullscreen(true);
  a.storyStep("clearing");
  a.tick(3);
  a.finish();
  a.finish();
  a.exit("gallery");
  a.move("jump");

  const expected = [
    {
      name: "level_start",
      params: {
        level_id: "tree",
        input_device: "keyboard",
        entry_reason: "painting",
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "story_step",
      params: {
        level_id: "tree",
        input_device: "keyboard",
        story_phase: "path",
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "move_used",
      params: {
        level_id: "tree",
        input_device: "keyboard",
        move_name: "long_jump",
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "camera_used",
      params: {
        level_id: "tree",
        input_device: "keyboard",
        camera_action: "rotate",
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "camera_used",
      params: {
        level_id: "tree",
        input_device: "keyboard",
        camera_action: "recenter",
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "secret_found",
      params: {
        level_id: "tree",
        input_device: "keyboard",
        secret_id: "fruit",
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "activity_used",
      params: {
        level_id: "tree",
        input_device: "keyboard",
        activity_id: "rope",
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "play_time",
      params: {
        level_id: "tree",
        input_device: "gamepad",
        active_seconds: 8,
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "level_retry",
      params: {
        level_id: "tree",
        input_device: "gamepad",
        retry_reason: "checkpoint",
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "play_time",
      params: {
        level_id: "tree",
        input_device: "gamepad",
        active_seconds: 2,
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "fullscreen_changed",
      params: {
        level_id: "tree",
        input_device: "gamepad",
        fullscreen_mode: "fullscreen",
      },
    },
    {
      name: "story_step",
      params: {
        level_id: "tree",
        input_device: "gamepad",
        story_phase: "clearing",
        fullscreen_mode: "fullscreen",
      },
    },
    {
      name: "play_time",
      params: {
        level_id: "tree",
        input_device: "gamepad",
        active_seconds: 3,
        fullscreen_mode: "fullscreen",
      },
    },
    {
      name: "level_end",
      params: {
        level_id: "tree",
        input_device: "gamepad",
        success: true,
        total_active_seconds: 13,
        fullscreen_mode: "fullscreen",
      },
    },
  ];
  assert.deepEqual(sent, expected);
  assert.deepEqual(
    sent.map(({ params }) => Object.keys(params)),
    expected.map(({ params }) => Object.keys(params)),
  );
});

test("scene changes flush the previous episode with its final phase and context", () => {
  const sent: {
    name: string;
    params: Record<string, string | number | boolean>;
  }[] = [];
  const a = new GameplayAnalytics((name, params) =>
    sent.push({ name, params }),
  );
  a.start("streets", "painting", "touch");
  a.storyStep("trail");
  a.tick(4);
  sent.length = 0;
  a.start("tree", "replay", "keyboard");
  assert.deepEqual(sent, [
    {
      name: "play_time",
      params: {
        level_id: "streets",
        input_device: "touch",
        active_seconds: 4,
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "level_exit",
      params: {
        level_id: "streets",
        input_device: "touch",
        exit_reason: "scene_change",
        story_phase: "trail",
        total_active_seconds: 4,
        fullscreen_mode: "windowed",
      },
    },
    {
      name: "level_start",
      params: {
        level_id: "tree",
        input_device: "keyboard",
        entry_reason: "replay",
        fullscreen_mode: "windowed",
      },
    },
  ]);
});

test("TypeScript rejects invalid private event payloads while preserving the broad transport", () => {
  const directory = mkdtempSync(join(tmpdir(), "analytics-payloads-"));
  try {
    const source = fileURLToPath(new URL("./analytics.ts", import.meta.url));
    const fixture = join(directory, "payloads.ts");
    writeFileSync(
      fixture,
      `
      import { GameplayAnalytics, type AnalyticsTransport } from ${JSON.stringify(source)};
      declare const analytics: GameplayAnalytics;
      // Bracket access checks the private method without exporting its schema.
      analytics["send"]("level_start", { entry_reason: "painting" });
      analytics["send"]("level_end", { success: true, total_active_seconds: 3 });
      analytics["send"]("level_exit", { exit_reason: "gallery", story_phase: "path", total_active_seconds: 3 });
      analytics["send"]("level_retry", { retry_reason: "checkpoint" });
      analytics["send"]("play_time", { active_seconds: 3 });
      analytics["send"]("move_used", { move_name: "jump" });
      analytics["send"]("camera_used", { camera_action: "rotate" });
      analytics["send"]("camera_used", { camera_action: "recenter" });
      analytics["send"]("story_step", { story_phase: "path" });
      analytics["send"]("secret_found", { secret_id: "fruit" });
      analytics["send"]("activity_used", { activity_id: "rope" });
      analytics["send"]("fullscreen_changed");
      declare const transport: AnalyticsTransport;
      transport("custom_browser_event", { arbitrary_key: 1, flag: true, label: "ok" });
      // @ts-expect-error Misspelled event names must not reach the transport.
      analytics["send"]("level_strat", { entry_reason: "painting" });
      // @ts-expect-error Event fields must use the emitted key spelling.
      analytics["send"]("level_start", { entry_reasson: "painting" });
      // @ts-expect-error Payloads cannot be swapped between events.
      analytics["send"]("move_used", { secret_id: "fruit" });
      // @ts-expect-error Durations must remain numeric.
      analytics["send"]("play_time", { active_seconds: "3" });
      // @ts-expect-error Required event fields cannot be omitted.
      analytics["send"]("level_exit", { exit_reason: "gallery" });
      // @ts-expect-error Events with payloads require their payload argument.
      analytics["send"]("level_start");
      // @ts-expect-error Camera actions must be one of the emitted values.
      analytics["send"]("camera_used", { camera_action: "spin" });
      // @ts-expect-error Finishing only emits success, never failure.
      analytics["send"]("level_end", { success: false, total_active_seconds: 3 });
      // @ts-expect-error Common context belongs to send, not event callers.
      analytics["send"]("level_start", { entry_reason: "painting", level_id: "tree" });
      // @ts-expect-error The context-only event accepts no custom payload.
      analytics["send"]("fullscreen_changed", { fullscreen_mode: "fullscreen" });
      declare const uncertainEvent: "move_used" | "secret_found";
      // @ts-expect-error A union event cannot be paired with only one branch's payload.
      analytics["send"](uncertainEvent, { move_name: "jump" });
    `,
    );
    const config = join(directory, "tsconfig.json");
    writeFileSync(
      config,
      JSON.stringify({
        extends: fileURLToPath(
          new URL("../../../tsconfig.json", import.meta.url),
        ),
        compilerOptions: { allowImportingTsExtensions: true },
        files: [fixture],
        include: [],
        exclude: [],
      }),
    );
    const compiler = fileURLToPath(
      new URL("./bin/tsc", import.meta.resolve("typescript/package.json")),
    );
    const result = spawnSync(
      process.execPath,
      [compiler, "--project", config],
      { encoding: "utf8", timeout: 30_000 },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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
