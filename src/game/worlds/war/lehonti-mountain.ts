import * as T from "three";
import {
  planStoryCamera,
  StoryMeshObstacles,
  type StoryActor,
} from "../../camera/cinematic";
import { adventureLandscape, withinTask } from "../shared/adventure-landscape";
import { material } from "../../rendering/art";
import {
  createCharacter,
  type CharacterRole,
} from "../../characters/character";
import { createCarriedProp } from "../../characters/roster-data";
import {
  markScenery,
  sceneryTerraceUnion,
  terracedRock,
} from "../shared/scenery";
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
  const { root, solids } = land;
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
  sceneryTerraceUnion(
    root,
    solids,
    route.map((point, index) => ({
      x: point.x,
      y: 0,
      z: point.z,
      w: 5.7,
      d: 5.7,
      h: point.y,
      color: index % 5 === 0 ? 0x8d8066 : index % 3 === 0 ? 0x9b8e74 : 0xa3977a,
    })),
    "Mount Antipas walkable spiral terraces",
  );
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
  const valley = { x: 30, y: 0, z: 36 };
  const amalickiah = land.actor("amalickiah", valley);
  amalickiah.group.name = "Amalickiah sends a secret embassy from the valley";
  amalickiah.group.visible = true;
  const messengers = [0, 1, 2].map((i) => {
    const rig = crowd("guard", route[0]);
    rig.group.name = `Actual embassy messenger ${i + 1}`;
    rig.group.visible = i === 0;
    return rig;
  });

  const servant = crowd("guard", valley);
  servant.group.name = "Amalickiah's treacherous servant";
  servant.group.visible = false;
  const jar = createCarriedProp("jar");
  if (jar) {
    jar.name = "Poison jar";
    jar.position.set(0.18, 0.85, 0.35);
    jar.rotation.set(-0.25, 0.2, 0);
    jar.scale.setScalar(0.85);
    servant.group.add(jar);
    jar.visible = false;
  }

  // Royal crown for King Amalickiah
  const goldMat = new T.MeshStandardMaterial({
    color: 0xdfb13b,
    roughness: 0.35,
    metalness: 0.85,
  });
  const crownGroup = new T.Group();
  crownGroup.name = "Amalickiah royal crown";
  const crownBand = new T.Mesh(
    new T.CylinderGeometry(0.18, 0.19, 0.08, 12, 1, true),
    goldMat,
  );
  crownGroup.add(crownBand);
  for (let i = 0; i < 6; i++) {
    const spike = new T.Mesh(new T.ConeGeometry(0.04, 0.09, 4), goldMat);
    const angle = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.18, 0.08, Math.sin(angle) * 0.18);
    crownGroup.add(spike);
  }
  crownGroup.position.set(0, 1.95, 0.03);
  crownGroup.visible = false;
  amalickiah.group.add(crownGroup);

  // Camp council pavilion for the historical poisoning sequence
  const woodMat = new T.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.8 });
  const canvasMat = new T.MeshStandardMaterial({
    color: 0xc8bc9f,
    roughness: 0.9,
  });
  const rugMat = new T.MeshStandardMaterial({ color: 0x7a634e, roughness: 0.9 });
  const councilTent = new T.Group();
  councilTent.name = "Camp council pavilion";
  for (const [px, pz] of [
    [-1.8, -1.8],
    [1.8, -1.8],
    [-1.8, 1.8],
    [1.8, 1.8],
  ]) {
    const pole = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.3, 6), woodMat);
    pole.position.set(px, 1.15, pz);
    councilTent.add(pole);
  }
  const tentRoof = new T.Mesh(new T.BoxGeometry(4.0, 0.08, 4.0), canvasMat);
  tentRoof.position.set(0, 2.3, 0);
  councilTent.add(tentRoof);
  const matMesh = new T.Mesh(new T.BoxGeometry(3.6, 0.04, 3.6), rugMat);
  matMesh.position.set(0, 0.02, 0);
  councilTent.add(matMesh);
  councilTent.visible = false;
  root.add(councilTent);
  markScenery(councilTent, {
    kind: "decoration",
    reason: "Camp council pavilion for historical outro sequence.",
  });

  // Royal standards for the coronation
  const royalStandards: T.Group[] = [];
  [-2.2, 2.2].forEach((offset, idx) => {
    const std = createCarriedProp("banner");
    if (std) {
      std.name = `Royal standard ${idx + 1}`;
      std.position.set(summit.x + offset, summit.y + 0.1, summit.z - 1.2);
      std.visible = false;
      root.add(std);
      royalStandards.push(std);
      markScenery(std, {
        kind: "decoration",
        reason: "Royal standards for King Amalickiah coronation.",
      });
    }
  });

  const OPENING_BEAT_0 = 8.0;
  const OPENING_BEAT_1 = 16.0;
  const OPENING_DURATION = 24.0;

  const OUTRO_BEAT_0 = 6.0;
  const OUTRO_BEAT_1 = 12.0;
  const OUTRO_BEAT_2 = 18.0;
  const OUTRO_DURATION = 24.0;

  let phase: "opening" | "race" | "outro" | "done" = "opening";
  let openingTime = 0;
  let outroTime = 0;
  let race = 0,
    pending = false,
    time = 0,
    retries = 0,
    messengerProgress = 0,
    runnerProgress = 0;
  // Face directly along the ascending trail heading toward the summit
  const trailheadYaw = -Math.PI / 2;
  const trailhead = { x: route[0].x, y: route[0].y, z: route[0].z, yaw: trailheadYaw };
  const target = () => summit;
  function updateActors(dt: number) {
    messengers.forEach((rig, i) => {
      rig.group.visible = phase !== "done" && phase !== "outro" && i === race;
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
    initialObjective:
      "Lehonti and his people hold the summit of Mount Antipas. They refuse to fight the Nephites.",
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
      let cinematicCamera:
        { position: T.Vector3; focus: T.Vector3; cut: boolean } | undefined;
      let lastAspect = 0;
      let lastBeat = -1;
      const runnerAnchor = new T.Group();
      runnerAnchor.position.set(trailhead.x, trailhead.y, trailhead.z);
      const cameraActors: StoryActor[] = [
        lehonti,
        amalickiah,
        ...summitGuards,
        ...messengers,
        servant,
      ].map((rig) => ({ group: rig.group }));
      const playerActor = root.getObjectByName("warning-runner-character");
      if (playerActor) cameraActors.push({ group: playerActor });
      const meshObstacles = new StoryMeshObstacles(root, cameraActors);

      function frameOpening() {
        const beat =
          openingTime < OPENING_BEAT_0
            ? 0
            : openingTime < OPENING_BEAT_1
              ? 1
              : 2;
        const anchor =
          beat === 0
            ? lehonti.group
            : beat === 1
              ? amalickiah.group
              : runnerAnchor;
        const camera = new T.PerspectiveCamera(
          58,
          hooks.viewAspect?.() ?? 16 / 9,
          0.08,
          320,
        );
        camera.position.copy(anchor.position).add(new T.Vector3(7, 5, 9));
        camera.lookAt(anchor.position);
        const plan = planStoryCamera(
          camera,
          {
            cutaway: true,
            actors: [{ group: anchor }],
            wide: beat === 0 ? 7 : 6,
          },
          solids,
          meshObstacles,
        );
        cinematicCamera = { position: plan.wide, focus: plan.focus, cut: true };
        lastBeat = beat;
        lastAspect = hooks.viewAspect?.() ?? 16 / 9;
      }

      function frameOutro() {
        const beat =
          outroTime < OUTRO_BEAT_0
            ? 0
            : outroTime < OUTRO_BEAT_1
              ? 1
              : outroTime < OUTRO_BEAT_2
                ? 2
                : 3;
        const camera = new T.PerspectiveCamera(
          58,
          hooks.viewAspect?.() ?? 16 / 9,
          0.08,
          320,
        );
        const focus = new T.Vector3();
        const cameraPos = new T.Vector3();
        const actorsToFrame: StoryActor[] = [];

        if (beat === 0) {
          // 75% height meeting terrace
          const meetPt = route[68] ?? route[67];
          focus.set(meetPt.x, meetPt.y + 1.2, meetPt.z);
          cameraPos.set(meetPt.x + 8.5, meetPt.y + 4.5, meetPt.z + 7.5);
          actorsToFrame.push({ group: amalickiah.group }, { group: lehonti.group });
        } else if (beat === 1) {
          // Council tent poisoning
          const campPt = route[67];
          focus.set(campPt.x - 1, campPt.y + 1.1, campPt.z + 0.6);
          cameraPos.set(campPt.x + 3.8, campPt.y + 2.0, campPt.z + 3.5);
          actorsToFrame.push(
            { group: lehonti.group },
            { group: servant.group },
            { group: amalickiah.group },
          );
        } else if (beat === 2) {
          // Lehonti dies; Amalickiah takes chief command
          const campPt = route[67];
          focus.set(campPt.x - 0.2, campPt.y + 1.1, campPt.z + 0.4);
          cameraPos.set(campPt.x + 3.2, campPt.y + 0.8, campPt.z + 4.2);
          actorsToFrame.push({ group: amalickiah.group }, { group: servant.group });
        } else {
          // Amalickiah crowned king atop summit
          focus.set(summit.x, summit.y + 1.35, summit.z);
          cameraPos.set(summit.x + 4.2, summit.y + 0.65, summit.z + 5.2);
          actorsToFrame.push({ group: amalickiah.group });
        }

        camera.position.copy(cameraPos);
        camera.lookAt(focus);
        const plan = planStoryCamera(
          camera,
          {
            cutaway: true,
            actors: actorsToFrame,
            wide: beat === 0 ? 7 : beat === 3 ? 5.5 : 4.8,
          },
          solids,
          meshObstacles,
        );
        cinematicCamera = { position: plan.wide, focus: plan.focus, cut: true };
        lastBeat = beat;
        lastAspect = hooks.viewAspect?.() ?? 16 / 9;
      }

      function updateOutroActors(delta: number, beat: number, timeInOutro: number) {
        const campPos = route[67];
        if (beat === 0) {
          councilTent.visible = false;
          crownGroup.visible = false;
          if (jar) jar.visible = false;
          servant.group.visible = false;
          royalStandards.forEach((s) => {
            s.visible = false;
          });

          // Amalickiah climbs rapidly ~75% of the mountain
          const t = Math.min(1, timeInOutro / 3.5);
          const p = 55 + t * 12; // route index 55 to 67
          const loc = locationAt(p);
          const isAscending = t < 1;
          amalickiah.group.visible = true;
          amalickiah.group.rotation.x = 0;
          amalickiah.update(delta, {
            ...loc,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: isAscending ? 5.5 : 0,
            move: isAscending ? "run" : "idle",
            yaw: isAscending ? Math.PI / 2 : 0,
            pointing: !isAscending && timeInOutro > 4.2,
          });

          // Lehonti descends from the summit to meet him
          const lt = Math.min(1, timeInOutro / 3.5);
          const lp = 89 - lt * 19; // route index 89 down to 70
          const lloc = locationAt(lp);
          const lDescending = lt < 1;
          lehonti.group.visible = true;
          lehonti.group.rotation.x = 0;
          lehonti.update(delta, {
            ...lloc,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: lDescending ? 3.5 : 0,
            move: lDescending ? "run" : "idle",
            yaw: Math.PI,
          });

          summitGuards[0].update(delta, {
            ...locationAt(Math.min(89, lp + 2)),
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "idle",
            yaw: Math.PI,
          });
          summitGuards[1].update(delta, {
            ...locationAt(Math.min(89, lp + 4)),
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "idle",
            yaw: Math.PI,
          });
        } else if (beat === 1) {
          councilTent.visible = true;
          councilTent.position.set(campPos.x - 1, campPos.y, campPos.z);
          crownGroup.visible = false;
          if (jar) jar.visible = true;
          servant.group.visible = true;
          royalStandards.forEach((s) => {
            s.visible = false;
          });

          // Lehonti is kneeling inside the tent, bowed downward as poison takes hold
          lehonti.group.visible = true;
          lehonti.group.rotation.x = 0;
          lehonti.update(delta, {
            x: campPos.x - 1,
            y: campPos.y,
            z: campPos.z,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "kneel",
            yaw: 0,
            lookPitch: 0.35,
          });

          // Servant administers the poison jar
          servant.group.rotation.x = 0;
          servant.update(delta, {
            x: campPos.x - 1,
            y: campPos.y,
            z: campPos.z + 1.1,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "kneel",
            yaw: Math.PI,
          });

          // Amalickiah stands at the tent entrance, watching cunningly
          amalickiah.group.rotation.x = 0;
          amalickiah.update(delta, {
            x: campPos.x + 1.2,
            y: campPos.y,
            z: campPos.z - 0.4,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "idle",
            yaw: -Math.PI / 3,
            lookYaw: -Math.PI / 3,
          });

          summitGuards[0].update(delta, {
            x: campPos.x - 2.5,
            y: campPos.y,
            z: campPos.z - 1,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "idle",
            yaw: Math.PI / 3,
          });
          summitGuards[1].update(delta, {
            x: campPos.x + 2,
            y: campPos.y,
            z: campPos.z + 1.5,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "idle",
            yaw: -Math.PI / 2,
          });
        } else if (beat === 2) {
          councilTent.visible = true;
          if (jar) jar.visible = false;
          servant.group.visible = true;
          crownGroup.visible = false;

          // Lehonti has fallen / died on the ground
          lehonti.group.visible = true;
          lehonti.group.rotation.x = -Math.PI / 2;
          lehonti.update(delta, {
            x: campPos.x - 1,
            y: campPos.y + 0.15,
            z: campPos.z,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "idle",
            yaw: 0,
          });

          // Amalickiah steps forward and commands the army
          amalickiah.group.rotation.x = 0;
          amalickiah.update(delta, {
            x: campPos.x - 0.2,
            y: campPos.y,
            z: campPos.z + 0.5,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "idle",
            pointing: true,
            yaw: Math.PI,
            lookPitch: -0.2,
          });

          // Guards and servant kneel in submission
          servant.update(delta, {
            x: campPos.x - 2.2,
            y: campPos.y,
            z: campPos.z + 0.8,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "kneel",
            yaw: Math.PI / 3,
          });
          summitGuards[0].update(delta, {
            x: campPos.x + 0.6,
            y: campPos.y,
            z: campPos.z + 1.6,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "kneel",
            yaw: -Math.PI / 4,
          });
          summitGuards[1].update(delta, {
            x: campPos.x - 1.8,
            y: campPos.y,
            z: campPos.z + 1.8,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "kneel",
            yaw: Math.PI / 4,
          });
        } else {
          councilTent.visible = false;
          crownGroup.visible = true;
          royalStandards.forEach((s) => {
            s.visible = true;
          });
          lehonti.group.visible = false;

          // King Amalickiah stands magnificent, mighty and laughing atop the summit
          const laughT = (timeInOutro - OUTRO_BEAT_2) * 7;
          const laughPitch = -0.15 + Math.sin(laughT) * 0.05;
          const laughYaw = Math.sin(laughT * 0.5) * 0.08;
          amalickiah.group.rotation.x = 0;
          amalickiah.update(delta, {
            ...summit,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "idle",
            yaw: Math.PI * 0.75,
            lookPitch: -laughPitch,
            lookYaw: Math.PI * 0.75 + laughYaw,
          });

          // All guards and servant bow before King Amalickiah
          summitGuards[0].update(delta, {
            x: summit.x - 1.8,
            y: summit.y,
            z: summit.z + 1.5,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "kneel",
            yaw: Math.PI * 0.2,
          });
          summitGuards[1].update(delta, {
            x: summit.x + 1.8,
            y: summit.y,
            z: summit.z + 1.5,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "kneel",
            yaw: -Math.PI * 0.25,
          });
          servant.update(delta, {
            x: summit.x,
            y: summit.y,
            z: summit.z + 2.2,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            runSpeed: 0,
            move: "kneel",
            yaw: 0,
          });
        }
      }

      function cleanupOutro() {
        councilTent.visible = false;
        crownGroup.visible = false;
        if (jar) jar.visible = false;
        servant.group.visible = false;
        royalStandards.forEach((s) => {
          s.visible = false;
        });
      }

      frameOpening();
      return {
        movementLocked: () => phase === "opening" || phase === "outro" || pending,
        camera: () => cinematicCamera,
        snapshot: () => ({
          openingTime,
          openingBeat:
            phase === "opening"
              ? openingTime < OPENING_BEAT_0
                ? "summit"
                : openingTime < OPENING_BEAT_1
                  ? "embassy"
                  : "warning"
              : undefined,
          outroTime,
          outroBeat:
            phase === "outro"
              ? outroTime < OUTRO_BEAT_0
                ? "ascent"
                : outroTime < OUTRO_BEAT_1
                  ? "poison"
                  : outroTime < OUTRO_BEAT_2
                    ? "command"
                    : "king"
              : undefined,
          phase,
          race: Math.min(3, race + 1),
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
        update(dt, player, input) {
          if (phase === "opening") {
            const delta = Math.min(0.1, Math.max(0, dt));
            if (input?.jump || input?.interact) {
              if (openingTime < OPENING_BEAT_0) openingTime = OPENING_BEAT_0;
              else if (openingTime < OPENING_BEAT_1) openingTime = OPENING_BEAT_1;
              else openingTime = OPENING_DURATION;
            } else {
              openingTime += delta;
            }
            const beat =
              openingTime < OPENING_BEAT_0
                ? 0
                : openingTime < OPENING_BEAT_1
                  ? 1
                  : 2;
            if (
              beat !== lastBeat ||
              lastAspect !== (hooks.viewAspect?.() ?? 16 / 9)
            ) {
              frameOpening();
            }
            const amalickiahYaw = Math.atan2(
              route[0].x - valley.x,
              route[0].z - valley.z,
            );
            amalickiah.update(delta, {
              ...valley,
              vx: 0,
              vy: 0,
              vz: 0,
              yaw: amalickiahYaw,
              grounded: true,
              runSpeed: 0,
              pointing: beat === 1 && openingTime < (OPENING_BEAT_1 - 1.5),
              lookYaw: amalickiahYaw + Math.sin(openingTime * 0.7) * 0.12,
            });
            const lehontiYaw = Math.PI / 2;
            lehonti.update(delta, {
              ...summit,
              vx: 0,
              vy: 0,
              vz: 0,
              yaw: lehontiYaw,
              grounded: true,
              runSpeed: 0,
              lookYaw: lehontiYaw + Math.sin(openingTime * 0.5) * 0.16,
            });
            if (openingTime >= OPENING_DURATION) {
              phase = "race";
              cinematicCamera = undefined;
              Object.assign(player, {
                ...trailhead,
                vx: 0,
                vy: 0,
                vz: 0,
                grounded: true,
              });
              hooks.toast(
                "Run! Follow the blue trail and warn Lehonti before the messenger reaches his summit camp.",
              );
            }
            return {
              objective:
                beat === 0
                  ? "Lehonti and his people hold the summit of Mount Antipas. They refuse to fight the Nephites."
                  : beat === 1
                    ? "In the valley, Amalickiah plots to take command. His secret messenger asks Lehonti to come down."
                    : "It is a trap. In this imagined warning race, reach Lehonti before the messenger. Follow the blue trail!",
              prompt: "",
            };
          }
          if (phase === "outro") {
            const delta = Math.min(0.1, Math.max(0, dt));
            if (input?.jump || input?.interact) {
              if (outroTime < OUTRO_BEAT_0) outroTime = OUTRO_BEAT_0;
              else if (outroTime < OUTRO_BEAT_1) outroTime = OUTRO_BEAT_1;
              else if (outroTime < OUTRO_BEAT_2) outroTime = OUTRO_BEAT_2;
              else outroTime = OUTRO_DURATION;
            } else {
              outroTime += delta;
            }
            const beat =
              outroTime < OUTRO_BEAT_0
                ? 0
                : outroTime < OUTRO_BEAT_1
                  ? 1
                  : outroTime < OUTRO_BEAT_2
                    ? 2
                    : 3;
            if (
              beat !== lastBeat ||
              lastAspect !== (hooks.viewAspect?.() ?? 16 / 9)
            ) {
              frameOutro();
            }
            updateOutroActors(delta, beat, outroTime);
            if (outroTime >= OUTRO_DURATION) {
              phase = "done";
              cinematicCamera = undefined;
              cleanupOutro();
              hooks.complete();
              return {
                objective: "Lehonti's story remembered",
                prompt: "Journey complete",
              };
            }
            return {
              objective:
                beat === 0
                  ? "Alma 47:12–14 · Amalickiah climbs nearly to the summit; Lehonti comes down to negotiate."
                  : beat === 1
                    ? "Alma 47:18 · Second in command, Amalickiah has his servant secretly poison Lehonti by degrees."
                    : beat === 2
                      ? "Alma 47:19 · Lehonti dies. Amalickiah takes chief command of the entire army."
                      : "Alma 47:35 · Marching to the city of Nephi, Amalickiah is crowned king over all the land.",
              prompt: "",
            };
          }
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
                "Good job! You arrived in time to warn Lehonti not to come down to meet Amalickiah. Lehonti refuses to leave his camp.",
                "Good job! You arrived in time to warn Lehonti again. Amalickiah has asked a second time, but Lehonti refuses to come down.",
                "Good job! You arrived in time to warn Lehonti a third time. He still refuses to come down to meet Amalickiah.",
              ];
              hooks.dialog(
                `Alma 47:${race === 0 ? "10–11" : "11"}`,
                `Message ${race + 1} · Lehonti refuses`,
                stories[race],
                () => {
                  race++;
                  pending = false;
                  if (race === 3) {
                    phase = "outro";
                    outroTime = 0;
                    lastBeat = -1;
                    frameOutro();
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
                      `Back at the trailhead. Messenger ${race + 1} is faster—climb the mountain to warn Lehonti again.`,
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
              objective: `Race ${race + 1}/3: climb the mountain to warn Lehonti (${Math.max(0, Math.ceil((segmentLength - runnerProgress) * 5))} m)`,
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
        dispose() {
          cinematicCamera = undefined;
          cleanupOutro();
        },
      };
    },
    dispose: () => {
      crowdRigs.forEach((rig) => rig.dispose());
      goldMat.dispose();
      woodMat.dispose();
      canvasMat.dispose();
      rugMat.dispose();
      land.dispose();
    },
  };
}
