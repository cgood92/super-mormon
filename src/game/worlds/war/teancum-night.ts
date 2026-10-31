import * as T from "three";
import { createPlayer, type PlayerState } from "../../physics/physics";
import { spyCanSeePlayer } from "../../camera/spy-vision";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import { sceneryCanvasTent } from "../shared/scenery";
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

export function buildTeancumNight(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Teancum's night mission", true, {
    width: 110,
    depth: 370,
  });
  const { root, solids, solid, actor, tree } = land;
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
    [-32, -65],
    [24, -56],
    [-32, -24],
    [24, -12],
    [-32, 18],
    [24, 29],
    [-18, 67],
    [19, 72],
    [-18, 101],
    [19, 107],
  ])
    tent(x, z, 5, 7);
  for (const [x, z] of [
    [-17, -125],
    [16, -113],
    [-30, -96],
    [26, -82],
    [-30, -45],
    [28, -34],
    [-30, 0],
    [28, 14],
    [-29, 43],
    [28, 55],
    [-29, 86],
    [28, 123],
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
  const objectives = [
    "Meet your servant before leaving camp",
    "Cross the outer watch · use stone cover or the western grove",
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
    bounds: { minX: -42, maxX: 42, minZ: -180, maxZ: 150 },
    goal: { ...TEANCUM_ROUTE[4], radius: 3 },
    initialObjective: objectives[0],
    landmarks: [
      { name: "Nephite camp", ...TEANCUM_ROUTE[1] },
      { name: "Outer watch", ...TEANCUM_ROUTE[2] },
      { name: "Royal tent", ...TEANCUM_ROUTE[4] },
    ],
    adventure(hooks) {
      hooks.setAvatar("teancum");
      hooks.toast(
        "Move at night with your servant. Watch the sentries' turning heads; stone cover hides you.",
      );
      const reset = (player: PlayerState) => {
        detections++;
        stage = 0;
        pending = false;
        time = 0;
        servantX = TEANCUM_ROUTE[1].x;
        servantZ = TEANCUM_ROUTE[1].z;
        servant.update(0, { ...createPlayer(servantX, 0, servantZ), yaw: 0 });
        Object.assign(
          player,
          createPlayer(TEANCUM_ROUTE[0].x, 0, TEANCUM_ROUTE[0].z),
        );
        hooks.toast(
          "A sentry saw you. Return to your servant and try a different path.",
        );
      };
      return {
        snapshot: () => ({
          phase: phases[stage],
          time,
          detections,
          route: TEANCUM_ROUTE,
          sentries: sentries.map((s) => ({
            x: s.x,
            z: s.z,
            headYaw: s.base + Math.sin(time * 0.7 + s.phase) * 1.0,
          })),
        }),
        movementLocked: () => pending,
        update(dt, player, input) {
          dt = Math.max(0, Math.min(dt, 0.1));
          if (!pending && !finished) time += dt;
          if (stage >= 1 && stage <= 4 && !pending) {
            const dx = player.x - 1.2 - servantX;
            const dz = player.z - 1.8 - servantZ;
            const distance = Math.hypot(dx, dz);
            const stride = Math.min(distance, dt * 5.4);
            if (distance > 0.01) {
              servantX += (dx / distance) * stride;
              servantZ += (dz / distance) * stride;
            }
            servant.update(dt, {
              ...createPlayer(servantX, 0, servantZ),
              yaw: Math.atan2(dx, dz),
              vx: distance
                ? ((dx / distance) * stride) / Math.max(dt, 0.001)
                : 0,
              vz: distance
                ? ((dz / distance) * stride) / Math.max(dt, 0.001)
                : 0,
              runSpeed: stride / Math.max(dt, 0.001),
              move: distance > 0.2 ? "run" : "idle",
            });
          }
          for (const s of sentries) {
            const yaw = s.base + Math.sin(time * 0.7 + s.phase) * 1.0;
            s.rig.update(dt, {
              ...createPlayer(s.x, 0, s.z),
              yaw: s.base,
              lookYaw: yaw,
              lookPitch: 0,
            });
          }
          if (stage >= 1 && stage <= 3 && !pending) {
            for (const s of sentries) {
              // Player-facing visual gaze and sight-line share the same yaw; cover is physical.
              if (
                spyCanSeePlayer({
                  eye: { x: s.x, y: 1.48, z: s.z },
                  headYaw: s.base + Math.sin(time * 0.7 + s.phase) * 1.0,
                  headPitch: 0,
                  playerPosition: player,
                  playerHeight: player.crouching ? 0.9 : 1.65,
                  solids,
                  maxDistance: 20,
                  halfAngleRadians: Math.PI / 12,
                })
              ) {
                hooks.caught?.(() => reset(player));
                if (!hooks.caught) reset(player);
                return { objective: "A sentry spotted you", prompt: "" };
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
            stage === 3
              ? nearWarPoint(
                  player,
                  { x: king.group.position.x, y: 0, z: king.group.position.z },
                  4.5,
                ) &&
                Math.abs(player.x - royalTent.x) < royalTent.width / 2 - 0.4 &&
                Math.abs(player.z - royalTent.z) < royalTent.depth / 2 - 0.4
              : nearWarPoint(player, target, 3);
          const actionable = stage === 0 || stage === 3 || stage === 4;
          if (!pending && !finished && actionable && close && input.interact) {
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
              [
                "Alma 51:32–33",
                "After a hard day",
                "Teancum and his servant go out by night. The enemy camp has fallen asleep after the heat and labor of the day.",
              ],
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
                "Teancum enters privately and strikes Amalickiah with a javelin. The scene cuts away without a graphic view. He and his servant turn back toward their own camp.",
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
                stage === 0
                  ? [{ group: servant.group, gesture: "talk" }]
                  : stage === 3
                    ? [{ group: king.group }]
                    : stage === 4
                      ? [{ group: captain.group, gesture: "talk" }]
                      : [],
            });
          }
          return {
            objective: objectives[stage],
            prompt:
              actionable && close && !pending && !finished
                ? `{action} · ${stage === 3 ? "Use javelin · Amalickiah" : objectives[stage]}`
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
