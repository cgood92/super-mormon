import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { FollowCamera } from "./camera";
import {
  CameraTelemetry,
  updateActorCameraClearance,
} from "./camera-telemetry";
import { createPlayer, stepPlayer } from "../physics/physics";
import { buildTeancumNight } from "../worlds/war/teancum-night";
import { buildJerusalem } from "../worlds/jerusalem/jerusalem";

test("wall-hugger bot walks straight parallel to side walls without being steered into the wall", () => {
  for (const side of [-1, 1] as const) {
    // Long side wall at x = side * 2.2, player at x = 0 running north (+Z, yaw = 0)
    const wall = { x: side * 2.2, y: 0, z: 20, w: 1.0, h: 8, d: 80 };
    const player = createPlayer(0, 0, 0);
    player.yaw = 0;
    const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
    const follow = new FollowCamera(camera);
    follow.reset(player, 0, "night");
    const telemetry = new CameraTelemetry();

    for (let frame = 0; frame < 240; frame++) {
      const input = { x: 0, y: 1, jump: false, jumpHeld: false };
      stepPlayer(player, input, 1 / 60, follow.yaw, [wall]);
      follow.update(
        1 / 60,
        player,
        [wall],
        { orbitX: 0, orbitY: 0, recenter: false, movementIntent: true },
        "night",
      );
      telemetry.record({
        dt: 1 / 60,
        input,
        player,
        follow,
        solids: [wall],
      });
    }

    assert.deepEqual(
      telemetry.anomalies.map((a) => `${a.kind}: ${a.message}`),
      [],
      `side=${side} wall caused camera anomalies`,
    );
    assert.ok(
      Math.abs(player.x) < 0.05,
      `side=${side} wall steered straight-running player laterally to x=${player.x.toFixed(3)}`,
    );
    assert.ok(
      player.z > 20,
      `player must make full forward progress along wall: z=${player.z.toFixed(2)}`,
    );
  }
});

