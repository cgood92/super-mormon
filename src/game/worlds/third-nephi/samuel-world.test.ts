import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  createPlayer,
  stepPlayer,
  type PlayerState,
} from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";
import { buildSamuelWall } from "./samuel-wall";
import {
  SAMUEL_BLOCKS,
  SAMUEL_EXIT,
  SAMUEL_ROUTES,
  SAMUEL_SPAWN,
  SAMUEL_SPEAKING_POINT,
  SAMUEL_WALL,
  samuelBlockPoint,
  samuelBlockSolid,
} from "./samuel-layout";
import type { Point, WorldData } from "../../runtime/worlds";

const input = (dx = 0, dz = 0, jump = false, jumpHeld = jump) => ({
  x: -dx,
  y: dz,
  jump,
  jumpHeld,
  traversal: false,
});
const blocks = new Map(SAMUEL_BLOCKS.map((block) => [block.id, block]));

function walkTo(
  world: WorldData,
  player: PlayerState,
  target: Pick<Point, "x" | "z">,
  frames = 180,
) {
  for (let frame = 0; frame < frames; frame++) {
    const dx = target.x - player.x;
    const dz = target.z - player.z;
    const distance = Math.hypot(dx, dz);
    stepPlayer(
      player,
      input(
        distance > 0.18 ? dx / distance : 0,
        distance > 0.18 ? dz / distance : 0,
      ),
      1 / 60,
      0,
      world.solids,
    );
    if (distance < 0.18 && Math.hypot(player.vx, player.vz) < 0.35) break;
  }
  assert.ok(
    Math.hypot(target.x - player.x, target.z - player.z) < 0.7,
    `walking reaches ${JSON.stringify(target)} from ${JSON.stringify({ x: player.x, y: player.y, z: player.z })}`,
  );
}

function jumpTo(
  world: WorldData,
  player: PlayerState,
  target: Point,
  label: string,
) {
  for (let frame = 0; frame < 100; frame++) {
    const dx = target.x - player.x;
    const dz = target.z - player.z;
    const distance = Math.hypot(dx, dz);
    stepPlayer(
      player,
      input(
        distance > 0.22 ? dx / distance : 0,
        distance > 0.22 ? dz / distance : 0,
        frame === 0,
        frame < 16,
      ),
      1 / 60,
      0,
      world.solids,
    );
    if (
      player.grounded &&
      Math.abs(player.y - target.y) < 0.06 &&
      Math.hypot(player.x - target.x, player.z - target.z) < 1.45
    )
      return;
  }
  assert.fail(
    `${label} must land by ordinary jump; ended at ${JSON.stringify({ x: player.x, y: player.y, z: player.z })}`,
  );
}

// Launches are comfortably inside the current stone. The shallow reverse
// stones leave headroom above the lower launch faces while the player jumps.
const launches: Record<string, Pick<Point, "x" | "z">> = {
  "starter:left": { x: -12.5, z: 4.1 },
  "starter:right": { x: -11.5, z: 4.1 },
  "west-low": { x: -15.5, z: 4.2 },
  "west-outlook": { x: -18, z: 3.7 },
  "west-turn": { x: -15.6, z: 2.8 },
  "west-return": { x: -12.3, z: 3.5 },
  "right-low": { x: -8.8, z: 4.2 },
  "right-outlook": { x: -7.1, z: 4 },
  "right-turn": { x: -8.15, z: 2.85 },
  "right-return": { x: -4.6, z: 3.5 },
  "far-east-low": { x: 17, z: 4.1 },
  "far-east-out": { x: 20.2, z: 4.2 },
  "far-east-turn": { x: 17.8, z: 2.8 },
  "far-east-middle": { x: 14.4, z: 3.5 },
  "far-east-return": { x: 11, z: 3.2 },
};

