import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildTreeOfLife,
  createTreeOfLifeScene,
} from "../src/super/tree-of-life";
import { createPlayer, stepPlayer } from "../src/super/physics";

function setup() {
  const scene = new THREE.Scene(),
    world = buildTreeOfLife(scene);
  const dialogs: (() => void)[] = [];
  let completions = 0;
  const checkpoints: { x: number; y: number; z: number }[] = [];
  const runtime = createTreeOfLifeScene(scene, world, {
    dialog: (_k, _t, _b, cb) => dialogs.push(cb),
    toast: () => {},
    complete: () => {
      completions++;
    },
    checkpoint: (p) => checkpoints.push(p),
    setMarker: () => {},
  });
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  return {
    scene,
    world,
    runtime,
    player,
    dialogs,
    checkpoints,
    get completions() {
      return completions;
    },
  };
}

test("a spacious peaceful world has distinct safe fountain and separated building", () => {
  const s = setup();
  assert.ok(s.world.bounds!.maxZ - s.world.bounds!.minZ >= 180);
  assert.ok(s.world.treeData.path.length >= 8);
  assert.ok(s.world.treeData.fountain.x < s.world.treeData.river.minX);
  assert.ok(s.world.treeData.building.x > s.world.treeData.river.maxX);
  assert.equal(s.world.tokens?.length ?? 0, 0);
  s.runtime.dispose();
  s.world.dispose?.();
});

test("held rod prevents leaving it, release restores free exploration", () => {
  const s = setup();
  s.runtime.update(1 / 60, s.player, { interact: false });
  s.dialogs.shift()!();
  Object.assign(s.player, s.world.treeData.path[0]);
  s.runtime.update(1 / 60, s.player, { interact: false, holdRod: true });
  s.player.x += 12;
  s.runtime.update(1 / 60, s.player, { interact: false, holdRod: true });
  assert.equal(s.runtime.snapshot().holdingRod, true);
  assert.ok(s.player.x < -35);
  s.runtime.update(1 / 60, s.player, { interact: false, holdRod: false });
  s.player.x = 20;
  s.runtime.update(1 / 60, s.player, { interact: false, holdRod: false });
  assert.equal(s.player.x, 20);
});

test("fruit surrounds the actual tree and completes without a beckoning step", () => {
  const s = setup();
  s.runtime.update(1 / 60, s.player, { interact: false });
  s.dialogs.shift()!();
  Object.assign(s.player, {
    x: s.world.treeData.tree.x + 3,
    z: s.world.treeData.tree.z,
  });
  assert.match(
    s.runtime.update(1 / 60, s.player, { interact: false }).prompt,
    /fruit/,
  );
  s.runtime.update(1 / 60, s.player, { interact: true });
  s.dialogs.shift()!();
  assert.equal(s.runtime.snapshot().phase, "done");
  assert.equal(s.completions, 1);
  s.runtime.respawn(s.player);
  assert.ok(
    Math.hypot(
      s.player.x - s.world.treeData.tree.x,
      s.player.z - s.world.treeData.tree.z,
    ) >= 2,
  );
});

test("actual physics crosses the gulf, ascends building stair and returns", () => {
  const s = setup();
  s.runtime.update(1 / 60, s.player, { interact: false });
  s.dialogs.shift()!();
  Object.assign(s.player, { x: 20, y: 0, z: 5 });
  const walk = (x: number, z: number) => {
    for (
      let i = 0;
      i < 4000 && Math.hypot(s.player.x - x, s.player.z - z) > 0.25;
      i++
    ) {
      const dx = x - s.player.x,
        dz = z - s.player.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        s.player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        s.world.solids,
        s.world.climbables,
      );
      s.runtime.update(1 / 60, s.player, { interact: false, holdRod: false });
    }
    assert.ok(
      Math.hypot(s.player.x - x, s.player.z - z) < 0.3,
      `target ${x},${z}; reached ${s.player.x},${s.player.y},${s.player.z}`,
    );
  };
  walk(49.5, 5);
  walk(49.5, 22);
  walk(53, 22);
  walk(53, -23);
  walk(64, -23);
  assert.ok(s.player.y >= 15);
  walk(53, -23);
  walk(53, 22);
  walk(49.5, 22);
  walk(49.5, 5);
  walk(20, 5);
  assert.ok(s.player.y < 0.5);
});

