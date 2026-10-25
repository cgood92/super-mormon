import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildNephihah } from "../src/super/nephihah";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
import type { Point } from "../src/super/worlds";

function walk(
  world: ReturnType<typeof buildNephihah>,
  player: ReturnType<typeof createPlayer>,
  target: Point,
  frames = 1600,
) {
  for (
    let frame = 0;
    frame < frames &&
    (Math.hypot(player.x - target.x, player.z - target.z) > 0.55 ||
      Math.abs(player.y - target.y) > 0.7);
    frame++
  ) {
    const dx = target.x - player.x,
      dz = target.z - player.z,
      length = Math.hypot(dx, dz);
    stepPlayer(
      player,
      {
        x: length > 0.55 ? -dx / length : 0,
        y: length > 0.55 ? dz / length : 0,
        jump: false,
        jumpHeld: false,
      },
      1 / 60,
      0,
      world.solids,
      world.climbables,
    );
    world.update?.(1 / 60, player);
  }
  assert.ok(
    Math.hypot(player.x - target.x, player.z - target.z) < 0.8,
    `blocked toward ${JSON.stringify(target)} at ${player.x.toFixed(2)},${player.y.toFixed(2)},${player.z.toFixed(2)}`,
  );
  assert.ok(
    Math.abs(player.y - target.y) < 0.75,
    `missed height ${target.y} at ${player.y.toFixed(2)}`,
  );
}

test("Nephihah requires scouting, carried materials, a western wall crossing, and a real inner descent", () => {
  const scene = new T.Scene(),
    world = buildNephihah(scene),
    player = createPlayer();
  Object.assign(player, world.spawn);
  let next: (() => void) | undefined,
    done = 0;
  const bodies: string[] = [];
  const runtime = world.adventure!({
    setAvatar(role) {
      assert.equal(role, "moroni");
    },
    toast() {},
    complete() {
      done++;
    },
    dialog(ref, title, body, advance) {
      bodies.push(`${ref} ${title} ${body}`);
      next = advance;
    },
  });
  const snapshot = () =>
    runtime.snapshot() as {
      phase: string;
      target: Point;
      outerPlaced: boolean;
      innerPlaced: boolean;
      entered: number;
      carrying: string | null;
    };
  const act = () => {
    runtime.update(1 / 60, player, {
      x: 0,
      y: 0,
      interact: true,
      interactHeld: true,
    });
    assert.ok(next, `no dialog at ${snapshot().phase}`);
    next!();
    next = undefined;
  };
  walk(world, player, { x: -35, y: 0, z: -12 });
  walk(world, player, snapshot().target);
  act();
  walk(world, player, { x: -35, y: 0, z: -12 });
  walk(world, player, snapshot().target);
  act();
  for (let i = 2; i <= 6; i++) {
    walk(world, player, snapshot().target);
    act();
  }
  assert.equal(snapshot().outerPlaced, true);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  walk(world, player, { x: -37, y: 0, z: 8 });
  walk(world, player, snapshot().target);
  act(); // climb outer wall
  act(); // lower inside ladder from wall top
  assert.equal(snapshot().innerPlaced, true);
  walk(world, player, snapshot().target);
  act(); // descend inside
  assert.equal(snapshot().entered, 1);
  for (let i = 10; i <= 14; i++) {
    walk(world, player, snapshot().target);
    act();
  }
  assert.equal(done, 1);
  assert.equal(snapshot().phase, "done");
  assert.match(bodies.join(" "), /asleep on the east, by the entrance/i);
  assert.match(bodies.join(" "), /many.*slay|slay many/i);
  assert.match(bodies.join(" "), /without losing a Nephite soul/i);
  assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  world.dispose?.();
  assert.equal(scene.children.length, 0);
});

test("east gate is open but the western wall blocks ground entry until the ladder is placed", () => {
  const world = buildNephihah(new T.Scene());
  const west = createPlayer(-29, 0, 0);
  for (let i = 0; i < 150; i++)
    stepPlayer(
      west,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(west.x < -24.8, `west wall crossed at ground ${west.x}`);
  const east = createPlayer(29, 0, 0);
  for (let i = 0; i < 150; i++)
    stepPlayer(
      east,
      { x: 1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(east.x < 21, `east entrance blocked at ${east.x}`);
  world.dispose?.();
});
