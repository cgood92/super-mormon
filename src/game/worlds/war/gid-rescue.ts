import * as T from "three";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import { StoryMeshObstacles } from "../../camera/cinematic";
import { gidWalkPath } from "./gid-walk-path";
import type { Point, WorldData } from "../../runtime/worlds";

/** Alma 55:4–24. Interior delivery, wall-kicks and the gate procession are gameplay staging. */
export const GID_ROUTE: Point[] = [
  { x: 0, y: 0, z: -55 },
  { x: -5, y: 0, z: -44 },
  { x: 0, y: 0, z: -16 },
  { x: -5, y: 0, z: -44 },
  { x: -13, y: 0, z: -30 },
  { x: -15, y: 0, z: 28 },
  { x: -13, y: 0, z: -30 },
  { x: 10, y: 0, z: 30 },
  { x: 0, y: 0, z: 25 },
  { x: 2, y: 0, z: 16 },
];

export function buildGidRescue(scene: T.Scene): WorldData {
  const land = warWorld(scene, "The rescue at Gid", true);
  const { root, solids, solid, decor, actor, tree } = land;
  // Walls stay solid; the timber gate keeps matching collision while it rises at dawn.
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
  const bundle = new T.Group();
  bundle.name = "Carried weapon bundle";
  root.add(bundle);
  // The origin is the right palm; the tied bundle extends toward the left hand.
  const wrap = decor(
    { x: -0.38, y: -0.08, z: 0, w: 0.9, h: 0.18, d: 0.3 },
    0xb9a47e,
    "Tied arms",
    "Hand-held narrative equipment.",
  );
  bundle.add(wrap);
  for (const z of [-0.1, 0.1]) {
    const shaft = decor(
      { x: -0.38, y: 0.05, z, w: 1.1, h: 0.06, d: 0.06 },
      0x6a523b,
      "Bundled weapon shaft",
      "Hand-held narrative equipment.",
    );
    bundle.add(shaft);
  }
  bundle.visible = false;
  const dropped = [bundle.clone(), bundle.clone()];
  dropped.forEach((m, i) => {
    m.name = `Dropped arms ${i + 1}`;
    m.visible = false;
    root.add(m);
  });
  const beacon = decor(
    { x: -13, y: 3.3, z: -30, w: 0.22, h: 0.7, d: 0.22 },
    0xffd57a,
    "Next destination beacon",
    "Floating objective marker; never a physical surface.",
  );
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
  for (const [x, z] of [
    [-13, 27],
    [13, 27],
    [-5, 46],
    [6, 46],
  ])
    guards.push(actor("guard", { x, y: 0, z }, "Sleeping city guard"));
  const outsideForce = [-9, -5, 5, 9].map((x) =>
    actor("guard", { x, y: 0, z: 11 }, "Moroni's surrounding force"),
  );
  outsideForce.forEach((r) => (r.group.visible = false));
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
  const walkers = prisoners.map((r) => ({
    rig: r,
    body: createPlayer(r.group.position.x, 0, r.group.position.z),
    armed: false,
    path: [] as Point[],
    goal: "",
    repath: 0,
  }));
  const swords = walkers.map(({ rig }, i) => {
    const sword = new T.Group();
    sword.name = "Prisoner's held sword";
    const add = (
      shape: {
        x: number;
        y: number;
        z: number;
        w: number;
        h: number;
        d: number;
      },
      color: number,
      name: string,
    ) => {
      const mesh = decor(
        shape,
        color,
        name,
        "Equipment attached to an animated palm.",
      );
      sword.add(mesh);
    };
    add(
      { x: 0, y: -0.09, z: 0, w: 0.08, h: 0.18, d: 0.08 },
      0x654d3c,
      "Sword grip",
    );
    add(
      { x: 0, y: 0.02, z: 0, w: 0.24, h: 0.06, d: 0.08 },
      0xc0a270,
      "Sword guard",
    );
    add(
      { x: 0, y: 0.37, z: 0, w: 0.09, h: 0.65, d: 0.045 },
      0xc7ced2,
      "Sword blade",
    );
    if (i === 2) sword.scale.setScalar(0.65);
    sword.visible = false;
    rig.sockets.rightHand.add(sword);
    return sword;
  });
  const phases = [
    "orders",
    "wine",
    "report",
    "first-cache",
    "first-delivery",
    "second-cache",
    "second-delivery",
    "dawn",
    "escort",
    "done",
  ] as const;
  const objectives = [
    "Meet Moroni at camp",
    "Bring the wine to the guards ahead",
    "Report the sleeping guards to Moroni at camp",
    "Pick up the first bundle at the glowing supply cache",
    "Jump into the city with the arms · jump again against a wall to wall-kick",
    "Jump back out and return to the glowing cache for the second bundle",
    "Jump into the city with the second bundle",
    "Dawn · the prisoners open the gate",
    "Lead the armed prisoners out through the open gate and approach the captain",
    "Gid is secured · the prisoners are free!",
  ];
  let stage = 0,
    pending = false,
    ended = false,
    carrying = false,
    delivered = 0,
    time = 0,
    drinking = 0,
    dawn = 0,
    collected = 0;
  let dropping:
    | {
        time: number;
        start: T.Vector3;
        end: T.Vector3;
        rotation: T.Quaternion;
        landingRotation: T.Quaternion;
      }
    | undefined;
  let collecting: number | undefined;
  let dawnCamera:
    { cut: boolean; position: T.Vector3; focus: T.Vector3 } | undefined;
  const inside = (p: Point) =>
    p.x > -16.65 && p.x < 16.65 && p.z > 21.85 && p.z < 48.15;
  const target = () => GID_ROUTE[Math.min(stage + 1, 9)];
  const sleep = (rig: typeof moroni, amount: number) => {
    rig.group.rotation.z = (-Math.PI / 2) * amount;
    rig.group.position.y = 0;
    rig.group.updateWorldMatrix(true, true);
    rig.group.position.y = 0.025 - new T.Box3().setFromObject(rig.group).min.y;
  };
  const moveWalker = (w: (typeof walkers)[number], goal: Point, dt: number) => {
    w.repath -= dt;
    const key = `${Math.round(goal.x)},${Math.round(goal.z)}`;
    if (w.repath <= 0 || w.goal !== key) {
      w.path = gidWalkPath(w.body, goal, solids);
      w.goal = key;
      w.repath = 1;
    }
    while (
      w.path.length &&
      Math.hypot(w.body.x - w.path[0].x, w.body.z - w.path[0].z) < 0.3
    )
      w.path.shift();
    const next = w.path[0] ?? goal;
    const dx = next.x - w.body.x,
      dz = next.z - w.body.z,
      len = Math.hypot(dx, dz);
    // Small physics steps preserve the same collision behavior as the player.
    for (let t = 0; t < dt; t += 1 / 60)
      stepPlayer(
        w.body,
        {
          x: len > 0.35 ? (-dx / len) * 0.52 : 0,
          y: len > 0.35 ? (dz / len) * 0.52 : 0,
          jump: false,
          jumpHeld: false,
        },
        Math.min(1 / 60, dt - t),
        0,
        solids,
      );
    w.rig.update(dt, { ...w.body, carrying: w.armed });
  };
  const beginDawn = (player: Point, aspect: number) => {
    stage = 7;
    dawn = 0;
    const focus = new T.Vector3(player.x * 0.5, 1.3, (player.z + 21) * 0.5);
    const distance =
      Math.max(17, Math.hypot(player.x, player.z - 21) * 0.9 + 10) /
      Math.min(1, aspect);
    const position = focus.clone().add(new T.Vector3(7, distance, 10));
    const obstacles = new StoryMeshObstacles(root, [
      ...[...guards, ...prisoners, ...outsideForce, moroni, laman, captain].map(
        (r) => ({ group: r.group }),
      ),
      ...root.children
        .filter((o) => o.name === "moroni-character")
        .map((group) => ({ group })),
    ]);
    for (let i = 0; i < 50; i++) {
      const clear = [
        new T.Vector3(player.x, 1, player.z),
        new T.Vector3(0, 2.35, 21.57),
      ].every((p) => obstacles.clear(position, p));
      if (clear && obstacles.clear(position, position, 0.3)) break;
      position.y += 1;
    }
    dawnCamera = { cut: true, position, focus };
  };
  return {
    name: "The Rescue at Gid",
    subtitle: "A city saved without bloodshed · Alma 55:4–24",
    spawn: { ...GID_ROUTE[0], yaw: 0 },
    solids,
    actorParent: root,
    bounds: { minX: -29, maxX: 29, minZ: -62, maxZ: 57 },
    goal: { x: 2, y: 0, z: 16, radius: 3 },
    initialObjective: objectives[0],
    landmarks: [
      { name: "Moroni's camp", ...GID_ROUTE[1] },
      { name: "Guard post", ...GID_ROUTE[2] },
      { name: "Supply cache", ...GID_ROUTE[4] },
      { name: "City courtyard · jump over the wall", ...GID_ROUTE[5] },
      { name: "City gate", x: 0, y: 0, z: 21 },
    ],
    adventure(hooks) {
      hooks.setAvatar("lamanite-laman");
      hooks.toast(
        "Meet Moroni, then bring wine to the guards. Later, carry two bundles into the city in silence.",
      );
      const dialog = (
        ref: string,
        title: string,
        body: string,
        next: () => void,
        actors: typeof guards = [],
      ) => {
        pending = true;
        hooks.dialog(
          ref,
          title,
          body,
          () => {
            pending = false;
            next();
          },
          {
            wide: 6,
            actors: actors.map((r) => ({
              group: r.group,
              gesture: "talk" as const,
            })),
          },
        );
      };
      return {
        snapshot: () => ({
          phase: phases[stage],
          delivered,
          carrying,
          collected,
          time,
          drinking,
          throwing: !!dropping,
          collecting: collecting !== undefined,
          dawn,
          gateLift: gateSolid.y,
          followers: walkers.map((w) => ({ ...w.body, armed: w.armed })),
          target: target(),
          route: GID_ROUTE,
        }),
        movementLocked: () =>
          pending || drinking > 0 || !!dropping || stage === 7,
        camera: () => dawnCamera,
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
            guards.forEach((r) => sleep(r, Math.max(0, (bend - 0.4) / 0.6)));
            if (!drinking) {
              wine.visible = false;
              guards.forEach((r) => sleep(r, 1));
            }
          }
          // No socket hook exists in pure world tests; retain a forward fallback there.
          if (carrying && bundle.parent === root && !dropping) {
            bundle.position.set(
              player.x + Math.sin(player.yaw) * 0.65,
              player.y + 1,
              player.z + Math.cos(player.yaw) * 0.65,
            );
            bundle.rotation.set(0, player.yaw, 0);
          }
          if (dropping) {
            dropping.time = Math.min(0.65, dropping.time + dt);
            const t = dropping.time / 0.65;
            bundle.position.lerpVectors(dropping.start, dropping.end, t);
            bundle.quaternion.slerpQuaternions(
              dropping.rotation,
              dropping.landingRotation,
              t,
            );
            bundle.position.y += Math.sin(t * Math.PI) * 0.35;
            if (t >= 1) {
              const mesh = dropped[delivered];
              mesh.visible = true;
              mesh.position.copy(dropping.end);
              mesh.rotation.copy(bundle.rotation);
              bundle.visible = false;
              dropping = undefined;
              collecting = delivered;
              delivered++;
            }
          }
          if (collecting !== undefined) {
            const index = collecting,
              drop = dropped[index].position;
            for (const w of walkers.slice(index * 2, index * 2 + 2)) {
              if (w.armed) continue;
              moveWalker(w, { x: drop.x, y: 0, z: drop.z }, dt);
              if (Math.hypot(w.body.x - drop.x, w.body.z - drop.z) < 1.25) {
                w.armed = true;
                swords[walkers.indexOf(w)].visible = true;
                collected++;
              }
            }
            if (walkers.slice(index * 2, index * 2 + 2).every((w) => w.armed)) {
              dropped[index].visible = false;
              collecting = undefined;
              if (delivered === 1) {
                stage = 5;
                cache.visible = true;
                hooks.toast(
                  "They have the arms. Jump back over the wall for the second bundle.",
                );
              } else beginDawn(player, hooks.viewAspect?.() ?? 16 / 9);
            }
          }
          if (stage === 7) {
            dawn = Math.min(6, dawn + dt);
            const t = T.MathUtils.smoothstep(dawn, 0, 6);
            gateSolid.y = t * 5.1;
            gate.position.y = gateSolid.y + gateSolid.h / 2;
            const color = new T.Color(0x19283f).lerp(new T.Color(0xceb99d), t);
            scene.background = color;
            scene.fog = new T.Fog(color, 48 + t * 17, 135 + t * 25);
            root.children.forEach((o) => {
              if (o instanceof T.HemisphereLight) {
                o.intensity = 1.6 + t * 0.9;
                o.color.set(0x9abce9).lerp(new T.Color(0xffecd0), t);
              }
              if (o instanceof T.DirectionalLight) {
                o.intensity = 1.4 + t;
                o.color.set(0x9cb7e7).lerp(new T.Color(0xffdcaa), t);
              }
            });
            if (dawn >= 6) {
              stage = 8;
              dawnCamera = undefined;
              captain.group.visible = true;
              guards.forEach((r) => {
                r.group.rotation.z = 0;
                r.group.position.y = 0;
              });
              hooks.toast(
                "The gate is open. Lead everyone outside, then speak to the Lamanite captain.",
              );
            }
          }
          if (stage === 8) {
            walkers.forEach((w, i) => {
              // Route everyone through the gate before spreading out behind the player.
              const goal =
                player.z > 23
                  ? {
                      x: T.MathUtils.clamp(
                        player.x + (i - 1.5) * 0.8,
                        -15.5,
                        15.5,
                      ),
                      y: 0,
                      z: Math.min(47.5, player.z + 2 + i * 0.65),
                    }
                  : w.body.z > 23
                    ? { x: 0, y: 0, z: 22 }
                    : w.body.z > 19
                      ? { x: 0, y: 0, z: 18 }
                      : {
                          x: T.MathUtils.clamp(
                            player.x + (i - 1.5) * 0.8,
                            -15,
                            15,
                          ),
                          y: 0,
                          z: Math.min(19, player.z + 2 + i * 0.65),
                        };
              moveWalker(w, goal, dt);
            });
          }
          const deliverStage = stage === 4 || stage === 6;
          const canDrop =
            deliverStage &&
            carrying &&
            inside(player) &&
            player.grounded &&
            player.y < 0.15;
          const close =
            stage === 8
              ? nearWarPoint(player, { x: 2, y: 0, z: 16 }, 3) && player.z < 20
              : nearWarPoint(player, target(), 3);
          beacon.visible =
            !pending &&
            !ended &&
            !drinking &&
            !dropping &&
            collecting === undefined &&
            stage !== 7;
          const mark = stage === 8 ? { x: 2, y: 0, z: 16 } : target();
          beacon.position.set(mark.x, 3.3 + Math.sin(time * 3) * 0.2, mark.z);
          if (
            !pending &&
            !ended &&
            !drinking &&
            !dropping &&
            collecting === undefined &&
            input.interact
          ) {
            if (canDrop) {
              carrying = false;
              root.attach(bundle);
              bundle.updateWorldMatrix(true, true);
              dropping = {
                time: 0,
                start: bundle.position.clone(),
                end: new T.Vector3(
                  player.x + Math.cos(player.yaw) * 0.38,
                  0.12,
                  player.z - Math.sin(player.yaw) * 0.38,
                ),
                rotation: bundle.quaternion.clone(),
                landingRotation: new T.Quaternion().setFromEuler(
                  new T.Euler(0, player.yaw, 0),
                ),
              };
            } else if (close && !deliverStage) {
              if (stage === 0)
                dialog(
                  "Alma 55:4–8",
                  "A plan for Gid",
                  "As Laman, bring wine to the guards ahead. Moroni wants to free the prisoners without bloodshed.",
                  () => (stage = 1),
                  [moroni],
                );
              else if (stage === 1)
                dialog(
                  "Alma 55:8–15",
                  "The weary guards",
                  "The guards ask for the wine. They drink freely and fall into a deep sleep. Laman makes no attack.",
                  () => {
                    stage = 2;
                    drinking = 2.4;
                  },
                  guards.slice(0, 2),
                );
              else if (stage === 2)
                dialog(
                  "Alma 55:15–19",
                  "The guards are asleep",
                  "Moroni prepares arms for the prisoners. Carry two bundles inside in silence. Jump toward the wall, then jump again against it to wall-kick over.",
                  () => {
                    hooks.setAvatar("moroni");
                    laman.group.visible = true;
                    moroni.group.visible = false;
                    outsideForce.forEach((r) => (r.group.visible = true));
                    stage = 3;
                  },
                  [moroni],
                );
              else if (stage === 3 || stage === 5) {
                carrying = true;
                cache.visible = false;
                bundle.visible = true;
                bundle.position.set(0, 0, 0);
                bundle.rotation.set(0, 0, 0);
                hooks.attachEquipment?.("rightHand", bundle);
                stage++;
                hooks.toast(
                  "Jump into the city. Once on the ground inside, drop the arms anywhere; prisoners will collect them.",
                );
              } else if (stage === 8 && walkers.every((w) => w.body.z < 21))
                dialog(
                  "Alma 55:22–24",
                  "Gid is taken without bloodshed",
                  "The Lamanites see armed prisoners inside and Moroni's soldiers outside. They are too afraid to fight and give up their weapons. Congratulations! The prisoners are free and Gid is secured without bloodshed.",
                  () => {
                    stage = 9;
                    ended = true;
                    hooks.complete();
                  },
                  [captain],
                );
            }
          }
          return {
            objective: drinking
              ? "Wait until the guards are deeply asleep"
              : dropping || collecting !== undefined
                ? "Wait as the prisoners collect the arms in silence"
                : canDrop
                  ? "Drop the arms here · the prisoners will come and collect them"
                  : objectives[stage],
            prompt:
              !pending &&
              !ended &&
              !drinking &&
              !dropping &&
              collecting === undefined &&
              (canDrop || (!deliverStage && close && stage !== 7))
                ? `{action} · ${canDrop ? "Drop arms on the ground" : stage === 8 ? (walkers.every((w) => w.body.z < 21) ? "Receive the captain's surrender" : "Wait for the prisoners to follow you out") : objectives[stage]}`
                : "",
            carrying,
          };
        },
        dispose() {
          ended = true;
          root.attach(bundle);
          dawnCamera = undefined;
        },
      };
    },
    dispose: () => {
      root.attach(bundle);
      land.dispose();
    },
  };
}
