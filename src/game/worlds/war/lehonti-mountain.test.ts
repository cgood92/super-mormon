import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildLehontiMountain, ANTIPAS_ROUTE } from "./lehonti-mountain";

// Adjacent full-height trail boxes formerly shared overlapping outward walls.
// Sample the middle of a straight run, away from corners and triangle edges.
test("Antipas brown terrace walls have one visible owner at overlapping steps", () => {
  const scene = new T.Scene();
  const world = buildLehontiMountain(scene);
  scene.updateMatrixWorld(true);
  const point = ANTIPAS_ROUTE[3];
  const ray = new T.Raycaster(
    new T.Vector3(point.x + 2.5, 0.4, point.z + 12),
    new T.Vector3(0, 0, -1),
    0,
    15,
  );
  const hits = ray
    .intersectObject(scene, true)
    .filter((hit) => /Mount Antipas walkable spiral/.test(hit.object.name));
  const coincident = hits.filter(
    (hit) => Math.abs(hit.point.z - (point.z + 2.85)) < 0.01,
  );
  assert.equal(
    coincident.length,
    1,
    "overlapping vertical brown walls must be removed, not depth-biased",
  );
  world.dispose?.();
});

test("Antipas terrace tops match their support without duplicate floor hits", () => {
  const scene = new T.Scene();
  const world = buildLehontiMountain(scene);
  scene.updateMatrixWorld(true);
  const terrace = scene.getObjectByName(
    "Mount Antipas walkable spiral terraces",
  ) as T.Mesh;
  const supports = terrace.userData.scenery.solids as {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
  }[];
  for (const p of ANTIPAS_ROUTE) {
    // Avoid triangle diagonals and authored post positions.
    const x = p.x + 0.137,
      z = p.z + 0.213;
    const expected = Math.max(
      ...supports
        .filter(
          (s) => Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2,
        )
        .map((s) => s.y + s.h),
    );
    const ray = new T.Raycaster(
      new T.Vector3(x, 100, z),
      new T.Vector3(0, -1, 0),
    );
    const hits = ray.intersectObject(terrace);
    assert.equal(hits.length, 1, "each walk surface has one visible owner");
    assert.ok(
      Math.abs(hits[0].point.y - expected) < 0.0001,
      "visible top matches the physical terrace",
    );
  }
  assert.ok(
    terrace.geometry.attributes.position.count < 50_000,
    "the entire spiral is one bounded mesh",
  );
  world.dispose?.();
});

import { createPlayer } from "../../physics/physics";
const idle = { x: 0, y: 0, interact: false, interactHeld: false };
test("Lehonti opening establishes summit and valley before releasing a fresh race", () => {
  const scene = new T.Scene(),
    world = buildLehontiMountain(scene);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog() {},
  });
  assert.equal(runtime.movementLocked?.(), true);
  const captions = new Set<string>();
  for (let i = 0; i < 239; i++) {
    captions.add(runtime.update(0.1, player, idle).objective);
    const state = runtime.snapshot() as {
      timer: number;
      messengerProgress: number;
      retries: number;
    };
    assert.equal(state.timer, 0);
    assert.equal(state.messengerProgress, 0);
    assert.equal(state.retries, 0);
    assert.ok(runtime.camera?.());
  }
  assert.ok([...captions].some((s) => /Lehonti.*summit/.test(s)));
  assert.ok([...captions].some((s) => /Amalickiah/.test(s)));
  assert.ok([...captions].some((s) => /trap/.test(s)));
  runtime.update(0.1, player, idle);
  runtime.update(0.1, player, idle);
  assert.equal(runtime.movementLocked?.(), false);
  assert.equal(runtime.camera?.(), undefined);
  runtime.update(0.1, player, idle);
  assert.ok(
    (runtime.snapshot() as { messengerProgress: number }).messengerProgress > 0,
  );
  runtime.dispose();
  world.dispose?.();
});

