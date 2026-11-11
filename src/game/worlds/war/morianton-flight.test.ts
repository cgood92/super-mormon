import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildMoriantonFlight,
  DUEL_ROUNDS,
  T_LEAD_IN,
  T_INTERVAL,
  type DuelInputType,
} from "./morianton-flight";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };

function harness() {
  const scene = new T.Scene();
  const world = buildMoriantonFlight(scene);
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let completed = 0;
  const dialogs: string[] = [];
  const toasts: string[] = [];

  const runtime = world.adventure!({
    setAvatar() {},
    toast(t) {
      toasts.push(t);
    },
    complete() {
      completed++;
    },
    dialog(_ref, _title, body, next) {
      dialogs.push(body);
      next();
    },
    attachEquipment() {},
  });

  const state = () =>
    runtime.snapshot() as {
      phase: string;
      teancumHp: number;
      moriantonHp: number;
      round: number;
      targetIndex: number;
      sequenceTimer: number;
      cz: number;
      attempts: number;
      escapedCount: number;
      enemies: { x: number; y: number; z: number }[];
    };

  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) runtime.update(1 / 60, player, idle);
  };

  const walk = (x: number, z: number) => {
    let frames = 0;
    while (Math.hypot(player.x - x, player.z - z) > 0.35 && frames++ < 1800) {
      const dx = x - player.x,
        dz = z - player.z,
        d = Math.hypot(dx, dz);
      stepPlayer(
        player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
      runtime.update(1 / 60, player, idle);
    }
    assert.ok(frames < 1800, `blocked at ${player.x},${player.z}`);
  };

  const press = (token: DuelInputType) => {
    const input = {
      x: token === "up" ? 0 : 0,
      y: token === "up" ? 1 : token === "down" ? -1 : 0,
      interact: token === "action",
      interactHeld: token === "action",
      jump: token === "jump",
      crouch: token === "crouch",
    };
    runtime.update(1 / 60, player, input);
    // Release
    runtime.update(1 / 60, player, idle);
  };

  return {
    scene,
    world,
    player,
    runtime,
    state,
    tick,
    walk,
    press,
    dialogs,
    toasts,
    get completed() {
      return completed;
    },
  };
}

test("scenery passes semantic collision validation", () => {
  const h = harness();
  assert.deepEqual(sceneryCollisionErrors(h.scene, h.world.solids), []);
  h.world.dispose?.();
});

