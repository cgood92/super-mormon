import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlayer,
  stepPlayer,
  type Solid,
  type Climbable,
  type MoveInput,
} from "./physics.ts";

const idle: MoveInput = { x: 0, y: 0, jump: false, jumpHeld: false };
function frames(
  p: ReturnType<typeof createPlayer>,
  input: MoveInput,
  n: number,
  solids: Solid[] = [],
  climbables?: Climbable[],
) {
  for (let i = 0; i < n; i++)
    stepPlayer(p, input, 1 / 60, 0, solids, climbables);
}

test("crouching fits a low tunnel and standing remains blocked until clear", () => {
  const roof: Solid = { x: 1.6, y: 1, z: 0, w: 3, h: 0.5, d: 3 };
  const p = createPlayer(-1, 0, 0);
  frames(p, { ...idle, x: -1 }, 50, [roof]);
  assert.ok(p.x < -0.2);
  frames(p, { ...idle, x: -1, crouch: true }, 65, [roof]);
  assert.ok(p.x > 2.1);
  frames(p, idle, 1, [roof]);
  assert.equal(p.crouching, true);
  assert.ok(p.move === "crouch" || p.move === "crawl");
  frames(p, { ...idle, x: -1 }, 35, [roof]);
  frames(p, idle, 1, [roof]);
  assert.equal(p.crouching, false);
});

test("forced crouch continues at crawl speed after crouch is released", () => {
  const roof: Solid = { x: 0, y: 1, z: 0, w: 10, h: 0.5, d: 3 };
  const p = createPlayer();
  frames(p, { ...idle, x: -1 }, 30, [roof]);
  assert.equal(p.crouching, true);
  assert.equal(p.move, "crawl");
  assert.ok(p.x < 1.7, `forced crawl traveled ${p.x}m`);
});

test("running crouch jump carries long-jump momentum farther than normal jump", () => {
  const normal = createPlayer();
  const long = createPlayer();
  frames(normal, { ...idle, y: 1 }, 25);
  frames(long, { ...idle, y: 1 }, 25);
  const nz = normal.z,
    lz = long.z;
  frames(normal, { ...idle, y: 1, jump: true, jumpHeld: true }, 1);
  frames(long, { ...idle, y: 1, crouch: true, jump: true, jumpHeld: true }, 1);
  assert.equal(long.move, "longJump");
  frames(normal, { ...idle, y: 1, jumpHeld: true }, 25);
  frames(long, { ...idle, y: 1, jumpHeld: true }, 25);
  assert.ok(long.z - lz > normal.z - nz + 0.3);
});

