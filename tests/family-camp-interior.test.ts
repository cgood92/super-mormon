import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildBountiful } from "../src/super/bountiful";
import { buildShip } from "../src/super/ship";
import { buildFamilyCamp } from "../src/super/family-camp";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";

function go(
  p: ReturnType<typeof createPlayer>,
  solids: ReturnType<typeof buildShip>["solids"],
  x: number,
  z: number,
) {
  for (let i = 0; i < 700; i++) {
    const dx = x - p.x,
      dz = z - p.z,
      d = Math.hypot(dx, dz);
    if (d < 0.12) return;
    stepPlayer(
      p,
      {
        x: (-dx / d) * Math.min(1, d),
        y: (dz / d) * Math.min(1, d),
        jump: false,
        jumpHeld: false,
      },
      1 / 60,
      0,
      solids,
    );
  }
  assert.ok(
    Math.hypot(x - p.x, z - p.z) < 0.2,
    `route stopped at ${p.x},${p.z} before ${x},${z}`,
  );
}

test("fore-cabins connect to the common room through real standing doorways", () => {
  const ship = buildShip(new T.Group(), { x: 0, y: 0, z: 0 });
  const p = createPlayer(-1.15, 0, 15);
  for (const key of [
    "sleepingQuarters",
    "pantry",
    "stores",
    "workNook",
  ] as const) {
    const target = ship.points[key];
    go(p, ship.solids, -1.15, 9);
    go(p, ship.solids, 0, target.z);
    go(p, ship.solids, target.x, target.z);
    assert.ok(p.y < 0.1);
    go(p, ship.solids, 0, target.z);
  }
  go(p, ship.solids, 0, 11);
  go(p, ship.solids, 6, 11);
  go(p, ship.solids, 6, -1.5);
  assert.ok(p.y > 4.1, "normal route still reaches the upper deck");
});

test("eight family tents have accessible doorways, physical walls, and bounded courtyard play", () => {
  const root = new T.Group(),
    solids: ReturnType<typeof buildShip>["solids"] = [];
  const camp = buildFamilyCamp(root, solids);
  assert.equal(camp.tents.length, 8);
  assert.deepEqual(sceneryCollisionErrors(root, solids), []);
  for (const tent of camp.tents) {
    const p = createPlayer(tent.x, 0, tent.z - 5);
    go(p, solids, tent.x, tent.z);
    go(p, solids, tent.x, tent.z - 5);
    const blocked = createPlayer(tent.x - 3, 0, tent.z - 5);
    for (let i = 0; i < 80; i++)
      stepPlayer(
        blocked,
        { x: 0, y: 1, jump: false, jumpHeld: false },
        1 / 60,
        0,
        solids,
      );
    assert.ok(blocked.z < tent.z - 2.9, "canvas wall blocks walking");
  }
  const children = camp.group.children.filter((child) =>
    child.name.startsWith("Child playing"),
  );
  const before = children.map((child) => child.position.clone());
  for (let i = 0; i < 90; i++) camp.update(1 / 30, { x: -4, z: 24 });
  children.forEach((child, i) => {
    assert.ok(child.position.distanceTo(before[i]) > 0.1);
    assert.ok(child.position.x >= -7 && child.position.x <= -1);
    assert.ok(child.position.z >= 22 && child.position.z <= 26);
  });
  camp.dispose();
});

test("family tent canvas catches a falling player on the roof while its doorway stays open", () => {
  const root = new T.Group(),
    solids: ReturnType<typeof buildShip>["solids"] = [];
  const camp = buildFamilyCamp(root, solids);
  const { x, z } = camp.tents[0];
  for (const offset of [-1.4, 0, 1.4]) {
    const p = createPlayer(x + offset, 8, z);
    for (let i = 0; i < 150; i++)
      stepPlayer(
        p,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        solids,
      );
    assert.ok(
      p.grounded && p.y > 2.5,
      `roof at x offset ${offset} did not support player: ${p.y}`,
    );
  }
  const entering = createPlayer(x, 0, z - 5);
  go(entering, solids, x, z);
  assert.ok(
    entering.y < 0.1,
    "roof support must leave the interior floor open",
  );
  camp.dispose();
});

