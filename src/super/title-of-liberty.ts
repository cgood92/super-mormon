import * as T from "three";
import { adventureLandscape, withinTask } from "./adventure-landscape";
import { createCharacter, type CharacterRole } from "./character";
import { markScenery } from "./scenery";
import type { Point, WorldData } from "./worlds";

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
  const craft = place(0, 29),
    prayer = place(-14, 17),
    tower = towerRoute[towerRoute.length - 1];
  const groups = rallySites.map((base, i) => {
    const people = Array.from({ length: 4 }, (_, j) => {
      const role =
        j === 0 ? "guard" : j === 1 ? "sariah" : j === 2 ? "sam" : "child";
      const rig = (j === 0 ? land.actor : crowd)(
        role,
        place(base.x + (j % 2 ? 1.4 : -1.4), base.z + (j < 2 ? -1 : 1)),
      );
      rig.group.name = `Rally group ${i + 1} citizen ${j + 1}`;
      return rig;
    });
    return { base, people, rallied: false, x: base.x, z: base.z };
  });
  const guards = [
    land.actor("guard", place(-14, -14)),
    land.actor("guard", place(19, 22)),
  ];
  guards.forEach((guard, i) => {
    guard.group.name = `City watch patrol ${i + 1}`;
  });
  const banner = new T.Group();
  banner.name = "Carried title of liberty · rent coat on pole";
  const pole = new T.Mesh(
    new T.CylinderGeometry(0.06, 0.08, 4.9, 7),
    new T.MeshStandardMaterial({ color: 0x654b35 }),
  );
  pole.position.y = 2.45;
  const cloth = new T.Mesh(
    new T.PlaneGeometry(2.8, 1.35, 8, 3),
    new T.MeshStandardMaterial({
      color: 0xeee0bb,
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
      context.fillStyle = "#eee0bb";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#755d43";
      context.lineWidth = 12;
      context.strokeRect(23, 20, canvas.width - 46, canvas.height - 40);
      context.fillStyle = "#483a30";
      context.textAlign = "center";
      context.font = "bold 53px Georgia, serif";
      [
        "In memory of our God,",
        "our religion, and freedom,",
        "and our peace, our wives,",
        "and our children",
      ].forEach((line, i) =>
        context.fillText(line, canvas.width / 2, 125 + i * 96),
      );
      bannerTexture = new T.CanvasTexture(canvas);
      bannerTexture.colorSpace = T.SRGBColorSpace;
      bannerTexture.anisotropy = 4;
      (cloth.material as T.MeshStandardMaterial).color.set(0xffffff);
      (cloth.material as T.MeshStandardMaterial).map = bannerTexture;
    }
  }
  cloth.position.set(1.38, 3.75, 0);
  cloth.name = "Rent coat banner fabric · Alma 46:12 inscription";
  banner.add(pole, cloth);
  root.add(banner);
  markScenery(banner, {
    kind: "decoration",
    reason:
      "Carried fabric and pole are animated with the player, not a fixed obstacle.",
  });
  banner.visible = false;
  const stages = [
    {
      id: "make",
      at: craft,
      objective: "Rend Moroni's coat and fasten the title of liberty to a pole",
      ref: "Alma 46:11–12",
      title: "A coat becomes a standard",
      body: "As Moroni, you rend your coat and write a call to remember God, religion, freedom, peace, wives, and children. Fasten it to the pole and carry the banner.",
    },
    {
      id: "prayer",
      at: prayer,
      objective: "Carry the banner to the quiet court and pray",
      ref: "Alma 46:13–18",
      title: "Prayer before the rally",
      body: "Moroni bows and prays for liberty and for the people who believe in Christ. The prayer is the first act of his campaign.",
    },
    {
      id: "rally-1",
      at: rallySites[0],
      objective: "Find the west street group and raise the banner",
      ref: "Alma 46:19–21",
      title: "The first families gather",
      body: "Moroni goes among the people, waving the rent cloth and calling them to defend their rights and religion. These unnamed citizens and this street are imagined.",
    },
    {
      id: "rally-2",
      at: rallySites[1],
      objective: "Carry the standard through the east market",
      ref: "Alma 46:19–22",
      title: "People run together",
      body: "People run toward Moroni and make a covenant. Their gathering, rather than a battle, is the answer to his public call.",
    },
    {
      id: "rally-3",
      at: rallySites[2],
      objective: "Rally the families at the southern square",
      ref: "Alma 46:21–28",
      title: "The gathering grows",
      body: "More people join Moroni. In the record, he also sends others through the land to gather those who want to maintain liberty.",
    },
    {
      id: "tower",
      at: tower,
      objective:
        "Climb the switchback stairs and plant the title of liberty on the tower",
      ref: "Alma 46:36",
      title: "A standard on the towers",
      body: "Moroni later has the title of liberty raised on every tower in Nephite land. Plant the standard you carried atop this tower as the people gather to defend liberty.",
    },
  ];
  let index = 0,
    pending = false,
    done = false,
    clock = 0,
    rallySignal = 0,
    playerPoint = place(0, 54);
  const currentTarget = () => {
    if (index >= stages.length) return tower;
    if (index >= 2 && index <= 4) {
      const group = groups[index - 2];
      return place(group.x, group.z);
    }
    return stages[index].at;
  };
  return {
    name: "The Title of Liberty",
    subtitle: "Moroni rallies the people · Alma 46",
    initialObjective: stages[0].objective,
    spawn: place(0, 53),
    solids,
    actorParent: root,
    bounds: { minX: -76, maxX: 76, minZ: -76, maxZ: 76 },
    goal: { ...tower, radius: 3 },
    landmarks: [
      { name: "Moroni's workshop", ...craft },
      { name: "Prayer court", ...prayer },
      { name: "Tower of liberty", ...tower },
    ],
    update(dt, player) {
      const delta = Math.min(Math.max(dt, 0), 0.1);
      clock += delta;
      if (player) playerPoint = { x: player.x, y: player.y, z: player.z };
      groups.forEach((group, i) => {
        const destination = group.rallied
          ? place((i - 1) * 3, -40 - i * 2)
          : group.base;
        const wave = group.rallied
          ? 0
          : Math.sin(clock * (0.55 + i * 0.12) + i) * 2;
        group.x += (destination.x + wave - group.x) * Math.min(1, delta * 1.8);
        group.z += (destination.z - group.z) * Math.min(1, delta * 1.8);
        group.people.forEach((rig, j) =>
          rig.group.position.set(
            group.x + (j % 2 ? 1.25 : -1.25),
            0,
            group.z + (j < 2 ? -1 : 1),
          ),
        );
      });
      guards.forEach((guard, i) =>
        guard.group.position.set(
          (i ? 19 : -14) + Math.sin(clock * 0.7 + i) * 4,
          0,
          (i ? 22 : -14) + Math.cos(clock * 0.7 + i) * 2,
        ),
      );
      banner.visible = index >= 1;
      if (done) banner.position.set(0, 12.8, -65);
      else
        banner.position.set(playerPoint.x + 0.65, playerPoint.y, playerPoint.z);
      banner.rotation.y = Math.sin(clock * 3) * 0.1;
      cloth.rotation.y =
        Math.sin(clock * (rallySignal > 0 ? 12 : 5)) *
        (rallySignal > 0 ? 0.34 : 0.14);
      if (!done && index === 5 && player) {
        let nearest = 0,
          score = Infinity;
        towerRoute.forEach((point, i) => {
          const cost =
            Math.hypot(player.x - point.x, player.z - point.z) +
            Math.abs(player.y - point.y) * 2.5;
          if (cost < score) {
            score = cost;
            nearest = i;
          }
        });
        land.update(
          dt,
          towerRoute[Math.min(towerRoute.length - 1, nearest + 2)],
        );
      } else land.update(dt, done ? undefined : currentTarget());
    },
    adventure(hooks) {
      hooks.setAvatar("moroni");
      hooks.toast(
        "Alma 46 · Explore the imagined city as Moroni. The title of liberty is a piece of his own coat, carried on a pole.",
      );
      return {
        snapshot: () => ({
          phase: done ? "done" : stages[index].id,
          target: currentTarget(),
          index,
          pending,
          carrying: index >= 1 && !done,
          rallied: groups.filter((g) => g.rallied).length,
          rallySignal,
          groupPositions: groups.map((g) => place(g.x, g.z)),
        }),
        update(dt, player, input) {
          if (done)
            return {
              objective: "The standard is raised",
              prompt: "Journey complete",
              carrying: false,
            };
          const stage = stages[index],
            target = currentTarget(),
            near = withinTask(player, target, 3.8);
          const rallying = index >= 2 && index <= 4;
          if (rallying && !pending) {
            const movingBanner =
              near && input.interactHeld && player.runSpeed > 0.8;
            rallySignal = T.MathUtils.clamp(
              rallySignal +
                Math.min(0.1, Math.max(0, dt)) * (movingBanner ? 1 : -0.4),
              0,
              1.35,
            );
          }
          const patrol = guards.find(
            (guard) =>
              Math.hypot(
                player.x - guard.group.position.x,
                player.z - guard.group.position.z,
              ) < 2.2,
          );
          if (input.interact && patrol && !pending && !near)
            hooks.toast(
              "City watch: The streets are unsettled. Keep the banner visible and call people together.",
            );
          if (input.interact && near && rallying && rallySignal < 1.25)
            hooks.toast(
              "Keep moving among this group while holding the action button to wave Moroni's banner.",
            );
          if (
            input.interact &&
            near &&
            !pending &&
            (!rallying || rallySignal >= 1.25)
          ) {
            pending = true;
            hooks.dialog(
              stage.ref,
              stage.title,
              stage.body,
              () => {
                if (index >= 2 && index <= 4) groups[index - 2].rallied = true;
                index++;
                rallySignal = 0;
                pending = false;
                if (index === stages.length) {
                  done = true;
                  hooks.complete();
                }
              },
              {
                focus: { x: target.x, y: target.y + 1.25, z: target.z },
                wide: index === 5 ? 7 : 5,
                playerGesture:
                  index === 0 ? "work" : index === 1 ? "pray" : "point",
                actors:
                  index >= 2 && index <= 4
                    ? groups[index - 2].people.map((person, i) => ({
                        group: person.group,
                        gesture: i === 0 ? ("talk" as const) : undefined,
                        speaker: i === 0,
                      }))
                    : [],
              },
            );
          }
          return {
            objective:
              rallying && rallySignal < 1.25
                ? `${stage.objective} · wave while moving (${Math.round((rallySignal / 1.25) * 100)}%)`
                : stage.objective,
            prompt: near
              ? rallying && rallySignal < 1.25
                ? "Hold action and move through the group"
                : "Interact to continue"
              : `Seek ${stage.id === "tower" ? "the tower" : "the blue beacon"}`,
            carrying: index >= 1,
          };
        },
        dispose() {},
      };
    },
    dispose: () => {
      bannerTexture?.dispose();
      crowdRigs.forEach((rig) => rig.dispose());
      land.dispose();
    },
  };
}