test("a crouch-first long jump outruns a normal running jump", () => {
  const normal = createPlayer();
  const long = createPlayer();
  frames(normal, { ...idle, y: 1 }, 30);
  frames(long, { ...idle, y: 1, crouch: true }, 30);
  const normalStart = normal.z;
  const longStart = long.z;
  stepPlayer(
    normal,
    { ...idle, y: 1, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [],
  );
  stepPlayer(
    long,
    { ...idle, y: 1, crouch: true, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [],
  );
  assert.equal(long.move, "longJump");
  assert.ok(long.vz >= 8.5, `long-jump launch speed was ${long.vz}`);
  frames(normal, { ...idle, y: 1, jumpHeld: true }, 25);
  frames(long, { ...idle, y: 1, jumpHeld: true }, 25);
  assert.ok(long.z - longStart > normal.z - normalStart + 0.3);
});

test("a long jump uses the standing collider before entering a low opening", () => {
  const roof: Solid = { x: 1.2, y: 1.2, z: 0, w: 2, h: 0.4, d: 2 };
  const p = createPlayer(-1, 0, 0);
  frames(p, { ...idle, x: -1 }, 12);
  stepPlayer(
    p,
    { ...idle, x: -1, crouch: true, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [roof],
  );
  assert.equal(p.move, "longJump");
  assert.equal(p.crouching, false);
  frames(p, { ...idle, x: -1, crouch: true, jumpHeld: true }, 10, [roof]);
  assert.ok(p.x <= -0.1, `airborne player entered opening at x=${p.x}`);
});

test("an airborne player remains crouched beneath an overhead slab after releasing crouch", () => {
  const roof: Solid = { x: 0, y: 1.2, z: 0, w: 3, h: 0.4, d: 3 };
  const p = createPlayer(0, 0.2, 0);
  p.grounded = false;
  p.vy = 0.5;
  stepPlayer(p, { ...idle, crouch: true }, 1 / 60, 0, [roof]);
  stepPlayer(p, idle, 1 / 60, 0, [roof]);
  assert.equal(p.crouching, true);
  assert.ok(p.y + 0.9 <= 1.2 + 0.01);
});

test("stationary crouch jump backflips and rapid reversal jumps sideflip", () => {
  const back = createPlayer();
  stepPlayer(
    back,
    { ...idle, crouch: true, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [],
  );
  assert.equal(back.move, "backflip");
  assert.ok(back.vz < -0.5);
  const side = createPlayer();
  frames(side, { ...idle, x: -1 }, 25);
  stepPlayer(
    side,
    { ...idle, x: 1, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [],
  );
  assert.equal(side.move, "sideflip");
});

test("quick land-jump chains double then triple when moving fast", () => {
  const p = createPlayer();
  frames(p, { ...idle, y: 1 }, 25);
  const stages: string[] = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    stepPlayer(p, { ...idle, y: 1, jump: true, jumpHeld: true }, 1 / 60, 0, []);
    stages.push(p.move);
    for (let i = 0; i < 120 && !p.grounded; i++)
      stepPlayer(p, { ...idle, y: 1 }, 1 / 60, 0, []);
    assert.equal(p.grounded, true);
  }
  assert.deepEqual(stages, ["jump", "doubleJump", "tripleJump"]);
});

test("wall kick pushes away from wall and repeat requires cooldown", () => {
  const wall: Solid = { x: 1, y: 0, z: 0, w: 0.4, h: 4, d: 4 };
  const p = createPlayer(0.4, 1, 0);
  p.vy = -1;
  const first = stepPlayer(
    p,
    { ...idle, x: -1, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [wall],
  );
  assert.equal(first.jumped, true);
  assert.equal(p.move, "wallKick");
  assert.ok(p.vx < 0);
  const repeat = stepPlayer(
    p,
    { ...idle, x: -1, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [wall],
  );
  assert.equal(repeat.jumped, false);
});

test("descending into an edge grabs it and jumping pulls onto a clear top", () => {
  const ledge: Solid = { x: 1, y: 0, z: 0, w: 1, h: 2, d: 3 };
  const p = createPlayer(0.1, 1.3, 0);
  p.vy = -2;
  frames(p, { ...idle, x: -1 }, 12, [ledge]);
  assert.equal(p.move, "ledgeHang");
  stepPlayer(p, { ...idle, jump: true, jumpHeld: true }, 1 / 60, 0, [ledge]);
  assert.ok(p.y >= 2);
  assert.ok(p.x > 0.4);
  assert.equal(p.grounded, true);
});

test("held forward keeps a newly grabbed ledge visible before pulling up", () => {
  const ledge: Solid = { x: 0, y: 0, z: 1, w: 3, h: 2, d: 1 };
  const p = createPlayer(0, 1.3, 0.1);
  p.vy = -2;
  frames(p, { ...idle, y: 1 }, 2, [ledge]);
  assert.equal(p.move, "ledgeHang");
  frames(p, { ...idle, y: 1 }, 6, [ledge]);
  assert.equal(p.move, "ledgeHang");
  frames(p, { ...idle, y: 1 }, 8, [ledge]);
  assert.equal(p.grounded, true);
  assert.ok(p.z > 0.4);
});

test("traversal disabled prevents an airborne NPC from hanging on a ledge", () => {
  const ledge: Solid = { x: 1, y: 0, z: 0, w: 1, h: 2, d: 3 };
  const p = createPlayer(0.1, 1.3, 0);
  p.vy = -2;
  frames(p, { ...idle, x: -1, traversal: false }, 12, [ledge]);
  assert.notEqual(p.move, "ledgeHang");
  assert.equal(p.ledge, undefined);
});

test("ledge pull stays hanging when an overhead slab blocks the vertical path", () => {
  const ledge: Solid = { x: 1, y: 0, z: 0, w: 1, h: 2, d: 3 };
  const overhead: Solid = { x: 0.1, y: 3.05, z: 0, w: 0.45, h: 0.2, d: 1 };
  const p = createPlayer(0.1, 1.3, 0);
  p.vy = -2;
  frames(p, { ...idle, x: -1 }, 12, [ledge, overhead]);
  assert.equal(p.move, "ledgeHang");
  const startY = p.y;
  stepPlayer(p, { ...idle, jump: true, jumpHeld: true }, 1 / 60, 0, [
    ledge,
    overhead,
  ]);
  assert.equal(p.move, "ledgeHang");
  assert.equal(p.y, startY);
});

test("a climbable attaches in air, climbs, and jump detaches outward", () => {
  const tree: Climbable = {
    id: "tree",
    x: 0,
    z: 0,
    y: 0,
    height: 4,
    radius: 0.25,
  };
  const p = createPlayer(0, 1, 0.55);
  p.vy = -1;
  frames(p, { ...idle, y: -1 }, 2, [], [tree]);
  assert.equal(p.move, "climb");
  const start = p.y;
  frames(p, { ...idle, y: 1 }, 20, [], [tree]);
  assert.ok(p.y > start + 0.4);
  stepPlayer(p, { ...idle, jump: true, jumpHeld: true }, 1 / 60, 0, [], [tree]);
  assert.notEqual(p.move, "climb");
  assert.ok(p.vy > 0);
  assert.ok(p.vz > 0);
});

test("climbing stops below a ceiling and still allows descent and jump detach", () => {
  const tree: Climbable = {
    id: "tree",
    x: 0,
    z: 0,
    y: 0,
    height: 4,
    radius: 0.25,
  };
  const roof: Solid = { x: 0, y: 2.6, z: 0, w: 2, h: 0.3, d: 2 };
  const p = createPlayer(0, 0.5, 0.55);
  p.vx = 3;
  p.runSpeed = 3;
  p.vy = -1;
  frames(p, { ...idle, y: -1 }, 2, [roof], [tree]);
  assert.equal(p.move, "climb");
  assert.equal(p.runSpeed, 0);
  frames(p, { ...idle, y: 1 }, 35, [roof], [tree]);
  assert.ok(p.y <= 0.96, `climbed through ceiling to y=${p.y}`);
  const heightAtRoof = p.y;
  frames(p, { ...idle, y: -1 }, 12, [roof], [tree]);
  assert.ok(p.y < heightAtRoof - 0.2);
  stepPlayer(
    p,
    { ...idle, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [roof],
    [tree],
  );
  assert.notEqual(p.move, "climb");
  assert.ok(p.vy > 0);
});
