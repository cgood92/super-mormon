import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildWatersOfMormon, WATERS_ROUTE } from "./waters-of-mormon";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
test("Waters of Mormon has physical scenery and a continuous ordinary walking route", () => {
  const world = buildWatersOfMormon(new T.Scene());
  assert.deepEqual(
    sceneryCollisionErrors(world.actorParent!, world.solids),
    [],
  );
  const player = createPlayer(world.spawn.x, 0, world.spawn.z);
  for (const target of WATERS_ROUTE.slice(1)) {
    let frames = 0;
    while (
      Math.hypot(player.x - target.x, player.z - target.z) > 0.25 &&
      frames++ < 1800
    ) {
      const dx = target.x - player.x,
        dz = target.z - player.z,
        n = Math.hypot(dx, dz);
      stepPlayer(
        player,
        { x: -dx / n, y: dz / n, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      frames < 1800,
      `route blocked before ${JSON.stringify(target)} at ${player.x},${player.z}`,
    );
  }
  world.dispose!();
});
test("direct gaze resets the complete mission; the fountain requires choosing baptism", () => {
  const world = buildWatersOfMormon(new T.Scene());
  let caught = 0,
    complete = 0;
  const player = createPlayer(0, 0, 98);
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      complete++;
    },
    dialog(_k, _t, _b, next) {
      next();
    },
    caught(reset) {
      caught++;
      reset();
    },
  });
  runtime.update(0.01, player, idle);
  assert.equal(complete, 0);
  // First spy faces south at the start; this exposed position is directly in that gaze.
  Object.assign(player, createPlayer(-4, 0, 14));
  runtime.update(0.01, player, idle);
  assert.equal(caught, 1);
  assert.equal((runtime.snapshot() as { phase: string }).phase, "city");
  assert.equal(player.z, world.spawn.z);
  Object.assign(player, createPlayer(0, 0, 98));
  runtime.update(0.01, player, idle);
  runtime.update(0.01, player, idle);
  runtime.update(0.01, player, idle);
  runtime.update(0.01, player, { ...idle, interact: true });
  for (let i = 0; i < 250; i++) runtime.update(1 / 60, player, idle);
  assert.equal(complete, 1);
  assert.equal((runtime.snapshot() as { phase: string }).phase, "done");
  world.dispose!();
});

test("a timed ordinary walk reaches the hidden water with gaze detection active", () => {
  const world = buildWatersOfMormon(new T.Scene());
  const player = createPlayer(world.spawn.x, 0, world.spawn.z);
  let detections = 0,
    completed = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_k, _t, _b, next) {
      next();
    },
    caught(reset) {
      detections++;
      reset();
    },
  });
  const tick = (x = 0, y = 0) => {
    stepPlayer(
      player,
      { x, y, jump: false, jumpHeld: false },
      0.05,
      0,
      world.solids,
    );
    runtime.update(0.05, player, idle);
  };
  // Observe the first head scan from the sheltered start. All waits advance both physics and patrols.
  for (let i = 0; i < 51; i++) tick();
  const waited = new Set<number>();
  for (let routeIndex = 1; routeIndex < WATERS_ROUTE.length; routeIndex++) {
    const target = WATERS_ROUTE[routeIndex];
    let frames = 0;
    while (
      Math.hypot(target.x - player.x, target.z - player.z) > 0.3 &&
      frames++ < 1000
    ) {
      // The last city corner and forest entrance are safe observation positions.
      if (routeIndex === 4 && !waited.has(4)) {
        // Wait for the second spy to look east, away from this west-side crossing.
        // Observe the rendered head scan rather than relying on arrival time.
        let observationFrames = 0;
        while (
          (runtime.snapshot() as { spies: { headYaw: number }[] }).spies[1]
            .headYaw > 2.9 &&
          observationFrames++ < 300
        ) {
          tick();
          assert.equal(detections, 0, "seen while observing the city crossing");
        }
        assert.ok(observationFrames < 300, "city spy never looked away");
        waited.add(4);
      }
      if (routeIndex === 7 && !waited.has(7)) {
        // Let the forest spy complete its eastward scan, then cross while it
        // turns west. We pass its east side first and its north side afterward.
        let observationFrames = 0;
        const headYaw = () =>
          (runtime.snapshot() as { spies: { headYaw: number }[] }).spies[2]
            .headYaw;
        while (headYaw() < 1.4 && observationFrames++ < 300) {
          tick();
          assert.equal(detections, 0, "seen while observing the forest scan");
        }
        while (headYaw() > 1 && observationFrames++ < 300) {
          tick();
          assert.equal(
            detections,
            0,
            "seen while waiting for the forest crossing",
          );
        }
        assert.ok(observationFrames < 300, "forest spy never looked away");
        waited.add(7);
      }
      const dx = target.x - player.x,
        dz = target.z - player.z,
        n = Math.hypot(dx, dz);
      tick(-dx / n, dz / n);
      assert.equal(detections, 0, `seen on route segment ${routeIndex}`);
    }
    assert.ok(frames < 1000, `stalled on route segment ${routeIndex}`);
  }
  assert.equal((runtime.snapshot() as { phase: string }).phase, "alma");
  runtime.update(0.05, player, { ...idle, interact: true });
  for (let i = 0; i < 90; i++) runtime.update(0.05, player, idle);
  assert.equal(completed, 1);
  assert.equal(detections, 0);
  world.dispose!();
  world.dispose!();
});
