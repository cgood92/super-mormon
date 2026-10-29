import * as T from "three";
import { adventureLandscape, withinTask } from "../shared/adventure-landscape";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { planStoryCamera, StoryMeshObstacles } from "../../camera/cinematic";
import { markScenery } from "../shared/scenery";
import type { Point, WorldData } from "../../runtime/worlds";

const place = (x: number, z: number): Point => ({ x, y: 0, z });
const rallySites = [place(-26, 1), place(28, -10), place(-5, -31)];
const towerRoute: Point[] = [];
for (let i = 0; i < 10; i++)
  towerRoute.push({ x: 0, y: (i + 1) * 0.4, z: -42 - i * 1.7 });
towerRoute.push({ x: 2.25, y: 4.2, z: -57.3 });
for (let i = 0; i < 10; i++)
  towerRoute.push({ x: 4.5, y: 4.4 + i * 0.4, z: -57.3 + i * 1.7 });
towerRoute.push({ x: 6.75, y: 8.2, z: -42 });
for (let i = 0; i < 10; i++)
  towerRoute.push({ x: 9, y: 8.4 + i * 0.4, z: -42 - i * 1.7 });
towerRoute.push(
  { x: 7, y: 12.4, z: -59.2 },
  { x: 6, y: 12.8, z: -60.2 },
  { x: 0, y: 12.8, z: -65 },
);
export const LIBERTY_TOWER_ROUTE: readonly Point[] = towerRoute;

