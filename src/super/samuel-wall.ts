import * as T from "three";
import { material } from "./art";
import { createCharacter, type CharacterRole } from "./character";
import { createPlayer } from "./physics";
import { markScenery } from "./scenery";
import { warWorld } from "./war-world-kit";
import type { Point, WorldData } from "./worlds";
import { createSamuelAdventure } from "./samuel-adventure";
import {
  SAMUEL_BLOCKS,
  SAMUEL_EXIT,
  SAMUEL_SPAWN,
  SAMUEL_SPEAKING_POINT,
  SAMUEL_WALL,
  samuelBlockPoint,
  samuelBlockSolid,
} from "./samuel-layout";

/** Helaman 13:2–6; 16:1–8. City layout, stone route and unnamed people are imagined. */
export function buildSamuelWall(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Samuel the Lamanite · Zarahemla wall");
  const { root, solids, solid, tree } = land;
  const audience: {
    rig: ReturnType<typeof createCharacter>;
    point: Point;
    believer: boolean;
    archer: boolean;
  }[] = [];

  // One stone body owns both the rendered parapet and its walkable 8 m top.
  solid(
    {
      x: SAMUEL_WALL.x,
      y: 0,
      z: SAMUEL_WALL.z,
      w: SAMUEL_WALL.w,
      h: SAMUEL_WALL.top,
      d: SAMUEL_WALL.d,
    },
    0xb8a078,
    "Samuel solid city wall",
  );
  // Every authored protrusion is both visible and physical. Their varied
  // widths, depths, and branching heights make several routes through the
  // field, while each block's rear edge attaches to the wall face.
  SAMUEL_BLOCKS.forEach((block, index) => {
    solid(
      samuelBlockSolid(block),
      index % 3 === 0 ? 0xd0ba91 : index % 3 === 1 ? 0xc7af84 : 0xbda47c,
      `Samuel exterior jumping stone · ${block.id}`,
    );
  });
  // Short corner towers identify the entrance to the city without obstructing
  // Samuel's speaking place or the player's landing area below it.
  for (const x of [-26.5, 26.5]) {
    solid(
      { x, y: 0, z: 0, w: 5, h: 9.5, d: 5 },
      0xa9916c,
      "Solid city corner tower",
    );
    for (const dx of [-1.6, 1.6])
      solid(
        { x: x + dx, y: 9.5, z: 0, w: 0.8, h: 0.75, d: 5 },
        0x9c835f,
        "Corner tower parapet",
      );
  }
  // Mortar coursing is shallow surface relief on the already solid face.
  const course = new T.InstancedMesh(
    new T.BoxGeometry(1, 1, 1),
    material(0x8d775b),
    6,
  );
  const transform = new T.Object3D();
  for (let i = 0; i < 6; i++) {
    transform.position.set(0, 1.1 + i * 1.15, SAMUEL_WALL.d / 2 + 0.026);
    transform.scale.set(SAMUEL_WALL.w - 0.08, 0.035, 0.035);
    transform.updateMatrix();
    course.setMatrixAt(i, transform.matrix);
  }
  course.name = "Stone coursing on outer wall";
  root.add(course);
  markScenery(course, {
    kind: "decoration",
    reason:
      "Shallow mortar relief on the wall face; the wall body owns collision.",
  });

  // The city has a broad gathering lane and several explorable courts. Houses
  // stand beyond the crowd, leaving the sermon sightline unobstructed.
  for (const [x, z, w, d, h] of [
    [-35, -26, 9, 9, 5.2],
    [-33, -48, 10, 8, 6],
    [-9, -42, 12, 9, 5.5],
    [16, -43, 11, 11, 6.2],
    [34, -28, 9, 8, 5.1],
    [37, -49, 10, 9, 6.1],
  ] as const) {
    solid(
      { x, y: 0, z, w, d, h },
      z < -40 ? 0xcbb38b : 0xc5a981,
      "Solid imagined city dwelling",
    );
    const door = new T.Mesh(
      new T.PlaneGeometry(1.7, 2.6),
      new T.MeshStandardMaterial({ color: 0x72543c, side: T.DoubleSide }),
    );
    door.position.set(x, 1.3, z + d / 2 + 0.03);
    door.name = "Imagined house doorway";
    root.add(door);
    markScenery(door, {
      kind: "decoration",
      reason: "Door color on the already solid dwelling face.",
    });
  }
  // Two shade stalls offer a side court to explore, without inserting roofs
  // above the projectile lane or extra walk surfaces into the central square.
  for (const x of [-20, 22]) {
    for (const dx of [-2.4, 2.4])
      solid(
        { x: x + dx, y: 0, z: -29, w: 0.35, d: 0.35, h: 3.1 },
        0x806448,
        "Solid market post",
      );
    const awning = new T.Mesh(
      new T.BoxGeometry(5.5, 0.12, 3),
      material(0xb76f4c),
    );
    awning.position.set(x, 3.15, -29);
    awning.name = "Market shade cloth";
    root.add(awning);
    markScenery(awning, {
      kind: "decoration",
      reason:
        "Flexible overhead shade above the walking lane; supporting posts are solid.",
    });
  }
  for (const [x, z] of [
    [-43, 18],
    [-36, 44],
    [37, 22],
    [44, 45],
    [-46, -56],
    [46, -59],
  ] as const)
    tree(x, z);
  // Six low-poly mesas sit beyond the playable floor, framing countryside and
  // distant city views without creating collision or hundreds of draw calls.
  const hillGeometry = new T.IcosahedronGeometry(1, 0);
  const hillMaterial = material(0x8b9270);
  for (let i = 0; i < 6; i++) {
    const hill = new T.Mesh(hillGeometry, hillMaterial);
    hill.position.set(-72 + i * 29, -7, i % 2 ? -95 : 94);
    hill.scale.set(24, 17 + (i % 3) * 3, 18);
    hill.name = "Distant countryside ridge";
    root.add(hill);
    markScenery(hill, {
      kind: "backdrop",
      reason: "Beyond the walkable ground and world bounds.",
    });
  }

  const listeners: readonly [
    CharacterRole,
    number,
    number,
    boolean,
    boolean,
  ][] = [
    ["guard", -13, -11, false, true],
    ["sariah", -7, -11, true, false],
    ["sam", -2, -13, false, false],
    ["lamanite-laman", 4, -10, false, true],
    ["child", 8, -15, true, false],
    ["convert", 12, -11, true, false],
    ["lemuel", -16, -18, false, false],
    ["wife", -7, -20, true, false],
    ["zoram", 1, -20, false, false],
    ["guard", 16, -19, false, true],
  ];
  listeners.forEach(([role, x, z, believer, archer], i) => {
    const point: Point = { x, y: 0, z, yaw: 0 };
    const rig = createCharacter(role, { quality: "crowd" });
    rig.group.name = `Unnamed Zarahemla listener ${i + 1}`;
    rig.update(0, { ...createPlayer(x, 0, z), yaw: 0 });
    root.add(rig.group);
    audience.push({ rig, point, believer, archer });
  });

  let disposed = false;
  return {
    name: "Samuel the Lamanite",
    subtitle: "Samuel speaks from Zarahemla's wall · Helaman 13–16",
    initialObjective: "Climb the protruding stones to the top of the city wall",
    spawn: SAMUEL_SPAWN,
    solids,
    actorParent: root,
    bounds: { minX: -52, maxX: 52, minZ: -65, maxZ: 65 },
    goal: { ...SAMUEL_EXIT, radius: 3 },
    landmarks: [
      { name: "Stone climbing field", ...samuelBlockPoint(SAMUEL_BLOCKS[0]) },
      { name: "Wall-top speaking place", ...SAMUEL_SPEAKING_POINT },
      { name: "City gathering square", x: 0, y: 0, z: -16 },
      { name: "Open countryside", x: 0, y: 0, z: 38 },
    ],
    adventure: (hooks) =>
      createSamuelAdventure({ root, audience, solids }, hooks),
    dispose() {
      if (disposed) return;
      disposed = true;
      audience.forEach((entry) => entry.rig.dispose());
      land.dispose();
    },
  };
}
