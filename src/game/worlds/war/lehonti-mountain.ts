import * as T from "three";
import { adventureLandscape, withinTask } from "../shared/adventure-landscape";
import { material } from "../../rendering/art";
import {
  createCharacter,
  type CharacterRole,
} from "../../characters/character";
import { markScenery, terracedRock } from "../shared/scenery";
import type { Point, WorldData } from "../../runtime/worlds";

const corners: [number, number][] = [
  [28, 28],
  [-28, 28],
  [-28, -28],
  [28, -28],
  [28, 18],
  [-18, 18],
  [-18, -18],
  [18, -18],
  [18, 8],
  [-8, 8],
  [-8, -8],
  [8, -8],
  [8, 0],
  [0, 0],
];
const route: Point[] = [];
for (let segment = 1; segment < corners.length; segment++) {
  const [ax, az] = corners[segment - 1],
    [bx, bz] = corners[segment];
  const count = Math.ceil(Math.hypot(bx - ax, bz - az) / 5.15);
  for (let j = segment === 1 ? 0 : 1; j <= count; j++) {
    const t = j / count;
    route.push({
      x: ax + (bx - ax) * t,
      y: route.length * 0.34 + 0.34,
      z: az + (bz - az) * t,
    });
  }
}
export const ANTIPAS_ROUTE: readonly Point[] = route;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const locationAt = (progress: number): Point => {
  const index = Math.min(route.length - 2, Math.max(0, Math.floor(progress)));
  const t = Math.min(1, Math.max(0, progress - index));
  return {
    x: T.MathUtils.lerp(route[index].x, route[index + 1].x, t),
    y: T.MathUtils.lerp(route[index].y, route[index + 1].y, t),
    z: T.MathUtils.lerp(route[index].z, route[index + 1].z, t),
  };
};

