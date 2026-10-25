import * as T from "three";
import { createPlayer, type PlayerState } from "./physics";
import { spyCanSeePlayer } from "./spy-vision";
import { warWorld, nearWarPoint } from "./war-world-kit";
import type { Point, WorldData } from "./worlds";

/** Alma 51:32–37. Patrol positions and pathfinding are an imagined night route. */
export const TEANCUM_ROUTE: Point[] = [
  { x: 0, y: 0, z: -55 },
  { x: -2, y: 0, z: -47 },
  { x: -12, y: 0, z: -26 },
  { x: -12, y: 0, z: 7 },
  { x: 0, y: 0, z: 27 },
  { x: 0, y: 0, z: -48 },
];

export function buildTeancumNight(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Teancum's night mission", true);
  const { root, solids, solid, decor, actor, tree } = land;
  // Tents have openings to the south. Their sides and poles are physical; the cloth is overhead decoration.
  const tent = (x: number, z: number, w: number, d: number, royal = false) => {
    for (const side of [-1, 1])
      solid(
        { x: x + (side * w) / 2, y: 0, z, w: 0.32, h: 2.7, d },
        royal ? 0x5a6172 : 0x5d6261,
        "Solid tent side",
      );
    solid(
      { x, y: 0, z: z + d / 2, w, h: 2.7, d: 0.32 },
      0x5e6470,
      "Solid tent rear",
    );
    decor(
      { x, y: 2.7, z, w: w + 0.7, h: 0.18, d: d + 0.7 },
      royal ? 0x837359 : 0x7b806e,
      "Tent cloth roof",
      "Raised cloth above the player's head; tent sides and rear own the physical enclosure.",
    );
  };
  tent(0, 32, 8, 9, true);
  for (const [x, z] of [
    [-18, -2],
    [17, 4],
    [-18, 23],
    [17, 28],
  ])
    tent(x, z, 5, 7);
  for (const [x, z] of [
    [-17, -39],
    [16, -35],
    [-18, -18],
    [18, -8],
    [-18, 12],
    [17, 46],
  ])
    tree(x, z);
  for (const [x, z, w, d] of [
    [-4, -17, 4, 3],
    [7, -4, 4, 3],
    [-2, 6, 3, 4],
    [9, 17, 4, 3],
  ])
    solid({ x, y: 0, z, w, d, h: 1.5 }, 0x4e5c59, "Solid night cover");
  const servant = actor("guard", TEANCUM_ROUTE[1], "Teancum's servant");
  const captain = actor(
    "guard",
    { x: 2, y: 0, z: -48, yaw: 0 },
    "Nephite guard captain",
  );
  const king = actor(
    "amalickiah",
    { x: 0, y: 0, z: 32, yaw: Math.PI },
    "Sleeping Amalickiah",
  );
  const sentries = [
    {
      x: 1,
      z: -15,
      base: 0,
      phase: 0,
      rig: actor("spy", { x: 1, y: 0, z: -15 }, "Outer sentry"),
    },
    {
      x: 7,
      z: 12,
      base: Math.PI * 0.7,
      phase: 2.1,
      rig: actor("spy", { x: 7, y: 0, z: 12 }, "Camp edge sentry"),
    },
  ];
  const sleepers = [
    actor("guard", { x: -5, y: 0, z: 26 }, "Sleeping camp guard one"),
    actor("guard", { x: 6, y: 0, z: 27 }, "Sleeping camp guard two"),
  ];
  sleepers.forEach((r) => {
    r.group.rotation.z = -0.9;
    r.group.position.y = 0.35;
  });
  const objectives = [
    "Meet your servant before leaving camp",
    "Cross the outer watch behind stone and trees",
    "Find a quiet route past the last sentry",
    "Enter Amalickiah's sleeping tent",
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
    bounds: { minX: -25, maxX: 25, minZ: -62, maxZ: 53 },
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
                  maxDistance: 18,
                })
              ) {
                hooks.caught?.(() => reset(player));
                if (!hooks.caught) reset(player);
                return { objective: "A sentry spotted you", prompt: "" };
              }
            }
          }
          const target = TEANCUM_ROUTE[Math.min(stage + 1, 5)];
          const close = nearWarPoint(player, target, stage === 3 ? 3.5 : 3);
          if (!pending && !finished && close && input.interact) {
            pending = true;
            const next = () => {
              pending = false;
              stage++;
              if (stage === 4) {
                king.group.visible = false;
                sleepers.forEach((r) => (r.group.visible = false));
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
              close && !pending && !finished
                ? `{action} · ${objectives[stage]}`
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
