import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildLachoneusGathering } from "./lachoneus-gathering";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
function setup() {
  const scene = new T.Scene(),
    world = buildLachoneusGathering(scene);
  const player = createPlayer(world.spawn.x, 0, world.spawn.z);
  let completions = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    dialog(_k, _t, _b, next) {
      next();
    },
    complete() {
      completions++;
    },
  });
  const tick = (x = 0, z = 0, interact = false) => {
    stepPlayer(
      player,
      { x: -x, y: z, jump: false, jumpHeld: false },
      1 / 30,
      0,
      world.solids,
    );
    runtime.update(1 / 30, player, { ...idle, interact });
  };
  const walk = (x: number, z: number, speed = 1) => {
    for (let i = 0; i < 5000; i++) {
      const dx = x - player.x,
        dz = z - player.z,
        distance = Math.hypot(dx, dz);
      if (distance < 0.35) return;
      tick(
        (dx / distance) * Math.min(speed, distance),
        (dz / distance) * Math.min(speed, distance),
      );
    }
    assert.fail(`Blocked en route to ${x},${z} at ${player.x},${player.z}`);
  };
  const snap = () =>
    runtime.snapshot() as {
      delivered: number[];
      carrying: string | null;
      family: { x: number; z: number; sheltered: boolean; following: boolean };
      child: { x: number; y: number; z: number };
      sacks: { name: string; state: string; x: number; y: number; z: number }[];
      discoveries: string[];
      time: number;
      phase: string;
    };
  return {
    scene,
    world,
    player,
    runtime,
    tick,
    walk,
    snap,
    completions: () => completions,
  };
}

test("gathering requires three physical return trips and an actual family escort; dialogue is optional", () => {
  const s = setup();
  for (let i = 0; i < 10; i++) s.tick(0, 0, true);
  assert.equal(s.completions(), 0);
  assert.deepEqual(s.snap().delivered, []);
  // The west lane bypasses the physical ridge.
  s.walk(-39, -7);
  s.walk(-39, 38);
  s.tick(0, 0, true);
  assert.equal(s.snap().carrying, "Orchard grain");
  assert.equal(s.snap().sacks[0].state, "carried");
  assert.ok(Math.abs(s.snap().sacks[0].y - s.player.y - 1) < 0.01);
  assert.notEqual(s.snap().sacks[0].z, 38);
  s.walk(-39, -7);
  s.walk(0, -7);
  s.walk(0, -37);
  assert.equal(s.snap().delivered.length, 1);
  assert.equal(s.snap().sacks[0].state, "deposited");
  assert.deepEqual(s.snap().sacks[0], {
    name: "Orchard grain",
    state: "deposited",
    x: -5,
    y: 1.775,
    z: -41,
  });
  // Eastern entrance: a second route through the refuge wall.
  s.walk(0, -19);
  s.walk(49, -19);
  s.walk(49, 12);
  s.walk(40, 12);
  s.walk(40, 16);
  s.tick(0, 0, true);
  s.walk(40, 12);
  s.walk(49, 12);
  s.walk(49, -19);
  s.walk(0, -19);
  s.walk(0, -37);
  s.walk(0, -7);
  s.walk(16, -7);
  s.walk(16, 62);
  s.tick(0, 0, true);
  s.walk(16, -7);
  s.walk(0, -7);
  s.walk(0, -37);
  assert.equal(s.snap().delivered.length, 3);
  assert.equal(s.completions(), 0);
  s.walk(0, -7);
  s.walk(-35, -7);
  s.walk(-35, 62);
  assert.equal(s.snap().family.following, true);
  // Keep pace with the slower followers; turn only after they catch up.
  const escortLeg = (x: number, z: number) => {
    s.walk(x, z, 0.22);
    for (let i = 0; i < 100; i++) s.tick();
  };
  escortLeg(-35, -7);
  escortLeg(0, -7);
  escortLeg(0, -37);
  assert.equal(s.snap().family.sheltered, true);
  assert.equal(s.completions(), 1);
  for (let i = 0; i < 30; i++) s.tick(0, 0, true);
  assert.equal(s.completions(), 1);
  s.world.dispose!();
});

