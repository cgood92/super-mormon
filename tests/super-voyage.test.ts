import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildVoyage } from "../src/super/voyage";
import { createPlayer } from "../src/super/physics";

test("voyage follows fourth-day release, prayer, Liahona and sustained steering", () => {
  const scene = new T.Scene(),
    world = buildVoyage(scene);
  let avatar = "",
    complete = 0;
  const runtime = world.adventure!({
    dialog: (_k, _t, _b, next) => next(),
    toast: () => {},
    setAvatar: (r) => {
      avatar = r;
    },
    complete: () => {
      complete++;
    },
  });
  const p = createPlayer();
  const click = { interact: true, interactHeld: true, x: 0, y: 0 };
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      day: number;
      gateIndex: number;
      heading: number;
      targetHeading: number;
      targets: Record<string, { x: number; y: number; z: number }>;
    };
  const visit = (target: string) => {
    Object.assign(p, state().targets[target]);
    runtime.update(0.016, p, click);
  };
  assert.equal(state().day, 4);
  visit("brothers");
  assert.equal(state().phase, "release");
  visit("nephi");
  assert.equal(avatar, "nephi");
  runtime.update(0.016, p, click);
  assert.equal(state().phase, "liahona");
  visit("liahona");
  visit("helm");
  assert.equal(runtime.movementLocked!(), true);
  for (let i = 0; i < 120; i++) runtime.update(0.1, p, click);
  assert.equal(state().gateIndex, 0, "pressing B cannot finish the course");
  for (let i = 0; i < 1500 && state().phase === "steer"; i++) {
    const s = state(),
      error = Math.atan2(
        Math.sin(s.targetHeading - s.heading),
        Math.cos(s.targetHeading - s.heading),
      );
    world.update!(0.1, p);
    runtime.update(0.1, p, {
      ...click,
      interact: false,
      x: Math.max(-1, Math.min(1, error * 5)),
    });
  }
  assert.equal(state().phase, "arrived");
  assert.equal(complete, 1);
  assert.equal(runtime.movementLocked!(), false);
  runtime.dispose();
  world.dispose!();
  world.dispose!();
  assert.equal(scene.children.length, 0);
});

test("voyage exposes a shared moving actor parent and climbable masts", () => {
  const scene = new T.Scene(),
    world = buildVoyage(scene),
    p = createPlayer(0, 4.2, 0);
  assert.equal(world.climbables?.length, 2);
  assert.ok(world.solids.length > 40);
  const before = world.actorParent!.rotation.z;
  world.update!(0.1, p);
  assert.notEqual(world.actorParent!.rotation.z, before);
  assert.ok(Math.abs(p.vx) < 0.05);
  world.dispose!();
});

test("ship stairs connect the upper deck with the brothers and back to Nephi", async () => {
  const { stepPlayer } = await import("../src/super/physics");
  const scene = new T.Scene(),
    world = buildVoyage(scene),
    p = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  const walk = (x: number, z: number) => {
    for (let i = 0; i < 900; i++) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.18 && Math.hypot(p.vx, p.vz) < 0.3) return;
      const strength = Math.min(1, d * 1.5);
      stepPlayer(
        p,
        {
          x: d ? (-dx / d) * strength : 0,
          y: d ? (dz / d) * strength : 0,
          jump: false,
          jumpHeld: false,
        },
        1 / 60,
        0,
        world.solids,
        world.climbables,
      );
    }
    assert.fail(`Blocked walking to ${x},${z}: ${p.x},${p.y},${p.z}`);
  };
  walk(3, -2);
  walk(6, -2);
  walk(6, 11);
  assert.ok(p.y < 0.45);
  walk(-1, 11);
  walk(-1, 16);
  assert.ok(p.y < 0.1);
  walk(-1, 11);
  walk(6, 11);
  walk(6, -2);
  assert.ok(p.y > 4.1);
  walk(3, -2);
  walk(-4, -4);
  assert.ok(p.y > 4.1);
  world.dispose!();
});

test("voyage releases every instanced ship buffer exactly once on repeated disposal", () => {
  const scene = new T.Scene(),
    world = buildVoyage(scene);
  const counts = new Map<T.InstancedMesh, number>();
  scene.traverse((object) => {
    if (object instanceof T.InstancedMesh) {
      counts.set(object, 0);
      object.addEventListener("dispose", () =>
        counts.set(object, counts.get(object)! + 1),
      );
    }
  });
  assert.ok(counts.size > 0, "ship must exercise instanced GPU buffer cleanup");
  world.dispose!();
  world.dispose!();
  for (const count of counts.values()) assert.equal(count, 1);
});
