import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
import {
  buildTitleOfLiberty,
  LIBERTY_TOWER_ROUTE,
} from "../src/super/title-of-liberty";
import { buildLehontiMountain } from "../src/super/lehonti-mountain";
import { StoryCinematic, type StoryShot } from "../src/super/cinematic";
import { FollowCamera } from "../src/super/camera";
import type { Point, WorldData } from "../src/super/worlds";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function harness(world: WorldData) {
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let done = 0;
  let next: (() => void) | undefined;
  const dialogs: string[] = [];
  const shots: StoryShot[] = [];
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      done++;
    },
    dialog(_reference, _title, body, advance, shot) {
      dialogs.push(body);
      next = advance;
      if (shot) shots.push(shot);
    },
  });
  return {
    player,
    runtime,
    dialogs,
    shots,
    advance: () => {
      assert.ok(next);
      next();
      next = undefined;
    },
    done: () => done,
  };
}
function walk(
  world: WorldData,
  player: ReturnType<typeof createPlayer>,
  target: Point,
  frames = 1800,
  onStep?: () => void,
) {
  for (
    let i = 0;
    i < frames && Math.hypot(player.x - target.x, player.z - target.z) > 1.1;
    i++
  ) {
    const dx = target.x - player.x,
      dz = target.z - player.z;
    const d = Math.hypot(dx, dz);
    stepPlayer(
      player,
      { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
      world.climbables,
    );
    world.update?.(1 / 60, player);
    onStep?.();
  }
  assert.ok(
    Math.hypot(player.x - target.x, player.z - target.z) < 1.1,
    `blocked route to ${JSON.stringify(target)} at ${player.x.toFixed(1)},${player.y.toFixed(1)},${player.z.toFixed(1)}`,
  );
}

test("title of liberty requires making, carrying, and rallying moving groups", () => {
  const scene = new T.Scene(),
    world = buildTitleOfLiberty(scene),
    h = harness(world);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  const state = () =>
    h.runtime.snapshot() as {
      phase: string;
      target: Point;
      rallied: number;
      carrying: boolean;
    };
  for (let i = 0; i < 8 && state().phase !== "done"; i++) {
    if (state().phase === "tower") {
      for (const step of LIBERTY_TOWER_ROUTE) {
        walk(world, h.player, step);
        assert.ok(
          h.player.y >= step.y - 0.45,
          `tower switchback must physically lift Moroni (${h.player.y} vs ${step.y})`,
        );
      }
    } else walk(world, h.player, state().target);
    if (state().phase.startsWith("rally")) {
      for (let frame = 0; frame < 150; frame++) {
        const target = state().target,
          angle = frame * 0.075;
        const dx = target.x + Math.cos(angle) * 1.5 - h.player.x;
        const dz = target.z + Math.sin(angle) * 1.5 - h.player.z;
        const length = Math.hypot(dx, dz);
        stepPlayer(
          h.player,
          { x: -dx / length, y: dz / length, jump: false, jumpHeld: false },
          1 / 60,
          0,
          world.solids,
        );
        world.update?.(1 / 60, h.player);
        h.runtime.update(1 / 60, h.player, { ...idle, interactHeld: true });
      }
      assert.ok(
        (h.runtime.snapshot() as { rallySignal: number }).rallySignal >= 1.25,
        "moving with the raised banner should win the group's attention",
      );
    }
    h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
    h.advance();
  }
  assert.equal(state().phase, "done");
  assert.equal(state().rallied, 3);
  assert.equal(h.done(), 1);
  assert.ok(h.player.y > 12.4, "Moroni must stand on the actual tower roof");
  assert.ok(h.dialogs.some((body) => /prayer/i.test(body)));
  world.dispose?.();
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});

test("rally and fourth approach shots keep the player visible on phone and desktop", () => {
  for (const build of [buildTitleOfLiberty, buildLehontiMountain]) {
    const scene = new T.Scene(),
      world = build(scene),
      h = harness(world);
    if (build === buildLehontiMountain) {
      for (let i = 0; i < 3; i++) {
        const state = h.runtime.snapshot() as { target: Point };
        Object.assign(h.player, state.target);
        h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
        h.advance();
      }
      world.update?.(0.1, h.player);
    } else {
      for (let i = 0; i < 5; i++) {
        const state = h.runtime.snapshot() as { target: Point };
        Object.assign(h.player, state.target);
        if (i >= 2) {
          h.player.runSpeed = 2;
          for (let frame = 0; frame < 90; frame++)
            h.runtime.update(1 / 60, h.player, { ...idle, interactHeld: true });
        }
        h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
        h.advance();
      }
      world.update?.(1 / 60, h.player);
    }
    const state = h.runtime.snapshot() as { target: Point };
    Object.assign(h.player, state.target);
    h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
    const shot = h.shots.at(-1)!;
    const avatar = new T.Group();
    scene.add(avatar);
    for (const aspect of [16 / 9, 390 / 844])
      for (const angle of [0, Math.PI]) {
        avatar.position.set(h.player.x, h.player.y, h.player.z);
        const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
        new FollowCamera(camera).reset(
          { ...avatar.position, yaw: angle },
          angle,
          "streets",
        );
        const movie = new StoryCinematic(
          camera,
          {
            ...shot,
            actors: [{ group: avatar, speaker: true }, ...(shot.actors ?? [])],
          },
          world.solids,
          scene,
        );
        for (let frame = 0; frame < 105; frame++) {
          if (frame === 65) movie.finish();
          movie.update(1 / 30);
          const status = movie.snapshot();
          assert.equal(
            status.clear,
            true,
            `${world.name} camera intersects scenery`,
          );
          assert.equal(
            status.actorVisible,
            true,
            `${world.name} player leaves shot at aspect ${aspect}, angle ${angle}, frame ${frame}: ${JSON.stringify(status)}`,
          );
        }
        movie.dispose();
      }
    scene.remove(avatar);
    world.dispose?.();
  }
});

test("city dwellings block a direct walk while the carried banner tracks Moroni through an alley", () => {
  const scene = new T.Scene(),
    world = buildTitleOfLiberty(scene),
    h = harness(world);
  Object.assign(h.player, { x: -47, y: 0, z: 54, vx: 0, vz: 0 });
  for (let i = 0; i < 100; i++)
    stepPlayer(
      h.player,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(h.player.z > 45.75, "the house front blocks the direct route");
  walk(world, h.player, { x: -30, y: 0, z: 49 });
  walk(world, h.player, { x: -30, y: 0, z: 29 });
  walk(world, h.player, { x: 0, y: 0, z: 29 });
  h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
  h.advance();
  h.player.x = 4;
  h.player.z = 24;
  world.update?.(1 / 60, h.player);
  const banner = scene.getObjectByName(
    "Carried title of liberty · rent coat on pole",
  )!;
  assert.equal(banner.visible, true);
  assert.ok(Math.abs(banner.position.x - h.player.x - 0.65) < 0.01);
  world.dispose?.();
});

test("Antipas has a walkable spiral and three timed messenger races before the historical fourth request", () => {
  const scene = new T.Scene(),
    world = buildLehontiMountain(scene),
    h = harness(world);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  const state = () =>
    h.runtime.snapshot() as {
      phase: string;
      target: Point;
      race: number;
      timer: number;
      messengerProgress: number;
      runnerProgress: number;
    };
  let raced = 0;
  for (let i = 0; i < 6 && state().phase !== "done"; i++) {
    const before = state();
    if (before.phase === "race") {
      raced++;
      const route = (
        before as typeof before & {
          route: Point[];
          startIndex: number;
          checkpointIndex: number;
        }
      ).route;
      const startIndex = (before as typeof before & { startIndex: number })
        .startIndex;
      const checkpointIndex = (
        before as typeof before & { checkpointIndex: number }
      ).checkpointIndex;
      assert.equal(
        startIndex,
        0,
        "each messenger race starts at the trailhead",
      );
      assert.equal(
        checkpointIndex,
        route.length - 1,
        "each messenger reaches Lehonti's summit",
      );
      assert.deepEqual(
        before.target,
        route.at(-1),
        "Lehonti stays at the same camp for all refusals",
      );
      for (let step = startIndex; step <= checkpointIndex; step++) {
        walk(world, h.player, route[step], 500, () => {
          h.runtime.update(1 / 60, h.player, idle);
        });
        assert.ok(
          h.player.y >= route[step].y - 0.45,
          `spiral terrace ${step} must physically lift the player (${h.player.y} vs ${route[step].y})`,
        );
      }
    } else walk(world, h.player, before.target, 3000);
    h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
    h.advance();
    if (before.phase === "race" && raced < 3)
      assert.ok(
        Math.hypot(h.player.x - world.spawn.x, h.player.z - world.spawn.z) <
          0.01,
        "the next full ascent begins after a quick descent to the trailhead",
      );
  }
  assert.equal(raced, 3);
  assert.equal(state().phase, "done");
  assert.equal(h.done(), 1);
  assert.ok(h.dialogs.some((body) => /fourth/i.test(body)));
  assert.ok(h.dialogs.some((body) => /poison/i.test(body)));
  assert.equal(
    h.dialogs.filter((body) => /warn Lehonti/i.test(body)).length,
    3,
  );
  world.dispose?.();
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});

test("losing a messenger race returns the runner to its physical start for retry", () => {
  const world = buildLehontiMountain(new T.Scene()),
    h = harness(world);
  for (let i = 0; i < 1200; i++) h.runtime.update(0.1, h.player, idle);
  const state = h.runtime.snapshot() as {
    retries: number;
    race: number;
    messengerProgress: number;
  };
  assert.ok(state.retries > 0);
  assert.equal(state.race, 1);
  assert.ok(
    Math.hypot(h.player.x - world.spawn.x, h.player.z - world.spawn.z) < 0.01,
  );
  assert.ok(state.messengerProgress >= 0);
  world.dispose?.();
});
