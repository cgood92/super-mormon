import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCharacter } from "../src/super/character";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
import {
  buildTitleOfLiberty,
  LIBERTY_TOWER_ROUTE,
} from "../src/super/title-of-liberty";
import { buildLehontiMountain } from "../src/super/lehonti-mountain";
import { StoryCinematic, type StoryShot } from "../src/super/cinematic";
import { FollowCamera, cameraSegmentClear } from "../src/super/camera";
import type { Point, WorldData } from "../src/super/worlds";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function harness(world: WorldData, aspect = 16 / 9) {
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let done = 0;
  let next: (() => void) | undefined;
  const dialogs: string[] = [];
  const shots: StoryShot[] = [];
  const runtime = world.adventure!({
    viewAspect: () => aspect,
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

test("liberty prologue, two distinct roofs, summit and automatic interception", () => {
  const scene = new T.Scene(),
    world = buildTitleOfLiberty(scene),
    h = harness(world);
  const state = () =>
    h.runtime.snapshot() as {
      phase: string;
      target: Point;
      roofs: number[];
      coatVisible: boolean;
    };
  assert.equal(state().coatVisible, true);
  assert.equal(state().phase, "prayer");
  Object.assign(h.player, state().target);
  h.runtime.update(0.1, h.player, { ...idle, interact: true });
  for (let i = 0; i < 120; i++) h.runtime.update(0.1, h.player, idle);
  assert.equal(state().phase, "roofs");
  assert.equal(state().coatVisible, false);
  Object.assign(h.player, { x: -47, y: 0, z: 38 });
  for (let i = 0; i < 30; i++)
    h.runtime.update(0.1, h.player, { ...idle, interactHeld: true });
  assert.deepEqual(state().roofs, [], "standing beneath a roof must not count");
  for (const roof of [0, 0, 2]) {
    const sites = (h.runtime.snapshot() as { roofSites: Point[] }).roofSites;
    Object.assign(h.player, sites[roof]);
    for (let i = 0; i < 20; i++)
      h.runtime.update(0.1, h.player, { ...idle, interactHeld: true });
  }
  assert.deepEqual(state().roofs, [0, 2]);
  assert.equal(state().phase, "tower");
  Object.assign(h.player, state().target);
  h.runtime.update(0.1, h.player, { ...idle, interact: true });
  assert.equal(state().phase, "gather");
  for (let i = 0; i < 3000 && state().phase === "gather"; i++) {
    world.update?.(1 / 60, h.player);
    h.runtime.update(1 / 60, h.player, idle);
  }
  assert.equal(state().phase, "lead");
  Object.assign(h.player, state().target);
  h.runtime.update(0.1, h.player, idle);
  assert.equal(state().phase, "ending");
  for (let i = 0; i < 500; i++) {
    world.update?.(0.1, h.player);
    h.runtime.update(0.1, h.player, idle);
  }
  assert.equal(state().phase, "done", JSON.stringify(h.runtime.snapshot()));
  assert.equal(h.done(), 1);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  world.dispose?.();
});

test("rally and fourth approach shots keep the player visible on phone and desktop", () => {
  for (const build of [buildLehontiMountain]) {
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
  walk(world, h.player, { x: -20, y: 0, z: 49 });
  walk(world, h.player, { x: -20, y: 0, z: 29 });
  walk(world, h.player, { x: -14, y: 0, z: 17 });
  h.runtime.update(1 / 60, h.player, { ...idle, interact: true });
  for (let i = 0; i < 110; i++) h.runtime.update(0.1, h.player, idle);
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

test("all liberty roofs have physically playable jumping approaches and summit stairs", () => {
  const scene = new T.Scene(),
    world = buildTitleOfLiberty(scene),
    h = harness(world);
  const routes = (h.runtime.snapshot() as { roofRoutes: Point[][] }).roofRoutes;
  for (const route of routes) {
    const player = createPlayer(route[0].x, 0, route[0].z);
    for (const point of route.slice(1)) {
      let frames = 0;
      while (
        (Math.hypot(player.x - point.x, player.z - point.z) > 0.35 ||
          Math.abs(player.y - point.y) > 0.15 ||
          !player.grounded) &&
        frames++ < 500
      ) {
        const dx = point.x - player.x,
          dz = point.z - player.z,
          d = Math.hypot(dx, dz);
        stepPlayer(
          player,
          {
            x: d > 0.2 ? -dx / d : 0,
            y: d > 0.2 ? dz / d : 0,
            jump: player.grounded && player.y < point.y - 0.15,
            jumpHeld: true,
          },
          1 / 60,
          0,
          world.solids,
        );
      }
      assert.ok(
        frames < 500,
        `roof jump blocked toward ${JSON.stringify(point)} at ${JSON.stringify({ x: player.x, y: player.y, z: player.z })}`,
      );
    }
  }
  const player = createPlayer(0, 0, -39);
  for (const point of LIBERTY_TOWER_ROUTE) walk(world, player, point);
  assert.ok(player.y > 12.4);
  world.dispose?.();
});

test("liberty volunteers physically ascend, rally, descend and follow corners", () => {
  const world = buildTitleOfLiberty(new T.Scene()),
    h = harness(world);
  const state = () =>
    h.runtime.snapshot() as {
      phase: string;
      target: Point;
      roofSites: Point[];
      volunteers: Point[];
      gathered: number;
    };
  Object.assign(h.player, state().target);
  h.runtime.update(0.1, h.player, { ...idle, interact: true });
  for (let i = 0; i < 110; i++) h.runtime.update(0.1, h.player, idle);
  for (const site of state().roofSites.slice(0, 2)) {
    Object.assign(h.player, site);
    for (let i = 0; i < 16; i++)
      h.runtime.update(0.1, h.player, { ...idle, interactHeld: true });
  }
  Object.assign(h.player, state().target);
  h.runtime.update(0.1, h.player, { ...idle, interact: true });
  assert.equal(state().phase, "gather");
  for (let i = 0; i < 3000 && state().phase === "gather"; i++) {
    world.update?.(1 / 60, h.player);
    h.runtime.update(1 / 60, h.player, idle);
  }
  assert.equal(state().phase, "lead");
  assert.equal(state().gathered, 12);
  assert.ok(
    state().volunteers.every((p) => p.y > 12.4),
    "all volunteers stand on summit",
  );
  for (const p of [...LIBERTY_TOWER_ROUTE].reverse())
    walk(world, h.player, p, 1800, () =>
      h.runtime.update(1 / 60, h.player, idle),
    );
  for (const p of [
    { x: 0, y: 0, z: -36 },
    { x: -25, y: 0, z: -36 },
    { x: -25, y: 0, z: -42 },
  ])
    walk(world, h.player, p, 1800, () =>
      h.runtime.update(1 / 60, h.player, idle),
    );
  for (let i = 0; i < 2400; i++) world.update?.(1 / 60, h.player);
  assert.ok(
    state().volunteers.every(
      (p) => p.y < 0.5 && Math.hypot(p.x - h.player.x, p.z - h.player.z) < 8,
    ),
    `army completes physical descent and corner route ${JSON.stringify(state().volunteers)}`,
  );
  world.dispose?.();
});

test("liberty authored cameras fit prologue banner and show escape and return on phone and desktop", () => {
  for (const aspect of [16 / 9, 390 / 844]) {
    const scene = new T.Scene(),
      world = buildTitleOfLiberty(scene),
      h = harness(world, aspect);
    const state = () =>
      h.runtime.snapshot() as {
        phase: string;
        target: Point;
        roofSites: Point[];
        movieBeat: string;
      };
    const check = (fullBanner = false) => {
      const shot = h.runtime.camera?.();
      assert.ok(shot, "scripted beat has authored camera");
      const position = new T.Vector3(
          shot.position.x,
          shot.position.y,
          shot.position.z,
        ),
        focus = new T.Vector3(shot.focus.x, shot.focus.y, shot.focus.z);
      assert.ok(cameraSegmentClear(position, position, world.solids, 0.28));
      assert.ok(cameraSegmentClear(position, focus, world.solids, 0.03));
      if (fullBanner) {
        const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
        camera.position.copy(position);
        camera.lookAt(focus);
        camera.updateMatrixWorld();
        for (const y of [0.3, 4.9]) {
          const point = new T.Vector3(
            h.player.x + 0.65,
            h.player.y + y,
            h.player.z,
          ).project(camera);
          assert.ok(
            Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
            `prologue endpoint clipped at ${aspect}: ${point.toArray()}`,
          );
        }
      }
    };
    Object.assign(h.player, state().target);
    h.runtime.update(0.1, h.player, { ...idle, interact: true });
    for (let i = 0; i < 95; i++) {
      world.update?.(0.1, h.player);
      h.runtime.update(0.1, h.player, idle);
      check(true);
    }
    for (let i = 0; i < 10; i++) h.runtime.update(0.1, h.player, idle);
    for (const site of state().roofSites.slice(0, 2)) {
      Object.assign(h.player, site);
      for (let i = 0; i < 16; i++)
        h.runtime.update(0.1, h.player, { ...idle, interactHeld: true });
    }
    Object.assign(h.player, state().target);
    h.runtime.update(0.1, h.player, { ...idle, interact: true });
    for (let i = 0; i < 3000 && state().phase === "gather"; i++) {
      world.update?.(1 / 60, h.player);
      h.runtime.update(1 / 60, h.player, idle);
      if (state().phase === "gather") check();
    }
    Object.assign(h.player, state().target);
    h.runtime.update(0.1, h.player, idle);
    const beats = new Set<string>();
    for (let i = 0; i < 500 && state().phase === "ending"; i++) {
      world.update?.(0.1, h.player);
      h.runtime.update(0.1, h.player, idle);
      if (state().phase === "ending") {
        check();
        beats.add(state().movieBeat);
      }
    }
    assert.deepEqual([...beats], ["escape", "capture", "return"]);
    assert.equal(state().phase, "done");
    world.dispose?.();
  }
});

test("liberty camera excludes the actual Moroni avatar installed by setAvatar", () => {
  for (const aspect of [16 / 9, 390 / 844]) {
    const world = buildTitleOfLiberty(new T.Scene());
    const hero = createCharacter("moroni");
    hero.group.name = "moroni-character";
    const player = createPlayer(-14, 0, 17);
    hero.update(0, player);
    const runtime = world.adventure!({
      viewAspect: () => aspect,
      setAvatar() {
        world.actorParent!.add(hero.group);
      },
      toast() {},
      complete() {},
      dialog() {},
    });
    runtime.update(0.1, player, { ...idle, interact: true });
    const shot = runtime.camera!()!;
    assert.ok(shot);
    const fallback = new T.Vector3(player.x + 8, player.y + 5, player.z + 8);
    assert.ok(
      new T.Vector3(
        shot.position.x,
        shot.position.y,
        shot.position.z,
      ).distanceTo(fallback) > 0.1,
      "actual avatar must not force the camera planner to reuse the unsafe initial fallback",
    );
    world.actorParent!.remove(hero.group);
    hero.dispose();
    world.dispose?.();
  }
});

test("liberty background cast keeps the expanded city within its geometry budget", () => {
  const scene = new T.Scene();
  const world = buildTitleOfLiberty(scene);
  let vertices = 0;
  scene.traverse((object) => {
    if (object instanceof T.Mesh)
      vertices += object.geometry.getAttribute("position")?.count ?? 0;
  });
  assert.ok(vertices < 180_000, `background scene has ${vertices} vertices`);
  world.dispose?.();
});