/** Alma 47:5–19. The playable warning runner and timed races are fictional. */
export function buildLehontiMountain(scene: T.Scene): WorldData {
  const land = adventureLandscape(
    scene,
    "Mount Antipas · imagined spiral trail",
    0x978b69,
    148,
    148,
  );
  const { root, solids, solid } = land;
  const crowdRigs: ReturnType<typeof createCharacter>[] = [];
  const crowd = (role: CharacterRole, point: Point) => {
    const rig = createCharacter(role, { quality: "crowd" });
    rig.update(0, {
      ...point,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.PI,
      grounded: true,
      runSpeed: 0,
    });
    root.add(rig.group);
    crowdRigs.push(rig);
    return rig;
  };
  scene.background = new T.Color(0xa9b6b0);
  scene.fog = new T.Fog(0xa9b6b0, 100, 220);
  // The many stepped terraces themselves form the mountain; their visible top
  // and support are the same shape. Adjacent tops differ by 0.34 m, below step height.
  route.forEach((point, index) => {
    solid(
      { x: point.x, y: 0, z: point.z, w: 5.7, d: 5.7, h: point.y },
      index % 5 === 0 ? 0x8d8066 : index % 3 === 0 ? 0x9b8e74 : 0xa3977a,
      `Mount Antipas walkable spiral terrace ${index + 1}`,
    );
  });
  // Three interlocking masses fill the hollow middle of the spiral. Every
  // visible ledge is below the next ring's walking height; no broad collider
  // blocks a switchback or replaces its individually supported terraces.
  for (const [w, d, h, color] of [
    [42, 42, 9, 0x817864],
    [27, 27, 17, 0x887e68],
    [12, 12, 20, 0x918771],
  ] as const)
    terracedRock(
      root,
      solids,
      material(color),
      { x: 0, y: 0, z: 0, w, d, h },
      "Mount Antipas fitted inner rock mass",
    );
  // Outer rock masses are solid and fitted away from the ascent, with open valleys between.
  for (const [x, z, w, d, h] of [
    [-50, 5, 15, 22, 9],
    [49, -3, 18, 25, 12],
    [-44, -43, 18, 15, 7],
    [44, 44, 16, 17, 8],
  ] as const)
    terracedRock(
      root,
      solids,
      material(0x817962),
      { x, y: 0, z, w, d, h },
      "Walkable outer rock terrace",
    );
  // A ring of physical trunks is outside the spiral; the shared landscape batches plants.
  for (const [x, z] of [
    [-54, 31],
    [-51, -19],
    [54, 19],
    [52, -35],
    [-31, -53],
    [18, 54],
  ] as const)
    land.tree(x, z, 1.1);
  // Solid trunks and high foliage interrupt the sight line along the broad
  // trail without obstructing its center; the gap also offers a side route.
  for (const [x, z] of [
    [-10, 34],
    [10, 34],
    [-34, -8],
    [34, 8],
    [0, -34],
    [0, 23],
  ] as const)
    land.tree(x, z, 0.85);
  const scrub = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 0),
    new T.MeshStandardMaterial({ color: 0x6f7e54, roughness: 1 }),
    route.length,
  );
  const stoneFaces = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 0),
    new T.MeshStandardMaterial({ color: 0x817660, roughness: 1 }),
    route.length,
  );
  const instance = new T.Object3D();
  route.forEach((point, i) => {
    const side = i % 2 ? 1 : -1;
    instance.position.set(
      point.x + side * 2.25,
      point.y + 0.19,
      point.z + Math.sin(i * 2.1) * 0.3,
    );
    instance.scale.set(0.38 + (i % 3) * 0.09, 0.21 + (i % 4) * 0.04, 0.43);
    instance.rotation.set(0, i * 0.67, 0);
    instance.updateMatrix();
    scrub.setMatrixAt(i, instance.matrix);
    instance.position.set(point.x + side * 2.7, point.y * 0.5, point.z);
    instance.scale.set(0.28, Math.min(2.1, point.y * 0.43), 1.1);
    instance.rotation.set(0, i * 0.13, 0);
    instance.updateMatrix();
    stoneFaces.setMatrixAt(i, instance.matrix);
  });
  scrub.name = "Batched sparse trail scrub";
  stoneFaces.name = "Batched shallow stone facets";
  root.add(scrub, stoneFaces);
  markScenery(scrub, {
    kind: "decoration",
    reason:
      "Flexible low vegetation on the solid terrace edges, clear of the centerline.",
  });
  markScenery(stoneFaces, {
    kind: "decoration",
    reason:
      "Shallow faceted skin within the fitted physical terrace faces, never a separate walking surface.",
  });
  const summit = route[route.length - 1];
  const lehonti = land.actor("lehonti", summit);
  lehonti.group.name = "Lehonti · leader at the summit";
  const summitGuards = [
    crowd("guard", { x: summit.x - 2, y: summit.y, z: summit.z }),
    crowd("guard", { x: summit.x + 2, y: summit.y, z: summit.z }),
  ];
  summitGuards.forEach((guard, i) => {
    guard.group.name = `Lehonti guard ${i + 1}`;
  });
  const amalickiah = land.actor("amalickiah", route[route.length - 9]);
  amalickiah.group.name = "Amalickiah climbs nearly to the camp";
  amalickiah.group.visible = false;
  const messengers = [0, 1, 2].map((i) => {
    const rig = crowd("guard", route[0]);
    rig.group.name = `Actual embassy messenger ${i + 1}`;
    rig.group.visible = i === 0;
    return rig;
  });
  const campFlags = new T.InstancedMesh(
    new T.ConeGeometry(0.22, 1, 5),
    new T.MeshStandardMaterial({
      color: 0xd9c89d,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
    8,
  );
  const flagTransform = new T.Object3D();
  for (let i = 0; i < 8; i++) {
    flagTransform.position.set(
      summit.x + Math.cos(i * 0.785) * 2,
      summit.y + 1.1,
      summit.z + Math.sin(i * 0.785) * 2,
    );
    flagTransform.updateMatrix();
    campFlags.setMatrixAt(i, flagTransform.matrix);
  }
  campFlags.name = "Lehonti's small summit camp";
  root.add(campFlags);
  markScenery(campFlags, {
    kind: "decoration",
    reason:
      "Small pennants above the solid summit terraces; they do not support the player.",
  });
  let phase: "race" | "done" = "race";
  let race = 0,
    pending = false,
    time = 0,
    retries = 0,
    messengerProgress = 0,
    runnerProgress = 0;
  const trailhead = { x: route[0].x, y: 0, z: route[0].z + 3.3 };
  const target = () => summit;
  function updateActors(dt: number) {
    messengers.forEach((rig, i) => {
      rig.group.visible = phase === "race" && i === race;
      if (i === race && phase === "race") {
        const p = locationAt(messengerProgress);
        const ahead = locationAt(
          Math.min(route.length - 1, messengerProgress + 0.01),
        );
        const behind = locationAt(Math.max(0, messengerProgress - 0.01));
        const dx = ahead.x - behind.x,
          dz = ahead.z - behind.z;
        const length = Math.hypot(dx, dz) || 1;
        const speed = race === 2 ? 1.25 : race === 1 ? 1.17 : 1.1;
        // Terrace tops are level, so feet follow their actual support height
        // instead of hovering along an interpolated slope between steps.
        const support = Math.max(
          ...route
            .filter(
              (step) =>
                Math.abs(step.x - p.x) <= 2.85 &&
                Math.abs(step.z - p.z) <= 2.85,
            )
            .map((step) => step.y),
        );
        rig.update(dt, {
          ...p,
          y: support,
          vx: (dx / length) * speed * 5,
          vy: 0,
          vz: (dz / length) * speed * 5,
          yaw: Math.atan2(dx, dz),
          grounded: true,
          runSpeed: speed * 5,
          move: "run",
        });
      }
    });
  }
  return {
    name: "Lehonti on Mount Antipas",
    subtitle: "Race to warn Lehonti · inspired by Alma 47",
    initialObjective: "Race the first messenger up the winding mountain trail",
    spawn: trailhead,
    solids,
    actorParent: root,
    bounds: { minX: -65, maxX: 65, minZ: -65, maxZ: 65 },
    goal: { ...summit, radius: 3 },
    landmarks: [
      { name: "Antipas trailhead", ...route[0] },
      { name: "Lehonti's summit camp", ...summit },
    ],
    update(dt, player) {
      const delta = Math.min(0.1, Math.max(0, dt));
      updateActors(delta);
      if (player && phase === "race") {
        let nearest = 0,
          score = Infinity;
        for (let i = 0; i < route.length; i++) {
          const p = route[i],
            cost = distance(player, p) + Math.abs(player.y - p.y) * 2.5;
          if (cost < score) {
            score = cost;
            nearest = i;
          }
        }
        runnerProgress = Math.max(runnerProgress, nearest);
        land.update(delta, route[Math.min(route.length - 1, nearest + 3)]);
      } else land.update(delta, phase === "done" ? undefined : target());
    },
    adventure(hooks) {
      hooks.setAvatar("warning-runner");
      hooks.toast(
        "Game invention: you are an unnamed warning runner. The three embassies, Lehonti's refusals, and later tragedy are from Alma 47.",
      );
      return {
        snapshot: () => ({
          phase,
          race: race + 1,
          target: target(),
          route,
          checkpointIndex: route.length - 1,
          startIndex: 0,
          timer: time,
          messengerProgress,
          runnerProgress,
          retries,
          pending,
        }),
        update(dt, player) {
          if (phase === "done")
            return {
              objective: "Lehonti's story remembered",
              prompt: "Journey complete",
            };
          if (phase === "race" && !pending) {
            const delta = Math.min(0.1, Math.max(0, dt));
            time += delta;
            // Every attempt is a complete ascent to Lehonti's real summit camp.
            const segmentLength = route.length - 1;
            messengerProgress = Math.min(
              route.length - 1,
              messengerProgress +
                delta * (race === 2 ? 1.25 : race === 1 ? 1.17 : 1.1),
            );
            const reached = withinTask(player, target(), 3.2);
            if (!reached && messengerProgress >= route.length - 1) {
              retries++;
              Object.assign(player, {
                ...trailhead,
                vx: 0,
                vy: 0,
                vz: 0,
                grounded: true,
              });
              messengerProgress = 0;
              runnerProgress = 0;
              time = 0;
              hooks.toast(
                `The messenger reached Lehonti's camp first. Try the full ascent for race ${race + 1} again; follow the blue trail beacon.`,
              );
            }
            if (reached && !pending) {
              pending = true;
              const stories = [
                "First embassy: Amalickiah sends a secret messenger at night asking Lehonti to come down to the foot of Antipas. You warn Lehonti at his summit camp. Lehonti refuses. Your warning and race are invented.",
                "Second embassy: the messenger climbs again. You warn Lehonti at his camp, and he again refuses to descend. Your warning and race are invented; the second refusal is in Alma 47:11.",
                "Third embassy: the messenger asks a third time at the summit. You warn Lehonti once more, but he still does not come down. Your warning is invented; his third refusal is from Alma 47:11.",
              ];
              hooks.dialog(
                `Alma 47:${race === 0 ? "10–11" : "11"}`,
                `Message ${race + 1} · Lehonti refuses`,
                race === 2
                  ? "Amalickiah tried to convince Lehonti to come down the mountain. You arrived in time to warn him. He’s not going down this time. Great job."
                  : stories[race],
                () => {
                  race++;
                  pending = false;
                  if (race === 3) {
                    phase = "done";
                    hooks.complete();
                  } else {
                    // A short imagined return trip gives the next messenger a
                    // fresh full ascent without requiring a long downhill replay.
                    Object.assign(player, {
                      ...trailhead,
                      vx: 0,
                      vy: 0,
                      vz: 0,
                      grounded: true,
                    });
                    time = 0;
                    messengerProgress = 0;
                    runnerProgress = 0;
                    hooks.toast(
                      "An imagined quick descent returns the warning runner to the trailhead for the next embassy.",
                    );
                  }
                },
                {
                  focus: { x: target().x, y: target().y + 1.25, z: target().z },
                  wide: 5.2,
                  playerGesture: "point",
                  actors: [
                    { group: lehonti.group, gesture: "talk", speaker: true },
                    { group: messengers[race].group, gesture: "talk" },
                    ...summitGuards.map((guard) => ({ group: guard.group })),
                  ],
                },
              );
            }
            return {
              objective: `Race ${race + 1}/3: climb the whole spiral to Lehonti's camp (${Math.max(0, Math.ceil((segmentLength - runnerProgress) * 5))} m)`,
              prompt: reached
                ? "Lehonti hears your warning"
                : `Messenger race · ${Math.ceil(time)} s`,
            };
          }
          return {
            objective: "Lehonti's story remembered",
            prompt: "Journey complete",
          };
        },
        dispose() {},
      };
    },
    dispose: () => {
      crowdRigs.forEach((rig) => rig.dispose());
      land.dispose();
    },
  };
}
