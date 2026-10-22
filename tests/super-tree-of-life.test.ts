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

test("rod has no autonomous motion and correction is bounded, rescue preserves progress", () => {
  const s = setup();
  s.runtime.update(1 / 60, s.player, { interact: false });
  s.dialogs.shift()!();
  Object.assign(s.player, s.world.treeData.path[0]);
  s.runtime.update(1 / 60, s.player, { interact: true });
  const before = { x: s.player.x, z: s.player.z };
  for (let i = 0; i < 120; i++)
    s.runtime.update(1 / 60, s.player, { interact: false });
  assert.equal(s.runtime.snapshot().holdingRod, true);
  assert.deepEqual({ x: s.player.x, z: s.player.z }, before);
  s.player.x += 1;
  s.player.vz = -3;
  const x = s.player.x;
  s.runtime.update(1 / 60, s.player, { interact: false });
  assert.ok(Math.abs(s.player.x - x) < 0.1);
  s.player.x = s.world.treeData.river.minX + 3;
  s.runtime.update(1 / 60, s.player, { interact: false });
  assert.ok(s.player.x < s.world.treeData.river.minX);
  assert.equal(s.completions, 0);
});

test("actual ground physics can walk the full rod route and complete family welcome", () => {
  const s = setup();
  s.runtime.update(1 / 60, s.player, { interact: false });
  s.dialogs.shift()!();
  const walkTo = (target: { x: number; z: number }) => {
    for (
      let i = 0;
      i < 3000 &&
      Math.hypot(s.player.x - target.x, s.player.z - target.z) > 0.4;
      i++
    ) {
      const dx = target.x - s.player.x,
        dz = target.z - s.player.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        s.player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        s.world.solids,
      );
      s.runtime.update(1 / 60, s.player, { interact: false });
    }
    assert.ok(
      Math.hypot(s.player.x - target.x, s.player.z - target.z) < 0.5,
      `reachable ${JSON.stringify(target)}, at ${s.player.x}, ${s.player.z}`,
    );
  };
  walkTo(s.world.treeData.path[0]);
  s.runtime.update(1 / 60, s.player, { interact: true });
  for (const [index, p] of s.world.treeData.path.slice(1).entries()) {
    walkTo(p);
    if (index === 4) {
      const before = s.runtime.snapshot();
      s.player.x = 40;
      s.runtime.update(1 / 60, s.player, { interact: false });
      const after = s.runtime.snapshot();
      assert.equal(after.progress, before.progress);
      assert.equal(after.phase, before.phase);
      assert.equal(s.player.x, before.checkpoint.x);
      assert.equal(s.player.z, before.checkpoint.z);
    }
  }
  walkTo(s.world.treeData.fruit);
  s.runtime.update(1 / 60, s.player, { interact: true });
  s.dialogs.shift()!();
  assert.equal(s.runtime.snapshot().phase, "invite");
  s.runtime.update(1 / 60, s.player, { interact: true });
  s.dialogs.shift()!();
  assert.equal(s.runtime.snapshot().phase, "done");
  assert.equal(s.completions, 1);
  walkTo(s.world.treeData.fountain);
  walkTo(s.world.treeData.overlook);
  s.runtime.respawn(s.player);
  assert.equal(s.runtime.snapshot().phase, "done");
});