import { cameraSegmentClear } from "../../camera/camera";
import { StoryMeshObstacles } from "../../camera/cinematic";
import { createCharacter } from "../../characters/character";
test("opening cuts frame summit, valley and runner safely on phone and desktop", () => {
  for (const aspect of [16 / 9, 390 / 844]) {
    const scene = new T.Scene(),
      world = buildLehontiMountain(scene);
    const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
    const avatar = createCharacter("warning-runner");
    const runtime = world.adventure!({
      viewAspect: () => aspect,
      setAvatar() {
        world.actorParent!.add(avatar.group);
        avatar.update(0, player);
      },
      toast() {},
      complete() {},
      dialog() {},
    });
    const actors = [
      "Lehonti · leader at the summit",
      "Amalickiah sends a secret embassy from the valley",
      "Lehonti guard 1",
      "Lehonti guard 2",
      ...[1, 2, 3].map((i) => `Actual embassy messenger ${i}`),
    ].map((name) => ({ group: scene.getObjectByName(name)! }));
    actors.push({ group: avatar.group });
    const meshes = new StoryMeshObstacles(world.actorParent, actors);
    for (let frame = 0; frame < 240; frame++) {
      world.update?.(0.1, player);
      const shot = runtime.camera!();
      assert.ok(shot);
      const position = new T.Vector3().copy(shot.position);
      const focus = new T.Vector3().copy(shot.focus);
      assert.equal(
        shot.cut,
        true,
        "distant beats use edited cuts, never a flight through the mountain",
      );
      assert.ok(cameraSegmentClear(position, position, world.solids));
      assert.ok(meshes.clear(position, position, 0.28));
      assert.ok(cameraSegmentClear(position, focus, world.solids, 0.035));
      assert.ok(meshes.clear(position, focus));
      const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
      camera.position.copy(position);
      camera.lookAt(focus);
      camera.updateMatrixWorld(true);
      const opening = runtime.snapshot() as { openingBeat: string };
      const subject =
        opening.openingBeat === "summit"
          ? actors[0].group
          : opening.openingBeat === "embassy"
            ? actors[1].group
            : avatar.group;
      for (const height of [0.3, 1.05, 1.65]) {
        const bodyPoint = subject
          .getWorldPosition(new T.Vector3())
          .add(new T.Vector3(0, height, 0));
        assert.ok(cameraSegmentClear(position, bodyPoint, world.solids, 0.035));
        assert.ok(meshes.clear(position, bodyPoint));
        const bodyNdc = bodyPoint.project(camera);
        assert.ok(
          Math.abs(bodyNdc.x) < 0.95 &&
            Math.abs(bodyNdc.y) < 0.95 &&
            bodyNdc.z < 1,
          "the subject's body stays framed",
        );
      }
      const projected = focus.clone().project(camera);
      assert.ok(Math.abs(projected.x) < 0.95 && Math.abs(projected.y) < 0.95);
      runtime.update(0.1, player, idle);
    }
    runtime.dispose();
    avatar.dispose();
    world.dispose?.();
  }
});

test("outro depicts Amalickiah's ascent, poisoning of Lehonti, and coronation as king", () => {
  const scene = new T.Scene(),
    world = buildLehontiMountain(scene);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let done = 0;
  let nextDialog: (() => void) | undefined;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      done++;
    },
    dialog(_ref, _title, _body, next) {
      nextDialog = next;
    },
  });

  // Advance past opening directly with jump input
  runtime.update(0.1, player, { ...idle, jump: true });
  runtime.update(0.1, player, { ...idle, jump: true });
  runtime.update(0.1, player, { ...idle, jump: true });
  assert.equal((runtime.snapshot() as { phase: string }).phase, "race");

  // Win race 1
  Object.assign(player, ANTIPAS_ROUTE.at(-1)!);
  runtime.update(0.1, player, idle);
  assert.ok(nextDialog);
  nextDialog();
  nextDialog = undefined;

  // Win race 2
  Object.assign(player, ANTIPAS_ROUTE.at(-1)!);
  runtime.update(0.1, player, idle);
  assert.ok(nextDialog);
  nextDialog();
  nextDialog = undefined;

  // Win race 3
  Object.assign(player, ANTIPAS_ROUTE.at(-1)!);
  runtime.update(0.1, player, idle);
  assert.ok(nextDialog);
  nextDialog();
  nextDialog = undefined;

  // Now in outro!
  const state = runtime.snapshot() as { phase: string; outroBeat: string };
  assert.equal(state.phase, "outro");
  assert.equal(state.outroBeat, "ascent");
  assert.equal(runtime.movementLocked?.(), true);

  const outroCaptions = new Set<string>();
  // Step through all 4 beats of the outro (23.9s)
  for (let step = 0; step < 239; step++) {
    const res = runtime.update(0.1, player, idle);
    outroCaptions.add(res.objective);
    assert.ok(runtime.camera?.());
  }

  assert.ok([...outroCaptions].some((c) => /negotiate|summit/i.test(c)));
  assert.ok([...outroCaptions].some((c) => /poison/i.test(c)));
  assert.ok([...outroCaptions].some((c) => /Lehonti dies|command/i.test(c)));
  assert.ok([...outroCaptions].some((c) => /king/i.test(c)));

  // Final step completes the outro (reaching 24.0s)
  runtime.update(0.1, player, idle);
  assert.equal((runtime.snapshot() as { phase: string }).phase, "done");
  assert.equal(done, 1);
  assert.equal(runtime.movementLocked?.(), false);
  assert.equal(runtime.camera?.(), undefined);

  runtime.dispose();
  world.dispose?.();
});

