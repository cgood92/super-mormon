import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildTeancumNight, TEANCUM_ROUTE } from "./teancum-night";
import { createPlayer, stepPlayer } from "../../physics/physics";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function escort(
  runtime: ReturnType<
    NonNullable<ReturnType<typeof buildTeancumNight>["adventure"]>
  >,
  player: ReturnType<typeof createPlayer>,
  points: { x: number; z: number }[],
) {
  for (const point of points) {
    Object.assign(player, createPlayer(point.x, 0, point.z));
    for (let i = 0; i < 800; i++) {
      runtime.update(0.1, player, idle);
      const servant = (runtime.snapshot() as any).servant;
      if (Math.hypot(servant.x - player.x, servant.z - player.z) < 1.9) break;
    }
  }
}
const toTent = [
  { x: -22, z: -130 },
  { x: -22, z: -78 },
  { x: -22, z: 21 },
  { x: 0, z: 87 },
  { x: 0, z: 94 },
];
const toCamp = [
  { x: 0, z: 87 },
  { x: -22, z: 68 },
  { x: -22, z: -130 },
  { x: -2, z: -144 },
];

test("the bedside action works after bypassing the invisible watch checkpoints", () => {
  const scene = new T.Scene();
  const world = buildTeancumNight(scene);
  let completed = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_ref, _title, _body, next) {
      next();
    },
  });
  for (let i = 0; i < 121; i++)
    runtime.update(0.1, createPlayer(0, 0, -165), idle);
  const servant = TEANCUM_ROUTE[1];
  const player = createPlayer(servant.x, 0, servant.z);
  runtime.update(0, player, { ...idle, interact: true });
  const king = scene.getObjectByName("Sleeping Amalickiah")!;
  const position = king.getWorldPosition(new T.Vector3());
  Object.assign(player, createPlayer(position.x, 0, position.z - 1.5));
  assert.equal(
    runtime.update(0, player, idle).prompt,
    "",
    "servant must reach the royal tent before its action",
  );
  escort(runtime, player, toTent);
  const result = runtime.update(0, player, idle);
  assert.match(result?.prompt ?? "", /Amalickiah|javelin/i);
  runtime.update(0, player, { ...idle, interact: true });
  assert.equal((runtime.snapshot() as { phase: string }).phase, "return");
  assert.equal(completed, 0);
  Object.assign(player, createPlayer(servant.x, 0, servant.z));
  runtime.update(0, player, { ...idle, interact: true });
  assert.equal(completed, 0, "both companions must return to camp");
  escort(runtime, player, toCamp);
  runtime.update(0, player, { ...idle, interact: true });
  assert.equal(completed, 1);
  runtime.update(0, player, { ...idle, interact: true });
  assert.equal(completed, 1);
  world.dispose?.();
});

test("the royal sleeper rests on bedding instead of standing or floating", () => {
  const scene = new T.Scene();
  const world = buildTeancumNight(scene);
  scene.updateMatrixWorld(true);
  const king = scene.getObjectByName("Sleeping Amalickiah")!;
  const box = new T.Box3().setFromObject(king);
  const size = box.getSize(new T.Vector3());
  assert.ok(size.y < size.z, "sleeping body must lie along the bed");
  assert.ok(box.min.y >= 0 && box.min.y < 0.4, `sleeper base ${box.min.y}`);
  for (const name of ["Sleeping camp guard one", "Sleeping camp guard two"])
    assert.equal(scene.getObjectByName(name), undefined);
  world.dispose?.();
});

test("the bedside action reaches both ends of the bed but never passes through canvas", () => {
  const world = buildTeancumNight(new T.Scene());
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_r, _t, _b, next) {
      next();
    },
  });
  for (let i = 0; i < 121; i++)
    runtime.update(0.1, createPlayer(0, 0, -165), idle);
  const player = createPlayer(-2, 0, -144);
  runtime.update(0, player, { ...idle, interact: true });
  escort(runtime, player, toTent);
  Object.assign(player, createPlayer(4.9, 0, 94));
  assert.equal(
    runtime.update(0, player, idle)?.prompt,
    "",
    "canvas wall must block the action",
  );
  for (const z of [94, 100]) {
    Object.assign(player, createPlayer(0, 0, z));
    assert.match(runtime.update(0, player, idle)?.prompt ?? "", /javelin/i);
  }
  world.dispose?.();
});

