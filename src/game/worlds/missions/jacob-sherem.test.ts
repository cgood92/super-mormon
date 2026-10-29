import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildJacobSherem } from "./jacob-sherem";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };

test("search follows moving Sherem, with no beacon or intermediate chores", () => {
  const scene = new T.Scene(),
    world = buildJacobSherem(scene),
    p = createPlayer();
  let done = 0,
    next: (() => void) | undefined;
  const texts: string[] = [];
  const captions: string[] = [];
  const runtime = world.adventure!({
    setAvatar() {},
    toast(text) {
      captions.push(text);
    },
    complete() {
      done++;
    },
    dialog(_r, _t, text, advance) {
      texts.push(text);
      next = advance;
    },
  });
  assert.match(world.initialObjective!, /Find Sherem/);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  const actor = scene.getObjectByName("Sherem · articulate visitor")!;
  const start = actor.position.clone();
  for (let i = 0; i < 180; i++) world.update(1 / 60, p);
  assert.ok(
    actor.position.distanceTo(start) > 3,
    "Sherem walks at a normal pace",
  );
  assert.equal(scene.getObjectByName("Blue next task beacon")!.visible, false);
  Object.assign(p, start);
  runtime.update(0.016, p, { ...idle, interact: true });
  assert.equal(
    texts.length,
    0,
    "old position cannot trigger the moving encounter",
  );
  Object.assign(p, actor.position);
  p.x += 1.2;
  runtime.update(0.016, p, { ...idle, interact: true });
  assert.equal(texts.length, 1);
  runtime.update(0.016, p, { ...idle, interact: true });
  assert.equal(
    texts.length,
    1,
    "repeated action cannot duplicate the encounter",
  );
  next!();
  for (let i = 0; i < 90; i++) runtime.update(1 / 60, p, idle);
  assert.ok(Math.abs(actor.rotation.z) > 1.5);
  assert.equal(texts.length, 1, "fall never opens another mandatory dialog");
  assert.match(captions.at(-1)!, /many days/);
  assert.match(captions.at(-1)!, /next day/);
  assert.match(captions.at(-1)!, /died/);
  assert.equal(done, 0, "leave time to read the automatic closing caption");
  for (let i = 0; i < 600; i++) runtime.update(1 / 60, p, idle);
  assert.equal(done, 1);
  runtime.update(1, p, { ...idle, interact: true });
  assert.equal(done, 1);
  world.dispose();
  world.dispose();
  assert.equal(scene.children.length, 0);
});

test("temple approach and city outskirts are physically reachable; varied crowd keeps walking", () => {
  const scene = new T.Scene(),
    world = buildJacobSherem(scene),
    p = createPlayer();
  Object.assign(p, world.spawn);
  const walk = (x: number, z: number) => {
    for (let i = 0; i < 2200 && Math.hypot(x - p.x, z - p.z) > 0.5; i++) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        p,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      world.update(1 / 60, p);
    }
    assert.ok(
      Math.hypot(x - p.x, z - p.z) < 0.6,
      `route blocked at ${p.x},${p.z} toward ${x},${z}`,
    );
  };
  assert.ok(world.spawn.z < -75, "arrival passes temple before city search");
  walk(14, -27);
  walk(0, -27);
  walk(0, 0);
  walk(0, 52);
  walk(57, 52);
  walk(57, 72);
  const crowd: T.Object3D[] = [];
  scene.traverse((o) => {
    if (o.name.startsWith("Settlement resident")) crowd.push(o);
  });
  assert.ok(crowd.length >= 20);
  const before = crowd.map((o) => o.position.clone());
  for (let i = 0; i < 180; i++) world.update(1 / 60, p);
  assert.ok(crowd.every((o, i) => o.position.distanceTo(before[i]) > 2));
  assert.ok(crowd.some((o) => Math.abs(o.position.x) > 40));
  world.dispose();
});

test("Sherem encounter camera remains clear on phone and desktop from four approaches", async () => {
  const { StoryCinematic } = await import("../../camera/cinematic");
  const { FollowCamera } = await import("../../camera/camera");
  const scene = new T.Scene(),
    world = buildJacobSherem(scene),
    p = createPlayer();
  let shot: import("../../camera/cinematic").StoryShot | undefined;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_r, _t, _b, _n, s) {
      shot = s;
    },
  });
  const target = scene.getObjectByName("Sherem · articulate visitor")!.position;
  Object.assign(p, target);
  p.x += 1.3;
  runtime.update(1 / 60, p, { ...idle, interact: true });
  const avatar = new T.Group();
  scene.add(avatar);
  for (const aspect of [16 / 9, 390 / 844])
    for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      avatar.position.set(
        target.x + Math.sin(yaw) * 1.3,
        0,
        target.z + Math.cos(yaw) * 1.3,
      );
      const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
      new FollowCamera(camera).reset(
        { ...avatar.position, yaw },
        yaw,
        "streets",
      );
      const movie = new StoryCinematic(
        camera,
        {
          ...shot,
          actors: [{ group: avatar, speaker: true }, ...(shot?.actors ?? [])],
        },
        world.solids,
        scene,
      );
      for (let i = 0; i < 100; i++) {
        if (i === 70) movie.finish();
        movie.update(1 / 30);
        assert.equal(movie.snapshot().clear, true);
        assert.equal(movie.snapshot().actorVisible, true);
      }
      movie.dispose();
    }
  world.dispose();
  scene.remove(avatar);
});