test("tent roof remains walkable and its fitted support follows the rendered canvas", () => {
  const root = new T.Group(),
    solids: ReturnType<typeof buildShip>["solids"] = [];
  const camp = buildFamilyCamp(root, solids);
  const { x, z } = camp.tents[0];
  root.updateMatrixWorld(true);
  const roof = root.getObjectsByProperty(
    "name",
    "Lehi and Sariah · left sewn roof",
  )[0] as T.Mesh;
  const roofRight = root.getObjectsByProperty(
    "name",
    "Lehi and Sariah · right sewn roof",
  )[0] as T.Mesh;
  const ray = new T.Raycaster();
  for (const dx of [-2.2, -1.1, 1.1, 2.2])
    for (const dz of [-1.4, 0.17, 1.4]) {
      const p = createPlayer(x + dx, 8, z + dz);
      for (let i = 0; i < 150; i++)
        stepPlayer(
          p,
          { x: 0, y: 0, jump: false, jumpHeld: false },
          1 / 60,
          0,
          solids,
        );
      ray.set(new T.Vector3(x + dx, 8, z + dz), new T.Vector3(0, -1, 0));
      const hits = ray.intersectObjects([roof, roofRight], false);
      assert.equal(
        new Set(hits.map((hit) => hit.object.uuid)).size,
        1,
        `duplicate or missing canvas at ${dx},${dz}`,
      );
      assert.ok(hits.length > 0, `missing canvas at ${dx},${dz}`);
      assert.ok(
        Math.abs(hits[0].point.y - p.y) < 0.35,
        `canvas/support gap at ${dx},${dz}: ${hits[0].point.y - p.y}`,
      );
    }
  const walking = createPlayer(x - 1.4, 8, z);
  for (let i = 0; i < 150; i++)
    stepPlayer(
      walking,
      { x: 0, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      solids,
    );
  go(walking, solids, x + 1.4, z);
  assert.ok(
    walking.grounded && walking.y > 2.5,
    "roof traversal dropped inside shelter",
  );
  camp.dispose();
});

test("family camp remains reachable beside the actual mountain and timber grove", () => {
  const world = buildBountiful(new T.Scene());
  const p = createPlayer(-27, 0, 9);
  go(p, world.solids, -14, 9);
  go(p, world.solids, -14, 25);
  for (const z of [33, 45]) {
    go(p, world.solids, -23, p.z);
    go(p, world.solids, -23, z - 5);
    for (const x of [-18, -9, 0, 9]) {
      go(p, world.solids, x, z - 5);
      go(p, world.solids, x, z);
      go(p, world.solids, x, z - 5);
    }
  }
  world.dispose?.();
});

test("voyage wives move their limbs during the celebration and settle after release", async () => {
  const { buildVoyage } = await import("../src/super/voyage");
  const scene = new T.Scene(),
    world = buildVoyage(scene);
  const runtime = world.adventure!({
    setAvatar: () => {},
    toast: () => {},
    complete: () => {},
    dialog: (_a, _b, _c, next) => next(),
  });
  const p = createPlayer(0, 0, 0),
    input = { x: 0, y: 0, interact: false, interactHeld: false };
  for (let i = 0; i < 45; i++) runtime.update(0.1, p, input);
  const wives = [
    scene.getObjectByName("lamans-wife-character")!,
    scene.getObjectByName("lemuels-wife-character")!,
  ];
  const arms = wives.map((wife) => wife.getObjectByName("right-arm")!);
  assert.ok(arms.every(Boolean));
  world.update!(0.1, p);
  const before = arms.map((arm) => arm.rotation.z);
  for (let i = 0; i < 5; i++) world.update!(0.1, p);
  assert.ok(arms.some((arm, i) => Math.abs(arm.rotation.z - before[i]) > 0.02));
  Object.assign(p, { x: -1, y: 0, z: 16 });
  runtime.update(0.1, p, { ...input, interact: true });
  for (let i = 0; i < 20; i++) world.update!(0.1, p);
  const settled = arms.map((arm) => arm.rotation.z);
  for (let i = 0; i < 20; i++) world.update!(0.1, p);
  assert.ok(
    arms.every((arm, i) => Math.abs(arm.rotation.z - settled[i]) < 0.1),
  );
  world.dispose?.();
});