test("Teancum chases Morianton through the narrow pass and intercepts him to begin the duel", () => {
  const h = harness();
  assert.equal(h.state().phase, "chase");
  assert.match(h.toasts[0], /Teancum/i);

  // Initial objective
  const res = h.runtime.update(1 / 60, h.player, idle);
  assert.equal(res.objective, "Cut off their escape · Catch up to Morianton");
  assert.equal(res.prompt, "", "HUD prompt is kept clean during pursuit");

  // Run north toward Morianton
  h.walk(0, -10);
  // Intercept Morianton
  let frames = 0;
  while (h.state().phase === "chase" && frames++ < 1200) {
    const enemy = h.state().enemies[0];
    const dx = enemy.x - h.player.x;
    const dz = enemy.z - h.player.z;
    const d = Math.hypot(dx, dz);
    stepPlayer(
      h.player,
      { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
      1 / 60,
      0,
      h.world.solids,
    );
    h.runtime.update(1 / 60, h.player, idle);
  }

  assert.equal(h.state().phase, "round_gate");
  assert.equal(h.runtime.movementLocked?.(), true);
  assert.ok(
    h.runtime.camera?.() !== undefined,
    "Camera transitions to cinematic duel angle",
  );

  // Scoreboard shows only pure scores without "Cut off their escape"
  const duelRes = h.runtime.update(1 / 60, h.player, idle);
  assert.match(duelRes.objective, /TEANCUM:.*MORIANTON:/);
  assert.doesNotMatch(duelRes.objective, /Cut off their escape/);
  assert.match(duelRes.prompt, /Press \{jump\} to begin/);

  h.world.dispose?.();
});

test("Morianton reaching the northward exit fairly resets the chase", () => {
  const h = harness();
  assert.equal(h.state().phase, "chase");

  // Player stands still and lets Morianton walk to z = 52
  for (let i = 0; i < 1800 && h.state().escapedCount === 0; i++) {
    h.tick(1);
  }

  assert.equal(h.state().escapedCount, 1);
  assert.equal(h.state().phase, "chase");
  assert.match(h.toasts[h.toasts.length - 1], /escap/i);
  assert.equal(h.player.z, -57, "player resets to spawn");

  h.world.dispose?.();
});

test("guitar hero sequence inputs on beat damage Morianton across five rounds to victory", () => {
  const h = harness();

  // Intercept Morianton immediately
  h.player.x = h.state().enemies[0].x;
  h.player.z = h.state().enemies[0].z - 1.0;
  h.tick(5);

  assert.equal(h.state().phase, "round_gate");
  assert.equal(h.state().moriantonHp, 5);
  assert.equal(h.state().teancumHp, 5);

  // Play through all 5 rounds
  for (let round = 1; round <= 5; round++) {
    assert.equal(h.state().phase, "round_gate");
    assert.equal(h.state().round, round);

    // Demands [A] click to start
    h.press("jump");
    assert.equal(h.state().phase, "duel_sequence");

    const seq = DUEL_ROUNDS[round - 1].sequence;
    let currentSeqFrame = 1;

    // Hit each button on beat
    for (let i = 0; i < seq.length; i++) {
      assert.equal(h.state().phase, "duel_sequence");
      const targetFrame = Math.round((T_LEAD_IN + i * T_INTERVAL) * 60);
      while (currentSeqFrame < targetFrame) {
        h.tick(1);
        currentSeqFrame++;
      }
      h.press(seq[i]);
      currentSeqFrame += 2;
    }

    // Now in clash_player animation
    assert.equal(h.state().phase, "clash_player");
    assert.equal(h.state().moriantonHp, 5 - round);

    // Wait for clash animation (2.2s = 132 frames)
    while (h.state().phase === "clash_player") {
      h.tick(1);
    }
  }

  assert.equal(h.state().moriantonHp, 0);
  assert.equal(h.state().phase, "duel_win");

  // Advance win animation to victory dialog
  while (h.completed === 0) {
    h.tick(1);
  }

  assert.equal(h.completed, 1);
  assert.match(h.dialogs.join(" "), /single combat/i);

  h.world.dispose?.();
});

test("incorrect or missed inputs damage Teancum and five wounds show defeat and demand [A] to retry", () => {
  const h = harness();

  // Intercept Morianton
  h.player.x = h.state().enemies[0].x;
  h.player.z = h.state().enemies[0].z - 1.0;
  h.tick(5);

  for (let wound = 1; wound <= 5; wound++) {
    assert.equal(h.state().phase, "round_gate");
    // Press [A] to start round
    h.press("jump");
    assert.equal(h.state().phase, "duel_sequence");

    // Wait lead-in
    h.tick(108);

    // Intentionally press wrong input
    const target = DUEL_ROUNDS[h.state().round - 1].sequence[0];
    const wrong: DuelInputType = target === "action" ? "jump" : "action";
    h.press(wrong);

    assert.equal(h.state().phase, "clash_enemy");
    assert.equal(h.state().teancumHp, 5 - wound);

    while (h.state().phase === "clash_enemy") {
      h.tick(1);
    }
  }

  assert.equal(h.state().teancumHp, 0);
  assert.equal(h.state().phase, "duel_defeat");

  // Verify defeat scoreboard and prompt demand [A] click to retry
  const defeatRes = h.runtime.update(1 / 60, h.player, idle);
  assert.match(defeatRes.objective, /FALLEN/);
  assert.match(defeatRes.prompt, /Press \{jump\} to try again/);

  // Ticking idle does NOT auto-reset
  h.tick(60);
  assert.equal(h.state().phase, "duel_defeat");

  // Press [A] to restart duel
  h.press("jump");
  assert.equal(h.state().phase, "round_gate");
  assert.equal(h.state().teancumHp, 5);
  assert.equal(h.state().moriantonHp, 5);
  assert.equal(h.state().round, 1);

  h.world.dispose?.();
});

test("disposing runtime or world cleans up and ignores delayed callbacks", () => {
  const scene = new T.Scene();
  const world = buildMoriantonFlight(scene);
  let next = () => {};
  let completed = 0;

  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_r, _t, _b, advance) {
      next = advance;
    },
    attachEquipment() {},
  });

  const player = createPlayer(0, 0, 0);
  runtime.dispose();
  next();
  assert.equal(completed, 0);

  world.dispose?.();
  assert.equal(scene.children.length, 0);
});
