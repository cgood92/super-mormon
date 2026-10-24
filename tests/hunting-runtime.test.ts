import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildBrokenBow } from "../src/super/broken-bow";
import { createPlayer } from "../src/super/physics";
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
      target: { x: number; y: number; z: number };
      animals: { position: T.Vector3 }[];
      arrow?: { position: T.Vector3; active: boolean };
    };
  // Isolate runtime behavior; the story test separately exercises stepPlayer through this route.
  for (const phase of ["camp", "wood", "arrow", "craft", "counsel", "guide"]) {
    assert.equal(snapshot().phase, phase);
    Object.assign(player, snapshot().target);
    for (let i = 0; i < (phase === "craft" ? 3 : 1); i++)
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
