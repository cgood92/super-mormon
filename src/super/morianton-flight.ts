import * as T from "three";
import { createPlayer } from "./physics";
import { terracedRock } from "./scenery";
import { material } from "./art";
import { warWorld, nearWarPoint } from "./war-world-kit";
import type { Point, WorldData } from "./worlds";

/** Alma 50:25–36. Coast shape, scout positions, and the race are imagined staging. */
export const MORIANTON_ROUTE: Point[] = [
  { x: 0, y: 0, z: -57 },
  { x: 3, y: 0, z: -47 },
  { x: -10, y: 0, z: -29 },
  { x: -8, y: 0, z: 1 },
  { x: 0, y: 0, z: 28 },
  { x: 0, y: 0, z: 41 },
];

export function buildMoriantonFlight(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Narrow pass · Morianton's flight");
  const { root, solids, solid, actor, tree } = land;
  // Two waters bracket a genuinely narrow central route; their surfaces are below and outside play.
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
  // Raised but fitted stone shoulders offer a long west route and a short central gap.
  for (const [x, z, w, d, h] of [
    [3, -13, 4, 6, 1.2],
    [5, -3, 4, 7, 1.5],
    [4, 8, 5, 7, 1.2],
    [-14, 13, 3, 8, 0.55],
    [13, 36, 5, 6, 0.65],
  ])
    solid({ x, y: 0, z, w, d, h }, 0x9b8c73, "Solid pass outcrop");
  for (const [x, z] of [
    [-17, -48],
    [16, -39],
    [-17, -19],
    [15, -23],
    [-16, 34],
    [15, 52],
  ])
    tree(x, z);
  const maid = actor(
    "wife",
    MORIANTON_ROUTE[1],
    "Maidservant · escaped witness",
  );
  maid.group.scale.setScalar(0.94);
  const scout = actor("guard", MORIANTON_ROUTE[2], "Teancum's advance scout");
  const morianton = actor(
    "morianton",
    { x: -1, y: 0, z: -17, yaw: 0 },
    "Morianton · fleeing leader",
  );
  const followers = [
    actor("guard", { x: -4, y: 0, z: -22 }, "Morianton follower one"),
    actor("guard", { x: -7, y: 0, z: -25 }, "Morianton follower two"),
  ];
  const phases = [
    "warning",
    "scout",
    "pass",
    "intercept",
    "peace",
    "done",
  ] as const;
  const objectives = [
    "Hear the maidservant's warning",
    "Consult Teancum's scout beside the western ridge",
    "Race ahead through the two seas to hold the narrow pass",
    "Stop Morianton before the fleeing group reaches the north",
    "Help the followers pledge peace and return home",
    "The people of Morianton return in peace",
  ];
  let stage = 0,
    pending = false,
    ended = false,
    raceTime = 0,
    attempts = 0;
  const placeFollowers = () => {
    morianton.update(0, { ...createPlayer(-1, 0, -17), yaw: 0 });
    followers[0].update(0, { ...createPlayer(-4, 0, -22), yaw: 0 });
    followers[1].update(0, { ...createPlayer(-7, 0, -25), yaw: 0 });
  };
  return {
    name: "Morianton's Flight",
    subtitle: "Hold the narrow pass · Alma 50:25–36",
    spawn: { ...MORIANTON_ROUTE[0], yaw: 0 },
    solids,
    actorParent: root,
    bounds: { minX: -19, maxX: 19, minZ: -62, maxZ: 61 },
    goal: { ...MORIANTON_ROUTE[4], radius: 3 },
    initialObjective: objectives[0],
    landmarks: [
      { name: "Maidservant's warning", ...MORIANTON_ROUTE[1] },
      { name: "West ridge scout", ...MORIANTON_ROUTE[2] },
      { name: "Narrow pass", ...MORIANTON_ROUTE[3] },
      { name: "Return covenant", ...MORIANTON_ROUTE[5] },
    ],
    adventure(hooks) {
      hooks.setAvatar("teancum");
      hooks.toast(
        "The maidservant has warned Moroni. Lead Teancum to cut off Morianton at the narrow pass between two seas.",
      );
      const resetRace = (player: ReturnType<typeof createPlayer>) => {
        attempts++;
        raceTime = 0;
        stage = 1;
        pending = false;
        Object.assign(
          player,
          createPlayer(MORIANTON_ROUTE[2].x, 0, MORIANTON_ROUTE[2].z - 4),
        );
        placeFollowers();
        hooks.toast(
          "Morianton reached the northward route. Try a faster line through the pass.",
        );
      };
      return {
        snapshot: () => ({
          phase: phases[stage],
          raceTime,
          attempts,
          opponentZ: morianton.group.position.z,
          route: MORIANTON_ROUTE,
        }),
        movementLocked: () => pending,
        update(dt, player, input) {
          dt = Math.max(0, Math.min(dt, 0.1));
          if (stage >= 2 && stage <= 3 && !pending) {
            raceTime += dt;
            const z = Math.min(43, -17 + raceTime * 2.3);
            morianton.update(dt, {
              ...createPlayer(-1, 0, z),
              yaw: 0,
              vz: 2.3,
              runSpeed: 2.3,
              move: "run",
            });
            followers.forEach((rig, i) =>
              rig.update(dt, {
                ...createPlayer(i ? -7 : -4, 0, z - 5 - i * 3),
                yaw: 0,
                vz: 2.3,
                runSpeed: 2.3,
                move: "run",
              }),
            );
            if (raceTime > 27) {
              resetRace(player);
              return { objective: objectives[stage], prompt: "" };
            }
          }
          const target = MORIANTON_ROUTE[Math.min(stage + 1, 5)];
          const close = nearWarPoint(player, target, stage === 3 ? 4 : 3);
          if (!pending && !ended && close && input.interact) {
            pending = true;
            const proceed = () => {
              pending = false;
              stage++;
              if (stage === 2) raceTime = 0;
              if (stage === 4) {
                morianton.group.visible = false;
                followers.forEach((r) => (r.group.visible = true));
              }
              if (stage === 5) {
                ended = true;
                hooks.complete();
              }
            };
            const dialog = [
              [
                "Alma 50:30–33",
                "A warning believed",
                "Morianton hurt his maidservant. She escaped and told Moroni of his plan to seize the land northward. Moroni trusts her warning and sends Teancum ahead.",
              ],
              [
                "Alma 50:33–34",
                "Two seas, one pass",
                "The scout points out the narrow passage by the sea on the west and east. Choose a path around the rock shoulders and reach it before Morianton's group.",
              ],
              [
                "Alma 50:34",
                "Hold the passage",
                "You reach the pass first. Stand your ground as the fleeing company approaches; there is no reason to threaten the people traveling behind them.",
              ],
              [
                "Alma 50:35",
                "The flight ends",
                "Morianton's people refuse to turn back and battle begins. Teancum defeats Morianton. The decisive moment is shown without violence, and the surviving followers become prisoners.",
              ],
              [
                "Alma 50:36",
                "A covenant of peace",
                "The people of Morianton covenant to keep the peace. They return to their own land, and the dispute with Lehi's people ends in union.",
              ],
            ][stage];
            hooks.dialog(dialog[0], dialog[1], dialog[2], proceed, {
              focus: { x: target.x, y: 1.1, z: target.z },
              wide: 5,
              playerGesture: "talk",
              actors:
                stage === 0
                  ? [{ group: maid.group, gesture: "talk", speaker: true }]
                  : stage === 1
                    ? [{ group: scout.group, gesture: "point", speaker: true }]
                    : stage === 3
                      ? [{ group: morianton.group }]
                      : [],
            });
          }
          return {
            objective: objectives[stage],
            prompt:
              close && !pending && !ended
                ? `{action} · ${stage === 3 ? "Intercept Morianton" : objectives[stage]}`
                : "",
          };
        },
        dispose() {
          ended = true;
        },
      };
    },
    dispose: land.dispose,
  };
}
