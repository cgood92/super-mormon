import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import * as T from "three";
import { Discoveries } from "./discoveries";
import { WorldSession } from "./world-session";
import type { GameUI } from "../ui/game-ui";
import type { GameplayAnalytics } from "./analytics";

function fixture(t: TestContext) {
  const elements = new Map([
    ["practice-lesson", { hidden: false, textContent: "" }],
    ["collect-count", { hidden: true, textContent: "" }],
  ]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { getElementById: (id: string) => elements.get(id) },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  });
  const session = new WorldSession();
  session.world = {
    name: "Test gallery",
    subtitle: "",
    spawn: { x: 0, y: 0, z: 0 },
    goal: { x: 10, y: 0, z: 10 },
    solids: [],
    tokens: [{ id: "token", x: 0, y: 0.8, z: 0.5 }],
    carryables: [{ id: "bundle", name: "Bundle", x: 4, y: 0.28, z: 0 }],
    delivery: { x: 4, y: 0, z: 0, radius: 1 },
  };
  const messages: string[] = [],
    discoveries: string[] = [],
    activities: string[] = [],
    sounds: string[] = [];
  const ui = {
    message: (text: string) => messages.push(text),
  } as unknown as GameUI;
  const analytics = {
    discover: (id: string) => discoveries.push(id),
    activity: (id: string) => activities.push(id),
  } as unknown as GameplayAnalytics;
  const runtime = new Discoveries(session, ui, analytics, {
    sound: (kind) => sounds.push(kind),
    updateObjective: () => {},
  });
  runtime.setup();
  return {
    runtime,
    session,
    elements,
    messages,
    discoveries,
    activities,
    sounds,
  };
}

test("loading another scene resets discoveries, props, and movement studio progress", (t) => {
  const { runtime, session, elements } = fixture(t);
  runtime.bonusCollected.add("token");
  runtime.deliveryDone = true;
  runtime.learnedMoves.add("longJump");
  runtime.practiceVisible = true;
  runtime.carryObjects[0].held = true;
  const oldBundle = runtime.carryObjects[0];
  session.scene = new T.Scene();
  session.world.tokens = [{ id: "next-token", x: 2, y: 1, z: 3 }];
  session.world.carryables = [
    { id: "next-bundle", name: "Next bundle", x: 5, y: 0.28, z: 6 },
  ];
  runtime.setup();
  assert.equal(runtime.bonusCollected.size, 0);
  assert.equal(runtime.deliveryDone, false);
  assert.equal(runtime.learnedMoves.size, 0);
  assert.equal(runtime.practiceVisible, false);
  assert.equal(elements.get("practice-lesson")!.hidden, true);
  assert.deepEqual([...runtime.tokenMeshes.keys()], ["next-token"]);
  assert.deepEqual([...runtime.carryMeshes.keys()], ["next-bundle"]);
  assert.equal(runtime.carryObjects.length, 1);
  assert.notEqual(runtime.carryObjects[0], oldBundle);
  assert.equal(runtime.carryObjects[0].held, false);
  assert.deepEqual(runtime.carryObjects[0].spawn, { x: 5, y: 0.28, z: 6 });
  assert.ok(
    [...runtime.tokenMeshes.values(), ...runtime.carryMeshes.values()].every(
      (mesh) => mesh.parent === session.scene,
    ),
  );
});

test("a nearby token requires line of sight and can only be collected once", (t) => {
  const { runtime, session, messages, discoveries, sounds } = fixture(t);
  session.world.solids.push({ x: 0, y: 0, z: 0.25, w: 2, h: 3, d: 0.1 });
  runtime.updatePickups(0.016, 0.016);
  assert.equal(runtime.bonusCollected.size, 0);
  assert.equal(runtime.tokenMeshes.get("token")!.visible, true);
  assert.deepEqual(discoveries, []);
  session.world.solids = [];
  runtime.updatePickups(0.016, 0.032);
  runtime.updatePickups(0.016, 0.048);
  assert.deepEqual([...runtime.bonusCollected], ["token"]);
  assert.equal(runtime.tokenMeshes.get("token")!.visible, false);
  assert.deepEqual(discoveries, ["token"]);
  assert.deepEqual(sounds, ["collect"]);
  assert.deepEqual(messages, ["Every discovery token found!"]);
});

test("a delivered bundle completes once, after it is released and settles", (t) => {
  const {
    runtime,
    session,
    messages,
    discoveries,
    activities,
    sounds,
    elements,
  } = fixture(t);
  session.player.x = 20;
  runtime.practiceVisible = true;
  const bundle = runtime.carryObjects[0];
  bundle.held = true;
  bundle.grounded = true;
  runtime.updatePickups(0.016, 0.016);
  assert.equal(runtime.deliveryDone, false);
  bundle.held = false;
  bundle.vx = 1;
  runtime.updatePickups(0.016, 0.032);
  assert.equal(runtime.deliveryDone, false);
  bundle.vx = 0;
  runtime.updatePickups(0.016, 0.048);
  runtime.updatePickups(0.016, 0.064);
  assert.equal(runtime.deliveryDone, true);
  assert.deepEqual(discoveries, ["bundle_delivery"]);
  assert.deepEqual(activities, ["bundle_delivery"]);
  assert.deepEqual(sounds, ["win"]);
  assert.deepEqual(messages, [
    "Bundle delivered! Pick it up again to keep practicing.",
  ]);
  assert.match(elements.get("collect-count")!.textContent, /Bundle delivered/);
});