test("the royal canvas blocks its sides while its doorway and outside route stay walkable", () => {
  const world = buildTeancumNight(new T.Scene());
  const player = createPlayer(0, 0, 94);
  const walk = (x: number, y: number, frames: number) => {
    for (let i = 0; i < frames; i++)
      stepPlayer(
        player,
        { x, y, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
  };
  walk(-1, 0, 90);
  assert.ok(player.x < 4.2, `passed through canvas at ${player.x}`);
  // Return to the middle, leave through the open south entrance, then round the side.
  walk(1, 0, 37);
  walk(0, -1, 75);
  assert.ok(player.z < 89, `doorway blocked at ${player.z}`);
  walk(-1, 0, 85);
  assert.ok(player.x > 6, `could not round tent at ${player.x}`);
  walk(0, 1, 130);
  assert.ok(player.z > 98);
  walk(1, 0, 90);
  assert.ok(player.x > 4.8, "exterior canvas must also block entry");
  world.dispose?.();
});

test("the extended approach and far camp have one floor with physical landing support", () => {
  const scene = new T.Scene();
  const world = buildTeancumNight(scene);
  scene.updateMatrixWorld(true);
  const floor = scene.getObjectByName("Single earth walk surface")!;
  for (const [x, z] of [
    [-21.3, -170],
    [-21.3, 20],
    [36.3, 140],
  ]) {
    const player = createPlayer(x, 7, z);
    for (let i = 0; i < 120; i++)
      stepPlayer(
        player,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(player.grounded);
    assert.equal(player.y, 0);
    const ray = new T.Raycaster(
      new T.Vector3(x, 4, z),
      new T.Vector3(0, -1, 0),
    );
    const hits = ray
      .intersectObjects(scene.children, true)
      .filter((hit) => Math.abs(hit.point.y) < 0.01);
    assert.equal(hits.length, 1, `duplicate or missing floor at ${x},${z}`);
    assert.equal(hits[0].object, floor);
  }
  world.dispose?.();
});

test("opening movie shows the sleeper and guards while freezing the mission clock", () => {
  const world = buildTeancumNight(new T.Scene());
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_r, _t, _b, next) {
      next();
    },
  });
  const player = createPlayer(0, 0, -165);
  assert.equal(runtime.movementLocked?.(), true);
  runtime.update(0.1, player, idle);
  assert.ok(runtime.camera?.());
  assert.equal((runtime.snapshot() as any).time, 0);
  const beats = new Set<string>();
  for (let i = 0; i < 130; i++) {
    runtime.update(0.1, player, idle);
    beats.add((runtime.snapshot() as any).movieBeat);
  }
  assert.ok(beats.has("sleeping-king"));
  assert.ok(beats.has("watchful-guards"));
  assert.equal(runtime.movementLocked?.(), false);
  assert.equal(runtime.camera?.(), undefined);
  world.dispose?.();
});

test("a servant alone in a guard's sight resets both companions and the mission", () => {
  const world = buildTeancumNight(new T.Scene());
  let catches = 0;
  let resetCaught: (() => void) | undefined;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_r, _t, _b, next) {
      next();
    },
    caught(reset) {
      catches++;
      resetCaught = reset;
    },
  });
  const player = createPlayer(-2, 0, -144);
  for (let i = 0; i < 121; i++) runtime.update(0.1, player, idle);
  runtime.update(0, player, { ...idle, interact: true });
  // Beyond the outer sentry's range and behind the next watch line. The
  // companion crosses the outer sentry's view while following this route.
  Object.assign(player, createPlayer(1, 0, -74));
  for (let i = 0; i < 180 && !catches; i++) runtime.update(0.1, player, idle);
  assert.equal(catches, 1);
  assert.equal(
    player.z,
    -74,
    "player remains outside the outer guard's 20-unit range",
  );
  const before = runtime.snapshot() as any;
  assert.ok(Math.hypot(before.servant.x - 1, before.servant.z + 95) < 20);
  for (let i = 0; i < 5; i++) runtime.update(0.1, player, idle);
  assert.equal(catches, 1, "capture only opens once while waiting for retry");
  resetCaught!();
  const after = runtime.snapshot() as any;
  assert.equal(after.phase, "servant");
  assert.equal(after.detections, 1);
  assert.equal(after.time, 0);
  assert.deepEqual(after.servant, { x: -2, y: 0, z: -144 });
  assert.equal(player.x, 0);
  assert.equal(player.z, -165);
  world.dispose?.();
});