test("tent enter-and-exit bot walks into a tent and backs straight out without a 180-degree camera flip", () => {
  const scene = new T.Scene();
  const world = buildTeancumNight(scene);
  try {
    // Start south of the sleeping camp tent at (-15, -65) (door at z = -68.5)
    const player = createPlayer(-15, 0, -72);
    player.yaw = 0; // facing north (+Z) into the tent
    const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
    const follow = new FollowCamera(camera);
    follow.reset(player, 0, "night");
    const telemetry = new CameraTelemetry();

    // 1. Walk north into the tent (z from -72 to -64)
    for (let frame = 0; frame < 95; frame++) {
      const input = { x: 0, y: 1, jump: false, jumpHeld: false };
      stepPlayer(player, input, 1 / 60, follow.yaw, world.solids);
      follow.update(
        1 / 60,
        player,
        world.solids,
        { orbitX: 0, orbitY: 0, recenter: false, movementIntent: true },
        "night",
      );
      telemetry.record({
        dt: 1 / 60,
        input,
        player,
        follow,
        solids: world.solids,
      });
    }
    assert.ok(
      player.z > -66.5,
      `player must be inside the tent: z=${player.z.toFixed(2)}`,
    );

    // 2. Pause inside the tent (wife's stop-and-go pause)
    for (let frame = 0; frame < 40; frame++) {
      const input = { x: 0, y: 0, jump: false, jumpHeld: false };
      stepPlayer(player, input, 1 / 60, follow.yaw, world.solids);
      follow.update(
        1 / 60,
        player,
        world.solids,
        { orbitX: 0, orbitY: 0, recenter: false, movementIntent: false },
        "night",
      );
      telemetry.record({
        dt: 1 / 60,
        input,
        player,
        follow,
        solids: world.solids,
      });
    }

    // 3. Pull down on the stick (with realistic slight human thumb offset) to walk back out of the tent
    for (let frame = 0; frame < 140; frame++) {
      const input = { x: 0.08, y: -0.99, jump: false, jumpHeld: false };
      stepPlayer(player, input, 1 / 60, follow.yaw, world.solids);
      follow.update(
        1 / 60,
        player,
        world.solids,
        { orbitX: 0, orbitY: 0, recenter: false, movementIntent: true },
        "night",
      );
      telemetry.record({
        dt: 1 / 60,
        input,
        player,
        follow,
        solids: world.solids,
      });
    }

    assert.deepEqual(
      telemetry.anomalies.map((a) => `${a.kind}@f${a.frame}: ${a.message}`),
      [],
    );
    assert.ok(
      player.z < -70.0,
      `player must have walked cleanly back out of the tent door: z=${player.z.toFixed(2)}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("stop-and-go micro-nudger bot in Teancum avoids idle zoom-ins, cover snaps, and servant beard clipping", () => {
  const scene = new T.Scene();
  const world = buildTeancumNight(scene);
  try {
    const player = createPlayer(-2, 0, -140);
    player.yaw = 0;
    const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
    const follow = new FollowCamera(camera);
    follow.reset(player, 0, "night");
    const telemetry = new CameraTelemetry();

    const runtime = world.adventure!({
      avatar: new T.Group(),
      viewAspect: () => 16 / 9,
      dialog: (_k, _t, _b, next) => next(),
      toast: () => {},
      complete: () => {},
      caught: () => {},
      attachEquipment: () => {},
      setAvatar: () => {},
    });

    // Skip the 12s opening movie and trigger stage 0 dialog with servant so servant starts following
    runtime.update(12, player, {
      x: 0,
      y: 0,
      jump: false,
      jumpHeld: false,
      interact: false,
    });
    runtime.update(1 / 60, player, {
      x: 0,
      y: 0,
      jump: false,
      jumpHeld: false,
      interact: true,
    });

    const servantObj = scene.getObjectByName("Teancum's servant")!;
    assert.ok(servantObj, "Teancum's servant must exist in scene");

    // Simulate stop-and-go play: 25 frames of pushing the stick, 45 frames of stopping
    // while moving past cover stones and tents with the servant trailing behind
    const nudges = [
      { x: -0.25, y: 0.95 },
      { x: 0.2, y: 0.95 },
      { x: -0.35, y: 0.9 },
      { x: 0, y: 1.0 },
      { x: 0.3, y: 0.9 },
      { x: -0.15, y: 0.98 },
      { x: 0.4, y: 0.85 },
      { x: -0.4, y: 0.85 },
      { x: 0, y: -0.95 },
      { x: 0.15, y: 0.98 },
    ];

    for (const nudge of nudges) {
      for (let f = 0; f < 70; f++) {
        const active = f < 25;
        const input = {
          x: active ? nudge.x : 0,
          y: active ? nudge.y : 0,
          jump: false,
          jumpHeld: false,
          interact: false,
        };
        stepPlayer(player, input, 1 / 60, follow.yaw, world.solids);
        runtime.update(1 / 60, player, input);
        follow.update(
          1 / 60,
          player,
          world.solids,
          {
            orbitX: 0,
            orbitY: 0,
            recenter: false,
            movementIntent: active,
          },
          "night",
        );
        updateActorCameraClearance(camera.position, [servantObj], false);
        telemetry.record({
          dt: 1 / 60,
          input,
          player,
          follow,
          solids: world.solids,
          actors: [servantObj],
        });
        const servantDist = Math.hypot(
          servantObj.position.x - player.x,
          servantObj.position.z - player.z,
        );
        assert.ok(
          servantDist >= 1.4,
          `servant walked onto Teancum's heels (${servantDist.toFixed(2)}m) where his beard blocks the camera`,
        );
      }
    }

    assert.deepEqual(
      telemetry.anomalies.map((a) => `${a.kind}@f${a.frame}: ${a.message}`),
      [],
    );
  } finally {
    world.dispose?.();
  }
});

test("hiding behind Teancum's 1.5m stealth cover stones preserves a wide overview without collapsing the camera boom", () => {
  const scene = new T.Scene();
  const world = buildTeancumNight(scene);
  try {
    // Walk across and stand on the north side of the [-8, -106] cover stone (z = -103.5)
    // facing north (yaw = 0) so the 1.5m cover stone is directly between Teancum and the camera!
    const player = createPlayer(-8, 0, -103.5);
    player.yaw = 0;
    const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
    const follow = new FollowCamera(camera);
    follow.reset(player, 0, "night");
    const telemetry = new CameraTelemetry();

    for (let frame = 0; frame < 120; frame++) {
      const input = {
        x: frame < 60 ? 0.3 : -0.3,
        y: 0.2,
        jump: false,
        jumpHeld: false,
        crouch: frame > 30 && frame < 90,
      };
      stepPlayer(player, input, 1 / 60, follow.yaw, world.solids);
      follow.update(
        1 / 60,
        player,
        world.solids,
        { orbitX: 0, orbitY: 0, recenter: false, movementIntent: true },
        "night",
      );
      telemetry.record({
        dt: 1 / 60,
        input,
        player,
        follow,
        solids: world.solids,
      });
      const dist = Math.hypot(
        camera.position.x - player.x,
        camera.position.z - player.z,
      );
      assert.ok(
        dist > 3.8,
        `camera boom collapsed to ${dist.toFixed(2)}m behind 1.5m stealth cover at frame ${frame}`,
      );
    }

    assert.deepEqual(
      telemetry.anomalies.map((a) => `${a.kind}@f${a.frame}: ${a.message}`),
      [],
    );
  } finally {
    world.dispose?.();
  }
});

