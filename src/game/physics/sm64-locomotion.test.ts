import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlayer,
  stepPlayer,
  type MoveInput,
  type Solid,
} from "./physics.ts";
import { createMotionDriver } from "../characters/character-motion.ts";
import type { CharacterState } from "../characters/character-types.ts";

const still: MoveInput = { x: 0, y: 0, jump: false, jumpHeld: false };

function runUp(frames = 30) {
  const p = createPlayer();
  for (let i = 0; i < frames; i++) {
    stepPlayer(p, { ...still, y: 1 }, 1 / 60, 0, []);
  }
  return p;
}

test("reversing direction at high speed enters turnSkid and decelerates before running", () => {
  const p = runUp(40);
  assert.ok(p.runSpeed > 5, `initial speed ${p.runSpeed}`);
  // Reverse stick direction: 180 degrees
  stepPlayer(p, { ...still, y: -1 }, 1 / 60, 0, []);
  assert.equal(p.move, "turnSkid", "entered skidding state on sharp reversal");
  assert.ok(p.runSpeed > 4, "still carries forward slide momentum initially");

  // Jumping during turnSkid executes a sideflip
  const jumper = runUp(40);
  stepPlayer(jumper, { ...still, y: -1 }, 1 / 60, 0, []);
  assert.equal(jumper.move, "turnSkid");
  stepPlayer(
    jumper,
    { ...still, y: -1, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [],
  );
  assert.equal(jumper.move, "sideflip", "sideflip launched from turn skid");
  assert.equal(jumper.grounded, false);
});

test("long jump landing enters forward slide rollout before recovering into run", () => {
  const p = runUp(30);
  stepPlayer(
    p,
    { ...still, y: 1, crouch: true, jump: true, jumpHeld: true },
    1 / 60,
    0,
    [],
  );
  assert.equal(p.move, "longJump");
  assert.equal(p.grounded, false);

  // Fall until touchdown
  for (let i = 0; i < 40 && !p.grounded; i++) {
    stepPlayer(p, { ...still, y: 1 }, 1 / 60, 0, []);
  }
  assert.equal(p.grounded, true);
  assert.equal(
    p.move,
    "slideRollout",
    "landing long jump transitions to slide rollout",
  );
  assert.ok(p.runSpeed > 3, "preserves forward rollout speed on landing");

  // Rolling forward while holding stick recovers into full run
  for (let i = 0; i < 25; i++) {
    stepPlayer(p, { ...still, y: 1 }, 1 / 60, 0, []);
  }
  assert.equal(p.move, "run", "rollout popped up into running");
});

test("air dive launches forward and lands into a belly slide", () => {
  const p = createPlayer(0, 3, 0);
  p.grounded = false;
  p.vy = 2;
  p.vz = 4;
  p.runSpeed = 4;

  stepPlayer(p, { ...still, dive: true }, 1 / 60, 0, []);
  assert.equal(p.move, "dive", "airborne dive activated");
  assert.ok(p.vz > 7, `dive propelled forward: ${p.vz}`);

  // Fall to floor
  for (let i = 0; i < 60 && !p.grounded; i++) {
    stepPlayer(p, still, 1 / 60, 0, []);
  }
  assert.equal(p.grounded, true);
  assert.equal(p.move, "bellySlide", "landing dive enters belly slide");
  assert.ok(p.runSpeed > 3, "sliding along ground on belly");
});

test("sprint on ground with dive enters belly slide; crouch with dive performs slide-kick", () => {
  const sprinter = runUp(35);
  stepPlayer(sprinter, { ...still, y: 1, dive: true }, 1 / 60, 0, []);
  assert.equal(
    sprinter.move,
    "bellySlide",
    "sprinting dive enters belly slide",
  );

  const crawler = runUp(30);
  stepPlayer(crawler, { ...still, y: 1, crouch: true }, 1 / 60, 0, []);
  assert.equal(crawler.move, "crawl");
  stepPlayer(
    crawler,
    { ...still, y: 1, crouch: true, dive: true },
    1 / 60,
    0,
    [],
  );
  assert.equal(
    crawler.move,
    "slideKick",
    "crouched dive performs SM64 slide kick",
  );
});

test("downhill incline accelerates belly slide via slope gravity", () => {
  // Stepped slope descending in positive Z
  const solids: Solid[] = [
    { x: 0, y: 0, z: 0, w: 6, h: 2, d: 2 },
    { x: 0, y: 0, z: 2, w: 6, h: 1.2, d: 2 },
    { x: 0, y: 0, z: 4, w: 6, h: 0.4, d: 2 },
  ];
  const flat: Solid[] = [{ x: 0, y: 0, z: 0, w: 6, h: 2, d: 20 }];

  const slidingFlat = createPlayer(0, 2, 0.7);
  slidingFlat.move = "bellySlide";
  slidingFlat.vx = 0;
  slidingFlat.vz = 5;
  slidingFlat.runSpeed = 5;

  const slidingSlope = createPlayer(0, 2, 0.7);
  slidingSlope.move = "bellySlide";
  slidingSlope.vx = 0;
  slidingSlope.vz = 5;
  slidingSlope.runSpeed = 5;

  stepPlayer(slidingFlat, still, 1 / 60, 0, flat);
  stepPlayer(slidingSlope, still, 1 / 60, 0, solids);

  assert.ok(
    slidingSlope.runSpeed > slidingFlat.runSpeed,
    `downhill slope accelerated slide: slope=${slidingSlope.runSpeed} flat=${slidingFlat.runSpeed}`,
  );
});

test("SM64 rig poses articulate turnSkid, slideRollout, dive, bellySlide, and slideKick", () => {
  const driver = createMotionDriver("nephi");
  const baseState: CharacterState = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 4,
    yaw: 0,
    grounded: true,
    runSpeed: 4,
    move: "turnSkid",
  };

  // Turn skid
  driver.update(1 / 60, baseState);
  const leftArm = driver.group.getObjectByName("left-arm")!;
  const rightArm = driver.group.getObjectByName("right-arm")!;
  assert.ok(
    leftArm.rotation.z > 0.5 && rightArm.rotation.z < -0.5,
    "arms spread for turn skid balance",
  );

  // Dive
  driver.update(1 / 60, {
    ...baseState,
    grounded: false,
    vy: 0,
    move: "dive",
  });
  const body = driver.group.getObjectByName("body")!;
  assert.ok(
    body.rotation.x > 1.0,
    "body pitched horizontal in aerodynamic Superman dive",
  );

  // Slide kick
  driver.update(1 / 60, { ...baseState, move: "slideKick" });
  const rightLeg = driver.group.getObjectByName("right-leg")!;
  assert.ok(
    rightLeg.rotation.x < -1.0,
    "lead leg extended forward in slide kick",
  );

  driver.dispose();
});