test("the companion cannot cut through solid cover to catch up", () => {
  const world = buildTeancumNight(new T.Scene());
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_r, _t, _b, next) {
      next();
    },
  });
  const player = createPlayer(-2, 0, -144);
  for (let i = 0; i < 121; i++) runtime.update(0.1, player, idle);
  runtime.update(0, player, { ...idle, interact: true });
  Object.assign(player, createPlayer(-8, 0, -100));
  for (let i = 0; i < 150; i++) runtime.update(0.1, player, idle);
  const companion = (runtime.snapshot() as any).servant;
  assert.ok(
    companion.z < -107.5,
    `companion crossed stone cover at ${companion.z}`,
  );
  assert.ok(companion.z > -120, "companion attempted to follow");
  world.dispose?.();
});

test("the companion replays a player's real jump over cover", () => {
  const world = buildTeancumNight(new T.Scene());
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_r, _t, _b, next) {
      next();
    },
  });
  const player = createPlayer(-2, 0, -144);
  for (let i = 0; i < 121; i++) runtime.update(0.1, player, idle);
  runtime.update(0, player, { ...idle, interact: true });
  const walk = (x: number, z: number, jump = false, frames = 1) => {
    for (let i = 0; i < frames; i++) {
      stepPlayer(
        player,
        { x, y: z, jump: jump && i === 0, jumpHeld: jump },
        1 / 60,
        0,
        world.solids,
      );
      runtime.update(1 / 60, player, idle);
    }
  };
  walk(1, 0, false, 56);
  walk(0, 1, false, 320);
  assert.ok(
    player.z < -108 && player.z > -112,
    `approach ${player.x},${player.z}`,
  );
  walk(0, 1, true, 50);
  walk(0, 1, false, 30);
  assert.ok(player.z > -104.5, `player did not traverse stone: ${player.z}`);
  walk(0, 0, false, 360);
  const companion = (runtime.snapshot() as any).servant;
  assert.ok(
    companion.z > -104.5,
    `companion stranded behind cover: ${companion.z}`,
  );
  assert.ok(Math.hypot(companion.x - player.x, companion.z - player.z) < 3);
  world.dispose?.();
});

test("straight runs along either map border meet a watch line", () => {
  for (const edge of [-41, 41]) {
    const world = buildTeancumNight(new T.Scene());
    let caught = 0;
    const runtime = world.adventure!({
      setAvatar() {},
      toast() {},
      complete() {},
      dialog(_r, _t, _b, next) {
        next();
      },
      caught() {
        caught++;
      },
    });
    const player = createPlayer(-2, 0, -144);
    for (let i = 0; i < 121; i++) runtime.update(0.1, player, idle);
    runtime.update(0, player, { ...idle, interact: true });
    const walk = (x: number, y: number, frames: number) => {
      for (let i = 0; i < frames && !caught; i++) {
        stepPlayer(
          player,
          { x, y, jump: false, jumpHeld: false },
          1 / 60,
          0,
          world.solids,
        );
        runtime.update(1 / 60, player, idle);
      }
    };
    for (let i = 0; i < 430 && Math.abs(player.x - edge) > 0.3; i++)
      walk(edge < player.x ? 1 : -1, 0, 1);
    walk(0, 0, 12);
    assert.ok(
      Math.abs(player.x - edge) < 1,
      `border approach ended at ${player.x}`,
    );
    assert.equal(
      caught,
      0,
      "camp staging area must allow approaching either flank",
    );
    walk(0, 1, 1700);
    assert.equal(
      caught,
      1,
      `unseen straight run remained possible on border ${edge}`,
    );
    assert.ok(
      player.z < 65,
      `border runner reached the royal camp at ${player.z}`,
    );
    world.dispose?.();
  }
});
