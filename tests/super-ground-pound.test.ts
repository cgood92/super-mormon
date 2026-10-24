import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlayer,
  stepPlayer,
  type MoveInput,
  type Solid,
} from "../src/super/physics";

const neutral: MoveInput = { x: 0, y: 0, jump: false, jumpHeld: false };
const tick = (
  p: ReturnType<typeof createPlayer>,
  input = neutral,
  solids: Solid[] = [],
  dt = 1 / 60,
) => stepPlayer(p, input, dt, 0, solids);

test("airborne crouch suspends briefly, descends strongly, and emits one impact", () => {
  const p = createPlayer();
  tick(p, { ...neutral, jump: true, jumpHeld: true });
  const start = p.y;
  tick(p, { ...neutral, crouch: true });
  assert.equal(p.move, "groundPound");
  assert.equal(p.y, start);
  let impacts = 0;
  for (let i = 0; i < 90; i++) {
    const event = tick(p, {
      ...neutral,
      crouch: true,
      jump: p.move === "groundPound",
    });
    impacts += Number(!!event.pounded);
    if (event.pounded) assert.equal(p.move, "poundLand");
  }
  assert.equal(impacts, 1);
  assert.equal(p.grounded, true);
  assert.equal(p.y, 0);
  assert.equal(p.move, "crouch");
});

test("pound crosses thin platform tops safely at coarse frame times", () => {
  const p = createPlayer(0, 9, 0);
  p.vx = 10;
  const solids = [{ x: 0, y: 3, z: 0, w: 4, h: 0.03, d: 4 }];
  let impact = false;
  for (let i = 0; i < 10; i++)
    impact ||= !!tick(p, { ...neutral, x: 1, crouch: true }, solids, 0.1)
      .pounded;
  assert.equal(impact, true);
  assert.equal(p.y, 3.03);
  assert.ok(Math.abs(p.x) < 0.3);
});

test("holding crouch before launch preserves backflip and long jump", () => {
  const still = createPlayer();
  tick(still, { ...neutral, crouch: true, jump: true, jumpHeld: true });
  tick(still, { ...neutral, crouch: true, jumpHeld: true });
  assert.equal(still.move, "backflip");
  const moving = createPlayer();
  moving.vz = 6;
  tick(moving, { ...neutral, y: 1, crouch: true, jump: true, jumpHeld: true });
  tick(moving, { ...neutral, y: 1, crouch: true, jumpHeld: true });
  assert.equal(moving.move, "longJump");
});

test("repeated airborne crouch edges cannot restart the suspended windup", () => {
  const p = createPlayer(0, 20, 0);
  for (let i = 0; i < 30; i++) tick(p, { ...neutral, crouch: i % 2 === 0 });
  assert.equal(p.move, "groundPound");
  assert.equal(p.vy, -24);
  assert.ok(p.y < 12);
});

test("crouch drops from climb and ledge without starting a pound", () => {
  const p = createPlayer(0, 2, 0);
  p.ledge = { x: 0, z: 0, top: 3 };
  p.move = "ledgeHang";
  tick(p, { ...neutral, crouch: true });
  assert.equal(p.ledge, undefined);
  assert.equal(p.move, "jump");
  const climber = createPlayer(1, 2, 0);
  climber.climbId = "tree";
  climber.move = "climb";
  stepPlayer(
    climber,
    { ...neutral, crouch: true },
    1 / 60,
    0,
    [],
    [{ id: "tree", x: 0, z: 0, y: 0, radius: 0.5, height: 5 }],
  );
  assert.equal(climber.climbId, undefined);
  assert.equal(climber.move, "jump");
});

test("pound stays below a ceiling and lands on the highest crossed terrace", () => {
  const p = createPlayer(0, 4, 0);
  const solids: Solid[] = [
    { x: 0, y: 5.7, z: 0, w: 5, h: 0.2, d: 5 },
    { x: 0, y: 1, z: 0, w: 6, h: 0.2, d: 6 },
    { x: 0, y: 2, z: 0, w: 3, h: 0.1, d: 3 },
  ];
  let impacts = 0;
  for (let i = 0; i < 50; i++) {
    impacts += Number(
      !!tick(p, { ...neutral, crouch: true, jumpHeld: true }, solids).pounded,
    );
    assert.ok(p.y <= 4);
  }
  assert.equal(impacts, 1);
  assert.equal(p.y, 2.1);
  assert.equal(p.grounded, true);
});
