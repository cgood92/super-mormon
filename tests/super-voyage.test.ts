import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildVoyage } from "../src/super/voyage";
import { createPlayer } from "../src/super/physics";

test("voyage follows fourth-day release, prayer, Liahona and sustained steering", () => {
  const scene = new T.Scene(),
    world = buildVoyage(scene);
  assert.equal(world.initialObjective, "Find Laman and Lemuel below deck");
  assert.ok(scene.getObjectByName("laman-character"));
  assert.ok(scene.getObjectByName("lemuel-character"));
  assert.ok(scene.getObjectByName("nephi-character"));
  assert.equal(scene.getObjectByName("sam-character"), undefined);
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
      boat: { x: number; z: number };
      contacts: number;
      releaseReady: boolean;
      targets: Record<string, { x: number; y: number; z: number }>;
    };
  const visit = (target: string) => {
    Object.assign(p, state().targets[target]);
    runtime.update(0.016, p, click);
  };
  assert.equal(state().day, 4);
  for (let i = 0; i < 42; i++)
    runtime.update(0.1, p, { ...click, interact: false });
  visit("brothers");
  assert.equal(state().phase, "release");
  assert.equal(runtime.movementLocked!(), true);
  const childBelow = { x: p.x, z: p.z };
  for (let i = 0; i < 260; i++)
    runtime.update(0.1, p, { ...click, interact: false });
  assert.ok(
    p.y > 4.1,
    "the child follows the stairs to the deck without teleporting",
  );
  assert.ok(Math.hypot(p.x - childBelow.x, p.z - childBelow.z) > 12);
  assert.equal(state().releaseReady, true);
  assert.equal(runtime.movementLocked!(), false);
  visit("nephi");
  assert.equal(avatar, "nephi");
  runtime.update(0.016, p, click);
  assert.equal(state().phase, "liahona");
  visit("liahona");
  visit("helm");
  assert.equal(runtime.movementLocked!(), true);
  for (let i = 0; i < 120; i++) runtime.update(0.1, p, click);
  assert.equal(state().gateIndex, 0, "pressing B cannot finish the course");
  assert.ok(
    state().contacts > 0,
    "sailing straight hits the first rocky island and resets",
  );
  assert.notEqual(
    state().boat.z,
    0,
    "the ship advances through actual sea coordinates",
  );
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
  assert.ok(
    state().boat.z <= -450,
    "success crosses the last authored gate plane",
  );
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

test("lower hull blocks walking through both sides and tapered ends", async () => {
  const { stepPlayer } = await import("../src/super/physics");
  const world = buildVoyage(new T.Scene());
  for (const [x, z, ix, iz] of [
    [0, -15, -1, 0],
    [0, -15, 1, 0],
    [0, -15, 0, -1],
    [0, 19, 0, 1],
  ]) {
    const p = createPlayer(x, 0, z);
    for (let i = 0; i < 360; i++)
      stepPlayer(
        p,
        { x: -ix, y: iz, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
        world.climbables,
      );
    assert.ok(Math.abs(p.z) < 21.5, `escaped an end: ${p.z}`);
    assert.ok(Math.abs(p.x) < 7, `escaped a side: ${p.x}`);
  }
  world.dispose!();
});

test("voyage beacon obeys depth and wheel camera faces the island passage", () => {
  const scene = new T.Scene(),
    world = buildVoyage(scene);
  const beacon = scene.getObjectByName("Blue next task beacon") as T.Mesh;
  assert.equal((beacon.material as T.Material).depthTest, true);
  assert.ok(scene.getObjectByName("Ship wheel pivot"));
  assert.equal(scene.getObjectByName("Steering oar pivot"), undefined);
  world.dispose!();
});

test("ship hull scenery has live collision owners and deck surfaces have one owner", async () => {
  const { sceneryCollisionErrors } = await import("../src/super/scenery");
  const scene = new T.Scene(),
    world = buildVoyage(scene);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  scene.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  for (const [x, z] of [
    [2.3, -10.2],
    [-2.3, 4.2],
    [3.2, 13.2],
  ]) {
    ray.set(new T.Vector3(x, 8, z), new T.Vector3(0, -1, 0));
    const hits = ray
      .intersectObjects(scene.children, true)
      .filter((hit) => Math.abs(hit.point.y - 4.2) < 0.01);
    assert.equal(hits.length, 1, `deck ownership at ${x},${z}`);
  }
  world.dispose!();
});

test("hidden construction ships defer collision validation until revealed", async () => {
  const { buildShip } = await import("../src/super/ship");
  const { sceneryCollisionErrors } = await import("../src/super/scenery");
  const root = new T.Group(),
    ship = buildShip(root, { x: 0, y: 0, z: 0 });
  ship.group.visible = false;
  assert.deepEqual(sceneryCollisionErrors(root, []), []);
  ship.group.visible = true;
  assert.ok(sceneryCollisionErrors(root, []).length > 0);
  assert.deepEqual(sceneryCollisionErrors(root, ship.solids), []);
});
