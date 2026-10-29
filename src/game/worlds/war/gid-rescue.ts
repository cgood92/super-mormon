import * as T from "three";
import { createPlayer } from "../../physics/physics";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import type { Point, WorldData } from "../../runtime/worlds";

/** Alma 55:4–24. The supply caches, throw points, and wall plan are interpretive. */
export const GID_ROUTE: Point[] = [
  { x: 0, y: 0, z: -55 },
  { x: -5, y: 0, z: -44 },
  { x: 0, y: 0, z: -16 },
  { x: -5, y: 0, z: -44 },
  { x: -13, y: 0, z: -30 },
  { x: -8, y: 0, z: 16 },
  { x: -13, y: 0, z: -30 },
  { x: 8, y: 0, z: 16 },
  { x: 20, y: 0, z: 34 },
  { x: 0, y: 0, z: 16 },
  { x: 0, y: 0, z: 36 },
];

export function buildGidRescue(scene: T.Scene): WorldData {
  const land = warWorld(scene, "The rescue at Gid", true);
  const { root, solids, solid, decor, actor, tree } = land;
  // The shut gate and wall are fully solid until the captains surrender.
  for (const [x, z, w, d] of [
    [-9.875, 21, 15.25, 1],
    [9.875, 21, 15.25, 1],
    [-17.5, 35, 1, 28],
    [17.5, 35, 1, 28],
    [0, 49, 35, 1],
  ])
    solid({ x, y: 0, z, w, d, h: 4.7 }, 0x958979, "Gid city wall");
  const gate = solid(
    { x: 0, y: 0, z: 21, w: 4.5, d: 1, h: 4.7 },
    0x654d3c,
    "Gid timber gate",
  );
  const gateSolid = solids[solids.length - 1];
  for (const [x, z, w, d, h] of [
    [-17.5, 20.5, 2, 2, 5.2],
    [17.5, 20.5, 2, 2, 5.2],
    [-17.5, 49, 2, 2, 5.2],
    [17.5, 49, 2, 2, 5.2],
  ])
    solid({ x, y: 0, z, w, d, h }, 0x827565, "Solid wall tower");
  for (const [x, z] of [
    [-21, -38],
    [21, -36],
    [-22, -4],
    [23, 7],
    [-24, 42],
    [23, 53],
  ])
    tree(x, z);
  for (const [x, z, w, d] of [
    [-5, -5, 3, 2],
    [7, 2, 4, 2],
    [-2, 7, 3, 3],
  ])
    solid({ x, y: 0, z, w, d, h: 1.4 }, 0x6a665c, "Solid approach cover");
  // Modest inner buildings leave a central lane to the prisoner families.
  for (const x of [-11, 11]) {
    solid(
      { x, y: 0, z: 42, w: 6, d: 5, h: 3 },
      0xa99b80,
      "Solid Gid inner house",
    );
    decor(
      { x, y: 3, z: 42, w: 6.6, d: 5.6, h: 0.2 },
      0x76614e,
      "Gid house roof cap",
      "Raised cap rests above the solid building; the building owns its support.",
    );
  }
  const wine = decor(
    { x: 1.8, y: 0, z: -17, w: 0.8, h: 1.0, d: 0.8 },
    0x684a31,
    "Wine jar",
    "Portable jar placed beside the guard; its small base does not block the path.",
  );
  const cache = decor(
    { x: -13, y: 0, z: -31.5, w: 2.5, h: 0.55, d: 1.1 },
    0x6a523b,
    "Weapon supply cache",
    "Low supply bundle outside the walking line; interaction handles carrying.",
  );
  const thrown = [
    decor(
      { x: -8, y: 0.4, z: 31, w: 1.8, h: 0.25, d: 0.5 },
      0xb6a37c,
      "Arms for west prisoners",
      "Narrative weapon bundle inside the wall; prisoners receive it after a throw.",
    ),
    decor(
      { x: 8, y: 0.4, z: 31, w: 1.8, h: 0.25, d: 0.5 },
      0xb6a37c,
      "Arms for east prisoners",
      "Narrative weapon bundle inside the wall; prisoners receive it after a throw.",
    ),
  ];
  thrown.forEach((m) => (m.visible = false));
  const bundle = decor(
    { x: 0, y: 1.1, z: 0, w: 1.25, h: 0.32, d: 0.48 },
    0xb9a47e,
    "Carried and thrown weapon bundle",
    "Moving carried prop; interaction controls pickup and throw instead of blocking movement.",
  );
  bundle.visible = false;
  const moroni = actor(
    "moroni",
    { x: -5, y: 0, z: -45, yaw: 0 },
    "Captain Moroni",
  );
  const laman = actor(
    "lamanite-laman",
    { x: -3, y: 0, z: -47, yaw: 0 },
    "Laman · descendant of Laman",
  );
  laman.group.visible = false;
  const guards = [
    actor("guard", { x: -2.2, y: 0, z: -15 }, "Gid guard west"),
    actor("guard", { x: 2.5, y: 0, z: -15 }, "Gid guard east"),
  ];
  const prisoners = [
    actor("guard", { x: -8, y: 0, z: 34 }, "Nephite prisoner west"),
    actor("wife", { x: -3, y: 0, z: 36 }, "Woman prisoner"),
    actor("child", { x: 4, y: 0, z: 37 }, "Child prisoner"),
    actor("guard", { x: 9, y: 0, z: 34 }, "Nephite prisoner east"),
  ];
  const captain = actor(
    "guard",
    { x: 2, y: 0, z: 16, yaw: Math.PI },
    "Gid captain who surrenders",
  );
  captain.group.visible = false;
  const phases = [
    "orders",
    "wine",
    "report",
    "first-cache",
    "west-wall",
    "second-cache",
    "east-wall",
    "surround",
    "surrender",
    "reunion",
    "done",
  ] as const;
  const objectives = [
    "Receive Moroni's orders as Laman",
    "Speak to the weary guards and let them request the wine",
    "Report the sleeping guards to Moroni",
    "Collect the first bundle of arms",
    "Carry arms to the west wall and throw them inside",
    "Return for a second bundle of arms",
    "Throw arms to the east prisoners in silence",
    "Move with Moroni's force around the outside wall",
    "Receive the captain's surrender at morning",
    "Walk through the opened gate to the freed families",
    "The prisoners are free and Gid is secured",
  ];
  let stage = 0,
    pending = false,
    ended = false,
    carrying = false,
    delivered = 0,
    time = 0,
    drinking = 0,
    throwing: { side: 0 | 1; time: number; start: T.Vector3 } | undefined,
    familyTalked = false;
  return {
    name: "The Rescue at Gid",
    subtitle: "A city saved without bloodshed · Alma 55:4–24",
    spawn: { ...GID_ROUTE[0], yaw: 0 },
    solids,
    actorParent: root,
    bounds: { minX: -29, maxX: 29, minZ: -62, maxZ: 57 },
    goal: { ...GID_ROUTE[10], radius: 3 },
    initialObjective: objectives[0],
    landmarks: [
      { name: "Moroni's camp", ...GID_ROUTE[1] },
      { name: "Guard post", ...GID_ROUTE[2] },
      { name: "Supply cache", ...GID_ROUTE[4] },
      { name: "West throw point", ...GID_ROUTE[5] },
      { name: "East throw point", ...GID_ROUTE[7] },
      { name: "Freed families", ...GID_ROUTE[10] },
    ],
    adventure(hooks) {
      hooks.setAvatar("lamanite-laman");
      hooks.toast(
        "As Laman, speak with Moroni, then approach the Gid guards with wine. The later rescue must remain silent.",
      );
      return {
        snapshot: () => ({
          phase: phases[stage],
          delivered,
          carrying,
          time,
          drinking,
          throwing: !!throwing,
          familyTalked,
          route: GID_ROUTE,
        }),
        movementLocked: () => pending || drinking > 0 || !!throwing,
        update(dt, player, input) {
          dt = Math.max(0, Math.min(dt, 0.1));
          if (!pending && !ended) time += dt;
          if (drinking > 0) {
            drinking = Math.max(0, drinking - dt);
            const bend = 1 - drinking / 2.4;
            wine.position.set(
              1.8 - bend * 1.8,
              0.5 + Math.sin(bend * Math.PI) * 0.9,
              -17 + bend * 2,
            );
            guards.forEach((r, i) => {
              r.group.rotation.z = -0.9 * Math.max(0, (bend - 0.55) / 0.45);
              r.group.position.y = 0.25 * Math.max(0, (bend - 0.55) / 0.45);
              r.update(dt, {
                ...createPlayer(i ? 2.5 : -2.2, 0, -15),
                pointing: bend < 0.5,
              });
            });
            if (!drinking) wine.visible = false;
          }
          if (drinking > 0)
            return {
              objective: "Wait until the guards are deeply asleep",
              prompt: "",
            };
          if (carrying && !throwing) {
            bundle.visible = true;
            bundle.position.set(
              player.x + Math.cos(player.yaw) * 0.55,
              player.y + 1.1,
              player.z - Math.sin(player.yaw) * 0.55,
            );
          }
          let landed = false;
          if (throwing) {
            throwing.time = Math.min(0.9, throwing.time + dt);
            const t = throwing.time / 0.9;
            const endX = throwing.side ? 8 : -8;
            bundle.position.set(
              T.MathUtils.lerp(throwing.start.x, endX, t),
              T.MathUtils.lerp(throwing.start.y, 0.55, t) +
                Math.sin(t * Math.PI) * 6.5,
              T.MathUtils.lerp(throwing.start.z, 31, t),
            );
            if (t >= 1) {
              thrown[throwing.side].visible = true;
              bundle.visible = false;
              throwing = undefined;
              pending = false;
              landed = true;
            }
          }
          const target = GID_ROUTE[Math.min(stage + 1, 10)];
          const close = nearWarPoint(player, target, stage === 7 ? 3.5 : 3);
          if (!pending && !ended && close && (input.interact || landed)) {
            if ((stage === 4 || stage === 6) && !landed) {
              carrying = false;
              pending = true;
              throwing = {
                side: stage === 4 ? 0 : 1,
                time: 0,
                start: new T.Vector3(player.x, player.y + 1.1, player.z),
              };
              return {
                objective: "Cast the arms over the city wall",
                prompt: "",
                carrying: false,
              };
            }
            pending = true;
            const next = () => {
              pending = false;
              if (stage === 1) {
                drinking = 2.4;
              }
              if (stage === 2) {
                hooks.setAvatar("moroni");
                laman.group.visible = true;
                moroni.group.visible = false;
              }
              if (stage === 3 || stage === 5) {
                carrying = true;
                cache.visible = false;
              }
              if (stage === 4 || stage === 6) {
                carrying = false;
                delivered++;
                cache.visible = stage === 4;
                prisoners
                  .slice(stage === 4 ? 0 : 2, stage === 4 ? 2 : 4)
                  .forEach((r) =>
                    r.update(0, {
                      ...createPlayer(
                        r.group.position.x,
                        0,
                        r.group.position.z,
                      ),
                      pointing: true,
                    }),
                  );
              }
              if (stage === 7) {
                captain.group.visible = true;
                scene.background = new T.Color(0xceb99d);
                scene.fog = new T.Fog(0xceb99d, 65, 160);
              }
              if (stage === 8) {
                gate.visible = false;
                const index = solids.indexOf(gateSolid);
                if (index >= 0) solids.splice(index, 1);
              }
              if (stage === 9) familyTalked = true;
              stage++;
              if (stage === 10) {
                ended = true;
                hooks.complete();
              }
            };
            const dialog = [
              [
                "Alma 55:4–8",
                "A plan for Gid",
                "Moroni chooses Laman, a descendant of Laman and former servant of the murdered king, to approach the guards with a small company and wine.",
              ],
              [
                "Alma 55:8–15",
                "The weary guards",
                "Laman says the men escaped with wine. The guards ask for it, drink freely, and fall into a deep sleep. Laman makes no attack.",
              ],
              [
                "Alma 55:15–16",
                "Tell Moroni",
                "Laman returns and tells Moroni the guards are asleep. Moroni prepares weapons so the imprisoned Nephites can defend themselves.",
              ],
              [
                "Alma 55:16",
                "First supply bundle",
                "Take this bundle to the western wall. The weapons must go over the wall to the prisoners inside, quietly.",
              ],
              [
                "Alma 55:16–17",
                "Arms over the west wall",
                "Moroni's men cast weapons over the wall. The prisoners receive them in profound silence.",
              ],
              [
                "Alma 55:16–17",
                "Another supply bundle",
                "The first prisoners are armed. Carry more arms so the women and children who can use them also have protection.",
              ],
              [
                "Alma 55:16–20",
                "All prisoners armed",
                "A second bundle goes over the wall. Women and children able to use weapons receive them too. Moroni will not attack the sleeping guards.",
              ],
              [
                "Alma 55:19–22",
                "Surround without striking",
                "Moroni wants to save people, not shed blood. His force surrounds the city while the prisoners hold its inner parts. Morning light comes.",
              ],
              [
                "Alma 55:22–24",
                "Surrender at Gid",
                "The captains see armed prisoners within and Moroni's force without. They cast down their weapons and plead for mercy. Gid is taken without bloodshed; the prisoners are freed.",
              ],
              [
                "Alma 55:17, 24",
                "Families reunited",
                "You walk through the opened gate and meet the freed Nephite prisoners, including women and children. They join Moroni's people after the city is secured without bloodshed.",
              ],
            ][stage];
            hooks.dialog(dialog[0], dialog[1], dialog[2], next, {
              focus: { x: target.x, y: 1.1, z: target.z },
              wide: 5,
              playerGesture: stage === 4 || stage === 6 ? "point" : "talk",
              actors:
                stage === 0 || stage === 2
                  ? [{ group: moroni.group, gesture: "talk", speaker: true }]
                  : stage === 1
                    ? guards.map((r) => ({
                        group: r.group,
                        gesture: "work" as const,
                      }))
                    : stage === 8
                      ? [{ group: captain.group, gesture: "talk" }]
                      : stage === 9
                        ? [
                            { group: prisoners[1].group, gesture: "talk" },
                            { group: prisoners[2].group },
                          ]
                        : [],
              props:
                stage === 1
                  ? [{ object: wine, to: { x: 0, y: 0.9, z: -15 } }]
                  : [],
            });
          }
          return {
            objective: objectives[stage],
            prompt:
              close && !pending && !ended
                ? `{action} · ${objectives[stage]}`
                : "",
            carrying,
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