test("player and embassy messenger start side-by-side at the trailhead without overlapping", () => {
  const scene = new T.Scene(),
    world = buildLehontiMountain(scene);
  const messenger = scene.getObjectByName("Actual embassy messenger 1")!;
  assert.ok(messenger, "embassy messenger exists");

  // Both should start on the first terrace
  assert.equal(world.spawn.x, 28);
  assert.equal(messenger.position.x, 28);
  assert.equal(world.spawn.y, 0.34);
  assert.equal(messenger.position.y, 0.34);

  // Lateral distance between them along the starting line must be generous (> 1.5m)
  const lateralDist = Math.abs(messenger.position.z - world.spawn.z);
  assert.ok(
    lateralDist >= 1.5,
    `runners must start side-by-side, not overlapping (was ${lateralDist.toFixed(2)}m apart)`,
  );

  // Both should be facing West down the trail toward the summit (-PI/2)
  assert.ok(
    Math.abs(Math.sin((world.spawn.yaw ?? 0) + Math.PI / 2)) < 0.01,
    "player must face West down the trail",
  );
  assert.ok(
    Math.abs(Math.sin(messenger.rotation.y + Math.PI / 2)) < 0.01,
    "messenger must face West down the trail",
  );

  world.dispose?.();
});

test("actors physically block the player and prevent walking through them", () => {
  const scene = new T.Scene(),
    world = buildLehontiMountain(scene);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  const messenger = scene.getObjectByName("Actual embassy messenger 1")!;

  // Try to move player directly onto the messenger (lateral intrusion)
  player.x = messenger.position.x;
  player.y = messenger.position.y;
  player.z = messenger.position.z - 0.2; // Only 0.2m away
  player.vz = 5.0; // Moving toward messenger

  world.update?.(1 / 60, player);

  const distToMessenger = Math.hypot(
    player.x - messenger.position.x,
    player.z - messenger.position.z,
  );
  assert.ok(
    distToMessenger >= 0.71,
    `player must be pushed outside actor cylinder, was ${distToMessenger.toFixed(2)}m`,
  );
  assert.ok(
    player.vz <= 0.001,
    "velocity into actor must be cancelled, cannot penetrate",
  );

  // Also verify Lehonti at the summit camp blocks penetration
  player.x = 0.25;
  player.y = 30.6;
  player.z = 0;
  player.vx = -4.0; // Moving toward Lehonti at (0, 30.6, 0)

  world.update?.(1 / 60, player);

  const distToLehonti = Math.hypot(player.x, player.z);
  assert.ok(
    distToLehonti >= 0.71,
    `player must not walk through Lehonti, was ${distToLehonti.toFixed(2)}m away`,
  );
  assert.ok(
    player.vx >= -0.001,
    "velocity into Lehonti must be deflected, cannot pass through",
  );

  world.dispose?.();
});