test("running and diagonal jumps in Conference Center and Teancum descend and land without mid-air camera stall or landing bounce", async () => {
  const { prepareWorld } = await import("../runtime/world-loading");
  const { cameraModeForWorld } = await import("../runtime/scene-entry");
  const { createMotionDriver } = await import("../characters/character-motion");

  for (const id of ["hub", "teancum"] as const) {
    const scene = new T.Scene();
    const prep = await prepareWorld(id);
    const world = prep.buildWorld(id, scene);
    try {
      const mode = cameraModeForWorld(id);
      for (const fps of [60, 30] as const) {
        for (const sideX of [0, 0.35, -0.35] as const) {
          const dt = 1 / fps;
          const player = createPlayer(
            world.spawn.x,
            world.spawn.y,
            world.spawn.z,
          );
          player.yaw = world.spawn.yaw ?? 0;
          const camera = new T.PerspectiveCamera(58, 9 / 16, 0.08, 200);
          const follow = new FollowCamera(camera);
          follow.reset(player, player.yaw, mode);
          const motion = createMotionDriver("elder");
          const telemetry = new CameraTelemetry();

          let prevEy = camera.position.y;
          let prevDEy = 0;
          let prevNdcY = 0;
          let wasAirborne = false;
          let postLandFrames = 0;

          const totalFrames = Math.round(1.5 * fps);
          const jumpFrame = Math.round(0.32 * fps);
          const jumpHoldEnd = Math.round(0.52 * fps);

          for (let f = 1; f <= totalFrames; f++) {
            const jump = f === jumpFrame;
            const jumpHeld = f >= jumpFrame && f <= jumpHoldEnd;
            const input = { x: sideX, y: 0.9, jump, jumpHeld };
            stepPlayer(
              player,
              input,
              dt,
              follow.yaw,
              world.solids,
              world.climbables,
              world.water,
            );
            motion.update(dt, player);
            follow.update(
              dt,
              player,
              world.solids,
              { orbitX: 0, orbitY: 0, recenter: false, movementIntent: true },
              mode,
            );
            telemetry.record({
              dt,
              input,
              player,
              follow,
              solids: world.solids,
            });

            camera.updateMatrixWorld(true);
            motion.group.updateMatrixWorld(true);
            const body = motion.group.getObjectByName("body")!;
            const bw = new T.Vector3();
            body.getWorldPosition(bw);
            const ndc = bw.project(camera);

            const dEy = camera.position.y - prevEy;
            const ddEy = Math.abs(dEy - prevDEy);
            const dNdcY = ndc.y - prevNdcY;

            // During lower half of airborne descent (0.18m <= player.y <= 1.25m, vy < -2),
            // camera vertical acceleration must not kink and screen-space descent must not stall.
            if (
              !player.grounded &&
              player.vy < -2 &&
              player.y >= 0.18 &&
              player.y <= 1.25
            ) {
              assert.ok(
                ddEy < 0.025 * (60 / fps),
                `${id} (${fps}fps, side=${sideX}) mid-air camera vertical velocity kink at f=${f}: ddEy=${ddEy.toFixed(4)}`,
              );
              assert.ok(
                dNdcY < -0.004 * (60 / fps),
                `${id} (${fps}fps, side=${sideX}) character screen-space descent stalled in mid-air at f=${f} (y=${player.y.toFixed(2)}): dNdcY=${dNdcY.toFixed(4)}`,
              );
            }

            if (!player.grounded) {
              wasAirborne = true;
            } else if (wasAirborne && postLandFrames < 8) {
              postLandFrames++;
              assert.ok(
                dNdcY < 0.022 * (60 / fps),
                `${id} (${fps}fps, side=${sideX}) post-landing upward screen bounce at f=${f}: dNdcY=${dNdcY.toFixed(4)}`,
              );
            }

            prevEy = camera.position.y;
            prevDEy = dEy;
            prevNdcY = ndc.y;
          }

          assert.deepEqual(
            telemetry.anomalies.map(
              (a) => `${a.kind}@f${a.frame}: ${a.message}`,
            ),
            [],
            `${id} (${fps}fps, side=${sideX}) jump produced camera telemetry anomalies`,
          );
          motion.dispose();
        }
      }
    } finally {
      world.dispose?.();
    }
  }
});

