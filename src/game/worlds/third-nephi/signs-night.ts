import * as T from "three";
import { markScenery } from "../shared/scenery";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import type { Point, WorldData } from "../../runtime/worlds";

export const SIGNS_ROUTE: Point[] = [
  { x: 0, y: 0, z: 12 },
  { x: -18, y: 0, z: 10 },
  { x: -18, y: 4, z: -12 },
  { x: -10, y: 4, z: -12 },
  { x: -5, y: 0, z: -24 },
  { x: 0, y: 0, z: -26 },
  { x: 0, y: 4, z: -44 },
  { x: 0, y: 0, z: 12 },
];

/** 3 Nephi 1. The town, errands and observation routes are imagined. */
export function buildSignsNight(scene: T.Scene): WorldData {
  const land = warWorld(scene, "A town watching for the sign");
  const { solid, actor, decor, root } = land;
  const plaza = SIGNS_ROUTE[0],
    roof = SIGNS_ROUTE[2],
    overlook = SIGNS_ROUTE[6];
  // Open-front homes: walls and roofs have actual thickness, with no duplicate floors.
  function home(x: number, z: number, color: number) {
    solid(
      { x: x - 4.8, y: 0, z, w: 0.4, h: 3.6, d: 8 },
      color,
      "Home west wall",
    );
    solid(
      { x: x + 4.8, y: 0, z, w: 0.4, h: 3.6, d: 8 },
      color,
      "Home east wall",
    );
    solid(
      { x, y: 0, z: z - 3.8, w: 10, h: 3.6, d: 0.4 },
      color,
      "Home rear wall",
    );
    solid({ x, y: 3.6, z, w: 10, h: 0.4, d: 8 }, 0xc19c70, "Walkable roof");
  }
  home(-18, -12, 0xc6a77d);
  home(18, -8, 0xb99d81);
  home(22, 18, 0xd0b391);
  home(-27, 25, 0xad977c);
  // Continuous broad stairs rise one quarter metre at a time; each owns its tread.
  for (let i = 0; i < 16; i++) {
    solid(
      { x: -18, y: 0, z: 7.5 - i, w: 3.4, d: 1, h: (i + 1) / 4 },
      0xb39b79,
      "Roof stair tread",
    );
    solid(
      { x: 0, y: 0, z: -27.5 - i, w: 5, d: 1, h: (i + 1) / 4 },
      0xa89b80,
      "Overlook stair tread",
    );
  }
  solid(
    { x: -10, y: 3.65, z: -12, w: 6, h: 0.35, d: 2.8 },
    0x88704d,
    "Rooftop footbridge",
  );
  solid(
    { x: 0, y: 0, z: -46, w: 14, d: 7, h: 4 },
    0xb9aa8f,
    "Broad watch terrace",
  );
  for (const [x, z] of [
    [-34, -25],
    [29, -29],
    [36, 6],
    [-37, 8],
    [-24, -43],
    [21, -49],
  ])
    land.tree(x, z);
  // A low garden maze offers an optional winding route, with reachable gaps.
  for (const [x, z, w, d] of [
    [24, -25, 12, 0.6],
    [30, -20, 0.6, 10],
    [23, -15, 7, 0.6],
    [18, -20, 0.6, 5],
  ])
    solid({ x, y: 0, z, w, d, h: 1.1 }, 0x938f69, "Garden boundary");
  solid(
    { x: 22, y: 0, z: -22, w: 2, d: 2, h: 0.65 },
    0xb6986b,
    "Garden sitting stone",
  );
  solid(
    { x: -29, y: 0, z: 25, w: 2, d: 1.4, h: 0.8 },
    0x886448,
    "Potter workbench",
  );
  const nephi = actor(
    "jacob",
    { x: -4, y: 4, z: -47 },
    "Nephi, son of Nephi, grandson of Helaman",
  );
  nephi.group.rotation.y = Math.PI / 2;
  const residents = [
    {
      role: "wife" as const,
      x: 2,
      z: 12,
      name: "Concerned parent",
      line: "Samuel told of a night filled with light. We are watching together.",
    },
    {
      role: "child" as const,
      x: -20,
      z: -12,
      y: 4,
      name: "Rooftop watcher",
      line: "The broad stairs lead down safely. Beyond the bridge you can see the whole town.",
    },
    {
      role: "zoram" as const,
      x: 19,
      z: -21,
      name: "Garden keeper",
      line: "This quiet garden is open to everyone who needs a place to wait.",
    },
    {
      role: "sam" as const,
      x: -26,
      z: 24,
      name: "Potter",
      line: "I have put my work aside. Some of our neighbors are afraid; I will stay with them.",
    },
    {
      role: "sariah" as const,
      x: 21,
      z: 18,
      name: "Weaver",
      line: "There is room in this house for another family tonight.",
    },
    {
      role: "convert" as const,
      x: 5,
      z: -40,
      name: "Terrace watcher",
      line: "This is the younger Nephi, who keeps the records after his father departed.",
    },
  ];
  residents.forEach((r) =>
    actor(r.role, { x: r.x, y: r.y ?? 0, z: r.z }, r.name),
  );
  const discoveries = [
    { name: "Garden refuge", x: 22, y: 0, z: -22 },
    { name: "Potter's courtyard", x: -29, y: 0, z: 25 },
    { name: "Roof bridge vista", x: -9, y: 4, z: -12 },
  ];
  const star = decor(
    { x: 9, y: 30, z: -56, w: 0.6, h: 0.6, d: 0.6 },
    0xfff7cf,
    "New star",
    "Distant sky light, outside playable space",
  );
  star.visible = false;
  const beacon = new T.Mesh(
    new T.OctahedronGeometry(0.65),
    new T.MeshBasicMaterial({ color: 0xffd477 }),
  );
  beacon.name = "Next route landmark";
  markScenery(beacon, {
    kind: "decoration",
    reason:
      "Floating navigation diamond above head height, never a walk surface",
  });
  root.add(beacon);
  beacon.position.set(plaza.x, plaza.y + 3.4, plaza.z);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    land.dispose();
  };
  return {
    name: "Night Without Darkness",
    subtitle: "3 Nephi 1 · A town waits for Samuel's promised sign",
    spawn: { x: 0, y: 0, z: 27 },
    solids: land.solids,
    actorParent: root,
    bounds: { minX: -49, maxX: 49, minZ: -62, maxZ: 60 },
    goal: plaza,
    landmarks: [
      { name: "Gathering square", ...plaza },
      { name: "West rooftop stairs", ...SIGNS_ROUTE[1] },
      { name: "North watch terrace", ...overlook },
      ...discoveries,
    ],
    initialObjective:
      "Find the gathering square, then explore the west rooftop route",
    dispose,
    adventure(hooks) {
      let stage = 0,
        elapsed = 0,
        completed = false,
        pending = false,
        stopped = false;
      const found = new Set<string>();
      const objectives = [
        "Reach the gathering square beside the waiting families",
        "Take the west stairs to the rooftop watcher",
        "Follow the north road and broad stairs to the watch terrace",
        "Watch the sunset: the promised sign is God's gift",
        "Return to the families in the gathering square",
        "The sign has come. Explore the town and its hidden places",
      ];
      return {
        snapshot: () => ({
          stage,
          elapsed,
          completed,
          pending,
          discoveries: [...found],
          signVisible: star.visible,
          targets: { plaza, roof, overlook, discoveries },
        }),
        update(dt, player, input) {
          if (stopped || disposed) return { objective: "", prompt: "" };
          const delta = Number.isFinite(dt)
            ? Math.max(0, Math.min(dt, 0.1))
            : 0;
          discoveries.forEach((d) => {
            if (!found.has(d.name) && nearWarPoint(player, d, 2)) {
              found.add(d.name);
              hooks.toast(`Discovered: ${d.name}`);
            }
          });
          if (stage === 0 && nearWarPoint(player, plaza, 3)) stage = 1;
          else if (stage === 1 && nearWarPoint(player, roof, 3)) stage = 2;
          else if (stage === 2 && nearWarPoint(player, overlook, 4)) {
            stage = 3;
            elapsed = 0;
            hooks.toast(
              "Nephi prayed for his people. The Lord promised that the sign would come that night.",
            );
          } else if (stage === 3) {
            elapsed += delta;
            // Time is condensed for the telling; exploration does not earn or cause the sign.
            const color = new T.Color(0xd4a777).lerp(
              new T.Color(0xc1e0e8),
              Math.min(1, elapsed / 7),
            );
            scene.background = color;
            if (scene.fog instanceof T.Fog) scene.fog.color.copy(color);
            if (elapsed >= 7) {
              star.visible = true;
              stage = 4;
              hooks.toast(
                "The sun has set, yet the town remains filled with light. A new star appears.",
              );
            }
          } else if (
            stage === 4 &&
            nearWarPoint(player, plaza, 3) &&
            !completed
          ) {
            completed = true;
            stage = 5;
            hooks.complete();
          }
          const target =
            stage === 0 || stage === 4 ? plaza : stage === 1 ? roof : overlook;
          beacon.visible = stage !== 5 && stage !== 3;
          beacon.position.set(target.x, target.y + 3.4, target.z);
          beacon.rotation.y += delta;
          const resident = residents.find((r) =>
            nearWarPoint(player, { x: r.x, y: r.y ?? 0, z: r.z }, 2.8),
          );
          if (input.interact && resident && !pending) {
            pending = true;
            hooks.dialog(
              "Imagined inhabitant",
              resident.name,
              resident.line,
              () => {
                if (!stopped && !disposed) pending = false;
              },
            );
          }
          return {
            objective: objectives[stage],
            prompt: resident ? `Talk with ${resident.name.toLowerCase()}` : "",
          };
        },
        dispose() {
          stopped = true;
          pending = false;
        },
      };
    },
  };
}
