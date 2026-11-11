import * as T from "three";
import {
  createPlayer,
  stepPlayer,
  type PlayerState,
} from "../../physics/physics";
import { terracedRock, markScenery } from "../shared/scenery";
import { material, label } from "../../rendering/art";
import { warWorld } from "../shared/war-world-kit";
import type { Point, WorldData } from "../../runtime/worlds";

/** Alma 50:25–36. Single combat between Teancum and Morianton at the narrow pass. */
export const MORIANTON_ROUTE: Point[] = [
  { x: 0, y: 0, z: -57 },
  { x: 0, y: 0, z: -15 },
  { x: 0, y: 0, z: 52 },
];
export const MORIANTON_POST_HINTS: Point[] = [];

export type DuelInputType = "action" | "jump" | "crouch" | "up" | "down";

export const DUEL_ROUNDS: { name: string; sequence: DuelInputType[] }[] = [
  { name: "First Strike", sequence: ["action", "jump", "action"] },
  { name: "High Parry", sequence: ["jump", "action", "up"] },
  { name: "Flank & Thrust", sequence: ["action", "up", "action", "jump"] },
  { name: "Low Sweep", sequence: ["down", "action", "crouch", "action"] },
  { name: "Final Clash", sequence: ["action", "jump", "up", "action"] },
];

const STEP_DURATION = 1.2;
const ENEMY_WALK_SPEED = 2.8;

function buildDuelSword(tint = 0xc2c7c6, guardTint = 0x8d7443) {
  const sword = new T.Group();
  sword.name = "Duel sword";
  const blade = new T.Mesh(
    new T.BoxGeometry(0.08, 0.9, 0.04),
    new T.MeshStandardMaterial({
      color: tint,
      metalness: 0.65,
      roughness: 0.35,
    }),
  );
  blade.position.y = 0.45;
  const cross = new T.Mesh(
    new T.BoxGeometry(0.28, 0.05, 0.07),
    new T.MeshStandardMaterial({ color: guardTint, roughness: 0.5 }),
  );
  cross.position.y = 0.03;
  const grip = new T.Mesh(
    new T.BoxGeometry(0.05, 0.16, 0.05),
    new T.MeshStandardMaterial({ color: 0x3d2719, roughness: 0.8 }),
  );
  grip.position.y = -0.07;
  const pommel = new T.Mesh(
    new T.SphereGeometry(0.045, 6, 6),
    new T.MeshStandardMaterial({ color: guardTint, metalness: 0.5 }),
  );
  pommel.position.y = -0.16;
  sword.add(blade, cross, grip, pommel);
  sword.rotation.x = Math.PI / 2;
  markScenery(sword, {
    kind: "decoration",
    reason: "Duel weapon attached to character hand.",
  });
  return sword;
}