test("single, double, and triple jump sequences keep full character framed cleanly on desktop and mobile", () => {
  const floor = { x: 0, y: -0.5, z: 0, w: 200, h: 0.5, d: 200 };
  for (const mode of ["conference", "hub", "night", "streets"] as const) {
    for (const aspect of [16 / 9, 9 / 16] as const) {
      for (const closeZoom of [false, true] as const) {
        const player = createPlayer(0, 0, 0);
        const camera = new T.PerspectiveCamera(58, aspect, 0.08, 200);
        const follow = new FollowCamera(camera);
        follow.reset(player, 0, mode);
        const telemetry = new CameraTelemetry();

        if (closeZoom) {
          for (let i = 0; i < 12; i++) {
            follow.update(
              1 / 60,
              player,
              [floor],
              { orbitX: 0, orbitY: 0, recenter: false, zoom: i === 0 ? -1 : 0 },
              mode,
            );
          }
          telemetry.reset();
        }

        const stagesSeen = new Set<number>();
        let maxStage = 0;
        let maxHeadNdcY = -Infinity;
        let minFootNdcY = Infinity;

        for (let f = 1; f <= 280; f++) {
          const triggerJump =
            f === 20 || (player.grounded && f > 25 && maxStage < 3);
          if (triggerJump) maxStage++;
          const input = {
            x: 0.25,
            y: 0.9,
            jump: triggerJump,
            jumpHeld: triggerJump || !player.grounded,
          };
          stepPlayer(player, input, 1 / 60, follow.yaw, [floor]);
          follow.update(
            1 / 60,
            player,
            [floor],
            { orbitX: 0, orbitY: 0, recenter: false, movementIntent: true },
            mode,
          );
          telemetry.record({
            dt: 1 / 60,
            input,
            player,
            follow,
            solids: [floor],
          });
          if (player.jumpStage > 0) stagesSeen.add(player.jumpStage);

          camera.updateMatrixWorld(true);
          const footNdc = new T.Vector3(player.x, player.y, player.z).project(
            camera,
          );
          const headNdc = new T.Vector3(
            player.x,
            player.y + 1.65,
            player.z,
          ).project(camera);
          maxHeadNdcY = Math.max(maxHeadNdcY, headNdc.y);
          minFootNdcY = Math.min(minFootNdcY, footNdc.y);
        }

        assert.ok(
          stagesSeen.has(1) && stagesSeen.has(2) && stagesSeen.has(3),
          `${mode} did not exercise full 1-2-3 jump sequence`,
        );
        const limit = closeZoom ? 0.93 : 0.78;
        assert.ok(
          maxHeadNdcY <= limit && minFootNdcY >= -limit,
          `${mode} (aspect=${aspect.toFixed(2)}, closeZoom=${closeZoom}) went near/out of viewport on multi-jump: headNdcY=${maxHeadNdcY.toFixed(3)}, footNdcY=${minFootNdcY.toFixed(3)}`,
        );
        assert.deepEqual(
          telemetry.anomalies.map((a) => `${a.kind}@f${a.frame}: ${a.message}`),
          [],
          `${mode} multi-jump produced telemetry anomalies`,
        );
      }
    }
  }
});

