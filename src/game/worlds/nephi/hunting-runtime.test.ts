import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildBrokenBow } from "./broken-bow";
import { createPlayer } from "../../physics/physics";
const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
test("hunt runtime moves real arrows, animates wildlife, cancels draw, and does not auto-hit distant targets", () => {
  const world = buildBrokenBow(new T.Scene()),
    player = createPlayer();
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_k, _t, _b, next) {
      next();
    },
  });
  const snapshot = () =>
    runtime.snapshot() as {
      phase: string;
      food: number;
      aiming: boolean;
      charge: number;
      practiceShots: number;
      target: { x: number; y: number; z: number };
      animals: { position: T.Vector3 }[];
      arrow?: { position: T.Vector3; active: boolean };
    };
  // Isolate runtime behavior; the story test separately exercises stepPlayer through this route.
  runtime.update(1, player, { ...idle, interactHeld: true });
  runtime.update(1 / 60, player, idle);
  assert.equal(snapshot().phase, "practice");
  assert.equal(
    snapshot().practiceShots,
    0,
    "a shot below the summit does not count",
  );
  player.x = 0;
  player.z = 46;
  player.y = 8;
  player.grounded = true;
  for (let i = 0; i < 3; i++) {
    runtime.update(1, player, { ...idle, interactHeld: true });
    runtime.update(1 / 60, player, idle);
    assert.equal(snapshot().practiceShots, i + 1);
  }
  runtime.update(0.85, player, idle);
  for (const phase of ["wood", "arrow", "counsel", "guide"]) {
    assert.equal(snapshot().phase, phase);
    Object.assign(player, snapshot().target);
    runtime.update(1 / 60, player, { ...idle, interact: true });
  }
  player.x = 0;
  player.z = 41;
  player.y = 8;
  player.yaw = Math.PI;
  const before = snapshot().animals.map((a) => a.position.clone());
  runtime.update(0.5, player, { ...idle, interactHeld: true });
  assert.equal(snapshot().aiming, true);
  runtime.update(1 / 60, player, { ...idle, jump: true });
  assert.equal(snapshot().aiming, false);
  assert.equal(snapshot().charge, 0);
  runtime.update(1, player, { ...idle, interactHeld: true });
  runtime.update(1 / 60, player, idle);
  const first = snapshot().arrow!.position.clone();
  assert.equal(snapshot().arrow!.active, true);
  const arrowModel = world.actorParent!.getObjectByName("Hunting arrow")!;
  // Find the free flying model rather than the bow's nocked child.
  const flying = world.actorParent!.children.find(
    (o) => o.name === "Hunting arrow",
  )!;
  assert.ok(arrowModel && flying);
  for (let i = 0; i < 8; i++) runtime.update(1 / 120, player, idle);
  const after = snapshot().arrow!;
  assert.ok(after.position.distanceTo(first) > 1);
  assert.ok(after.position.z < first.z);
  assert.ok(flying.position.distanceTo(after.position) < 1e-8);
  assert.ok(
    snapshot().animals.some((a, i) => a.position.distanceTo(before[i]) > 0.1),
  );
  for (let i = 0; i < 600; i++) runtime.update(1 / 120, player, idle);
  assert.equal(snapshot().food, 0);
  assert.equal(snapshot().arrow!.active, false);
  runtime.dispose();
  world.dispose?.();
});