/** Alma 46:11–28, 36. This city's street plan and unnamed citizens are imagined. */
export function buildTitleOfLiberty(scene: T.Scene): WorldData {
  const land = adventureLandscape(
    scene,
    "Title of Liberty · Zarahemla",
    0xbba980,
    180,
    180,
  );
  const { root, solids, solid } = land;
  scene.background = new T.Color(0xd7c8a8);
  scene.fog = new T.Fog(0xd7c8a8, 110, 235);
  const wall = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    color = 0xc9ad81,
    name = "Zarahemla wall",
  ) => solid({ x, y: 0, z, w, d, h }, color, name);
  // Separate homes leave a broad central processional street and two usable side lanes.
  for (const [x, z, w, d, h] of [
    [-47, 38, 16, 15, 8],
    [45, 36, 19, 13, 9],
    [-48, 12, 17, 15, 10],
    [48, 7, 18, 17, 8],
    [-49, -19, 17, 16, 8],
    [48, -29, 18, 16, 10],
    [-44, -53, 18, 13, 9],
    [42, -55, 18, 14, 8],
  ] as const) {
    wall(x, z, w, d, h, x < 0 ? 0xc6a67c : 0xd3b68b, "Solid city dwelling");
    // Door/awning details are inset in the physical dwelling face.
    const door = new T.Mesh(
      new T.PlaneGeometry(2.1, 3),
      new T.MeshStandardMaterial({ color: 0x694b37, side: T.DoubleSide }),
    );
    door.position.set(x + (x < 0 ? w / 2 + 0.02 : -w / 2 - 0.02), 1.5, z);
    door.rotation.y = Math.PI / 2;
    door.name = "Imagined street doorway";
    root.add(door);
    markScenery(door, {
      kind: "decoration",
      reason: "Painted doorway on an already solid house face.",
    });
  }
  // Three switchbacks climb the 12.8 m tower. Every rise is a physical terrace,
  // and the final bridge is lower than the roof, so no coplanar floor overlaps it.
  wall(0, -65, 13, 10, 12.8, 0xbda078, "Title of Liberty tower");
  towerRoute.forEach((point, i) => {
    if (i === towerRoute.length - 1 || i === towerRoute.length - 2) return;
    const bridge = i === towerRoute.length - 3;
    solid(
      {
        x: point.x,
        y: 0,
        z: point.z,
        w: bridge ? 2.8 : 2.8,
        d: bridge ? 4 : 1.7,
        h: point.y,
      },
      i % 3 === 0 ? 0xa58c69 : 0xb59870,
      bridge ? "Tower roof bridge" : "Tower switchback stair",
    );
  });
  const prayer = place(-14, 17),
    tower = towerRoute[towerRoute.length - 1];
  const roofSpecs = [
    [-47, 38, 16, 15, 8],
    [45, 36, 19, 13, 9],
    [-49, -19, 17, 16, 8],
    [-48, 12, 17, 15, 10],
    [48, 7, 18, 17, 8],
    [48, -29, 18, 16, 10],
    [-44, -53, 18, 13, 9],
    [42, -55, 18, 14, 8],
  ];
  const roofSites: Point[] = roofSpecs.map(([x, z, _w, _d, y]) => ({
    x,
    y,
    z,
  }));
  const onRoof = (player: Point, index: number) => {
    const [x, z, w, d, h] = roofSpecs[index];
    return (
      Math.abs(player.x - x) < w / 2 - 0.3 &&
      Math.abs(player.z - z) < d / 2 - 0.3 &&
      Math.abs(player.y - h) < 0.6
    );
  };
  // Broad offset terraces lead to short, readable jumping gaps; the houses
  // themselves own their roof surfaces. No overlay roof mesh is added.
  const roofRoutes = roofSites.map((roof, index) => {
    const direction = roof.x > 0 ? -1 : 1;
    const edge = roof.x + (direction * roofSpecs[index][2]) / 2;
    const route: Point[] = [place(edge + direction * 14, roof.z + 7)];
    for (let step = 0; step < 8; step++) {
      const point = {
        x: edge + direction * (12 - step * 1.5),
        y: ((step + 1) * roof.y) / 9,
        z: roof.z + (step % 2 ? 1 : 3),
      };
      solid(
        { ...point, y: 0, w: 1.4, d: 1.7, h: point.y },
        0xb79c73,
        "Rooftop jumping terrace",
      );
      route.push(point);
    }
    route.push(roof);
    return route;
  });
  root.userData.libertyRoofRoutes = roofRoutes;
  const groups = rallySites.map((base, i) => ({
    base,
    x: base.x,
    z: base.z,
    people: Array.from({ length: 4 }, (_, j) => {
      const rig = land.actor(
        j % 2 ? "sam" : "guard",
        place(base.x + (j % 2 ? 1.5 : -1.5), base.z + (j < 2 ? -1 : 1)),
        { quality: "crowd" },
      );
      rig.group.name = `Liberty volunteer ${i + 1}.${j + 1}`;
      const sword = new T.Group();
      const blade = new T.Mesh(
        new T.BoxGeometry(0.13, 1.15, 0.07),
        new T.MeshStandardMaterial({
          color: 0xc0c5c4,
          metalness: 0.65,
          roughness: 0.4,
        }),
      );
      const cross = new T.Mesh(
        new T.BoxGeometry(0.45, 0.09, 0.13),
        new T.MeshStandardMaterial({ color: 0x8d7443 }),
      );
      blade.position.y = 0.6;
      sword.add(blade, cross);
      sword.position.set(0.6, 0.85, 0);
      sword.rotation.z = -0.3;
      sword.name = "Volunteer sword held upright";
      sword.visible = false;
      rig.group.add(sword);
      markScenery(sword, {
        kind: "decoration",
        reason: "Carried equipment follows an animated volunteer.",
      });
      return { rig, sword };
    }),
  }));
  const volunteers = groups
    .flatMap((g) => g.people)
    .map(({ rig, sword }, i) => ({
      rig,
      sword,
      body: createPlayer(rig.group.position.x, 0, rig.group.position.z),
      path: [
        place(0, rig.group.position.z),
        place(0, -39),
        ...towerRoute,
        { x: -4.5 + (i % 4) * 3, y: 12.8, z: -63 - Math.floor(i / 4) * 1.5 },
      ],
      cursor: 0,
    }));
  const moveActor = (
    actor: {
      rig: (typeof volunteers)[number]["rig"];
      body: ReturnType<typeof createPlayer>;
      path: Point[];
      cursor: number;
    },
    dt: number,
    leader?: (typeof volunteers)[number],
  ) => {
    for (let remain = dt; remain > 1e-6; remain -= 1 / 60) {
      const point = actor.path[actor.cursor];
      if (
        point &&
        Math.hypot(point.x - actor.body.x, point.z - actor.body.z) < 0.32 &&
        Math.abs(point.y - actor.body.y) < 0.6
      )
        actor.cursor++;
      const next = actor.path[actor.cursor],
        dx = next ? next.x - actor.body.x : 0,
        dz = next ? next.z - actor.body.z : 0,
        d = Math.hypot(dx, dz);
      // Keep a single-file gap on the shared switchbacks. Ground trail points
      // spread back into each volunteer's own place in the marching formation.
      const waiting =
        leader &&
        next &&
        next.y > 0 &&
        leader.cursor >= actor.cursor &&
        Math.hypot(
          leader.body.x - actor.body.x,
          leader.body.y - actor.body.y,
          leader.body.z - actor.body.z,
        ) < 1.8;
      if (waiting) {
        actor.body.vx = 0;
        actor.body.vz = 0;
      }
      stepPlayer(
        actor.body,
        {
          x: !waiting && d > 0.1 ? -dx / d : 0,
          y: !waiting && d > 0.1 ? dz / d : 0,
          jump: false,
          jumpHeld: false,
        },
        Math.min(1 / 60, remain),
        0,
        solids,
      );
    }
    actor.rig.update(dt, actor.body);
  };
  let descentStarted = false;
  const camp = place(-69, -54),
    custody = place(12, 34);
  const opponents = Array.from({ length: 6 }, (_, i) => {
    const rig = land.actor(
      i === 0 ? "amalickiah" : "guard",
      place(camp.x + (i % 3) * 2, camp.z + Math.floor(i / 3) * 3),
      { quality: i === 0 ? "npc" : "crowd" },
    );
    rig.group.name =
      i === 0
        ? "Amalickiah at the wilderness camp"
        : `Amalickiah follower ${i}`;
    return rig;
  });
  const opponentWalkers = opponents.map((rig) => ({
    rig,
    body: createPlayer(rig.group.position.x, 0, rig.group.position.z),
    path: [] as Point[],
    cursor: 0,
  }));
  // Open-sided temporary custody court, an invented staging location.
  wall(7, 34, 0.7, 10, 3, 0xa98d68, "Custody court west wall");
  wall(12, 39, 10, 0.7, 3, 0xa98d68, "Custody court rear wall");
  land.actor("guard", place(-14, -14), { quality: "crowd" });
  land.actor("guard", place(19, 22), { quality: "crowd" });
  const banner = new T.Group();
  banner.name = "Carried title of liberty · rent coat on pole";
  banner.scale.setScalar(0.65);
  const pole = new T.Mesh(
    new T.CylinderGeometry(0.06, 0.08, 4.9, 7),
    new T.MeshStandardMaterial({ color: 0x654b35 }),
  );
  pole.name = "Title of Liberty flagpole";
  pole.position.y = 2.45 - 2.1;
  const cloth = new T.Mesh(
    new T.ShapeGeometry(
      new T.Shape([
        new T.Vector2(-1.4, 0.65),
        new T.Vector2(-0.7, 0.95),
        new T.Vector2(-0.35, 0.5),
        new T.Vector2(0.25, 0.55),
        new T.Vector2(0.65, 0.95),
        new T.Vector2(1.4, 0.55),
        new T.Vector2(1.2, 0.12),
        new T.Vector2(0.8, 0.22),
        new T.Vector2(0.72, -0.7),
        new T.Vector2(0.25, -0.56),
        new T.Vector2(-0.1, -0.78),
        new T.Vector2(-0.55, -0.62),
        new T.Vector2(-0.8, 0.12),
        new T.Vector2(-1.25, 0.02),
      ]),
    ),
    new T.MeshStandardMaterial({
      color: 0x335b78,
      side: T.DoubleSide,
      roughness: 1,
    }),
  );
  let bannerTexture: T.CanvasTexture | undefined;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#335b78";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "#fff0c7";
      context.textAlign = "center";
      context.font = "bold 34px Georgia, serif";
      [
        "In memory of our God,",
        "our religion, and freedom,",
        "and our peace, our wives,",
        "and our children",
      ].forEach((line, i) =>
        context.fillText(line, canvas.width / 2, 220 + i * 55, 470),
      );
      bannerTexture = new T.CanvasTexture(canvas);
      bannerTexture.colorSpace = T.SRGBColorSpace;
      bannerTexture.anisotropy = 4;
      (cloth.material as T.MeshStandardMaterial).color.set(0xffffff);
      (cloth.material as T.MeshStandardMaterial).map = bannerTexture;
    }
  }
  // Flutter about the fastening edge at the pole, not the fabric's center.
  cloth.geometry.translate(1.38, 0, 0);
  cloth.position.set(0, 3.75 - 2.1, 0);
  cloth.name = "Rent coat banner fabric · Alma 46:12 inscription";
  banner.add(pole, cloth);
  root.add(banner);
  markScenery(banner, {
    kind: "decoration",
    reason:
      "Carried fabric and pole are animated with the player, not a fixed obstacle.",
  });
  banner.visible = false;
  const coatPiece = new T.Mesh(cloth.geometry, cloth.material);
  coatPiece.name = "Moroni's coat being rent and inscribed";
  coatPiece.geometry = cloth.geometry.clone().translate(-1.38, 0, 0);
  coatPiece.rotation.x = -Math.PI / 2;
  coatPiece.position.set(prayer.x, 0.12, prayer.z + 0.7);
  coatPiece.visible = false;
  root.add(coatPiece);
  markScenery(coatPiece, {
    kind: "decoration",
    reason:
      "Thin loose garment laid on the ground during the acted coat preparation.",
  });
  // ShapeGeometry UVs use model coordinates; fit the inscription to the cloth.
  const uv = cloth.geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, (uv.getX(i) + 1.4) / 2.8, (uv.getY(i) + 0.78) / 1.73);
  let phase:
    | "prayer"
    | "prologue"
    | "roofs"
    | "tower"
    | "gather"
    | "lead"
    | "ending"
    | "done" = "prayer";
  let elapsed = 0,
    clock = 0,
    signal = 0,
    coatVisible = true,
    playerPoint = place(0, 53);
  const roofs = new Set<number>();
  const trail: Point[] = [];
  let trailStarted = false;

  const target = (): Point =>
    phase === "prayer" || phase === "prologue"
      ? prayer
      : phase === "roofs"
        ? roofSites.find((_, i) => !roofs.has(i))!
        : phase === "tower"
          ? tower
          : camp;
  const syncPose = () => {
    root.userData.moroniCoatVisible = coatVisible;
    root.userData.moroniGesture =
      phase === "prologue"
        ? elapsed < 4.5
          ? "work"
          : elapsed < 8
            ? "pray"
            : "point"
        : undefined;
  };
  syncPose();
  return {
    name: "The Title of Liberty",
    subtitle: "Moroni rallies the people · Alma 46",
    initialObjective: "Go to the quiet prayer court wearing Moroni's coat",
    spawn: place(0, 53),
    solids,
    actorParent: root,
    bounds: { minX: -79, maxX: 79, minZ: -79, maxZ: 76 },
    goal: { ...camp, radius: 6 },
    landmarks: [
      { name: "Prayer court", ...prayer },
      ...roofSites.map((p, i) => ({
        name: `Accessible rooftop ${i + 1}`,
        ...p,
      })),
      { name: "High standard", ...tower },
      { name: "Wilderness camp", ...camp },
    ],
    update(dt, player) {
      const delta = Math.min(Math.max(dt, 0), 0.1);
      clock += delta;
      if (player) playerPoint = { x: player.x, y: player.y, z: player.z };
      const gathered = ["gather", "lead", "ending", "done"].includes(phase);
      coatPiece.visible = phase === "prologue" && elapsed >= 2 && elapsed < 4.5;
      if (
        phase === "lead" &&
        (trailStarted || (playerPoint.y < 0.5 && playerPoint.z > -42))
      ) {
        trailStarted = true;
        const last = trail.at(-1);
        if (
          !last ||
          Math.hypot(last.x - playerPoint.x, last.z - playerPoint.z) > 0.65 ||
          Math.abs(last.y - playerPoint.y) > 0.4
        ) {
          trail.push({ ...playerPoint });
          volunteers.forEach((v, i) =>
            v.path.push({
              ...playerPoint,
              x: playerPoint.x + ((i % 4) - 1.5) * 1.8,
              z: playerPoint.z + (Math.floor(i / 4) - 1) * 1.8,
            }),
          );
        }
      }
      volunteers.forEach((v, i) => {
        v.sword.visible = gathered;
        if (roofs.size > 0 || gathered)
          moveActor(v, delta, phase === "lead" ? volunteers[i - 1] : undefined);
      });
      if (phase === "ending" || phase === "done")
        opponentWalkers.forEach((v, i) => {
          if (!v.path.length) {
            v.path =
              i < 2
                ? [place(-78, -78)]
                : [
                    place(-66, -40),
                    place(-66, 51),
                    place(20, 51),
                    place(20, 30),
                    place(
                      custody.x + (i % 2) * 2,
                      custody.z - Math.floor(i / 2) * 2,
                    ),
                  ];
          }
          moveActor(v, delta * 2);
          v.rig.group.visible = !(i < 2 && v.cursor >= v.path.length);
        });
      banner.visible =
        phase !== "prayer" && (phase !== "prologue" || elapsed >= 4.5);

      cloth.rotation.y = Math.sin(clock * (signal > 0 ? 12 : 5)) * 0.25;
      let beacon =
        phase === "done" || phase === "ending" || phase === "prologue"
          ? undefined
          : target();
      if (phase === "tower" && player) {
        let nearest = 0,
          score = Infinity;
        towerRoute.forEach((p, i) => {
          const d =
            Math.hypot(player.x - p.x, player.z - p.z) +
            Math.abs(player.y - p.y) * 2.5;
          if (d < score) {
            score = d;
            nearest = i;
          }
        });
        beacon = towerRoute[Math.min(towerRoute.length - 1, nearest + 2)];
      }
      land.update(dt, beacon);
    },
    adventure(hooks) {
      hooks.setAvatar("moroni");
      hooks.attachEquipment?.("rightHand", banner);
      banner.position.set(0, 0, 0);
      banner.rotation.set(0, 0, 0);
      hooks.toast(
        "Alma 46 · Explore an imagined Zarahemla. The rooftop routes and temporary custody court are invented staging.",
      );
      let cinematicCamera:
        { position: T.Vector3; focus: T.Vector3; cut: boolean } | undefined;
      let cameraClock = 0;
      const prologueAnchor = new T.Group();
      prologueAnchor.scale.setScalar(3);
      const playerActor = root.getObjectByName("moroni-character");
      const cameraActors = [
        ...(playerActor ? [{ group: playerActor }] : []),
        ...volunteers.map((v) => ({ group: v.rig.group })),
        ...opponents.map((r) => ({ group: r.group })),
      ];
      const meshObstacles = new StoryMeshObstacles(root, cameraActors);
      return {
        movementLocked: () =>
          phase === "prologue" || phase === "gather" || phase === "ending",
        camera: () => cinematicCamera,
        snapshot: () => ({
          phase,
          volunteers: volunteers.map((v) => ({
            x: v.body.x,
            y: v.body.y,
            z: v.body.z,
          })),
          gathered: descentStarted
            ? 12
            : volunteers.filter((v) => v.cursor >= v.path.length).length,
          opponentPositions: opponentWalkers.map((v) => ({
            x: v.body.x,
            y: v.body.y,
            z: v.body.z,
          })),
          movieBeat:
            phase === "ending"
              ? elapsed < 4
                ? "escape"
                : elapsed < 12
                  ? "capture"
                  : "return"
              : undefined,
          target: target(),
          roofs: [...roofs],
          roofSites,
          roofRoutes,
          coatVisible,
          prologueBeat:
            phase === "prologue"
              ? elapsed < 2
                ? "remove"
                : elapsed < 4.5
                  ? "rend-and-write"
                  : elapsed < 8
                    ? "pray"
                    : "raise"
              : undefined,
          carrying: banner.visible,
          rallySignal: signal,
          rallied: roofs.size,
          escaped: phase === "done" ? 2 : 0,
          captured: phase === "done" ? 4 : 0,
        }),
        update(dt, player, input) {
          const delta = Math.min(0.1, Math.max(0, dt));
          if (
            phase === "prayer" &&
            input.interact &&
            withinTask(player, prayer, 3.8)
          ) {
            phase = "prologue";
            elapsed = 0;
          }
          if (phase === "prologue") {
            elapsed += delta;
            coatVisible = elapsed < 2;
            if (elapsed >= 10) {
              phase = "roofs";
              hooks.toast(
                "Climb any two different rooftops. Hold action on each roof to wave the torn coat.",
              );
            }
          } else if (phase === "roofs") {
            const roof = roofSites.findIndex(
              (p, i) => !roofs.has(i) && onRoof(player, i),
            );
            signal = roof >= 0 && input.interactHeld ? signal + delta : 0;
            if (signal >= 1.5) {
              roofs.add(roof);
              signal = 0;
              hooks.toast(
                "The people see the title of liberty and begin to gather.",
              );
              if (roofs.size === 2) phase = "tower";
            }
          } else if (
            phase === "tower" &&
            input.interact &&
            withinTask(player, tower, 4)
          ) {
            phase = "gather";
            hooks.toast(
              "The armed volunteers are climbing to gather around Moroni. Wait as they arrive at the high standard.",
            );
          } else if (
            phase === "gather" &&
            volunteers.every((v) => v.cursor >= v.path.length)
          ) {
            phase = "lead";
            descentStarted = true;
            volunteers.forEach((v) => {
              v.path = [
                tower,
                ...[...towerRoute].reverse().slice(1),
                place(0, -39),
              ];
              v.cursor = 0;
            });
            trail.length = 0;
            hooks.toast(
              "The army has gathered around the standard. Lead them down the switchback stairs and out to the wilderness camp.",
            );
          } else if (phase === "lead" && withinTask(player, camp, 8)) {
            phase = "ending";
            elapsed = 0;
            hooks.toast(
              "Alma 46:29–33 · Amalickiah escapes with a few followers. The others surrender and are brought back to Zarahemla.",
            );
          } else if (phase === "ending") {
            elapsed += delta;
            if (
              elapsed >= 12 &&
              opponentWalkers.slice(2).every((v) => v.cursor >= v.path.length)
            ) {
              phase = "done";
              hooks.complete();
            }
          }
          if (
            input.interact &&
            phase === "roofs" &&
            !roofSites.some((_, i) => onRoof(player, i))
          ) {
            if (withinTask(player, camp, 10))
              hooks.toast(
                "Amalickiah's followers are gathering here. Moroni first calls the people to defend their liberty.",
              );
            else if (
              groups.some((g) => Math.hypot(player.x - g.x, player.z - g.z) < 4)
            )
              hooks.toast(
                "Citizen: We can see across the streets from the flat roofs. Look for the offset terraces beside the houses.",
              );
          }
          if (
            phase === "prologue" ||
            phase === "ending" ||
            phase === "gather"
          ) {
            cameraClock -= delta;
            if (cameraClock <= 0) {
              cameraClock = 0.25;
              prologueAnchor.position.set(player.x, player.y, player.z);
              prologueAnchor.scale.setScalar(phase === "prologue" ? 3 : 1);
              prologueAnchor.updateMatrixWorld(true);
              const anchor =
                phase === "prologue"
                  ? prologueAnchor
                  : phase === "gather"
                    ? prologueAnchor
                    : elapsed < 4
                      ? opponents[0].group
                      : opponents[2].group;
              const camera = new T.PerspectiveCamera(
                58,
                hooks.viewAspect?.() ?? 16 / 9,
                0.08,
                320,
              );
              camera.position.copy(anchor.position).add(new T.Vector3(8, 5, 8));
              camera.lookAt(anchor.position);
              const plan = planStoryCamera(
                camera,
                {
                  cutaway: true,
                  actors: [{ group: anchor }],
                  wide: phase === "prologue" ? 10 : 7,
                },
                solids,
                meshObstacles,
              );
              cinematicCamera = {
                position: plan.wide,
                focus: plan.focus,
                cut: true,
              };
            }
          } else {
            cinematicCamera = undefined;
            cameraClock = 0;
          }
          syncPose();
          const objective =
            phase === "prayer"
              ? "Go to the quiet prayer court wearing Moroni's coat"
              : phase === "prologue"
                ? elapsed < 4.5
                  ? "Moroni removes and rends his coat, then writes the title"
                  : elapsed < 8
                    ? "Moroni bows in prayer for liberty"
                    : "Moroni raises the torn coat on its pole"
                : phase === "roofs"
                  ? `Climb and wave on any two distinct building roofs (${roofs.size}/2)`
                  : phase === "tower"
                    ? "Climb the great switchback stairs and raise the banner a third time"
                    : phase === "gather"
                      ? "The armed volunteers gather around Moroni at the high standard"
                      : phase === "lead"
                        ? "Lead the armed volunteers outside the city to the back-left wilderness camp"
                        : phase === "ending"
                          ? "Amalickiah escapes; the surrendered followers return to Zarahemla"
                          : "The people covenant to maintain peace and liberty";
          return {
            objective,
            prompt:
              phase === "roofs"
                ? "Find a rooftop route · hold action on the roof to wave"
                : phase === "prayer" || phase === "tower"
                  ? "Follow the beacon · interact when you arrive"
                  : phase === "lead"
                    ? "Explore toward the back-left camp"
                    : phase === "done"
                      ? "Journey complete"
                      : "",
            carrying: banner.visible,
            holdingBanner: banner.visible,
            wave: signal > 0 || (phase === "prologue" && elapsed >= 8),
          };
        },
        dispose() {
          // Return socket equipment before the avatar/world resource passes.
          root.add(banner);
        },
      };
    },
    dispose: () => {
      bannerTexture?.dispose();
      land.dispose();
    },
  };
}