test("Samuel can choose left, right, or far eastern stones and reverse course to reach the wall", () => {
  for (const routeName of ["left", "right", "farEast"] as const) {
    const scene = new T.Scene();
    const world = buildSamuelWall(scene);
    const player = createPlayer(SAMUEL_SPAWN.x, SAMUEL_SPAWN.y, SAMUEL_SPAWN.z);
    const route = SAMUEL_ROUTES[routeName];
    assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
    const landedXs: number[] = [];
    for (const [index, id] of route.entries()) {
      const block = blocks.get(id)!;
      const target = samuelBlockPoint(block);
      const prior = index > 0 ? blocks.get(route[index - 1])! : undefined;
      const launch = prior
        ? launches[prior.id === "starter" ? `starter:${routeName}` : prior.id]
        : { x: target.x, z: target.z + block.depth / 2 + 0.33 };
      assert.ok(launch, `${routeName}: ${id} has a physical launch`);
      walkTo(world, player, launch, 600);
      assert.ok(
        player.grounded && Math.abs(player.y - (prior?.top ?? 0)) < 0.06,
        `${routeName}: standing on ${prior?.id ?? "the plain"} before jumping to ${id}`,
      );
      jumpTo(world, player, target, `${routeName}: ${id}`);
      landedXs.push(player.x);
    }
    // Each route changes its horizontal heading on the stones, including the
    // far eastern approach whose bend comes earlier than the two starter forks.
    const directions = landedXs
      .slice(1)
      .map((x, index) => Math.sign(x - landedXs[index]));
    assert.ok(
      directions.some(
        (direction, index) => index > 0 && direction === -directions[index - 1],
      ),
      `${routeName} has a genuine lateral reversal`,
    );
    const high = blocks.get(route[route.length - 1])!;
    jumpTo(
      world,
      player,
      {
        x: high.x + (routeName === "left" ? 0.2 : 0),
        y: SAMUEL_WALL.top,
        z: 0.8,
      },
      `${routeName}: wall top`,
    );
    walkTo(world, player, SAMUEL_SPEAKING_POINT, 420);
    assert.ok(
      player.grounded && player.y >= SAMUEL_WALL.top - 0.05,
      `${routeName} reaches the wall-top speaking place`,
    );
    if (routeName === "left") {
      // The wall cannot be passed through from outside at ground level, but
      // the city streets remain reachable by walking around its open end.
      const visitor = createPlayer(8, 0, 5);
      for (let frame = 0; frame < 100; frame++)
        stepPlayer(visitor, input(0, -1), 1 / 60, 0, world.solids);
      assert.ok(visitor.z > SAMUEL_WALL.d / 2);
      for (const destination of [
        { x: 8, z: 6 },
        { x: 32, z: 6 },
        { x: 32, z: -10 },
        { x: 15, z: -10 },
      ])
        walkTo(world, visitor, destination, 420);
      // Completing the vigil leaves the full exterior ground free for a
      // direct jump down and an ordinary walk to the exit.
      for (let frame = 0; frame < 240; frame++) {
        const dx = SAMUEL_EXIT.x - player.x;
        const dz = SAMUEL_EXIT.z - player.z;
        const distance = Math.hypot(dx, dz);
        stepPlayer(
          player,
          input(
            distance > 0.3 ? dx / distance : 0,
            distance > 0.3 ? dz / distance : 0,
            frame === 0,
            frame < 16,
          ),
          1 / 60,
          0,
          world.solids,
        );
      }
      assert.ok(player.grounded && player.y < 0.05);
      assert.ok(
        Math.hypot(player.x - SAMUEL_EXIT.x, player.z - SAMUEL_EXIT.z) < 2,
      );
    }
    world.dispose?.();
    world.dispose?.();
    assert.equal(scene.children.length, 0);
  }
});

test("the wall-wide authored stones each own one visible matching support", () => {
  const scene = new T.Scene();
  const world = buildSamuelWall(scene);
  const leftmost = Math.min(
    ...SAMUEL_BLOCKS.map((block) => block.x - block.width / 2),
  );
  const rightmost = Math.max(
    ...SAMUEL_BLOCKS.map((block) => block.x + block.width / 2),
  );
  assert.ok(
    leftmost < -19 && rightmost > 20,
    "stones span both ends of the 48 m wall",
  );
  assert.ok(new Set(SAMUEL_BLOCKS.map((block) => block.width)).size >= 4);
  assert.ok(new Set(SAMUEL_BLOCKS.map((block) => block.depth)).size >= 6);
  assert.equal(
    new Set(Object.values(SAMUEL_ROUTES).flat()).size,
    SAMUEL_BLOCKS.length,
    "every visible block belongs to a viable route",
  );
  scene.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  for (const block of SAMUEL_BLOCKS) {
    const mesh = scene.getObjectByName(
      `Samuel exterior jumping stone · ${block.id}`,
    );
    assert.ok(mesh instanceof T.Mesh);
    const shape = mesh.userData.scenery.solids[0];
    assert.deepEqual(shape, samuelBlockSolid(block));
    assert.ok(world.solids.includes(shape));
    assert.ok(
      Math.abs(shape.z - shape.d / 2 - (SAMUEL_WALL.d / 2 - 0.04)) < 1e-6,
      `${block.id} attaches to the wall face`,
    );
    ray.set(
      new T.Vector3(shape.x + shape.w * 0.21, 30, shape.z + shape.d * 0.17),
      new T.Vector3(0, -1, 0),
    );
    assert.equal(
      ray
        .intersectObject(mesh)
        .filter((hit) => Math.abs(hit.point.y - block.top) < 0.01).length,
      1,
      `${block.id} has one visible walk top`,
    );
  }
  const wall = scene.getObjectByName("Samuel solid city wall");
  assert.ok(wall instanceof T.Mesh);
  ray.set(new T.Vector3(0.21, 30, 0.17), new T.Vector3(0, -1, 0));
  assert.equal(
    ray
      .intersectObject(wall)
      .filter((hit) => Math.abs(hit.point.y - SAMUEL_WALL.top) < 0.01).length,
    1,
  );
  assert.ok(world.solids.length < 100, "keeps collision workload bounded");
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  world.dispose?.();
});