test("practice arrows aimed through moving wildlife cannot secure food or skip counsel", () => {
  const world = buildBrokenBow(new T.Scene()),
    player = createPlayer();
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_k, _t, _b, next) {
      next();
    },
  });
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      practiceShots: number;
      food: number;
      animals: { position: T.Vector3; taken: boolean }[];
      arrow?: { position: T.Vector3; active: boolean };
      target: { x: number; y: number; z: number };
    };
  for (let shot = 1; shot <= 3; shot++) {
    const before = state().animals[1].position.clone();
    player.y = 8;
    player.grounded = true;
    player.yaw = 0;
    player.x = before.x - 0.35;
    player.z = before.z - 2.2;
    runtime.update(1, player, { ...idle, interactHeld: true });
    runtime.update(0.2, player, { ...idle, interactHeld: true });
    const moving = state().animals[1].position;
    assert.ok(moving.distanceTo(before) > 0.05);
    player.x = moving.x - 0.35;
    player.z = moving.z - 2.2;
    runtime.update(1 / 60, player, idle);
    let closest = Infinity;
    for (let i = 0; i < 20; i++) {
      const snap = state();
      if (snap.arrow?.active)
        closest = Math.min(
          closest,
          snap.arrow.position.distanceTo(snap.animals[1].position),
        );
      runtime.update(1 / 120, player, idle);
    }
    if (shot < 3)
      assert.ok(
        closest < 0.72,
        `shot ${shot} crosses the animal (closest ${closest}, food ${state().food})`,
      );
    assert.equal(state().food, 0);
    assert.equal(state().animals.filter((a) => a.taken).length, 0);
    assert.equal(state().practiceShots, shot);
  }
  assert.equal(state().phase, "snapped");
  assert.equal(
    state().arrow?.active,
    undefined,
    "third practice projectile is retired at the break",
  );
  runtime.update(0.85, player, idle);
  for (const phase of ["wood", "arrow", "counsel", "guide"]) {
    assert.equal(state().phase, phase);
    Object.assign(player, state().target);
    runtime.update(1 / 60, player, { ...idle, interact: true });
    assert.equal(state().food, 0);
  }
  assert.equal(state().phase, "hunt");
  runtime.dispose();
  world.dispose?.();
});

test("hunting scene releases an allocated sun shadow map once", () => {
  const scene = new T.Scene(),
    world = buildBrokenBow(scene);
  let sun: T.DirectionalLight | undefined;
  scene.traverse((o) => {
    if (o instanceof T.DirectionalLight) sun = o;
  });
  assert.ok(sun?.castShadow);
  const target = new T.WebGLRenderTarget(4, 4);
  let disposed = 0;
  target.addEventListener("dispose", () => disposed++);
  sun!.shadow.map = target;
  world.dispose?.();
  world.dispose?.();
  assert.equal(disposed, 1);
});

test("held equipment follows sockets and releases from the visible nock", () => {
  const scene = new T.Scene(),
    world = buildBrokenBow(scene),
    player = createPlayer();
  const left = new T.Group(),
    back = new T.Group();
  scene.add(left, back);
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_k, _t, _b, next) {
      next();
    },
    attachEquipment(slot, object) {
      if (slot === "leftHand") left.add(object);
      if (slot === "back") back.add(object);
    },
  });
  assert.equal(left.children[0].name, "Steel bow");
  player.x = 0;
  player.y = 8;
  player.z = 46;
  player.grounded = true;
  for (let i = 0; i < 3; i++) {
    runtime.update(1, player, { ...idle, interactHeld: true });
    runtime.update(1 / 60, player, idle);
  }
  runtime.update(0.85, player, idle);
  for (const at of [
    { x: -18, y: 0, z: -4 },
    { x: 19, y: 0, z: 2 },
    { x: -5, y: 0, z: -15 },
    { x: 7, y: 0, z: -19 },
  ]) {
    Object.assign(player, at);
    runtime.update(1 / 60, player, { ...idle, interact: true });
  }
  assert.ok(left.children.some((o) => o.name === "Curved hunting bow"));
  assert.equal(back.children[0].name, "Secured hunted animals");
  left.position.set(4, 10, 7);
  left.rotation.y = 0.3;
  player.x = 0;
  player.y = 8;
  player.z = 46;
  player.yaw = 0.3;
  runtime.update(1, player, { ...idle, interactHeld: true });
  const nock = left
    .getObjectByName("Curved hunting bow")!
    .getObjectByName("Hunting arrow")!;
  const expected = nock.getWorldPosition(new T.Vector3());
  runtime.update(1 / 60, player, idle);
  const arrow = (runtime.snapshot() as { arrow: { position: T.Vector3 } })
    .arrow;
  assert.ok(
    arrow.position.distanceTo(expected) < 0.001,
    `release ${arrow.position.toArray()} versus nock ${expected.toArray()}`,
  );
  runtime.dispose();
  world.dispose?.();
});
