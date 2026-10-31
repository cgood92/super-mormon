import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildBountiful } from "./bountiful";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";

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
    assert.equal(
      scene.getObjectByName("Ground axe")!.visible,
      true,
      "axe remains where timber was picked up",
    );
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
      assert.ok(
        player.y >= timber.y + timber.h,
        "deposit lifts player clear of the new timber",
      );
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
  assert.ok(scene.getObjectByName("Mountain prayer ledges"));
  assert.ok(world.bounds!.minZ <= -62);
  world.dispose!();
  world.dispose!();
  assert.equal(disposed, geometries.size);
});

test("prayer mountain requires jumps and supports a full ascent and return", () => {
  const scene = new T.Scene();
  const world = buildBountiful(scene);
  const p = createPlayer(-36, 0, 10);
  const move = (forward: number, jump = false) =>
    stepPlayer(
      p,
      { x: 0, y: forward, jump, jumpHeld: jump },
      1 / 60,
      0,
      world.solids,
    );
  for (let i = 0; i < 90; i++) move(1);
  assert.ok(
    p.y < 0.1 && p.z < 13,
    `walking bypassed the first ledge: ${p.z}, ${p.y}`,
  );
  for (let tier = 1; tier <= 8; tier++) {
    const startHeight = p.y;
    move(1, true);
    let landed = false;
    for (let frame = 0; frame < 100; frame++) {
      move(p.z < 15 + (tier - 1) * 3.5 ? 1 : 0);
      if (p.grounded && p.y > startHeight + 0.8) {
        landed = true;
        break;
      }
    }
    assert.ok(landed, `jump ${tier} missed its ledge: ${p.x}, ${p.y}, ${p.z}`);
    assert.ok(Math.abs(p.y - tier * 1.125) < 0.01);
    for (let i = 0; i < 80; i++) move(tier < 8 ? 1 : 0);
  }
  for (let i = 0; i < 90; i++) move(p.z < 39 ? 1 : 0);
  assert.ok(p.z > 38.5 && p.y >= 8.99, `summit unreachable: ${p.z}, ${p.y}`);
  for (let i = 0; i < 360; i++) move(-1);
  assert.ok(
    p.z < 12 && p.y < 0.01 && p.grounded,
    `return blocked: ${p.z}, ${p.y}`,
  );
  const around = createPlayer(-50, 0, 9);
  for (let i = 0; i < 360; i++)
    stepPlayer(
      around,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(
    around.z > 45 && around.grounded,
    "clear ground route around the mountain",
  );
  scene.updateMatrixWorld(true);
  const mountain = scene.getObjectByName("Mountain prayer ledges")!;
  for (let tier = 1; tier <= 8; tier++) {
    const ray = new T.Raycaster(
      new T.Vector3(-36, 20, 14 + (tier - 1) * 3.5),
      new T.Vector3(0, -1, 0),
    );
    const hits = ray.intersectObject(mountain);
    assert.equal(
      new Set(hits.map((hit) => hit.point.y)).size,
      1,
      "one visible walk surface per landing",
    );
    assert.ok(Math.abs(hits[0].point.y - tier * 1.125) < 0.01);
  }
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
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

test("Bountiful held tools use the avatar hand sockets", () => {
  const scene = new T.Scene(),
    world = buildBountiful(scene);
  const hand = new T.Group();
  scene.add(hand);
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog: (_a, _b, _c, next) => next(),
    attachEquipment: (_slot, object) => hand.add(object),
  });
  const p = createPlayer();
  const input = { x: 0, y: 0, interact: true, interactHeld: true };
  for (let i = 0; i < 3; i++) {
    Object.assign(p, (runtime.snapshot() as { target: object }).target);
    runtime.update(0.016, p, input);
  }
  runtime.update(0.016, p, { ...input, interact: false });
  assert.ok(
    scene.getObjectByName("Animated work tool")!.parent === hand,
    "hammer must attach to right hand",
  );
  world.dispose!();
});

test("ore has continuous support and a clear route around its rear corners", () => {
  const scene = new T.Scene();
  const world = buildBountiful(scene);
  scene.updateMatrixWorld(true);
  const oreSurfaces: T.Mesh[] = [];
  scene.traverse((object) => {
    if (
      object instanceof T.Mesh &&
      object.name === "Ore outcrop natural surface"
    )
      oreSurfaces.push(object);
  });
  const ray = new T.Raycaster(
    new T.Vector3(-22.5, 5, 18.5),
    new T.Vector3(0, -1, 0),
  );
  const owners = new Set(
    ray.intersectObjects(oreSurfaces).map((hit) => hit.object),
  );
  assert.equal(
    owners.size,
    1,
    "ore must have one visible support owner at its former overlapping seam",
  );
  for (const x of [-24.3, -23.6, -22, -20.4, -19.7]) {
    const p = createPlayer(x, 4, 20.5);
    for (let i = 0; i < 180; i++)
      stepPlayer(
        p,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(p.y >= 0 && p.grounded, `ore corner lost support ${x}: ${p.y}`);
  }
  const p = createPlayer(-18.8, 0, 16);
  for (let i = 0; i < 120; i++)
    stepPlayer(
      p,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(
    p.z > 22 && p.y >= 0,
    `rear corner route blocked ${p.x},${p.y},${p.z}`,
  );
  world.dispose!();
});

test("Bountiful people block a direct walk while leaving room around", () => {
  const world = buildBountiful(new T.Scene());
  for (const [x, z] of [
    [9, 4],
    [-12, 27],
  ]) {
    const p = createPlayer(x, 0, z - 2);
    for (let i = 0; i < 65; i++)
      stepPlayer(
        p,
        { x: 0, y: 1, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(p.z < z - 0.6, `walked through person at ${x},${z}: ${p.z}`);
  }
  world.dispose!();
});
