import * as T from "three";
import {
  createPlayer,
  stepPlayer,
  type PlayerState,
} from "../../physics/physics";
import { spyCanSeePlayer } from "../../camera/spy-vision";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import {
  sceneryCanvasTent,
  sceneryTerraceUnion,
  markScenery,
} from "../shared/scenery";
import { planStoryCamera, StoryMeshObstacles } from "../../camera/cinematic";
import { material } from "../../rendering/art";
import type { Point, WorldData } from "../../runtime/worlds";

/** Alma 51:32–37. Patrol positions and pathfinding are an imagined night route. */
export const TEANCUM_ROUTE: Point[] = [
  { x: 0, y: 0, z: -165 },
  { x: -2, y: 0, z: -144 },
  { x: -22, y: 0, z: -78 },
  { x: -22, y: 0, z: 21 },
  { x: 0, y: 0, z: 96 },
  { x: 0, y: 0, z: -144 },
];

// One range and angle source for the visible danger cue and actual sight.
const SENTRY_RANGE = 20;
const SENTRY_HALF_ANGLE = Math.PI / 12;

export function buildTeancumNight(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Teancum's night mission", true, {
    width: 110,
    depth: 370,
  });
  const { root, solids, solid, actor, tree } = land;
  // Invented rocky pass: sheer inner faces close the flanking bypass, with
  // exposed upper terraces built from the same dimensions as their support.
  // One union mesh per side keeps repeated tiers cheap and removes hidden faces.
  for (const side of [-1, 1])
    sceneryTerraceUnion(
      root,
      solids,
      [
        { x: side * 39, y: 0, z: -125, w: 30, d: 110, h: 14, color: 0x465754 },
        { x: side * 39, y: 0, z: -25, w: 30, d: 90, h: 18, color: 0x4b5c59 },
        { x: side * 39, y: 0, z: 85, w: 30, d: 130, h: 15, color: 0x465754 },
        { x: side * 47, y: 0, z: -15, w: 16, d: 330, h: 23, color: 0x3c4b4c },
      ],
      `${side < 0 ? "Western" : "Eastern"} mountain boundary`,
    );

  // Pointed canvas shelters are a visual reconstruction, not a historical claim.
  const tent = (x: number, z: number, w: number, d: number, royal = false) => {
    const canvas = material(royal ? 0xb3a078 : 0x909887);
    canvas.side = T.DoubleSide;
    sceneryCanvasTent(
      root,
      solids,
      { canvas, wood: material(0x68553d) },
      {
        x,
        y: 0,
        z,
        width: w,
        depth: d,
        eaveHeight: 2.6,
        ridgeHeight: royal ? 6.4 : 5.1,
        doorWidth: royal ? 3.6 : 2.6,
      },
      royal ? "Amalickiah's royal canvas tent" : "Sleeping camp canvas tent",
    );
  };
  const royalTent = { x: 0, z: 96, width: 9, depth: 12 };
  tent(royalTent.x, royalTent.z, royalTent.width, royalTent.depth, true);
  for (const [x, z] of [
    [-15, -65],
    [15, -56],
    [-15, -24],
    [15, -12],
    [-15, 18],
    [15, 29],
    [-18, 67],
    [19, 72],
    [-18, 101],
    [19, 107],
  ])
    tent(x, z, 5, 7);
  for (const [x, z] of [
    [-17, -125],
    [16, -113],
    [-21, -96],
    [21, -82],
    [-21, -45],
    [21, -34],
    [-21, 0],
    [21, 14],
    [-21, 43],
    [21, 55],
    [-21, 86],
    [21, 123],
  ])
    tree(x, z);
  for (const [x, z, w, d] of [
    [-8, -106, 7, 3],
    [6, -84, 5, 3],
    [-8, -64, 6, 3],
    [6, -43, 5, 3],
    [-8, -22, 6, 3],
    [6, 0, 5, 3],
    [-8, 22, 6, 3],
    [6, 43, 5, 3],
    [-8, 64, 6, 3],
    [10, 83, 4, 3],
  ])
    solid({ x, y: 0, z, w, d, h: 1.5 }, 0x4e5c59, "Solid night cover");
  const servant = actor("guard", TEANCUM_ROUTE[1], "Teancum's servant");
  const captain = actor(
    "guard",
    { x: 2, y: 0, z: -144, yaw: 0 },
    "Nephite guard captain",
  );
  const king = actor(
    "amalickiah",
    { x: 0, y: 0, z: 98, yaw: 0 },
    "Sleeping Amalickiah",
  );
  // Rotate the whole resting model once, then fit its lowest visible surface to the bed.
  king.group.rotation.x = -Math.PI / 2;
  root.updateMatrixWorld(true);
  const restingBounds = new T.Box3().setFromObject(king.group);
  king.group.position.y += 0.2 - restingBounds.min.y;
  const bedSize = restingBounds.getSize(new T.Vector3());
  const bedCenter = restingBounds.getCenter(new T.Vector3());
  solid(
    {
      x: bedCenter.x,
      y: 0,
      z: bedCenter.z,
      w: bedSize.x + 0.3,
      h: 0.2,
      d: bedSize.z + 0.3,
    },
    0x746650,
    "King's sleeping mat",
  );
  // Opaque fitted screens create readable, physical hiding routes beside the
  // flank watch posts. Their single shared dimensions own rendering/collision.
  for (const x of [-20, 20])
    for (const z of [-95, 51])
      solid(
        { x, y: 0, z, w: 1.2, d: 24, h: 2 },
        0x4e5c59,
        "Flank watch stone screen",
      );
  const sentries = [
    {
      x: 1,
      z: -95,
      base: 0,
      phase: 0,
      rig: actor("spy", { x: 1, y: 0, z: -95 }, "Outer sentry"),
    },
    {
      x: 7,
      z: 75,
      base: Math.PI * 0.7,
      phase: 2.1,
      rig: actor("spy", { x: 7, y: 0, z: 75 }, "Camp edge sentry"),
    },
    ...[-59, -23, 15, 51].map((z, i) => ({
      x: i % 2 ? 3 : -1,
      z,
      base: i % 2 ? Math.PI * 0.65 : Math.PI * 0.3,
      phase: i * 1.7,
      rig: actor(
        "spy",
        { x: i % 2 ? 3 : -1, y: 0, z },
        `Watch line ${i + 2} sentry`,
      ),
    })),
  ];
  for (const side of [-1, 1]) {
    for (const [x, z] of [
      [14.5 * side, -95],
      [14.5 * side, 51],
      [18 * side, -23],
    ]) {
      const base = (side * Math.PI) / 2;
      sentries.push({
        x,
        z,
        base,
        phase: z === -23 ? 1.7 : 0.5,
        rig: actor(
          "spy",
          { x, y: 0, z, yaw: base },
          `${side < 0 ? "Western" : "Eastern"} flank sentry ${z}`,
        ),
      });
    }
  }
  for (const [x, z, base, phase, label] of [
    [-7, -41, -Math.PI * 0.45, 1.1, "Western pass southern sentry"],
    [-7, 32, -Math.PI * 0.55, 2.6, "Western pass northern sentry"],
    [-6, 81, Math.PI * 0.25, 0.9, "Royal tent approach sentry"],
  ] as const) {
    sentries.push({
      x,
      z,
      base,
      phase,
      rig: actor("spy", { x, y: 0, z, yaw: base }, label),
    });
  }
  const MAX_WEDGE_RAYS = 64;
  const WEDGE_SLICES = 20;
  const sightBlockers = solids
    .filter((solid) => solid.y <= 1.48 && solid.y + solid.h >= 1.62)
    .map((solid) => ({
      minX: solid.x - solid.w / 2,
      maxX: solid.x + solid.w / 2,
      minZ: solid.z - solid.d / 2,
      maxZ: solid.z + solid.d / 2,
    }));
  const sentryOccluders = sentries.map((s) =>
    sightBlockers.filter((box) => {
      const cx = Math.max(box.minX, Math.min(s.x, box.maxX));
      const cz = Math.max(box.minZ, Math.min(s.z, box.maxZ));
      return Math.hypot(cx - s.x, cz - s.z) <= SENTRY_RANGE + 0.5;
    }),
  );
  const castWedgeRay = (
    sx: number,
    sz: number,
    dirX: number,
    dirZ: number,
    occluders: typeof sightBlockers,
  ) => {
    let best = SENTRY_RANGE;
    for (const box of occluders) {
      let tEnter = 0;
      let tExit = best;
      if (Math.abs(dirX) < 1e-8) {
        if (sx < box.minX || sx > box.maxX) continue;
      } else {
        const a = (box.minX - sx) / dirX;
        const b = (box.maxX - sx) / dirX;
        tEnter = Math.max(tEnter, Math.min(a, b));
        tExit = Math.min(tExit, Math.max(a, b));
        if (tEnter > tExit) continue;
      }
      if (Math.abs(dirZ) < 1e-8) {
        if (sz < box.minZ || sz > box.maxZ) continue;
      } else {
        const a = (box.minZ - sz) / dirZ;
        const b = (box.maxZ - sz) / dirZ;
        tEnter = Math.max(tEnter, Math.min(a, b));
        tExit = Math.min(tExit, Math.max(a, b));
        if (tEnter > tExit) continue;
      }
      if (tExit > 0 && tEnter < best) best = tEnter;
    }
    return best;
  };
  const wedgeIndices: number[] = [];
  for (let i = 1; i < MAX_WEDGE_RAYS; i++) wedgeIndices.push(0, i, i + 1);
  const sightWedges = sentries.map((s) => {
    const geometry = new T.BufferGeometry();
    const positions = new Float32Array((MAX_WEDGE_RAYS + 1) * 3);
    geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
    geometry.setIndex(wedgeIndices);
    geometry.boundingSphere = new T.Sphere(
      new T.Vector3(0, 0, 0),
      SENTRY_RANGE + 0.5,
    );
    geometry.boundingBox = new T.Box3(
      new T.Vector3(-SENTRY_RANGE, -0.1, -SENTRY_RANGE),
      new T.Vector3(SENTRY_RANGE, 0.1, SENTRY_RANGE),
    );
    const wedge = new T.Mesh(
      geometry,
      new T.MeshBasicMaterial({
        color: 0xe9ae63,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    wedge.name = "Sentry sight direction cue";
    wedge.position.set(s.x, 0.035, s.z);
    markScenery(wedge, {
      kind: "decoration",
      reason:
        "Transparent full-range sentry sight cue; walls and cover clip sight within it.",
    });
    root.add(wedge);
    return wedge;
  });
  const updateSightWedge = (index: number, yaw: number) => {
    const s = sentries[index];
    const occluders = sentryOccluders[index];
    const wedge = sightWedges[index];
    const rawAngles: number[] = [];
    for (let i = 0; i <= WEDGE_SLICES; i++) {
      rawAngles.push(
        -SENTRY_HALF_ANGLE + (2 * SENTRY_HALF_ANGLE * i) / WEDGE_SLICES,
      );
    }
    for (const box of occluders) {
      for (const cx of [box.minX, box.maxX]) {
        for (const cz of [box.minZ, box.maxZ]) {
          const angle = Math.atan2(cx - s.x, cz - s.z);
          const diff = Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw));
          if (Math.abs(diff) < SENTRY_HALF_ANGLE) {
            rawAngles.push(
              Math.max(-SENTRY_HALF_ANGLE, diff - 1e-4),
              diff,
              Math.min(SENTRY_HALF_ANGLE, diff + 1e-4),
            );
          }
        }
      }
    }
    rawAngles.sort((a, b) => a - b);
    const angles: number[] = [];
    for (const a of rawAngles) {
      if (
        angles.length === 0 ||
        a - angles[angles.length - 1] > 1e-5 ||
        a === SENTRY_HALF_ANGLE
      ) {
        if (angles.length < MAX_WEDGE_RAYS) angles.push(a);
      }
    }
    const attr = wedge.geometry.getAttribute("position") as T.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < angles.length; i++) {
      const a = yaw + angles[i];
      const dirX = Math.sin(a);
      const dirZ = Math.cos(a);
      const dist = castWedgeRay(s.x, s.z, dirX, dirZ, occluders);
      const offset = (i + 1) * 3;
      arr[offset] = dirX * dist;
      arr[offset + 1] = 0;
      arr[offset + 2] = dirZ * dist;
    }
    attr.needsUpdate = true;
    wedge.geometry.setDrawRange(0, Math.max(0, (angles.length - 1) * 3));
  };
  const updateSentriesVisuals = (dt: number, currentTime: number) => {
    for (const [index, s] of sentries.entries()) {
      const yaw = s.base + Math.sin(currentTime * 0.7 + s.phase) * 1.0;
      updateSightWedge(index, yaw);
      s.rig.update(dt, {
        ...createPlayer(s.x, 0, s.z),
        yaw: s.base,
        lookYaw: yaw,
        lookPitch: 0,
      });
    }
  };
  updateSentriesVisuals(0, 0);
  const objectives = [
    "Enter the Lamanite camp with your servant. Keep both of you out of sight.",
    "Cross the outer watch · use stone screens and watch both flanks",
    "Pass the camp watch lines · the royal tent is to the north",
    "Enter the royal tent and approach sleeping Amalickiah",
    "Return to your camp and alert the guards",
    "Your army stands ready",
  ];
  const phases = [
    "servant",
    "outer-watch",
    "camp-edge",
    "tent",
    "return",
    "done",
  ] as const;
  let stage = 0,
    pending = false,
    finished = false,
    time = 0,
    detections = 0,
    servantX = TEANCUM_ROUTE[1].x,
    servantZ = TEANCUM_ROUTE[1].z;
  return {
    name: "Teancum's Night Mission",
    subtitle: "A silent return · Alma 51:32–37",
    spawn: { ...TEANCUM_ROUTE[0], yaw: 0 },
    solids,
    actorParent: root,
    bounds: { minX: -24, maxX: 24, minZ: -180, maxZ: 150 },
    goal: { ...TEANCUM_ROUTE[4], radius: 3 },
    initialObjective: objectives[0],
    landmarks: [
      { name: "Nephite camp", ...TEANCUM_ROUTE[1] },
      { name: "Outer watch", ...TEANCUM_ROUTE[2] },
      { name: "Royal tent", ...TEANCUM_ROUTE[4] },
    ],
    adventure(hooks) {
      hooks.setAvatar("teancum");
      let introTime = 0;
      let plannedBeat = -1,
        plannedAspect = 0;
      let cinematicCamera:
        { position: T.Vector3; focus: T.Vector3; cut: boolean } | undefined;
      const cameraObstacles = new StoryMeshObstacles(root, [
        { group: king.group },
        { group: servant.group },
        { group: captain.group },
        ...sentries.map((s) => ({ group: s.rig.group })),
      ]);
      let companion = createPlayer(servantX, 0, servantZ);
      let trail: Point[] = [];
      let lastTrail: Point = { ...TEANCUM_ROUTE[0] };
      let lastJumpTarget: Point | null = null;
      let companionStallTime = 0;
      const reset = (player: PlayerState) => {
        detections++;
        stage = 0;
        pending = false;
        time = 0;
        lastJumpTarget = null;
        companionStallTime = 0;
        servantX = TEANCUM_ROUTE[1].x;
        servantZ = TEANCUM_ROUTE[1].z;
        king.group.visible = true;
        companion = createPlayer(servantX, 0, servantZ);
        trail = [];
        lastTrail = { ...TEANCUM_ROUTE[0] };
        servant.update(0, { ...createPlayer(servantX, 0, servantZ), yaw: 0 });
        Object.assign(
          player,
          createPlayer(TEANCUM_ROUTE[0].x, 0, TEANCUM_ROUTE[0].z),
        );
        hooks.toast(
          "A sentry caught one of you. Both return safely to camp; try a different path.",
        );
      };
      return {
        snapshot: () => ({
          phase: introTime < 12 ? "intro" : phases[stage],
          movieBeat:
            introTime < 4
              ? "sleeping-king"
              : introTime < 8
                ? "teancum-plan"
                : introTime < 12
                  ? "watchful-guards"
                  : undefined,
          servant: { x: companion.x, y: companion.y, z: companion.z },
          time,
          detections,
          route: TEANCUM_ROUTE,
          sentries: sentries.map((s) => ({
            x: s.x,
            z: s.z,
            headYaw: s.base + Math.sin(time * 0.7 + s.phase) * 1.0,
          })),
        }),
        movementLocked: () => pending || introTime < 12,
        camera: () => cinematicCamera,
        update(dt, player, input) {
          dt = Math.max(0, Math.min(dt, 0.1));
          if (introTime < 12) {
            introTime = Math.min(12, introTime + dt);
            updateSentriesVisuals(dt, time);
            const beat = introTime < 4 ? 0 : introTime < 8 ? 1 : 2;
            const aspect = hooks.viewAspect?.() ?? 16 / 9;
            if (beat !== plannedBeat || aspect !== plannedAspect) {
              plannedBeat = beat;
              plannedAspect = aspect;
              if (beat === 0) {
                cinematicCamera = {
                  position: new T.Vector3(1.5, 1.9, 92.2),
                  focus: new T.Vector3(bedCenter.x, 0.45, bedCenter.z),
                  cut: true,
                };
              } else if (beat === 1) {
                const fx = Math.sin(player.yaw);
                const fz = Math.cos(player.yaw);
                const sx = Math.cos(player.yaw);
                const sz = -Math.sin(player.yaw);
                cinematicCamera = {
                  position: new T.Vector3(
                    player.x + fx * 3.6 + sx * 0.4,
                    player.y + 1.38,
                    player.z + fz * 3.6 + sz * 0.4,
                  ),
                  focus: new T.Vector3(player.x, player.y + 1.0, player.z),
                  cut: true,
                };
              } else {
                const anchor = sentries[0].rig.group;
                const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
                camera.position
                  .copy(anchor.position)
                  .add(new T.Vector3(5, 3.5, -7));
                camera.lookAt(anchor.position);
                const plan = planStoryCamera(
                  camera,
                  {
                    cutaway: true,
                    actors: [{ group: anchor }],
                    wide: 6.5,
                  },
                  solids,
                  cameraObstacles,
                );
                cinematicCamera = {
                  position: plan.wide,
                  focus: plan.focus,
                  cut: true,
                };
              }
            }
            if (introTime >= 12) cinematicCamera = undefined;
            return {
              objective:
                beat === 0
                  ? "Amalickiah is sleeping in his tent after a hard day of battle."
                  : beat === 1
                    ? "Teancum has a secret plan to kill Amalickiah in the dead of the night."
                    : "Avoid being seen by guards along the way.",
              prompt: "",
            };
          }
          if (!pending && !finished) time += dt;
          if (stage >= 1 && stage <= 4 && !pending) {
            // Follow the player's actual route, rather than cutting diagonally across tents.
            if (
              dt > 0 &&
              (Math.hypot(player.x - lastTrail.x, player.z - lastTrail.z) >=
                0.3 ||
                Math.abs(player.y - lastTrail.y) >= 0.25)
            ) {
              trail.push({ x: player.x, y: player.y, z: player.z });
              lastTrail = { x: player.x, y: player.y, z: player.z };
            }
            while (
              trail.length > 0 &&
              Math.hypot(trail[0].x - companion.x, trail[0].z - companion.z) <
                0.4 &&
              (Math.abs(trail[0].y - companion.y) < 0.65 ||
                !companion.grounded ||
                companion.y >= trail[0].y ||
                trail[0] === lastJumpTarget)
            )
              trail.shift();
            const target = trail[0];
            const dx = target ? target.x - companion.x : 0;
            const dz = target ? target.z - companion.z : 0;
            const distance = Math.hypot(dx, dz);
            const follow =
              trail.length > 0 ||
              Math.hypot(player.x - companion.x, player.z - companion.z) > 1.8;
            if (
              target &&
              target === lastJumpTarget &&
              target.y > companion.y + 0.25 &&
              companion.grounded &&
              distance > 0.35 &&
              companion.runSpeed < 0.6
            ) {
              companionStallTime += dt;
              if (companionStallTime > 0.3) {
                lastJumpTarget = null;
                companionStallTime = 0;
              }
            } else {
              companionStallTime = 0;
            }
            const shouldJump =
              !!target &&
              target !== lastJumpTarget &&
              target.y > companion.y + 0.25 &&
              companion.grounded;
            if (shouldJump) lastJumpTarget = target;
            const companionCrouch =
              shouldJump || !companion.grounded ? false : player.crouching;
            companion.crouching = companionCrouch;
            stepPlayer(
              companion,
              {
                x:
                  follow && distance > 0.15
                    ? (-dx / distance) * Math.min(1, distance / 0.7)
                    : 0,
                y:
                  follow && distance > 0.15
                    ? (dz / distance) * Math.min(1, distance / 0.7)
                    : 0,
                jump: shouldJump,
                jumpHeld:
                  !!target &&
                  (target.y > companion.y + 0.1 || !companion.grounded),
                crouch: companionCrouch,
                traversal: false,
              },
              dt,
              0,
              solids,
            );
            servantX = companion.x;
            servantZ = companion.z;
            servant.update(dt, companion);
          }
          updateSentriesVisuals(dt, time);
          if (stage >= 1 && stage <= 4 && !pending) {
            for (const s of sentries) {
              // Player-facing visual gaze and sight-line share the same yaw; cover is physical.
              const spotted = [player, companion].find((subject) =>
                spyCanSeePlayer({
                  eye: { x: s.x, y: 1.48, z: s.z },
                  headYaw: s.base + Math.sin(time * 0.7 + s.phase) * 1.0,
                  headPitch: 0,
                  playerPosition: subject,
                  playerHeight: subject.crouching ? 0.9 : 1.65,
                  solids,
                  maxDistance: SENTRY_RANGE,
                  halfAngleRadians: SENTRY_HALF_ANGLE,
                  // The ground cue describes the subject's position. Do not
                  // catch a shoulder protruding beyond its visible edge.
                  playerRadius: 0,
                }),
              );
              if (spotted) {
                pending = true;
                hooks.caught?.(() => reset(player));
                if (!hooks.caught) reset(player);
                return {
                  objective:
                    spotted === player
                      ? "A sentry spotted Teancum"
                      : "A sentry spotted your servant",
                  prompt: "",
                };
              }
            }
          }
          // Watch lines are navigation, never invisible interaction gates. Taking a
          // different path must still unlock the bedside action inside the tent.
          if (!pending && stage >= 1 && stage <= 2) {
            if (player.z >= 80) stage = 3;
            else if (player.z >= -78) stage = 2;
          }
          const target = TEANCUM_ROUTE[Math.min(stage + 1, 5)];
          const close =
            (stage !== 3 || nearWarPoint(companion, TEANCUM_ROUTE[4], 9)) &&
            (stage !== 4 || nearWarPoint(companion, TEANCUM_ROUTE[5], 4)) &&
            (stage === 3
              ? nearWarPoint(
                  player,
                  { x: king.group.position.x, y: 0, z: king.group.position.z },
                  4.5,
                ) &&
                Math.abs(player.x - royalTent.x) < royalTent.width / 2 - 0.4 &&
                Math.abs(player.z - royalTent.z) < royalTent.depth / 2 - 0.4
              : nearWarPoint(player, target, 3));
          const actionable = stage === 0 || stage === 3 || stage === 4;
          if (!pending && !finished && actionable && close && input.interact) {
            if (stage === 0) {
              stage = 1;
            } else {
              pending = true;
              const next = () => {
                pending = false;
                stage++;
                if (stage === 4) {
                  king.group.visible = false;
                }
                if (stage === 5) {
                  finished = true;
                  hooks.complete();
                }
              };
              const dialog = [
                [],
                [
                  "Alma 51:33",
                  "Past the outer watch",
                  "Use the stone and trees as cover. A few imagined sentries still scan the approach; the tents ahead are quiet.",
                ],
                [
                  "Alma 51:33",
                  "The camp sleeps",
                  "You and your servant reach the silent camp. Amalickiah's tent stands ahead; stay unseen.",
                ],
                [
                  "Alma 51:34–35",
                  "In the king's tent",
                  "Teancum enters privately and strikes Amalickiah with a javelin. He and his servant turn back toward their own camp.",
                ],
                [
                  "Alma 51:35–36",
                  "Stand in readiness",
                  "Teancum wakes his own men, tells them what happened to Amalickiah, and commands the guards to stand in readiness in case the Lamanites attack.",
                ],
              ][stage];
              hooks.dialog(dialog[0], dialog[1], dialog[2], next, {
                focus: { x: target.x, y: 1.1, z: target.z },
                wide: 5,
                playerGesture: stage === 4 ? "point" : "talk",
                actors:
                  stage === 3
                    ? [{ group: king.group }]
                    : stage === 4
                      ? [{ group: captain.group, gesture: "talk" }]
                      : [],
              });
            }
          }
          return {
            objective: objectives[stage],
            prompt:
              actionable && close && !pending && !finished
                ? `{action} · ${stage === 0 ? "Take servant with you" : stage === 3 ? "Use javelin · Amalickiah" : objectives[stage]}`
                : "",
          };
        },
        dispose() {
          finished = true;
        },
      };
    },
    dispose: land.dispose,
  };
}
