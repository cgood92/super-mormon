import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildBountiful } from "../src/super/bountiful";
import { createPlayer, stepPlayer } from "../src/super/physics";

test("Bountiful requires prayer, tools, reconciliation and four individually aligned timbers", () => {
  const scene = new T.Scene(),
    world = buildBountiful(scene);
  assert.equal(world.initialObjective, "Climb the mountain trail and pray");
  assert.ok(scene.getObjectByName("laman-character"));
  assert.ok(scene.getObjectByName("lemuel-character"));
  assert.equal(scene.getObjectByName("sam-character"), undefined);
  let completed = 0,
    dialogs = 0;
  let finishDialog: (() => void) | undefined;
  const runtime = world.adventure!({
    setAvatar: () => {},
    toast: () => {},
    complete: () => completed++,
    dialog: (_k, _t, _b, next) => {
      dialogs++;
      if (dialogs === 6) finishDialog = next;
      else next();
    },
  });
  const player = createPlayer();
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      target: { x: number; y: number; z: number };
      placed: number;
      carrying: boolean;
      hasAxe: boolean;
      hasHammer: boolean;
      sockets: { yaw: number }[];
    };
  function act() {
    const p = state().target;
    Object.assign(player, { x: p.x, y: p.y, z: p.z });
    return runtime.update(0.016, player, {
      interact: true,
      interactHeld: true,
      x: 0,
      y: 0,
    });
  }
  const originalSolids = world.solids.length;
  Object.assign(player, state().target);
  runtime.update(0.016, player, {
    interact: false,
    interactHeld: false,
    x: 0,
    y: 0,
  });
  assert.equal(
    scene.getObjectByName("Current task beacon")!.visible,
    true,
    "Prayer marker persists at the summit",
  );
  for (let i = 0; i < 4; i++) act(); // prayer, ore, hammer pickup, first forge blow
  assert.equal(state().phase, "forge");
  act();
  act();
  assert.equal(state().phase, "oppose");
  act();
  runtime.update(3, player, {
    interact: false,
    interactHeld: false,
    x: 0,
    y: 0,
  });
  assert.equal(state().phase, "timber");
  for (let i = 0; i < 4; i++) {
    act(); // pick up axe
    act();
    act();
    act(); // fell tree
    assert.equal(state().carrying, false);
    act(); // shoulder timber and leave axe
    assert.equal(state().carrying, true);
    assert.equal(state().hasAxe, false);
    runtime.update(0.016, player, {
      interact: false,
      interactHeld: false,
      x: 0,
      y: 0,
    });
    const beam = scene.getObjectByName("Carried timber")!;
    assert.ok(
      Math.hypot(beam.position.x - player.x, beam.position.z - player.z) > 0.6,
    );
    assert.equal(beam.position.y, player.y + 1.65);
    player.yaw = state().sockets[i].yaw + Math.PI / 2;
    act();
    assert.equal(state().placed, i, "misaligned timber must stay carried");
    player.yaw = state().sockets[i].yaw;
    act();
    assert.equal(state().placed, i + 1);
    if (i < 3) {
      const timber = world.solids.find(
        (solid) =>
          solid.x === (i % 2 ? 3 : -3) &&
          solid.z === -27 - Math.floor(i / 2) * 7 &&
          solid.h === 0.45,
      );
      assert.ok(timber, "Placed timber has ground collision");
      assert.equal(timber.y, 0);
    }
  }
  assert.equal(state().phase, "timber");
  assert.ok(
    Number.isFinite(state().target.x),
    "Snapshot stays valid while final dialog awaits Continue",
  );
  assert.equal(runtime.movementLocked!(), true);
  runtime.update(0.016, player, {
    interact: false,
    interactHeld: false,
    x: 0,
    y: 0,
  });
  finishDialog!();
  assert.equal(state().phase, "explore");
  assert.ok(player.y >= 4.2, "Finished ship places Nephi on its upper deck");
  assert.ok(world.solids.length > originalSolids + 40);
  assert.equal(world.climbables!.length, 2);
  assert.equal(completed, 0);
  const boarding = createPlayer(21, 0, -27);
  for (let i = 0; i < 140; i++)
    stepPlayer(
      boarding,
      { x: 1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
      world.climbables,
    );
  assert.ok(
    boarding.y >= 4.1,
    `Boarding stairs must reach deck: ${boarding.x}, ${boarding.y}`,
  );
  act();
  assert.equal(completed, 1);
  act();
  assert.equal(completed, 1);
  assert.equal(dialogs, 6);
  world.dispose!();
  assert.equal(scene.children.length, 0);
});

test("Bountiful geometry is finite, bounded, and disposed once even with shared assets", () => {
  const scene = new T.Scene(),
    world = buildBountiful(scene);
  const geometries = new Set<T.BufferGeometry>();
  scene.traverse((o) => {
    if (o instanceof T.Mesh) {
      geometries.add(o.geometry);
      assert.ok(Number.isFinite(o.position.x));
    }
  });
  let disposed = 0;
  geometries.forEach((g) => g.addEventListener("dispose", () => disposed++));
  assert.ok(world.solids.filter((s) => s.x === -36).length >= 30);
  assert.ok(world.bounds!.minZ <= -62);
  world.dispose!();
  world.dispose!();
  assert.equal(disposed, geometries.size);
});

test("mountain trail can be walked continuously onto the prayer summit", () => {
  const world = buildBountiful(new T.Scene());
  const p = createPlayer(-36, 0, 11);
  for (let i = 0; i < 280; i++)
    stepPlayer(
      p,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(p.z > 38.5, `Ascent stopped at ${p.z}, height ${p.y}`);
  assert.ok(p.y >= 8.99);
  world.dispose!();
});

test("Bountiful releases ship instance buffers exactly once", () => {
  const scene = new T.Scene(),
    world = buildBountiful(scene);
  let instances = 0,
    releases = 0;
  scene.traverse((o) => {
    if (o instanceof T.InstancedMesh) {
      instances++;
      o.addEventListener("dispose", () => releases++);
    }
  });
  assert.ok(instances > 0);
  world.dispose!();
  world.dispose!();
  assert.equal(releases, instances);
});

test("forge table and bellows block walking and permit a route around", () => {
  const world = buildBountiful(new T.Scene());
  for (const [x, z, depth] of [
    [-8, 10, 2],
    [-11, 10, 1.6],
  ]) {
    const player = createPlayer(x, 0, z - depth / 2 - 2);
    for (let i = 0; i < 90; i++)
      stepPlayer(
        player,
        { x: 0, y: 1, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(player.z < z, "Cannot walk through the work surface");
    const around = createPlayer(-4, 0, z - 3);
    for (let i = 0; i < 90; i++)
      stepPlayer(
        around,
        { x: 0, y: 1, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(around.z > z + 1, "Can walk around the work surface");
  }
  world.dispose!();
});