export function buildMoriantonFlight(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Narrow pass · Morianton's flight");
  const { root, solids, solid, actor, tree } = land;

  // Two waters bracket a narrow central route; their surfaces are below and outside play.
  for (const side of [-1, 1]) {
    const sea = new T.Mesh(
      new T.PlaneGeometry(65, 140),
      new T.MeshStandardMaterial({
        color: side < 0 ? 0x4a9cb7 : 0x5ca9bf,
        roughness: 0.28,
        metalness: 0.1,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(side * 53, -0.27, 0);
    sea.name = side < 0 ? "West sea" : "East sea";
    sea.userData.scenery = {
      kind: "backdrop",
      reason: "Water beyond the pass, below the only walk surface.",
    };
    root.add(sea);
    for (const [z, w, d, h] of [
      [-38, 8, 12, 2.5],
      [-8, 11, 15, 3.2],
      [22, 9, 18, 3.5],
      [49, 10, 12, 2.8],
    ])
      terracedRock(
        root,
        solids,
        material(0x8d8571),
        { x: side * 20, y: 0, z, w, d, h },
        "Coastal limestone ridge",
      );
  }

  // Pass outcrops beside the path.
  for (const [x, z, w, d, h] of [
    [7, -21, 4, 6, 1.2],
    [-15, -30, 3, 7, 1.5],
  ])
    solid({ x, y: 0, z, w, d, h }, 0x9b8c73, "Solid pass outcrop");

  for (const [x, z] of [
    [-17, -48],
    [16, -39],
    [-17, -19],
    [17, 52],
  ])
    tree(x, z);

  // The exit has visible posts and a readable direction marker.
  for (const x of [-5, 5])
    solid(
      { x, y: 0, z: 52, w: 0.65, d: 0.65, h: 3.8 },
      0x766047,
      "Northward exit post",
    );
  const exitSign = label(root, "NORTHWARD EXIT", 0, 3.7, 52, 9, 0.8);
  exitSign.rotation.y = Math.PI;
  for (const z of [44, 48]) {
    const arrow = new T.Mesh(
      new T.ConeGeometry(0.8, 1.7, 3),
      material(0xd9ab4e),
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.08, z);
    arrow.scale.z = 0.08;
    arrow.name = "Northward exit direction";
    markScenery(arrow, {
      kind: "decoration",
      reason: "Flat ground direction marker, not a raised walk surface.",
    });
    root.add(arrow);
  }

  // Patrol: 6 armored soldiers following Teancum
  const patrol = Array.from({ length: 6 }, (_, i) => ({
    rig: actor(
      "teancum-soldier",
      { x: -4 + (i % 3) * 2, y: 0, z: -55 - Math.floor(i / 3) * 2 },
      `Teancum soldier ${i + 1}`,
    ),
    state: createPlayer(-4 + (i % 3) * 2, 0, -55 - Math.floor(i / 3) * 2),
  }));

  // Enemies: Morianton (index 0) and 3 followers (indices 1..3)
  const enemyStartOffsets = [
    { x: 0, z: -15 },
    { x: -2.2, z: -17.5 },
    { x: 2.2, z: -17.5 },
    { x: 0, z: -19.5 },
  ];
  const enemies = enemyStartOffsets.map((p, i) => ({
    rig: actor(
      i === 0 ? "morianton" : "morianton-follower",
      { ...p, y: 0 },
      i === 0 ? "Morianton · fleeing leader" : `Morianton follower ${i}`,
    ),
    state: createPlayer(p.x, 0, p.z),
  }));

  // Attach weapon to Morianton's hand
  const moriantonSword = buildDuelSword(0xb4b9b8, 0x6d5538);
  enemies[0].rig.sockets.rightHand.add(moriantonSword);

  let disposed = false;
  let pending = false;
  let ended = false;
  let attempts = 0;
  let escapedCount = 0;

  // Duel state
  type Phase =
    | "chase"
    | "duel_prepare"
    | "duel_sequence"
    | "clash_player"
    | "clash_enemy"
    | "duel_defeat"
    | "duel_win"
    | "done";

  let phase: Phase = "chase";
  let teancumHp = 5;
  let moriantonHp = 5;
  let round = 1;
  let stepIndex = 0;
  let stepTimer = 0;
  let phaseTimer = 0;
  let cz = 0;
  const cx = 0;

  const prevInputState = {
    interact: false,
    jump: false,
    crouch: false,
    up: false,
    down: false,
  };

  const resetChase = (player: PlayerState) => {
    attempts++;
    phase = "chase";
    teancumHp = 5;
    moriantonHp = 5;
    round = 1;
    stepIndex = 0;
    stepTimer = 0;
    phaseTimer = 0;
    Object.assign(player, createPlayer(0, 0, -57));
    enemyStartOffsets.forEach((p, i) => {
      Object.assign(enemies[i].state, createPlayer(p.x, 0, p.z));
      enemies[i].rig.group.rotation.z = 0;
      enemies[i].rig.update(0, enemies[i].state);
    });
    patrol.forEach((s, i) => {
      Object.assign(
        s.state,
        createPlayer(-4 + (i % 3) * 2, 0, -55 - Math.floor(i / 3) * 2),
      );
      s.rig.update(0, s.state);
    });
  };

  const startDuelAt = (meetingZ: number) => {
    cz = Math.min(36, Math.max(-10, meetingZ));
    phase = "duel_prepare";
    phaseTimer = 0;
    stepIndex = 0;
    stepTimer = 0;
    teancumHp = 5;
    moriantonHp = 5;
    round = 1;

    // Reset Morianton orientation and placement
    Object.assign(enemies[0].state, {
      x: cx,
      y: 0,
      z: cz + 1.4,
      vx: 0,
      vy: 0,
      vz: 0,
      runSpeed: 0,
      yaw: Math.PI,
      grounded: true,
      move: "idle",
    });
    enemies[0].rig.group.rotation.z = 0;
    enemies[0].rig.update(0, enemies[0].state);

    // Position spectators
    patrol.forEach((s, i) => {
      Object.assign(s.state, {
        x: -4.5,
        y: 0,
        z: cz - 2.5 + i * 1.0,
        vx: 0,
        vy: 0,
        vz: 0,
        runSpeed: 0,
        yaw: Math.PI / 2,
        grounded: true,
        move: "idle",
      });
      s.rig.update(0, s.state);
    });

    for (let i = 1; i < enemies.length; i++) {
      Object.assign(enemies[i].state, {
        x: 4.5,
        y: 0,
        z: cz - 1.5 + (i - 1) * 1.5,
        vx: 0,
        vy: 0,
        vz: 0,
        runSpeed: 0,
        yaw: -Math.PI / 2,
        grounded: true,
        move: "idle",
      });
      enemies[i].rig.update(0, enemies[i].state);
    }
  };

  return {
    name: "Morianton's Flight",
    subtitle: "Cut off their escape · Alma 50:25–36",
    spawn: { ...MORIANTON_ROUTE[0], yaw: 0 },
    solids,
    actorParent: root,
    bounds: { minX: -19, maxX: 19, minZ: -62, maxZ: 61 },
    goal: { x: 0, y: 0, z: 17, radius: 15 },
    initialObjective: "Cut off their escape · Catch up to Morianton",
    landmarks: [
      { name: "Northward escape route", x: 0, y: 0, z: 52 },
      { name: "Coastal limestone ridge", x: 20, y: 0, z: 0 },
    ],
    adventure(hooks) {
      hooks.setAvatar("teancum");
      hooks.toast(
        "You are Teancum. Moroni commanded you to stop Morianton from escaping to the land northward. Catch up to him!",
      );

      // Equip player with a duel sword
      const playerSword = buildDuelSword();
      if (hooks.attachEquipment) {
        hooks.attachEquipment("rightHand", playerSword);
      } else if (hooks.avatar) {
        hooks.avatar.add(playerSword);
      }

      const objective = () => {
        if (phase === "chase") {
          return "Cut off their escape · Catch up to Morianton";
        }
        if (phase === "done") {
          return "The pass is secured · Morianton's company covenants peace";
        }
        return `Cut off their escape · Teancum ⚔️ ${teancumHp}/5   Morianton 🛡️ ${moriantonHp}/5`;
      };

      return {
        snapshot: () => ({
          phase,
          teancumHp,
          moriantonHp,
          round,
          stepIndex,
          cz,
          attempts,
          escapedCount,
          enemies: enemies.map((e) => ({
            x: e.state.x,
            y: e.state.y,
            z: e.state.z,
          })),
          soldiers: patrol.map((s) => ({
            x: s.state.x,
            y: s.state.y,
            z: s.state.z,
          })),
          route: MORIANTON_ROUTE,
          postHints: MORIANTON_POST_HINTS,
        }),

        movementLocked: () =>
          pending ||
          ended ||
          phase === "duel_prepare" ||
          phase === "duel_sequence" ||
          phase === "clash_player" ||
          phase === "clash_enemy" ||
          phase === "duel_defeat" ||
          phase === "duel_win",

        camera: () => {
          if (
            phase === "duel_prepare" ||
            phase === "duel_sequence" ||
            phase === "clash_player" ||
            phase === "clash_enemy" ||
            phase === "duel_defeat" ||
            phase === "duel_win"
          ) {
            return {
              cut: true,
              position: { x: cx - 4.2, y: 1.35, z: cz },
              focus: { x: cx, y: 1.15, z: cz },
            };
          }
          return undefined;
        },

        update(dt, player, input) {
          dt = Math.max(0, Math.min(dt, 0.1));
          if (disposed || ended) {
            return { objective: objective(), prompt: "" };
          }

          // Read and edge-trigger input
          const currentUp = input.y > 0.4;
          const currentDown = input.y < -0.4;
          const pressedAction = !!input.interact && !prevInputState.interact;
          const pressedJump = !!input.jump && !prevInputState.jump;
          const pressedCrouch = !!input.crouch && !prevInputState.crouch;
          const pressedUp = currentUp && !prevInputState.up;
          const pressedDown = currentDown && !prevInputState.down;

          prevInputState.interact = !!input.interact;
          prevInputState.jump = !!input.jump;
          prevInputState.crouch = !!input.crouch;
          prevInputState.up = currentUp;
          prevInputState.down = currentDown;

          // -----------------------------------------------------------
          // PHASE: CHASE
          // -----------------------------------------------------------
          if (phase === "chase") {
            // Patrol soldiers follow Teancum in a formation trail
            let ahead = player;
            patrol.forEach((soldier) => {
              const dx = ahead.x - soldier.state.x;
              const dz = ahead.z - soldier.state.z;
              const d = Math.hypot(dx, dz);
              const move = d > 1.7 ? Math.min(1, (d - 1.4) / 2) : 0;
              stepPlayer(
                soldier.state,
                {
                  x: d ? (-dx / d) * move : 0,
                  y: d ? (dz / d) * move : 0,
                  jump: false,
                  jumpHeld: false,
                },
                dt,
                0,
                solids,
              );
              soldier.rig.update(dt, soldier.state);
              ahead = soldier.state;
            });

            // Morianton and his company actively walk toward the north exit
            enemies[0].state.z += ENEMY_WALK_SPEED * dt;
            enemies[0].state.yaw = 0;
            enemies[0].state.move = "run";
            enemies[0].state.runSpeed = ENEMY_WALK_SPEED;
            enemies[0].state.vz = ENEMY_WALK_SPEED;
            enemies[0].rig.update(dt, enemies[0].state);

            for (let i = 1; i < enemies.length; i++) {
              const targetZ =
                enemies[0].state.z +
                (enemyStartOffsets[i].z - enemyStartOffsets[0].z);
              enemies[i].state.z = targetZ;
              enemies[i].state.x = enemyStartOffsets[i].x;
              enemies[i].state.yaw = 0;
              enemies[i].state.move = "run";
              enemies[i].state.runSpeed = ENEMY_WALK_SPEED;
              enemies[i].state.vz = ENEMY_WALK_SPEED;
              enemies[i].rig.update(dt, enemies[i].state);
            }

            // Check if Morianton escaped into the northward pass
            if (enemies[0].state.z >= 52) {
              escapedCount++;
              resetChase(player);
              hooks.toast(
                "Morianton reached the northward exit! Catch up to him before he escapes.",
              );
              return { objective: objective(), prompt: "" };
            }

            // Check if Teancum has intercepted Morianton
            const dist = Math.hypot(
              player.x - enemies[0].state.x,
              player.z - enemies[0].state.z,
            );
            if (dist < 2.8) {
              startDuelAt(enemies[0].state.z);
              hooks.toast(
                "Single combat! Strike in the correct sequence to defeat Morianton.",
              );
            }

            return { objective: objective(), prompt: "" };
          }

          // Keep spectators updated during duel
          patrol.forEach((s) => s.rig.update(dt, s.state));
          for (let i = 1; i < enemies.length; i++) {
            enemies[i].rig.update(dt, enemies[i].state);
          }

          // -----------------------------------------------------------
          // PHASE: DUEL PREPARE
          // -----------------------------------------------------------
          if (phase === "duel_prepare") {
            phaseTimer += dt;
            player.x = cx;
            player.y = 0;
            player.z = cz - 1.4;
            player.yaw = 0;
            player.move = "idle";
            player.vx = 0;
            player.vz = 0;

            enemies[0].state.x = cx;
            enemies[0].state.y = 0;
            enemies[0].state.z = cz + 1.4;
            enemies[0].state.yaw = Math.PI;
            enemies[0].state.move = "idle";
            enemies[0].rig.update(dt, enemies[0].state);

            const roundData = DUEL_ROUNDS[round - 1];
            const seqTokens = roundData.sequence
              .map((t) => `{${t}}`)
              .join("  ");

            if (phaseTimer >= 0.8) {
              phase = "duel_sequence";
              stepIndex = 0;
              stepTimer = 0;
            }

            return {
              objective: objective(),
              prompt: `Round ${round} of 5 · Get ready!  [ ${seqTokens} ]`,
            };
          }

          // -----------------------------------------------------------
          // PHASE: DUEL SEQUENCE (QTE INPUT)
          // -----------------------------------------------------------
          if (phase === "duel_sequence") {
            stepTimer += dt;
            player.x = cx;
            player.y = 0;
            player.z = cz - 1.4;
            player.yaw = 0;
            player.move = "idle";

            enemies[0].state.x = cx;
            enemies[0].state.y = 0;
            enemies[0].state.z = cz + 1.4;
            enemies[0].state.yaw = Math.PI;
            enemies[0].state.move = "idle";
            enemies[0].rig.update(dt, enemies[0].state);

            const seq = DUEL_ROUNDS[round - 1].sequence;
            const target = seq[stepIndex];

            // Check if step timed out
            if (stepTimer >= STEP_DURATION) {
              phase = "clash_enemy";
              phaseTimer = 0;
              teancumHp = Math.max(0, teancumHp - 1);
              return {
                objective: objective(),
                prompt: "Too late! Morianton strikes!",
              };
            }

            // Identify any button press
            let pressed: DuelInputType | null = null;
            if (pressedAction) pressed = "action";
            else if (pressedJump) pressed = "jump";
            else if (pressedCrouch) pressed = "crouch";
            else if (pressedUp) pressed = "up";
            else if (pressedDown) pressed = "down";

            if (pressed !== null) {
              if (pressed === target) {
                stepIndex++;
                stepTimer = 0;
                if (stepIndex >= seq.length) {
                  phase = "clash_player";
                  phaseTimer = 0;
                  moriantonHp = Math.max(0, moriantonHp - 1);
                  return {
                    objective: objective(),
                    prompt: "Sequence Complete! Teancum strikes!",
                  };
                }
              } else {
                phase = "clash_enemy";
                phaseTimer = 0;
                teancumHp = Math.max(0, teancumHp - 1);
                return {
                  objective: objective(),
                  prompt: "Wrong move! Morianton strikes!",
                };
              }
            }

            const promptTokens = seq
              .map((token, i) => {
                if (i < stepIndex) return `✓ {${token}}`;
                if (i === stepIndex) return `▶ {${token}} ◀`;
                return `{${token}}`;
              })
              .join("  ");
            const rem = Math.max(0, STEP_DURATION - stepTimer).toFixed(1);

            return {
              objective: objective(),
              prompt: `Round ${round}/5 · Hit:  ${promptTokens}  (${rem}s)`,
            };
          }

          // -----------------------------------------------------------
          // PHASE: CLASH PLAYER (TEANCUM HITS MORIANTON)
          // -----------------------------------------------------------
          if (phase === "clash_player") {
            phaseTimer += dt;
            const t = phaseTimer;

            if (t < 0.7) {
              // Teancum lunges forward
              player.z = cz - 1.4 + (t / 0.7) * 1.0;
              player.move = "run";
              player.runSpeed = 6;
              player.yaw = 0;
              enemies[0].state.move = "turnSkid";
            } else if (t < 1.3) {
              // Slash impact knocks Morianton back
              player.move = "turnSkid";
              enemies[0].state.z = cz + 1.4 + ((t - 0.7) / 0.6) * 0.8;
              enemies[0].state.move = "crouch";
              enemies[0].state.yaw = Math.PI - 0.35;
            } else {
              // Return to ready stance
              const returnT = (t - 1.3) / 0.7;
              player.z = cz - 0.4 - returnT * 1.0;
              player.move = "idle";
              player.yaw = 0;
              enemies[0].state.z = cz + 2.2 - returnT * 0.8;
              enemies[0].state.move = "idle";
              enemies[0].state.yaw = Math.PI;
            }

            enemies[0].rig.update(dt, enemies[0].state);

            if (phaseTimer >= 2.0) {
              player.z = cz - 1.4;
              enemies[0].state.z = cz + 1.4;
              if (moriantonHp <= 0) {
                phase = "duel_win";
                phaseTimer = 0;
              } else {
                round = Math.min(DUEL_ROUNDS.length, round + 1);
                phase = "duel_prepare";
                phaseTimer = 0;
              }
            }

            return {
              objective: objective(),
              prompt: "Sequence Complete! Teancum strikes!",
            };
          }

          // -----------------------------------------------------------
          // PHASE: CLASH ENEMY (MORIANTON HITS TEANCUM)
          // -----------------------------------------------------------
          if (phase === "clash_enemy") {
            phaseTimer += dt;
            const t = phaseTimer;

            if (t < 0.7) {
              // Morianton lunges forward
              enemies[0].state.z = cz + 1.4 - (t / 0.7) * 1.0;
              enemies[0].state.move = "run";
              enemies[0].state.runSpeed = 6;
              player.move = "turnSkid";
            } else if (t < 1.3) {
              // Strike knocks Teancum back
              enemies[0].state.move = "turnSkid";
              player.z = cz - 1.4 - ((t - 0.7) / 0.6) * 0.8;
              player.move = "crouch";
              player.yaw = 0.35;
            } else {
              // Both return to stance
              const returnT = (t - 1.3) / 0.7;
              enemies[0].state.z = cz + 0.4 + returnT * 1.0;
              enemies[0].state.move = "idle";
              enemies[0].state.yaw = Math.PI;
              player.z = cz - 2.2 + returnT * 0.8;
              player.move = "idle";
              player.yaw = 0;
            }

            enemies[0].rig.update(dt, enemies[0].state);

            if (phaseTimer >= 2.0) {
              player.z = cz - 1.4;
              enemies[0].state.z = cz + 1.4;
              if (teancumHp <= 0) {
                phase = "duel_defeat";
                phaseTimer = 0;
              } else {
                phase = "duel_prepare";
                phaseTimer = 0;
              }
            }

            return {
              objective: objective(),
              prompt: "Morianton lands a strike! Stay on beat.",
            };
          }

          // -----------------------------------------------------------
          // PHASE: DUEL DEFEAT
          // -----------------------------------------------------------
          if (phase === "duel_defeat") {
            phaseTimer += dt;
            player.move = "crouch";
            player.crouching = true;
            enemies[0].state.move = "idle";
            enemies[0].rig.update(dt, enemies[0].state);

            if (phaseTimer >= 2.2) {
              player.crouching = false;
              player.move = "idle";
              teancumHp = 5;
              moriantonHp = 5;
              round = 1;
              phase = "duel_prepare";
              phaseTimer = 0;
              hooks.toast(
                "The duel restarts. Watch the sequence and hit each control on beat!",
              );
            }

            return {
              objective: objective(),
              prompt: "Teancum was wounded! Prepare to try again.",
            };
          }

          // -----------------------------------------------------------
          // PHASE: DUEL WIN & VICTORY DIALOG
          // -----------------------------------------------------------
          if (phase === "duel_win") {
            phaseTimer += dt;
            player.move = "idle";
            player.yaw = -Math.PI / 2;

            // Morianton collapses
            enemies[0].state.move = "crouch";
            enemies[0].rig.group.rotation.z = -Math.PI / 2;
            enemies[0].state.y = 0.2;
            enemies[0].rig.update(dt, enemies[0].state);

            if (phaseTimer >= 1.5 && !pending) {
              pending = true;
              hooks.dialog(
                "Alma 50:35–36",
                "Cut off their escape",
                "Teancum met Morianton by the narrow pass and slew him in single combat, heading his army. The people of Morianton covenanted to keep the peace and returned home in safety.",
                () => {
                  if (disposed) return;
                  pending = false;
                  ended = true;
                  phase = "done";
                  hooks.complete();
                },
                {
                  focus: { x: cx, y: 1.1, z: cz },
                  wide: 5,
                  actors: [
                    { group: enemies[0].rig.group },
                    ...patrol.map((s) => ({ group: s.rig.group })),
                  ],
                },
              );
            }

            return {
              objective: objective(),
              prompt: "Morianton is defeated! The pass is secured.",
            };
          }

          return { objective: objective(), prompt: "" };
        },

        dispose() {
          disposed = true;
          pending = false;
        },
      };
    },

    dispose() {
      disposed = true;
      moriantonSword.parent?.remove(moriantonSword);
      land.dispose();
    },
  };
}