test("multi-persona exploration bots traverse all 32 distinct worlds without camera jerks, flips, or wall-pinning", async () => {
  const { prepareWorld } = await import("../runtime/world-loading");
  const { cameraModeForWorld } = await import("../runtime/scene-entry");
  const { selectCameraRoom } = await import("./camera-rooms");
  const { collectCharacterActors } = await import("./camera-telemetry");

  const worldIds = [
    "hub",
    "missionary",
    "streets",
    "palace",
    "house",
    "tree",
    "broken-bow",
    "bountiful",
    "voyage",
    "promised",
    "vineyard",
    "jacob",
    "waters",
    "ammon",
    "title-liberty",
    "lehonti",
    "morianton",
    "teancum",
    "gid",
    "nephihah",
    "samuel",
    "signs",
    "gathering",
    "christ-bountiful",
    "peace-city",
    "mormon-records",
    "moroni-farewell",
    "jared-expedition",
    "jared-barges",
    "shelem-stones",
    "jared-crossing",
    "ether-refuge",
  ] as const;

  const segments = [
    { x: 0, y: 1, frames: 65, jumpAt: 10 },
    { x: 0, y: 0, frames: 25 },
    { x: -0.45, y: 0.85, frames: 55, jumpAt: 5 },
    { x: 0, y: 0, frames: 20 },
    { x: 0, y: 1, frames: 55 },
    { x: 0, y: 0, frames: 25 },
    { x: 0, y: 0.55, frames: 18 },
    { x: 0, y: 0, frames: 25 },
    { x: 0, y: -1, frames: 50 },
  ];

  const allFailures: string[] = [];

  for (const id of worldIds) {
    const scene = new T.Scene();
    const prep = await prepareWorld(id);
    const world = prep.buildWorld(id, scene);
    try {
      const mode = cameraModeForWorld(id);
      const actors = collectCharacterActors(scene);
      const starts = [
        {
          label: "spawn",
          x: world.spawn.x,
          y: world.spawn.y,
          z: world.spawn.z,
          yaw: world.spawn.yaw ?? 0,
        },
      ];
      if (world.goal) {
        starts.push({
          label: "goal",
          x: world.goal.x,
          y: world.goal.y,
          z: world.goal.z,
          yaw: 0,
        });
      }
      for (const lm of (world.landmarks ?? []).slice(0, 3)) {
        starts.push({
          label: `lm:${lm.name}`,
          x: lm.x,
          y: lm.y,
          z: lm.z,
          yaw: 0,
        });
      }
      for (const rm of (world.cameraRooms ?? []).slice(0, 2)) {
        const cx = (rm.bounds.minX + rm.bounds.maxX) / 2;
        const cz = (rm.bounds.minZ + rm.bounds.maxZ) / 2;
        const cy = rm.bounds.minY ?? world.spawn.y;
        starts.push({
          label: `room:${rm.id}`,
          x: cx,
          y: cy,
          z: cz,
          yaw: rm.yaw ?? 0,
        });
      }

      for (const st of starts) {
        const player = createPlayer(st.x, st.y, st.z);
        player.yaw = st.yaw;
        const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
        const follow = new FollowCamera(camera);
        follow.reset(player, player.yaw, mode);
        const telemetry = new CameraTelemetry();

        // Settle start point for 18 frames before recording
        for (let i = 0; i < 18; i++) {
          stepPlayer(
            player,
            { x: 0, y: 0, jump: false, jumpHeld: false },
            1 / 60,
            follow.yaw,
            world.solids,
            world.climbables,
            world.water,
          );
          const room = selectCameraRoom(
            world.cameraRooms ?? [],
            player,
            follow.roomId,
          );
          follow.update(
            1 / 60,
            st.label !== "spawn" ? { ...player, runSpeed: 0.2 } : player,
            world.solids,
            {
              orbitX: 0,
              orbitY: 0,
              recenter: false,
              movementIntent: st.label !== "spawn",
            },
            mode,
            room,
          );
          updateActorCameraClearance(camera.position, actors, false);
        }
        telemetry.reset();

        for (const seg of segments) {
          for (let i = 0; i < seg.frames; i++) {
            const jumpAt = "jumpAt" in seg ? seg.jumpAt : undefined;
            const input = {
              x: seg.x,
              y: seg.y,
              jump: jumpAt !== undefined && i === jumpAt,
              jumpHeld: jumpAt !== undefined && i >= jumpAt && i <= jumpAt + 12,
            };
            const prevRoom = follow.roomId;
            const prevPos = { x: player.x, y: player.y, z: player.z };
            stepPlayer(
              player,
              input,
              1 / 60,
              follow.yaw,
              world.solids,
              world.climbables,
              world.water,
            );
            const playerTeleported =
              Math.hypot(player.x - prevPos.x, player.z - prevPos.z) > 1.5 ||
              Math.abs(player.y - prevPos.y) > 1.5;
            const room = selectCameraRoom(
              world.cameraRooms ?? [],
              player,
              follow.roomId,
            );
            follow.update(
              1 / 60,
              player,
              world.solids,
              {
                orbitX: 0,
                orbitY: 0,
                recenter: false,
                movementIntent: Math.hypot(seg.x, seg.y) > 0.05,
              },
              mode,
              room,
            );
            updateActorCameraClearance(camera.position, actors, false);
            telemetry.record({
              dt: 1 / 60,
              input,
              player,
              follow,
              solids: world.solids,
              actors,
              cut: prevRoom !== follow.roomId || playerTeleported,
            });
          }
        }

        for (const a of telemetry.anomalies) {
          allFailures.push(
            `${id}[${st.label}] ${a.kind}@f${a.frame}: ${a.message}`,
          );
        }
      }
    } finally {
      world.dispose?.();
    }
  }

  assert.deepEqual(allFailures, []);
});
