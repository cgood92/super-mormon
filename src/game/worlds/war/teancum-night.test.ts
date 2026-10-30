import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildTeancumNight, TEANCUM_ROUTE } from "./teancum-night";
import { createPlayer, stepPlayer } from "../../physics/physics";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };

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
  const servant = TEANCUM_ROUTE[1];
  const player = createPlayer(servant.x, 0, servant.z);
  runtime.update(0, player, { ...idle, interact: true });
  const king = scene.getObjectByName("Sleeping Amalickiah")!;
  const position = king.getWorldPosition(new T.Vector3());
  Object.assign(player, createPlayer(position.x, 0, position.z - 1.5));
  const result = runtime.update(0, player, idle);
  assert.match(result?.prompt ?? "", /Amalickiah|javelin/i);
  runtime.update(0, player, { ...idle, interact: true });
  assert.equal((runtime.snapshot() as { phase: string }).phase, "return");
  assert.equal(completed, 0);
  Object.assign(player, createPlayer(servant.x, 0, servant.z));
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
  const player = createPlayer(-2, 0, -144);
  runtime.update(0, player, { ...idle, interact: true });
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
