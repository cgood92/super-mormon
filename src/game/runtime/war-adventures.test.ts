import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildTeancumNight, TEANCUM_ROUTE } from "../worlds/war/teancum-night";
import { buildGidRescue, GID_ROUTE } from "../worlds/war/gid-rescue";
import { createPlayer, stepPlayer } from "../physics/physics";
import { sceneryCollisionErrors } from "../worlds/shared/scenery";
import { StoryCinematic, type StoryShot } from "../camera/cinematic";
import type { Point, WorldData } from "./worlds";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };

function harness(world: WorldData) {
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let completed = 0;
  const dialogs: { title: string; body: string }[] = [];
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_ref, title, body, next) {
      dialogs.push({ title, body });
      next();
    },
    caught(reset) {
      reset();
    },
  });
  const walk = (target: Point) => {
    let frames = 0;
    while (
      Math.hypot(target.x - player.x, target.z - player.z) > 0.55 &&
      frames++ < 3600
    ) {
      const dx = target.x - player.x,
        dz = target.z - player.z;
      const length = Math.hypot(dx, dz);
      stepPlayer(
        player,
        { x: -dx / length, y: dz / length, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
        world.climbables,
      );
      world.update?.(1 / 60, player);
      runtime.update(1 / 60, player, idle);
    }
    assert.ok(
      frames < 3600,
      `walking route blocked at ${player.x.toFixed(1)},${player.z.toFixed(1)} toward ${target.x},${target.z}`,
    );
  };
  const use = () => {
    runtime.update(1 / 60, player, { ...idle, interact: true });
    for (let i = 0; i < 35; i++) {
      const state = runtime.snapshot() as {
        drinking?: number;
        throwing?: boolean;
      };
      if (!state.drinking && !state.throwing) break;
      runtime.update(0.1, player, idle);
    }
  };
  return {
    player,
    runtime,
    walk,
    use,
    dialogs,
    get completed() {
      return completed;
    },
  };
}

test("Teancum's night route uses cover, a non-graphic tent event, and a return to the guard", () => {
  const scene = new T.Scene(),
    world = buildTeancumNight(scene),
    h = harness(world);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  for (const point of TEANCUM_ROUTE.slice(1)) {
    h.walk(point);
    h.use();
  }
  assert.equal(h.completed, 1);
  assert.match(h.dialogs.map((d) => d.body).join(" "), /Amalickiah/);
  assert.match(h.dialogs.map((d) => d.body).join(" "), /readiness|alert/i);
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});

test("Gid requires two weapon deliveries over the wall and bloodless surrender", () => {
  const scene = new T.Scene(),
    world = buildGidRescue(scene),
    h = harness(world);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  for (const [index, point] of GID_ROUTE.entries()) {
    if (!index) continue;
    if (index === 8 || index === 9) h.walk({ x: 22, y: 0, z: 16 });
    h.walk(point);
    h.use();
  }
  assert.equal(h.completed, 1);
  assert.equal((h.runtime.snapshot() as { delivered: number }).delivered, 2);
  assert.equal(
    (h.runtime.snapshot() as { familyTalked: boolean }).familyTalked,
    true,
  );
  assert.match(h.dialogs.map((d) => d.body).join(" "), /Laman/);
  assert.match(h.dialogs.map((d) => d.body).join(" "), /women|children/);
  assert.match(
    h.dialogs.map((d) => d.body).join(" "),
    /without bloodshed|surrender/i,
  );
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});

test("an exposed player in the outer watch triggers Teancum's stealth reset", () => {
  const world = buildTeancumNight(new T.Scene()),
    h = harness(world);
  h.walk(TEANCUM_ROUTE[1]);
  h.use();
  const sentry = (
    h.runtime.snapshot() as {
      sentries: { x: number; z: number; headYaw: number }[];
    }
  ).sentries[0];
  const yaw = sentry.headYaw;
  Object.assign(
    h.player,
    createPlayer(sentry.x + Math.sin(yaw) * 8, 0, sentry.z + Math.cos(yaw) * 8),
  );
  h.runtime.update(0.05, h.player, idle);
  const state = h.runtime.snapshot() as { phase: string; detections: number };
  assert.equal(state.phase, "servant");
  assert.equal(state.detections, 1);
  assert.equal(h.player.z, world.spawn.z);
  world.dispose?.();
});

test("Gid's city wall blocks walking while the outer flank stays open", () => {
  const world = buildGidRescue(new T.Scene());
  const player = createPlayer(0, 0, 16);
  for (let i = 0; i < 140; i++)
    stepPlayer(
      player,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(player.z < 20.3, `passed through Gid's wall at z=${player.z}`);
  world.dispose?.();
});

test("all war-story shots keep the player visible through entrance and return", () => {
  for (const [build, route] of [
    [buildTeancumNight, TEANCUM_ROUTE],
    [buildGidRescue, GID_ROUTE],
  ] as const) {
    const scene = new T.Scene(),
      world = build(scene),
      player = createPlayer();
    const avatar = new T.Group();
    scene.add(avatar);
    let shot: StoryShot | undefined, next: (() => void) | undefined;
    const runtime = world.adventure!({
      setAvatar() {},
      toast() {},
      complete() {},
      dialog(_r, _t, _b, advance, captured) {
        next = advance;
        shot = captured;
      },
    });
    for (let index = 1; index < route.length; index++) {
      for (
        let wait = 0;
        wait < 35 && (runtime.snapshot() as { drinking?: number }).drinking;
        wait++
      )
        runtime.update(0.1, player, idle);
      Object.assign(
        player,
        createPlayer(route[index].x, route[index].y, route[index].z),
      );
      avatar.position.set(player.x, player.y, player.z);
      runtime.update(1 / 60, player, { ...idle, interact: true });
      if (build === buildTeancumNight && (index === 2 || index === 3)) {
        assert.equal(
          shot,
          undefined,
          "watch lines should advance through travel, without stopping for dialogue",
        );
        continue;
      }
      for (
        let flight = 0;
        flight < 12 && (runtime.snapshot() as { throwing?: boolean }).throwing;
        flight++
      )
        runtime.update(0.1, player, idle);
      assert.ok(shot, `${world.name} stage ${index} opened no shot`);
      for (const aspect of [16 / 9, 390 / 844])
        for (const angle of [0, Math.PI / 2, Math.PI]) {
          const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
          camera.position.set(
            player.x + Math.sin(angle) * 5,
            3.5,
            player.z + Math.cos(angle) * 5,
          );
          camera.lookAt(player.x, 1, player.z);
          const movie = new StoryCinematic(
            camera,
            {
              ...shot,
              actors: [
                { group: avatar, speaker: true },
                ...(shot?.actors ?? []),
              ],
            },
            world.solids,
            scene,
          );
          for (let frame = 0; frame < 60; frame++) {
            if (frame === 35) movie.finish();
            movie.update(1 / 30);
            const state = movie.snapshot();
            assert.equal(
              state.clear,
              true,
              `${world.name} shot ${index}, aspect ${aspect}, angle ${angle}: camera intersected scenery`,
            );
            assert.equal(
              state.actorVisible,
              true,
              `${world.name} shot ${index}, aspect ${aspect}, angle ${angle}: player obscured`,
            );
          }
          movie.dispose();
        }
      next?.();
      shot = undefined;
      next = undefined;
    }
    world.dispose?.();
    scene.remove(avatar);
  }
});