test("physical wall blocks walking, alternate gate works, stairs support landing and optional exploration", () => {
  const s = setup();
  assert.deepEqual(
    sceneryCollisionErrors(s.world.actorParent!, s.world.solids),
    [],
  );
  s.walk(20, -7);
  for (let i = 0; i < 150; i++) s.tick(0, -1);
  assert.ok(s.player.z > -14, "wall blocks direct entry");
  s.walk(0, -7);
  s.walk(0, -37);
  s.walk(20, -20);
  s.walk(30, -20);
  for (let i = 0; i < 600 && s.player.z > -35; i++) {
    stepPlayer(
      s.player,
      { x: 0, y: -0.35, jump: i % 35 === 0, jumpHeld: i % 35 < 10 },
      1 / 30,
      0,
      s.world.solids,
    );
    s.runtime.update(1 / 30, s.player, idle);
  }
  for (let i = 0; i < 80; i++) s.tick();
  assert.ok(s.player.y >= 2.95, `land on lookout: ${s.player.y}`);
  assert.ok(s.snap().discoveries.includes("Watchtower vista"));
  s.world.dispose!();
});

test("optional spring, retry and disposal preserve progress safely", () => {
  const s = setup();
  s.walk(-59, -7);
  s.walk(-59, 28);
  assert.ok(s.snap().discoveries.includes("Hidden orchard spring"));
  s.walk(-39, 28);
  s.walk(-39, 38);
  s.tick(0, 0, true);
  s.player.y = -10;
  s.runtime.update(1 / 30, s.player, idle);
  assert.equal(s.snap().carrying, null);
  assert.deepEqual(s.snap().sacks[0], {
    name: "Orchard grain",
    state: "source",
    x: -39,
    y: 0.375,
    z: 38,
  });
  assert.deepEqual(s.snap().delivered, []);
  const time = s.snap().time;
  s.world.dispose!();
  s.world.dispose!();
  s.runtime.update(1, s.player, idle);
  assert.equal(s.snap().time, time);
  assert.equal(s.scene.children.length, 0);
});

test("family child uses independent collision when walking alongside the refuge wall", () => {
  const s = setup();
  s.walk(-35, -7);
  s.walk(-35, 62);
  const leg = (x: number, z: number) => {
    for (let frame = 0; frame < 7000; frame++) {
      const dx = x - s.player.x,
        dz = z - s.player.z,
        distance = Math.hypot(dx, dz);
      const scale = distance > 0.3 ? 0.22 / distance : 0;
      s.tick(dx * scale, dz * scale);
      const child = s.snap().child;
      for (const wall of s.world.solids.filter(
        (solid) => solid.z === -15 && solid.h === 5,
      )) {
        assert.ok(
          Math.abs(child.x - wall.x) >= wall.w / 2 + 0.319 ||
            Math.abs(child.z - wall.z) >= wall.d / 2 + 0.319,
          `child entered defensive wall at ${child.x},${child.z}`,
        );
      }
      const rendered = s.world.actorParent!.getObjectByName(
        "Unnamed family child",
      )!;
      assert.ok(Math.abs(rendered.position.x - child.x) < 0.01);
      assert.ok(Math.abs(rendered.position.z - child.z) < 0.01);
      if (distance < 0.3 && frame > 100) break;
      assert.ok(frame < 6999, "escort route should remain reachable");
    }
    for (let frame = 0; frame < 100; frame++) s.tick();
  };
  leg(-35, -7);
  leg(0, -7);
  leg(0, -17);
  leg(20, -17);
  assert.equal(s.snap().family.sheltered, false);
  s.world.dispose!();
});
