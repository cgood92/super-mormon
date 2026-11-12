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
  { x: 0, y: 0, z: -52 },
  { x: 0, y: 0, z: -35 },
  { x: 0, y: 0, z: 52 },
];
export const MORIANTON_POST_HINTS: Point[] = [];

export type DuelInputType = "action" | "jump" | "crouch" | "up" | "down";

export const DUEL_ROUNDS: { name: string; sequence: DuelInputType[] }[] = [
  {
    name: "First Strike",
    sequence: ["action", "jump", "action", "jump", "action"],
  },
  {
    name: "High Parry",
    sequence: ["jump", "action", "crouch", "action", "jump"],
  },
  {
    name: "Flank & Thrust",
    sequence: ["action", "jump", "crouch", "action", "crouch", "jump"],
  },
  {
    name: "Low Sweep",
    sequence: ["crouch", "action", "jump", "crouch", "action", "jump"],
  },
  {
    name: "Final Clash",
    sequence: [
      "action",
      "jump",
      "crouch",
      "action",
      "jump",
      "crouch",
      "action",
    ],
  },
];

export const T_LEAD_IN = 1.8;
export const T_INTERVAL = 0.85;
export const HIT_WINDOW = 0.25;
export const ENEMY_WALK_SPEED = 2.0;

const GLYPH_LABELS: Record<DuelInputType, string> = {
  action: "B",
  jump: "A",
  crouch: "Z",
  up: "↑",
  down: "↓",
};

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

  // Visual clash spark effect
  const clashSpark = new T.Group();
  clashSpark.name = "Sword clash spark effect";
  const sparkMaterial = new T.MeshBasicMaterial({
    color: 0xffe070,
    transparent: true,
    opacity: 0,
  });
  const flashCore = new T.Mesh(new T.SphereGeometry(0.25, 8, 8), sparkMaterial);
  clashSpark.add(flashCore);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const ray = new T.Mesh(
      new T.BoxGeometry(0.035, 0.35, 0.035),
      sparkMaterial,
    );
    ray.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0);
    ray.rotation.z = angle + Math.PI / 2;
    clashSpark.add(ray);
  }
  markScenery(clashSpark, {
    kind: "decoration",
    reason: "Dynamic sword clash visual effect.",
  });
  root.add(clashSpark);

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
    { x: 0, z: -35 },
    { x: -2.2, z: -37.5 },
    { x: 2.2, z: -37.5 },
    { x: 0, z: -39.5 },
  ];
  const enemies = enemyStartOffsets.map((p, i) => ({
    rig: actor(
      i === 0 ? "morianton" : "morianton-follower",
      { ...p, y: 0 },
      i === 0 ? "Morianton · fleeing leader" : `Morianton follower ${i}`,
    ),
    state: createPlayer(p.x, 0, p.z),
    holdingSword: false,
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
    | "round_gate"
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
  let targetIndex = 0;
  let sequenceTimer = 0;
  let phaseTimer = 0;
  let cz = 0;
  const cx = 0;
  let cameraResetTimer = 0;

  // Track node hit/miss states for current round
  let targetsHit: boolean[] = [];

  // Edge triggers and keyboard listeners for duel
  let duelKeyPressedAction = false;
  let duelKeyPressedJump = false;
  let duelKeyPressedCrouch = false;

  const onDuelKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyB") duelKeyPressedAction = true;
    if (e.code === "KeyA") duelKeyPressedJump = true;
    if (
      e.code === "KeyZ" ||
      e.code === "ShiftLeft" ||
      e.code === "ShiftRight"
    ) {
      duelKeyPressedCrouch = true;
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", onDuelKeyDown);
  }

  const prevInputState = {
    interact: false,
    jump: false,
    crouch: false,
    up: false,
    down: false,
  };

  // DOM Rhythm Track Elements
  let trackContainer: HTMLElement | null = null;
  let trackHeader: HTMLElement | null = null;
  let trackLane: HTMLElement | null = null;
  let trackNeedle: HTMLElement | null = null;
  let trackFooter: HTMLElement | null = null;
  let nodeElements: HTMLElement[] = [];
  let defeatOverlay: HTMLElement | null = null;

  const ensureDefeatOverlay = () => {
    if (typeof document === "undefined" || defeatOverlay) return;
    const container = document.querySelector("#app") ?? document.body;
    if (!container) return;
    defeatOverlay = document.createElement("div");
    defeatOverlay.className = "duel-defeat-overlay";
    defeatOverlay.setAttribute("aria-hidden", "true");
    container.appendChild(defeatOverlay);
  };

  const removeDefeatOverlay = () => {
    defeatOverlay?.remove();
    defeatOverlay = null;
  };

  const removeDomUi = () => {
    trackContainer?.remove();
    trackContainer = null;
    trackHeader = null;
    trackLane = null;
    trackNeedle = null;
    trackFooter = null;
    nodeElements = [];
    moriantonSword.position.set(0, 0, 0);
    moriantonSword.rotation.set(Math.PI / 2, 0, 0);
  };

  const ensureDomTrack = (roundSeq: DuelInputType[]) => {
    if (typeof document === "undefined") return;
    const app = document.querySelector("#app");
    if (!app) return;

    if (!trackContainer) {
      trackContainer = document.createElement("div");
      trackContainer.id = "duel-rhythm-track";
      trackContainer.className = "duel-rhythm-track";

      trackHeader = document.createElement("div");
      trackHeader.className = "duel-track-header";
      trackContainer.appendChild(trackHeader);

      trackLane = document.createElement("div");
      trackLane.className = "duel-track-lane";

      const leadZone = document.createElement("div");
      leadZone.className = "duel-track-lead";
      trackLane.appendChild(leadZone);

      trackNeedle = document.createElement("div");
      trackNeedle.className = "duel-track-needle";
      trackLane.appendChild(trackNeedle);

      trackContainer.appendChild(trackLane);

      trackFooter = document.createElement("div");
      trackFooter.className = "duel-track-footer";
      trackContainer.appendChild(trackFooter);

      app.appendChild(trackContainer);
    }

    // Always rebuild nodes for the round sequence
    nodeElements.forEach((el) => el.remove());
    nodeElements = [];

    roundSeq.forEach((token, i) => {
      const node = document.createElement("div");
      let nodeClass = "duel-node-b";
      let label = "B";
      if (token === "jump") {
        nodeClass = "duel-node-a";
        label = "A";
      } else if (token === "crouch") {
        nodeClass = "duel-node-z";
        label = "Z";
      }
      node.className = `duel-node ${nodeClass}`;
      const pct = 22 + (i / Math.max(1, roundSeq.length - 1)) * 72;
      node.style.left = `${pct}%`;
      node.textContent = label;
      trackLane?.appendChild(node);
      nodeElements.push(node);
    });
  };

  const updateDomUi = (
    currentSeq: DuelInputType[],
    needlePct: number,
    activeIdx: number,
    hintHtml: string,
  ) => {
    if (typeof document === "undefined" || !trackContainer) return;

    if (trackHeader) {
      trackHeader.innerHTML = `<span>ROUND ${round} OF 5</span>`;
    }

    if (trackNeedle) {
      trackNeedle.style.left = `${needlePct}%`;
    }

    nodeElements.forEach((node, i) => {
      node.classList.remove(
        "duel-node-active",
        "duel-node-hit",
        "duel-node-miss",
      );
      if (targetsHit[i] && phase === "duel_sequence") {
        node.classList.add("duel-node-hit");
      } else if (i === activeIdx && phase === "duel_sequence") {
        node.classList.add("duel-node-active");
      }
    });

    if (trackFooter) {
      trackFooter.innerHTML = hintHtml;
    }
  };

  const resetChase = (player: PlayerState) => {
    attempts++;
    phase = "chase";
    teancumHp = 5;
    moriantonHp = 5;
    round = 1;
    targetIndex = 0;
    sequenceTimer = 0;
    phaseTimer = 0;
    cameraResetTimer = 0.4;
    sparkMaterial.opacity = 0;
    removeDomUi();
    removeDefeatOverlay();

    Object.assign(player, createPlayer(0, 0, -52));
    player.yaw = 0;
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
    cz = Math.min(36, Math.max(-30, meetingZ));
    phase = "round_gate";
    phaseTimer = 0;
    targetIndex = 0;
    sequenceTimer = 0;
    teancumHp = 5;
    moriantonHp = 5;
    round = 1;
    targetsHit = [];

    // Reset Morianton orientation and placement
    Object.assign(enemies[0].state, {
      x: cx,
      y: 0,
      z: cz + 1.4,
      vx: 0,
      vy: 0,
      vz: 0,
      runSpeed: 0,
      yaw: Math.PI - 0.22,
      grounded: true,
      move: "idle",
    });
    enemies[0].holdingSword = true;
    enemies[0].rig.group.rotation.z = 0;
    enemies[0].rig.update(0, {
      ...enemies[0].state,
      holdingSword: enemies[0].holdingSword,
    });

    // Position spectators along the east boundary (x = 4.2) clear of the camera view
    patrol.forEach((s, i) => {
      Object.assign(s.state, {
        x: 4.2,
        y: 0,
        z: cz - 3.2 + i * 0.9,
        vx: 0,
        vy: 0,
        vz: 0,
        runSpeed: 0,
        yaw: -Math.PI / 2,
        grounded: true,
        move: "idle",
      });
      s.rig.update(0, s.state);
    });

    for (let i = 1; i < enemies.length; i++) {
      Object.assign(enemies[i].state, {
        x: 4.2,
        y: 0,
        z: cz + 1.2 + (i - 1) * 1.2,
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
    spawn: { x: 0, y: 0, z: -52, yaw: 0 },
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
        if (phase === "duel_defeat") {
          return "Single combat · Teancum has fallen";
        }
        if (phase === "duel_win") {
          return "Single combat · Morianton defeated";
        }
        const teancumMisses = 5 - teancumHp;
        const moriantonMisses = 5 - moriantonHp;
        return `Teancum: ${teancumMisses}/5 misses   ·   Morianton: ${moriantonMisses}/5 misses`;
      };

      return {
        snapshot: () => ({
          phase,
          teancumHp,
          moriantonHp,
          round,
          targetIndex,
          sequenceTimer,
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
          phase === "round_gate" ||
          phase === "duel_sequence" ||
          phase === "clash_player" ||
          phase === "clash_enemy" ||
          phase === "duel_defeat" ||
          phase === "duel_win",

        camera: () => {
          if (cameraResetTimer > 0) {
            return {
              cut: true,
              position: { x: 0, y: 2.2, z: -57 },
              focus: { x: 0, y: 1.4, z: -45 },
            };
          }
          if (
            phase === "round_gate" ||
            phase === "duel_sequence" ||
            phase === "clash_player" ||
            phase === "clash_enemy" ||
            phase === "duel_defeat" ||
            phase === "duel_win"
          ) {
            return {
              cut: true,
              position: { x: cx - 4.2, y: 1.25, z: cz },
              focus: { x: cx, y: 0.95, z: cz },
            };
          }
          return undefined;
        },

        update(dt, player, input) {
          dt = Math.max(0, Math.min(dt, 0.1));
          if (disposed || ended) {
            removeDomUi();
            return { objective: objective(), prompt: "" };
          }

          if (cameraResetTimer > 0) {
            cameraResetTimer = Math.max(0, cameraResetTimer - dt);
          }

          // Read and edge-trigger input (supports both standard controls and A/B keys)
          const currentUp = input.y > 0.4;
          const currentDown = input.y < -0.4;
          const pressedAction =
            (!!input.interact && !prevInputState.interact) ||
            duelKeyPressedAction;
          const pressedJump =
            (!!input.jump && !prevInputState.jump) || duelKeyPressedJump;
          const pressedCrouch =
            (!!input.crouch && !prevInputState.crouch) || duelKeyPressedCrouch;
          const pressedUp = currentUp && !prevInputState.up;
          const pressedDown = currentDown && !prevInputState.down;

          duelKeyPressedAction = false;
          duelKeyPressedJump = false;
          duelKeyPressedCrouch = false;

          prevInputState.interact = !!input.interact;
          prevInputState.jump = !!input.jump;
          prevInputState.crouch = !!input.crouch;
          prevInputState.up = currentUp;
          prevInputState.down = currentDown;

          // -----------------------------------------------------------
          // PHASE: CHASE
          // -----------------------------------------------------------
          if (phase === "chase") {
            removeDomUi();
            sparkMaterial.opacity = 0;

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
              return { objective: objective(), prompt: "" };
            }

            // Check if Teancum has intercepted Morianton
            const dist = Math.hypot(
              player.x - enemies[0].state.x,
              player.z - enemies[0].state.z,
            );
            if (dist < 2.8) {
              startDuelAt(enemies[0].state.z);
            }

            return { objective: objective(), prompt: "" };
          }

          // Keep spectators updated during duel
          patrol.forEach((s) => s.rig.update(dt, s.state));
          for (let i = 1; i < enemies.length; i++) {
            enemies[i].rig.update(dt, enemies[i].state);
          }

          const currentRoundData = DUEL_ROUNDS[round - 1];
          const seq = currentRoundData.sequence;
          const numButtons = seq.length;

          // -----------------------------------------------------------
          // PHASE: ROUND GATE (EXPLAIN & DEMAND [A] CLICK TO START)
          // -----------------------------------------------------------
          if (phase === "round_gate") {
            targetsHit = Array(numButtons).fill(false);
            sparkMaterial.opacity = 0;
            player.x = cx;
            player.y = 0;
            player.z = cz - 1.4;
            player.yaw = -0.22;
            player.move = "idle";
            player.vx = 0;
            player.vz = 0;

            enemies[0].state.x = cx;
            enemies[0].state.y = 0;
            enemies[0].state.z = cz + 1.4;
            enemies[0].state.yaw = Math.PI - 0.22;
            enemies[0].state.move = "idle";
            enemies[0].holdingSword = true;
            enemies[0].rig.update(dt, {
              ...enemies[0].state,
              holdingSword: enemies[0].holdingSword,
            });

            ensureDomTrack(seq);
            updateDomUi(
              seq,
              0,
              0,
              'Press <span class="duel-inline-badge duel-inline-badge-a">A</span> to begin round',
            );

            if (pressedJump) {
              phase = "duel_sequence";
              sequenceTimer = 0;
              targetIndex = 0;
              targetsHit = Array(numButtons).fill(false);
            }

            const promptTokens = seq.map((t) => `{${t}}`).join("  ");
            return {
              objective: objective(),
              prompt: `Round ${round} of 5 · Strike on beat! [ ${promptTokens} ] · Press {jump} to begin`,
              holdingSword: true,
            };
          }

          // -----------------------------------------------------------
          // PHASE: DUEL SEQUENCE (GUITAR HERO STYLE TIMING TRACK)
          // -----------------------------------------------------------
          if (phase === "duel_sequence") {
            sequenceTimer += dt;
            player.x = cx;
            player.y = 0;
            player.z = cz - 1.4;
            player.yaw = -0.22;
            player.move = "idle";

            enemies[0].state.x = cx;
            enemies[0].state.y = 0;
            enemies[0].state.z = cz + 1.4;
            enemies[0].state.yaw = Math.PI - 0.22;
            enemies[0].state.move = "idle";
            enemies[0].holdingSword = true;
            enemies[0].rig.update(dt, {
              ...enemies[0].state,
              holdingSword: enemies[0].holdingSword,
            });

            // Compute needle percentage along lane (0% to 100%)
            // 0% to 22%: lead-in period (0 to T_LEAD_IN)
            // 22% to 94%: button track over (numButtons - 1) intervals
            const trackTotalTime = T_LEAD_IN + (numButtons - 1) * T_INTERVAL;
            let needlePct = 0;
            if (sequenceTimer <= T_LEAD_IN) {
              needlePct = (sequenceTimer / T_LEAD_IN) * 22;
            } else {
              const elapsedAfterLead = sequenceTimer - T_LEAD_IN;
              needlePct = Math.min(
                98,
                22 +
                  (elapsedAfterLead /
                    Math.max(0.1, (numButtons - 1) * T_INTERVAL)) *
                    72,
              );
            }

            // Identify pressed button
            let pressed: DuelInputType | null = null;
            if (pressedAction) pressed = "action";
            else if (pressedJump) pressed = "jump";
            else if (pressedCrouch) pressed = "crouch";
            else if (pressedUp) pressed = "up";
            else if (pressedDown) pressed = "down";

            // Active target timing
            const activeTargetTime = T_LEAD_IN + targetIndex * T_INTERVAL;
            const diff = sequenceTimer - activeTargetTime;

            // Check if player timed out on the current target
            if (diff > HIT_WINDOW) {
              // Missed by timing out
              phase = "clash_enemy";
              phaseTimer = 0;
              teancumHp = Math.max(0, teancumHp - 1);
              updateDomUi(
                seq,
                needlePct,
                targetIndex,
                "Missed! Morianton strikes!",
              );
              return {
                objective: objective(),
                prompt: "Too late! Morianton strikes!",
              };
            }

            // Check player press
            if (pressed !== null) {
              const expectedToken = seq[targetIndex];
              const inWindow = Math.abs(diff) <= HIT_WINDOW;

              if (inWindow && pressed === expectedToken) {
                // Near perfection hit!
                targetsHit[targetIndex] = true;
                targetIndex++;
                if (targetIndex >= numButtons) {
                  // Entire sequence completed successfully!
                  phase = "clash_player";
                  phaseTimer = 0;
                  moriantonHp = Math.max(0, moriantonHp - 1);
                  updateDomUi(seq, needlePct, targetIndex, "Teancum strikes!");
                  return {
                    objective: objective(),
                    prompt: "Sequence Complete! Teancum strikes!",
                  };
                }
              } else {
                // Wrong button or pressed outside the hit window
                phase = "clash_enemy";
                phaseTimer = 0;
                teancumHp = Math.max(0, teancumHp - 1);
                updateDomUi(
                  seq,
                  needlePct,
                  targetIndex,
                  "Missed! Morianton strikes!",
                );
                return {
                  objective: objective(),
                  prompt:
                    diff < -HIT_WINDOW
                      ? "Too early! Morianton strikes!"
                      : "Wrong move! Morianton strikes!",
                };
              }
            }

            let hintHtml = "";
            if (sequenceTimer < T_LEAD_IN) {
              hintHtml = "Get ready...";
            } else {
              const nextBadge =
                seq[targetIndex] === "jump"
                  ? '<span class="duel-inline-badge duel-inline-badge-a">A</span>'
                  : seq[targetIndex] === "crouch"
                    ? '<span class="duel-inline-badge duel-inline-badge-z">Z</span>'
                    : '<span class="duel-inline-badge duel-inline-badge-b">B</span>';
              hintHtml = `Strike ${nextBadge} now!`;
            }

            updateDomUi(seq, needlePct, targetIndex, hintHtml);

            const promptTokens = seq
              .map((token, i) => {
                if (targetsHit[i]) return `✓ {${token}}`;
                if (i === targetIndex) return `▶ {${token}} ◀`;
                return `{${token}}`;
              })
              .join("  ");

            return {
              objective: objective(),
              prompt: `Round ${round}/5 · [ ${promptTokens} ] · Strike on beat!`,
              holdingSword: true,
            };
          }

          // -----------------------------------------------------------
          // PHASE: CLASH PLAYER (TEANCUM HITS MORIANTON - REALISTIC CLOSE COMBAT)
          // -----------------------------------------------------------
          if (phase === "clash_player") {
            phaseTimer += dt;
            const t = phaseTimer;
            const isFatal = moriantonHp <= 0;
            let slashProg = 0;

            if (t < 0.45) {
              // Both step forward into sword contact range!
              const lunge = t / 0.45;
              player.z = cz - 1.4 + lunge * 0.95; // Reaches cz - 0.45
              player.move = "run";
              player.runSpeed = 4.5;
              player.yaw = 0;
              // Windup sword high above shoulder
              slashProg = (t / 0.45) * 0.35;

              enemies[0].state.z = cz + 1.4 - lunge * 0.95; // Reaches cz + 0.45
              enemies[0].state.move = "run";
              enemies[0].state.runSpeed = 4.5;
              enemies[0].holdingSword = true;
              enemies[0].state.yaw = Math.PI;

              if (t >= 0.35) {
                sparkMaterial.opacity = 0.95;
                clashSpark.position.set(cx, 1.05, cz);
                clashSpark.scale.setScalar(1 + (t - 0.35) * 4);
              }
            } else if (t < 1.15) {
              // Teancum cleaves downward and drives through decisively into heroic stance
              if (t < 0.72) {
                slashProg = 0.35 + ((t - 0.45) / 0.27) * 0.3; // Cleaving down-slash arc
              } else {
                slashProg = 0.65 + ((t - 0.72) / 0.43) * 0.35; // Follow-through heroic hold
              }
              player.z = cz - 0.45;
              player.move = "turnSkid";
              player.runSpeed = 0;
              player.yaw = -0.15;

              if (isFatal) {
                // 5th STRIKE: Morianton dies immediately on impact!
                const fall = Math.min(1, (t - 0.45) / 0.7);
                enemies[0].state.z =
                  cz + 0.45 + Math.sin(fall * (Math.PI / 2)) * 0.9;
                enemies[0].state.move = "crouch";
                enemies[0].holdingSword = false;
                enemies[0].rig.group.rotation.z = (-Math.PI / 2) * fall;
                enemies[0].state.y = 0.15 * fall;

                // Sword knocked away to the side
                moriantonSword.position.set(
                  0.35 * fall,
                  -0.6 * fall,
                  -0.25 * fall,
                );
                moriantonSword.rotation.set(
                  0,
                  (Math.PI / 3) * fall,
                  (Math.PI / 2) * fall,
                );
              } else {
                // Rounds 1-4: Morianton recoils backward in pain
                const recoil = (t - 0.45) / 0.7;
                enemies[0].state.z =
                  cz + 0.45 + Math.sin(recoil * (Math.PI / 2)) * 1.5;
                enemies[0].state.move = "crouch";
                enemies[0].holdingSword = false;
                enemies[0].state.yaw = Math.PI - 0.35;
              }

              sparkMaterial.opacity = Math.max(0, 0.95 - (t - 0.45) * 2.2);
            } else {
              if (isFatal) {
                // Morianton has fallen dead; Teancum holds heroic stance over him
                slashProg = 0.98;
                player.z = cz - 0.45;
                player.move = "turnSkid";
                player.yaw = -0.15;

                enemies[0].state.z = cz + 1.35;
                enemies[0].state.move = "crouch";
                enemies[0].holdingSword = false;
                enemies[0].rig.group.rotation.z = -Math.PI / 2;
                enemies[0].state.y = 0.15;
                sparkMaterial.opacity = 0;
              } else {
                // Both step back to ready stance with active footsteps
                const returnT = (t - 1.15) / 0.8;
                slashProg = Math.max(0, 1 - returnT * 1.8);
                player.z = cz - 0.45 - returnT * 0.95;
                player.move = "run";
                player.runSpeed = 2.4;
                player.yaw = -0.22;

                enemies[0].state.z = cz + 1.95 - returnT * 0.55;
                enemies[0].state.move = "run";
                enemies[0].state.runSpeed = 1.8;
                enemies[0].holdingSword = true;
                enemies[0].state.yaw = Math.PI - 0.22;
                sparkMaterial.opacity = 0;
              }
            }

            enemies[0].rig.update(dt, {
              ...enemies[0].state,
              holdingSword: enemies[0].holdingSword,
            });

            const finishTime = isFatal ? 1.55 : 1.95;
            if (phaseTimer >= finishTime) {
              sparkMaterial.opacity = 0;
              targetsHit = Array(numButtons).fill(false);
              if (isFatal) {
                phase = "duel_win";
                phaseTimer = 0;
              } else {
                player.z = cz - 1.4;
                player.move = "idle";
                player.runSpeed = 0;
                enemies[0].state.z = cz + 1.4;
                enemies[0].state.move = "idle";
                enemies[0].state.runSpeed = 0;
                enemies[0].holdingSword = true;
                round = Math.min(DUEL_ROUNDS.length, round + 1);
                phase = "round_gate";
                phaseTimer = 0;
              }
            }

            return {
              objective: objective(),
              prompt: isFatal
                ? "Teancum strikes down Morianton in single combat!"
                : "Sequence Complete! Teancum strikes!",
              holdingSword: true,
              swordSlash: slashProg,
            };
          }

          // -----------------------------------------------------------
          // PHASE: CLASH ENEMY (MORIANTON HITS TEANCUM - REALISTIC CLOSE COMBAT)
          // -----------------------------------------------------------
          if (phase === "clash_enemy") {
            phaseTimer += dt;
            const t = phaseTimer;

            if (t < 0.55) {
              // Morianton advances into strike contact range!
              const lunge = t / 0.55;
              enemies[0].state.z = cz + 1.4 - lunge * 0.95; // Reaches cz + 0.45
              enemies[0].state.move = "run";
              enemies[0].state.runSpeed = 4.5;
              enemies[0].holdingSword = true;
              enemies[0].state.yaw = Math.PI;

              player.z = cz - 1.4 + lunge * 0.95; // Reaches cz - 0.45
              player.move = "run";
              player.runSpeed = 4.5;
              player.yaw = 0;

              if (t >= 0.45) {
                sparkMaterial.opacity = 0.95;
                clashSpark.position.set(cx, 1.05, cz);
                clashSpark.scale.setScalar(1 + (t - 0.45) * 4);
              }
            } else if (t < 1.25) {
              // Morianton plants his feet firmly on strike impact
              enemies[0].state.z = cz + 0.45;
              enemies[0].state.move = "turnSkid";
              enemies[0].state.runSpeed = 0;
              enemies[0].holdingSword = true;
              enemies[0].state.yaw = Math.PI;

              // Teancum is struck and recoils backward
              const recoil = (t - 0.55) / 0.7;
              player.z = cz - 0.45 - Math.sin(recoil * (Math.PI / 2)) * 1.5;
              player.move = "crouch";
              player.runSpeed = 0;
              player.yaw = 0.35;

              sparkMaterial.opacity = Math.max(0, 0.95 - (t - 0.55) * 2.2);
            } else {
              // Both step back to ready stance with active footsteps (no sliding on ice!)
              const returnT = (t - 1.25) / 0.8;
              enemies[0].state.z = cz + 0.45 + returnT * 0.95;
              enemies[0].state.move = "run";
              enemies[0].state.runSpeed = 2.4;
              enemies[0].holdingSword = true;
              enemies[0].state.yaw = Math.PI - 0.22;

              player.z = cz - 1.95 + returnT * 0.55;
              player.move = "run";
              player.runSpeed = 1.8;
              player.yaw = -0.22;

              sparkMaterial.opacity = 0;
            }

            enemies[0].rig.update(dt, {
              ...enemies[0].state,
              holdingSword: enemies[0].holdingSword,
            });

            if (phaseTimer >= 2.05) {
              sparkMaterial.opacity = 0;
              player.z = cz - 1.4;
              player.move = "idle";
              player.runSpeed = 0;
              enemies[0].state.z = cz + 1.4;
              enemies[0].state.move = "idle";
              enemies[0].state.runSpeed = 0;
              enemies[0].holdingSword = true;
              targetsHit = Array(numButtons).fill(false);
              if (teancumHp <= 0) {
                phase = "duel_defeat";
                phaseTimer = 0;
              } else {
                phase = "round_gate";
                phaseTimer = 0;
              }
            }

            return {
              objective: objective(),
              prompt: "Morianton lands a strike! Stay on beat.",
              holdingSword: true,
            };
          }

          // -----------------------------------------------------------
          // PHASE: DUEL DEFEAT (DEMAND [A] TO RETRY)
          // -----------------------------------------------------------
          if (phase === "duel_defeat") {
            sparkMaterial.opacity = 0;
            removeDomUi();
            ensureDefeatOverlay();

            player.move = "crouch";
            player.crouching = true;
            enemies[0].state.move = "idle";
            enemies[0].holdingSword = true;
            enemies[0].rig.update(dt, {
              ...enemies[0].state,
              holdingSword: true,
            });

            // Demand [A] click to try again
            if (pressedJump) {
              removeDefeatOverlay();
              player.crouching = false;
              player.move = "idle";
              teancumHp = 5;
              moriantonHp = 5;
              round = 1;
              phase = "round_gate";
              phaseTimer = 0;
            }

            return {
              objective: objective(),
              prompt:
                "Teancum has fallen in single combat. Press {jump} to try again.",
            };
          }

          // -----------------------------------------------------------
          // PHASE: DUEL WIN & VICTORY DIALOG
          // -----------------------------------------------------------
          if (phase === "duel_win") {
            phaseTimer += dt;
            removeDomUi();
            removeDefeatOverlay();
            sparkMaterial.opacity = 0;

            player.move = "idle";
            player.yaw = -Math.PI / 2;

            // Morianton has fallen dead on the field
            enemies[0].state.move = "crouch";
            enemies[0].rig.group.rotation.z = -Math.PI / 2;
            enemies[0].state.y = 0.15;
            enemies[0].holdingSword = false;
            enemies[0].rig.update(dt, {
              ...enemies[0].state,
              holdingSword: false,
            });

            if (phaseTimer >= 0.5 && !pending) {
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
              holdingSword: true,
              swordSlash: 0.95,
            };
          }

          return { objective: objective(), prompt: "" };
        },

        dispose() {
          disposed = true;
          pending = false;
          removeDomUi();
          removeDefeatOverlay();
          if (typeof window !== "undefined") {
            window.removeEventListener("keydown", onDuelKeyDown);
          }
        },
      };
    },

    dispose() {
      disposed = true;
      removeDomUi();
      removeDefeatOverlay();
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", onDuelKeyDown);
      }
      moriantonSword.parent?.remove(moriantonSword);
      clashSpark.parent?.remove(clashSpark);
      land.dispose();
    },
  };
}
