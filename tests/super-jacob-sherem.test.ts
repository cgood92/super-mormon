import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildJacobSherem } from "../src/super/jacob-sherem";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
import type { Point } from "../src/super/worlds";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
test("Jacob walks the settlement, witnesses the chronology, and completes only after returning for confession", () => {
  const scene = new T.Scene(),
    world = buildJacobSherem(scene),
    player = createPlayer();
  Object.assign(player, world.spawn);
  let done = 0,
    avatar = "",
    next: (() => void) | undefined;
  const text: string[] = [];
  const runtime = world.adventure!({
    setAvatar(role) {
      avatar = role;
    },
    toast() {},
    complete() {
      done++;
    },
    dialog(_ref, _title, body, advance) {
      text.push(body);
      next = advance;
    },
  });
  assert.equal(avatar, "jacob");
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      target: Point;
      pending: boolean;
      discovered: boolean;
    };
  function walk(target: Point) {
    for (
      let frame = 0;
      frame < 1500 &&
      Math.hypot(player.x - target.x, player.z - target.z) > 0.4;
      frame++
    ) {
      const dx = target.x - player.x,
        dz = target.z - player.z,
        length = Math.hypot(dx, dz);
      stepPlayer(
        player,
        { x: -dx / length, y: dz / length, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      world.update(1 / 60, player);
      runtime.update(1 / 60, player, idle);
    }
    assert.ok(
      Math.hypot(player.x - target.x, player.z - target.z) < 0.5,
      `blocked walking to ${JSON.stringify(target)} at ${player.x},${player.z}`,
    );
  }
  walk({ x: -23, y: 0, z: 32 });
  walk(state().target);
  const phases = [
    "settlement",
    "testimony",
    "sign",
    "days",
    "confession",
    "peace",
  ];
  for (const phase of phases) {
    assert.equal(state().phase, phase);
    // Stay outside the homes when crossing the settlement.
    if (phase === "testimony") walk({ x: 0, y: 0, z: 29 });
    if (phase === "days") walk({ x: 0, y: 0, z: 27 });
    if (phase === "confession") walk({ x: 0, y: 0, z: 27 });
    walk(state().target);
    runtime.update(1 / 60, player, { ...idle, interact: true });
    assert.equal(state().pending, true);
    runtime.update(1 / 60, player, { ...idle, interact: true });
    assert.equal(text.length, phases.indexOf(phase) + 1);
    next!();
    if (phase === "sign") {
      for (let i = 0; i < 12; i++) world.update(0.1, player);
      assert.ok(
        scene.getObjectByName("Sherem · articulate visitor")!.rotation.z < -1.5,
      );
    }
    if (phase === "days")
      assert.equal(
        scene.getObjectByName("Sherem · articulate visitor")!.visible,
        true,
      );
    if (phase === "confession")
      assert.equal(
        scene.getObjectByName("Sherem · articulate visitor")!.visible,
        false,
      );
  }
  assert.equal(done, 1);
  assert.equal(state().phase, "done");
  assert.match(text[3], /many days/);
  assert.match(text[3], /next day/);
  assert.match(text[4], /dies/);
  world.dispose();
  world.dispose();
  assert.equal(scene.children.length, 0);
});

test("home walls block walking while open doors and a garden route remain traversable", () => {
  const world = buildJacobSherem(new T.Scene()),
    p = createPlayer();
  Object.assign(p, { x: -24, y: 0, z: 23 });
  for (let i = 0; i < 90; i++)
    stepPlayer(
      p,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(p.x < -21.3, "west house wall must stop walking");
  Object.assign(p, { x: -17, y: 0, z: 29, vx: 0, vz: 0 });
  for (let i = 0; i < 45; i++)
    stepPlayer(
      p,
      { x: 0, y: -1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(p.z < 26, "doorway must admit the player");
  world.dispose();
});

test("story shots keep the player visible through entrance, watch, and return on phone and desktop", async () => {
  const { StoryCinematic } = await import("../src/super/cinematic");
  const { FollowCamera } = await import("../src/super/camera");
  const scene = new T.Scene(),
    world = buildJacobSherem(scene),
    player = createPlayer();
  let advance: (() => void) | undefined;
  let shot: import("../src/super/cinematic").StoryShot | undefined;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_r, _t, _b, next, s) {
      advance = next;
      shot = s;
    },
  });
  const avatar = new T.Group();
  scene.add(avatar);
  for (let stage = 0; stage < 6; stage++) {
    const target = (runtime.snapshot() as { target: Point }).target;
    Object.assign(player, target);
    runtime.update(1 / 60, player, { ...idle, interact: true });
    for (const aspect of [16 / 9, 390 / 844])
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        avatar.position.set(
          target.x + Math.sin(angle),
          0,
          target.z + Math.cos(angle),
        );
        const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
        const follow = new FollowCamera(camera);
        follow.reset({ ...avatar.position, yaw: angle }, angle, "streets");
        const movie = new StoryCinematic(
          camera,
          {
            ...shot,
            actors: [...(shot?.actors ?? []), { group: avatar, speaker: true }],
          },
          world.solids,
          scene,
        );
        for (let frame = 0; frame < 100; frame++) {
          if (frame === 70) movie.finish();
          movie.update(1 / 30);
          const diagnostic = movie.snapshot();
          assert.equal(
            diagnostic.clear,
            true,
            `stage ${stage} aspect ${aspect} camera collision`,
          );
          assert.equal(
            diagnostic.actorVisible,
            true,
            `stage ${stage} player hidden`,
          );
        }
        movie.dispose();
      }
    advance!();
  }
  world.dispose();
  scene.remove(avatar);
});