test("crowds, the six family members, climbable tree and dense offpath mist are present", () => {
  const s = setup();
  for (const name of [
    "Sariah",
    "Nephi",
    "Sam",
    "Laman",
    "Lemuel",
    "Lehi — dreamer and father",
  ])
    assert.ok(s.scene.getObjectByName(name), name);
  assert.ok(
    s.scene.children.filter((o) => o.name.startsWith("vision crowd")).length >=
      70,
  );
  assert.ok(s.world.climbables?.some((c) => c.id === "living-tree"));
  s.runtime.update(1 / 60, s.player, { interact: false });
  s.dialogs.shift()!();
  Object.assign(s.player, { x: -78, z: 20 });
  for (let i = 0; i < 600; i++)
    s.runtime.update(1 / 60, s.player, { interact: false });
  assert.equal((s.scene.background as THREE.Color).getHex(), 0x000000);
  assert.equal(s.world.treeData.mist.visible, false);
  // Keep camera-depth fog clear so an orbit camera can see the player bubble.
  assert.equal((s.scene.fog as THREE.Fog).far, 149);
  Object.assign(s.player, s.world.treeData.tree);
  for (let i = 0; i < 600; i++)
    s.runtime.update(1 / 60, s.player, { interact: false });
  assert.equal((s.scene.background as THREE.Color).getHex(), 0xbdcfd5);
  assert.equal(s.world.treeData.mist.visible, true);
});

test("deep river returns gently while the visible crossing remains walkable", () => {
  const s = setup();
  s.runtime.update(1 / 60, s.player, { interact: false });
  s.dialogs.shift()!();
  Object.assign(s.player, { x: 37, z: 5 });
  s.runtime.update(1 / 60, s.player, { interact: false });
  assert.equal(s.player.x, 37);
  s.player.z = 30;
  s.runtime.update(1 / 60, s.player, { interact: false });
  assert.equal(s.player.x, s.world.spawn.x);
});

test("runtime disposes crowd GPU instances and removes actor groups exactly once", () => {
  const s = setup();
  const instances = s.scene.children.filter(
    (o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh,
  );
  assert.equal(instances.length, 4);
  const disposed = instances.map(() => 0);
  instances.forEach((part, i) =>
    part.addEventListener("dispose", () => disposed[i]++),
  );
  const crowds = s.scene.children.filter((o) =>
    o.name.startsWith("vision crowd"),
  );
  s.runtime.dispose();
  s.runtime.dispose();
  assert.deepEqual(disposed, [1, 1, 1, 1]);
  for (const part of instances) assert.equal(part.parent, null);
  for (const actor of crowds) assert.equal(actor.parent, null);
});

test("instanced crowds have colored smooth bodies, paired moving arms and legs within four draw calls", () => {
  const s = setup();
  const parts = s.scene.children.filter(
    (o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh,
  );
  assert.equal(parts.length, 4);
  const bodies = parts.find((part) => part.name === "vision crowd bodies")!;
  const arms = parts.find((part) => part.name === "vision crowd arms")!;
  const legs = parts.find((part) => part.name === "vision crowd legs")!;
  assert.ok(bodies, "a shared sculpted body replaces disconnected primitives");
  assert.ok(arms, "both sleeved arms are instanced");
  assert.ok(legs, "both sandaled legs are instanced");
  assert.equal(bodies.count, 108);
  assert.equal(arms.count, 216);
  assert.equal(legs.count, 216);
  for (const part of [bodies, arms, legs]) {
    assert.ok(part.geometry.getAttribute("color"));
    assert.ok(part.geometry.getAttribute("normal"));
    assert.ok(part.geometry.getAttribute("position").count / 3 < 6000);
  }
  const triangles = parts.reduce(
    (sum, part) =>
      sum +
      ((part.geometry.index?.count ??
        part.geometry.getAttribute("position").count) /
        3) *
        part.count,
    0,
  );
  assert.ok(triangles < 300_000, `crowd triangle budget: ${triangles}`);
  bodies.geometry.computeBoundingBox();
  assert.ok(bodies.geometry.boundingBox!.max.y > 1.6);
  assert.ok(bodies.geometry.boundingBox!.min.y < 0.45);
  s.runtime.update(1 / 60, s.player, { interact: false });
  s.dialogs.shift()!();
  const before = new THREE.Matrix4();
  arms.getMatrixAt(72, before);
  s.runtime.update(0.4, s.player, { interact: false });
  const after = new THREE.Matrix4();
  arms.getMatrixAt(72, after);
  assert.notDeepEqual(
    after.elements,
    before.elements,
    "walking crowd swings its arms",
  );
  assert.ok(
    bodies.instanceColor,
    "individual clothing varies across the crowd",
  );
  s.runtime.dispose();
  s.world.dispose?.();
});
