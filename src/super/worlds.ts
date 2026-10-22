/// <reference types="vite/client" />
import * as THREE from "three";
import type { Climbable } from "./physics";
import {
  ambient,
  banner,
  box,
  column,
  datePalm,
  label,
  oilLamp,
  painting,
  palette,
  vessel,
} from "./art";

export type WorldId =
  "hub" | "streets" | "house" | "palace" | "trade" | "night";
export type Solid = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
};
export type Point = { x: number; y: number; z: number; yaw?: number };
export type WorldData = {
  name: string;
  subtitle: string;
  spawn: Point;
  solids: Solid[];
  portals?: { id: WorldId; x: number; y: number; z: number; title: string }[];
  treasures?: { id: string; name: string; x: number; y: number; z: number }[];
  climbables?: Climbable[];
  tokens?: { id: string; x: number; y: number; z: number }[];
  carryables?: { id: string; name: string; x: number; y: number; z: number }[];
  delivery?: { x: number; y: number; z: number; radius: number };
  tutorials?: {
    id: string;
    title: string;
    instruction: string;
    x: number;
    y: number;
    z: number;
    radius: number;
  }[];
  practiceBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  story?: {
    laban: Point;
    treasury?: Point;
    plates?: Point;
    gate: Point;
    cave?: Point;
    brothers: Point;
  };
  goal: { x: number; y: number; z: number; radius?: number };
  escapeGoal?: { x: number; y: number; z: number; radius?: number };
  pursuers?: { x: number; y: number; z: number }[];
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  dispose?: () => void;
};

function makeWorld(
  scene: THREE.Scene,
  mode: "gallery" | "jerusalem" | "interior",
) {
  const priorChildren = new Set(scene.children);
  const priorBackground = scene.background;
  const priorFog = scene.fog;
  const group = new THREE.Group();
  scene.add(group);
  ambient(scene, mode);
  const lighting = scene.children.filter(
    (child) => !priorChildren.has(child) && child !== group,
  );
  const solids: Solid[] = [];
  const add = (
    x: number,
    ybase: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    name = "",
  ) => {
    solids.push({ x, y: ybase, z, w, h, d });
    return box(group, x, ybase, z, w, h, d, color, name);
  };
  const decor = (
    x: number,
    ybase: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    name = "",
  ) => box(group, x, ybase, z, w, h, d, color, name);
  const finish = () => {
    const dispose = () => {
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const mat of materials) {
          if (
            mat instanceof THREE.MeshStandardMaterial ||
            mat instanceof THREE.MeshBasicMaterial
          )
            mat.map?.dispose();
          mat.dispose();
        }
      });
      scene.remove(group);
      for (const light of lighting) scene.remove(light);
      scene.background = priorBackground;
      scene.fog = priorFog;
    };
    return { solids, dispose };
  };
  return { group, add, decor, finish };
}

function gallery(scene: THREE.Scene): WorldData {
  const { group, add, decor, finish } = makeWorld(scene, "gallery");
  decor(0, -0.55, 0, 40, 0.55, 48, 0xd5d2c8, "gallery floor");
  // A broad, contemporary hall inspired by the Conference Center, with daylight above.
  // The west wall opens into the optional movement studio at z=6..13.
  add(-20, 0, -9, 0.9, 10, 30, 0xc7c5bc);
  add(-20, 0, 18.5, 0.9, 10, 11, 0xc7c5bc);
  add(20, 0, 0, 0.9, 10, 48, 0xc7c5bc);
  add(0, 0, 24, 40, 10, 0.9, 0xbfc4c1);
  add(0, 0, -24, 40, 10, 0.9, 0xbfc4c1);
  decor(-32.5, -0.55, 3.5, 25, 0.55, 35, 0xd5d2c8, "movement studio floor");
  add(-45, 0, 3.5, 0.9, 8, 35, 0xc7c5bc, "studio west wall");
  add(-32.5, 0, -14, 25, 8, 0.9, 0xc7c5bc, "studio back wall");
  add(-32.5, 0, 21, 25, 8, 0.9, 0xc7c5bc, "studio front wall");
  for (const x of [-16, 16]) {
    for (const z of [-11, 9]) {
      column(group, x, z, 8.2, 0.48, 0xe4e1d6);
      add(x, 0, z, 0.95, 8.2, 0.95, 0xe4e1d6);
    }
  }
  for (const x of [-11, 0, 11]) {
    add(x, 0, -18, 6.8, 0.18, 5.6, 0xb8c3c7, "painting platform");
    decor(x, 0, -21.4, 6.5, 7.2, 0.2, 0xf2eee4);
    painting(
      group,
      x,
      0.7,
      -20.98,
      x === 0
        ? `${import.meta.env?.BASE_URL ?? "/"}art/palace.png`
        : x < 0
          ? `${import.meta.env?.BASE_URL ?? "/"}art/streets.png`
          : `${import.meta.env?.BASE_URL ?? "/"}art/house.png`,
      x === 0 ? 0xffffff : x < 0 ? 0xe7e4db : 0xe7f0ec,
    );
  }
  label(group, "JERUSALEM STREETS", -11, 0.61, -17.65, 4.2);
  label(group, "LABAN’S PALACE", 0, 0.61, -17.65, 4.0);
  label(group, "LEHI’S HOUSE", 11, 0.61, -17.65, 3.6);
  for (const [z, file, title] of [
    [-5, "trade.png", "THE TREASURE OFFER"],
    [5, "night.png", "JERUSALEM BY NIGHT"],
  ] as const) {
    const alcove = new THREE.Group();
    alcove.position.set(18.5, 0, z);
    alcove.rotation.y = -Math.PI / 2;
    group.add(alcove);
    painting(
      alcove,
      0,
      0.7,
      0,
      `${import.meta.env?.BASE_URL ?? "/"}art/${file}`,
      0xffffff,
    );
    label(alcove, title, 0, 0.61, 3.33, 4.5, 0.5);
    add(17.5, 0, z, 5.6, 0.18, 6.8, 0xb8c3c7, "painting platform");
  }
  // Long, dark acoustic panels and linear skylights give the hall a modern scale.
  for (const x of [-13.5, -8, -2.5, 3, 8.5, 14])
    decor(x, 9.2, 0, 0.2, 0.13, 44, 0x657b83, "skylight mullion");
  for (const z of [-11, -4, 3, 10]) {
    decor(0, 9.2, z, 38, 0.12, 0.15, 0xe2e9e7, "skylight beam");
  }
  for (const x of [-18.2, 18.2])
    for (const z of [-16, -6, 4, 14])
      decor(x, 0.01, z, 0.75, 0.05, 3.7, 0xa0b0b2);
  label(group, "MOVEMENT STUDIO", -23.5, 2.6, 10, 5.1);
  label(group, "CRAWL", -27, 1.45, 13, 2.2, 0.45);
  add(-28.6, 0, 11, 0.35, 1.4, 3.3, 0x879a91, "crawl arch support");
  add(-25.4, 0, 11, 0.35, 1.4, 3.3, 0x879a91, "crawl arch support");
  add(-27, 1.02, 11, 3.5, 0.38, 3.3, 0xc2c9be, "crawl arch");
  add(-34, 0, 8, 3.2, 2.25, 3.2, 0xa5b6a5, "ledge practice block");
  label(group, "JUMP + CLIMB", -34, 2.3, 8, 2.9, 0.42);
  add(-40, 0, 3, 0.32, 3.6, 0.32, 0x7c6850, "climbing pole");
  decor(-40, 3.6, 3, 0.6, 0.12, 0.6, 0xc2a66d);
  label(group, "CLIMB", -40, 0.45, 5, 2, 0.4);
  add(-34, 0, -4, 1.8, 1, 4.5, 0xb4c2b0, "jump practice wall");
  add(-41, 0, -6, 0.55, 4.5, 5, 0x9dada6, "wall kick practice wall");
  label(group, "JUMP GARDEN", -34, 0.45, -1, 4.2);
  label(group, "CARRY TO THE RING", -28, 0.45, -11, 4.5, 0.55);
  const delivery = { x: -37, y: 0, z: -9, radius: 1.4 };
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.06, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xd3aa56 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(delivery.x, 0.07, delivery.z);
  group.add(ring);
  return {
    name: "The Gallery",
    subtitle: "A place of reflection before the journey",
    spawn: { x: 0, y: 0, z: 17, yaw: Math.PI },
    climbables: [
      { id: "gallery-pole", x: -40, z: 3, y: 0, height: 3.6, radius: 0.2 },
    ],
    tokens: [
      { id: "arch", x: -27, y: 0.4, z: 11 },
      { id: "ledge", x: -34, y: 2.75, z: 8 },
      { id: "pole", x: -40, y: 4.05, z: 3 },
      { id: "jump", x: -34, y: 1.5, z: -4 },
      { id: "wall", x: -39.8, y: 2.7, z: -6 },
      { id: "explore", x: -28, y: 0.55, z: -4 },
    ],
    carryables: [
      { id: "practice-bundle", name: "Practice bundle", x: -26, y: 0.3, z: -9 },
    ],
    delivery,
    portals: [
      { id: "streets", x: -11, y: 0, z: -20.4, title: "Jerusalem Streets" },
      { id: "palace", x: 0, y: 0, z: -20.4, title: "Laban’s Palace" },
      { id: "house", x: 11, y: 0, z: -20.4, title: "Lehi’s House" },
      { id: "trade", x: 17.8, y: 0, z: -5, title: "The Treasure Offer" },
      { id: "night", x: 17.8, y: 0, z: 5, title: "Jerusalem by Night" },
    ],
    goal: { x: 0, y: 0, z: -20.4, radius: 2.2 },
    tutorials: [
      {
        id: "arch",
        title: "Crawl",
        instruction:
          "Use {crouch} and move beneath the low arch. Find the token underneath.",
        x: -24,
        y: 0,
        z: 11,
        radius: 3.5,
      },
      {
        id: "ledge",
        title: "Jump and climb",
        instruction:
          "Jump toward the ledge, then {up} or {jump} to pull up. {crouch} lets go.",
        x: -32,
        y: 0,
        z: 8,
        radius: 4,
      },
      {
        id: "pole",
        title: "Climb the pole",
        instruction:
          "Jump toward the pole, then use {up} / {down} to climb. {jump} springs away.",
        x: -39,
        y: 0,
        z: 4,
        radius: 3.5,
      },
      {
        id: "jump",
        title: "Chain jumps",
        instruction:
          "Press {jump} again as you LAND for a double jump. Keep running and chain a third landing jump.",
        x: -33,
        y: 0,
        z: -2,
        radius: 4,
      },
      {
        id: "wall",
        title: "Wall kick",
        instruction: "Jump toward the wall, then press {jump} to kick away.",
        x: -39,
        y: 0,
        z: -5,
        radius: 3.5,
      },
      {
        id: "explore",
        title: "Carry and deliver",
        instruction:
          "{action} picks up the bundle. {crouch} + {action} sets it in the gold ring. {action} alone throws.",
        x: -27,
        y: 0,
        z: -8,
        radius: 4,
      },
      {
        id: "long-jump",
        title: "Long jump",
        instruction:
          "Run, use {crouch}, then {jump} to leap forward. Hold {jump} through the leap.",
        x: -27,
        y: 0,
        z: 4,
        radius: 3,
      },
      {
        id: "backflip",
        title: "Backflip",
        instruction:
          "Stand still. Use {crouch}, then {jump} to flip backward. Try it on this clear floor.",
        x: -25,
        y: 0,
        z: -1,
        radius: 3,
      },
      {
        id: "sideflip",
        title: "Side somersault",
        instruction:
          "Run one way, quickly reverse direction, and press {jump}. Keep trying until you flip!",
        x: -37,
        y: 0,
        z: 15,
        radius: 3,
      },
    ],
    practiceBounds: { minX: -44.3, maxX: -20.5, minZ: -13.3, maxZ: 20.3 },
    bounds: { minX: -44.3, maxX: 19.3, minZ: -23.3, maxZ: 23.3 },
    ...finish(),
  };
}

function cityBlock(
  add: ReturnType<typeof makeWorld>["add"],
  decor: ReturnType<typeof makeWorld>["decor"],
  group: THREE.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: number,
): void {
  // Flat roofs, plaster parapets, timber lintels, and street-facing clay vessels.
  add(x, 0, z, w, h, d, color, "Jerusalem dwelling");
  decor(x, h, z, w + 0.25, 0.17, d + 0.25, palette.paleStone, "flat roof");
  for (const side of [-1, 1]) {
    decor(
      x + side * (w / 2 - 0.12),
      h + 0.17,
      z,
      0.24,
      0.4,
      d,
      palette.sandstone,
    );
    decor(
      x,
      h + 0.17,
      z + side * (d / 2 - 0.12),
      w,
      0.4,
      0.24,
      palette.sandstone,
    );
  }
  const face = z > 0 ? z - d / 2 - 0.04 : z + d / 2 + 0.04;
  decor(x, 0, face, Math.min(1.6, w / 3), 2.25, 0.13, palette.timber);
  decor(
    x,
    2.28,
    face + (z > 0 ? -0.09 : 0.09),
    Math.min(2.1, w / 2.5),
    0.18,
    0.28,
    palette.timber,
  );
  for (const offset of [-w / 3.3, w / 3.3]) {
    decor(x + offset, 2.2, face, 0.65, 0.85, 0.14, palette.indigo);
    decor(x + offset, 3.07, face, 0.8, 0.13, 0.3, palette.timber);
  }
  vessel(group, x + w / 2 - 0.7, 0, face + (z > 0 ? -0.6 : 0.6), 1.1);
}

function streets(scene: THREE.Scene): WorldData {
  const { group, add, decor, finish } = makeWorld(scene, "jerusalem");
  decor(0, -0.5, 0, 80, 0.5, 80, 0xc4a780, "Jerusalem earth");
  // The central route is at least 6 m wide; western alleys lead to Lehi's door.
  const blocks: [number, number, number, number, number, number][] = [
    [-14, 14, 10, 10, 4.2, 0xbfa17d],
    [14, 14, 10, 10, 5, 0xd9bd94],
    [-14, 0, 10, 10, 5.4, 0xd8b18a],
    [14, 0, 10, 10, 4.3, 0xb68e69],
    [-14, -15, 10, 10, 5, 0xcfad86],
    [-27, -15, 8, 10, 5.1, 0xd1ac84],
    [14, -15, 10, 10, 5.4, 0xc49a70],
    [-26, 3, 9, 15, 5.4, 0xc39b72],
    [26, -5, 9, 15, 5.6, 0xe0bd91],
  ];
  for (const [x, z, w, d, h, c] of blocks)
    cityBlock(add, decor, group, x, z, w, d, h, c);
  // Broad 0.35 m risers let the player walk smoothly onto the roof route.
  for (let i = 0; i < 12; i++)
    add(8.0, i * 0.35, 23 - i * 1.1, 2.1, 0.35, 1.1, 0xc5a681, "roof stair");
  add(8, 4.2, 9, 4.8, 0.35, 3.4, 0xd4b690, "roof landing");
  // Small ledges support optional jumps across the east side without forcing them.
  add(5.3, 2, 2.5, 2.7, 0.38, 2.4, 0xb9916e, "street ledge");
  add(7.3, 3, -2.0, 2.6, 0.38, 2.4, 0xb9916e, "street ledge");
  for (const z of [-25, 27]) {
    add(0, 0, z, 76, 7.5, 1, 0xa98b69, "city wall");
    for (let x = -36; x <= 36; x += 4)
      decor(x, 7.5, z, 2.6, 0.75, 1.4, 0xb89a74, "crenellation");
  }
  add(-38, 0, 0, 1, 7.5, 55, 0xa98b69);
  add(38, 0, 0, 1, 7.5, 55, 0xa98b69);
  for (const z of [-19, -9, 4, 16]) {
    decor(-3.5, 0.02, z, 0.16, 0.05, 3.5, 0xa78968, "paving seam");
    decor(3.5, 0.02, z, 0.16, 0.05, 3.5, 0xa78968, "paving seam");
  }
  for (const [x, z] of [
    [-3, 11],
    [4, -10],
    [-24, -19],
  ] as const) {
    datePalm(group, x, z, 4.8);
    add(x, 0, z, 0.32, 4.8, 0.32, palette.timber, "palm trunk");
  }
  for (const [x, z] of [
    [-5.3, -6],
    [4.8, 7],
    [-23, 18],
  ] as const) {
    add(x, 0, z, 1.8, 1.05, 1, palette.timber, "market table");
    vessel(group, x, 1.05, z, 0.75);
  }
  decor(-22.93, 0.02, -15, 0.14, 2.8, 2.8, palette.indigo, "Lehi door");
  decor(-22.85, 2.82, -15, 0.28, 0.18, 3.2, palette.timber, "door lintel");
  const houseSign = label(group, "LEHI’S HOUSE", -22.78, 3.55, -15, 2.5);
  houseSign.rotation.y = Math.PI / 2;
  return {
    name: "Jerusalem",
    subtitle: "Find the house beyond the city streets",
    spawn: { x: 0, y: 0, z: 21, yaw: Math.PI },
    climbables: [
      [-3, 11],
      [4, -10],
      [-24, -19],
    ].map(([x, z]) => ({
      id: `street-palm-${x}-${z}`,
      x,
      z,
      y: 0,
      height: 4.8,
      radius: 0.23,
    })),
    tokens: [
      { id: "roof-route", x: 8, y: 5, z: 9 },
      { id: "palm-view", x: -3, y: 4.9, z: 11 },
    ],
    carryables: [
      { id: "market-bundle", name: "Supply bundle", x: 4, y: 0.3, z: 19 },
    ],
    portals: [
      { id: "house", x: -21.5, y: 0, z: -15, title: "Enter Lehi’s House" },
    ],
    goal: { x: -21.5, y: 0, z: -15, radius: 2.2 },
    pursuers: [
      { x: -6, y: 0, z: 24 },
      { x: 7, y: 0, z: 23 },
    ],
    bounds: { minX: -37.2, maxX: 37.2, minZ: -24.2, maxZ: 26.2 },
    ...finish(),
  };
}

function house(scene: THREE.Scene): WorldData {
  const { group, add, decor, finish } = makeWorld(scene, "interior");
  decor(0, -0.4, 0, 36, 0.4, 42, 0xc9af88, "courtyard paving");
  // Courtyard walls with a 4.4 m front gate and open roof over the center.
  add(-15, 0, 0, 0.9, 5.5, 38, 0xb69772);
  add(15, 0, 0, 0.9, 5.5, 38, 0xb69772);
  add(0, 0, -19, 31, 5.5, 0.9, 0xb69772);
  add(-9, 0, 19, 13, 5.5, 0.9, 0xb69772);
  add(9, 0, 19, 13, 5.5, 0.9, 0xb69772);
  add(0, 4.6, 19, 5, 0.9, 0.9, 0xb69772, "gate lintel");
  for (const x of [-11, 11])
    for (const z of [-13, -3, 7, 14]) {
      column(group, x, z, 4.8, 0.37, palette.paleStone);
      add(x, 0, z, 0.65, 4.8, 0.65, palette.paleStone);
    }
  // West rooms are divided with wide 3 m doorways. The roof is a true solid.
  add(-7.2, 0, -5.5, 15, 4.5, 0.55, 0xd0b18b, "room wall");
  add(-11.0, 0, 5.5, 7, 4.5, 0.55, 0xd0b18b, "room wall");
  add(-2.7, 0, 5.5, 5.2, 4.5, 0.55, 0xd0b18b, "room wall");
  const roof = add(
    -7.4,
    4.55,
    0,
    15,
    0.55,
    12,
    0x806847,
    "camera-occludable roof",
  );
  const roofMaterial = roof.material as THREE.MeshStandardMaterial;
  roofMaterial.transparent = true;
  roofMaterial.opacity = 0.38;
  roof.castShadow = false;
  for (const z of [-4.5, -1, 3.2])
    decor(-7, 0.01, z, 10, 0.035, 0.11, 0xb89b74, "floor seam");
  // East gallery: shallow steps lead to the second storey without repeated jumps.
  for (let i = 0; i < 9; i++)
    add(
      6.5,
      i * 0.35,
      15.6 - i * 0.95,
      3.2,
      0.35,
      0.95,
      i % 2 ? 0xc3a27b : 0xd2b18a,
      "gallery stair",
    );
  add(8.8, 3, 0, 10, 0.28, 15.8, 0x8e6a48, "second-storey floor");
  for (const z of [-7.8, 7.8]) {
    decor(8.8, 3.28, z, 10, 0.72, 0.22, 0x866342, "gallery rail");
    for (const x of [4.1, 6.8, 9.5, 12.2])
      decor(x, 3.28, z, 0.13, 0.75, 0.13, palette.timber);
  }
  // Tables, benches, baskets, jars and a low loft make the wealth tangible.
  for (const [x, z, w, d] of [
    [-9, -10, 3.3, 1.8],
    [-8, 10, 2.7, 1.4],
    [1, -11, 3.1, 1.6],
  ] as const) {
    add(x, 0, z, w, 0.85, d, palette.timber, "cedar table");
    decor(x, 0.78, z, w + 0.12, 0.13, d + 0.1, 0x8c6745);
  }
  add(-12.4, 0, -15.6, 2.5, 1.05, 1.2, 0x806044, "treasure chest");
  add(12.2, 3.28, -5.9, 2.3, 0.82, 1.2, palette.timber, "upper chest");
  for (const [x, z, scale] of [
    [-4, 10, 0.8],
    [-12, 2, 1.4],
    [3, -5, 1],
    [12.5, 12, 1.2],
  ] as const)
    vessel(group, x, 0, z, scale);
  for (const [x, y, z] of [
    [-3, 0.9, -10],
    [-11, 0.9, 10],
    [2, 1, -11],
    [12.2, 4.1, -5.9],
  ] as const)
    oilLamp(group, x, y, z);
  for (const x of [-6.5, 0, 6.5])
    decor(x, 4.8, -18.5, 0.3, 0.25, 17, palette.timber, "roof beam");
  label(group, "THE HOUSE OF LEHI", 0, 5.25, -18.42, 4.2);
  return {
    name: "Lehi’s House",
    subtitle: "Explore the house and gather the family’s treasures",
    spawn: { x: 0, y: 0, z: 16, yaw: Math.PI },
    carryables: [
      { id: "house-bundle", name: "Supply bundle", x: -3, y: 0.3, z: 14 },
    ],
    treasures: [
      { id: "silver", name: "Silver", x: -9, y: 0.85, z: -10 },
      { id: "gold", name: "Gold", x: -12.4, y: 1.05, z: -15.6 },
      { id: "family-necklace", name: "Family Necklace", x: -8, y: 0.85, z: 10 },
      { id: "fine-goods", name: "Fine Goods", x: 1, y: 0.85, z: -11 },
      { id: "upper-chest", name: "Upper Room", x: 12.2, y: 4.1, z: -5.9 },
    ],
    goal: { x: 0, y: 0, z: 16.5, radius: 2.2 },
    bounds: { minX: -14.4, maxX: 14.4, minZ: -18.4, maxZ: 18.4 },
    ...finish(),
  };
}

function palace(scene: THREE.Scene): WorldData {
  const { group, add, decor, finish } = makeWorld(scene, "jerusalem");
  decor(0, -0.45, 0, 45, 0.45, 59, 0xbba17e, "palace pavement");
  decor(0, -0.45, 37, 54, 0.45, 17, 0xb69773, "road beyond the city gate");
  add(-20, 0, 0, 1.1, 7, 56, 0xb19472);
  add(20, 0, 0, 1.1, 7, 56, 0xb19472);
  add(0, 0, -28, 41, 7, 1.1, 0xb19472);
  add(-13, 0, 28, 14, 6.5, 1.1, 0xb19472);
  add(13, 0, 28, 14, 6.5, 1.1, 0xb19472);
  add(0, 5.3, 28, 12, 1.2, 1.1, 0xb19472, "gate lintel");
  // An imposing open forecourt; no narrow corridor blocks the sprint home.
  for (const x of [-15, 15])
    for (const z of [-19, -10, -1, 8, 17]) {
      column(group, x, z, 6.1, 0.55);
      add(x, 0, z, 0.95, 6.1, 0.95, palette.paleStone, "palace pillar");
    }
  for (const x of [-18.5, 18.5])
    for (const z of [-19, -2, 15])
      banner(group, x, 3.1, z, x < 0 ? palette.indigo : palette.turquoise);
  // Dais and chair mark Laban's speaking point; steps allow direct approach.
  add(0, 0, -20, 9, 0.8, 6, 0xd9c29c, "dais");
  add(0, 0, -16.4, 9, 0.4, 1.6, 0xc5a67f, "dais step");
  add(0, 0.8, -22.4, 3.0, 1.15, 1.2, palette.timber, "seat");
  decor(0, 1.95, -22.85, 3.0, 2.4, 0.35, palette.timber, "seat back");
  decor(0, 3.2, -23.1, 4.2, 0.28, 0.7, palette.brass, "carved canopy");
  for (const x of [-7.5, 7.5]) {
    add(x, 0, -11, 2.3, 0.9, 1.6, palette.timber, "offering table");
    vessel(group, x, 0.9, -11, 1.2, palette.brass);
  }
  // Low cedar benches and bundled goods interrupt the escape line. Each can be
  // jumped, while generous side routes remain clear for a ground-level sprint.
  for (const [x, z, width, height] of [
    [-2, 3, 7.5, 0.85],
    [3, 13, 8.5, 0.9],
    [0, 24, 8.5, 0.9],
  ] as const) {
    add(x, 0, z, width, height, 1.55, palette.timber, "cedar travel bench");
    decor(x, height - 0.04, z, width + 0.15, 0.1, 1.7, 0xa27a50, "bench lid");
    for (const offset of [-width / 3, 0, width / 3])
      decor(
        x + offset,
        height + 0.06,
        z,
        0.55,
        0.18,
        1.1,
        palette.darkClay,
        "folded travel cloth",
      );
  }
  for (const x of [-11, 11]) {
    datePalm(group, x, 15, 5.4);
    add(x, 0, 15, 0.32, 5.4, 0.32, palette.timber, "palm trunk");
  }
  for (const x of [-18, -13, 14, 19]) {
    const z = 37 + Math.abs(x % 3);
    datePalm(group, x, z, 4.6);
    add(x, 0, z, 0.32, 4.6, 0.32, palette.timber, "palm trunk");
  }
  for (const [x, z, w] of [
    [-11, 39, 2.2],
    [12, 34, 2.5],
    [-17, 43, 3],
  ] as const)
    decor(x, -0.04, z, w, 0.6, w * 0.7, 0x997e61, "roadside stone");
  for (const [x, z] of [
    [-11, -10],
    [11, -10],
    [-11, 11],
    [11, 11],
  ] as const)
    oilLamp(group, x, 1, z);
  label(group, "LABAN’S PALACE", 0, 6.05, -27.36, 4.1);
  return {
    name: "Laban’s Palace",
    subtitle: "Ask for the brass plates, then escape to your brothers",
    spawn: { x: 0, y: 0, z: 22, yaw: Math.PI },
    climbables: [
      ...[-11, 11].map((x) => ({
        id: `palace-palm-${x}-15`,
        x,
        z: 15,
        y: 0,
        height: 5.4,
        radius: 0.23,
      })),
      ...[-18, -13, 14, 19].map((x) => ({
        id: `palace-palm-${x}-road`,
        x,
        z: 37 + Math.abs(x % 3),
        y: 0,
        height: 4.6,
        radius: 0.23,
      })),
    ],
    carryables: [
      { id: "courtyard-bundle", name: "Supply bundle", x: -5, y: 0.3, z: 20 },
    ],
    goal: { x: 0, y: 0.8, z: -18, radius: 3.2 },
    escapeGoal: { x: 0, y: 0, z: 39, radius: 3 },
    pursuers: [
      { x: -8, y: 0, z: -8 },
      { x: 8, y: 0, z: -6 },
    ],
    bounds: { minX: -19.3, maxX: 19.3, minZ: -27.3, maxZ: 44 },
    ...finish(),
  };
}

// The same plaster houses, flat parapets and western lanes as the daytime city.
// Two offset courtyard blocks break the central sightline; 4–6 m crossings
// connect both sides, so companions can follow entirely at ground level.
function storyNeighborhood(
  add: ReturnType<typeof makeWorld>["add"],
  decor: ReturnType<typeof makeWorld>["decor"],
  group: THREE.Group,
) {
  for (const [x, z, w, d, h, color] of [
    [-27, 14, 10, 10, 4.2, 0xbfa17d],
    [27, 14, 10, 10, 5, 0xd9bd94],
    [-27, -1, 10, 10, 5.4, 0xd8b18a],
    [24, -3, 18, 10, 4.3, 0xb68e69],
    [-27, -15, 10, 10, 5, 0xcfad86],
    [27, -18, 10, 10, 5.4, 0xc49a70],
    [0, 14, 18, 12, 4.6, 0xcfad86],
    [-7, -3, 20, 10, 5.2, 0xd1ac84],
    [-8, -24, 14, 6, 5.4, 0xc39b72],
    [-27, 31, 10, 10, 5.1, 0xd1ac84],
    [27, 31, 10, 10, 5.6, 0xe0bd91],
  ])
    cityBlock(add, decor, group, x, z, w, d, h, color);
  // Familiar indigo doorway and palm mark the west lane, as at Lehi's house.
  decor(-21.94, 0, -15, 0.12, 2.8, 2.8, palette.indigo, "western indigo door");
  datePalm(group, -19.5, 24, 4.8);
  add(-19.5, 0, 24, 0.32, 4.8, 0.32, palette.timber, "palm trunk");
  for (const z of [-12, 4, 24])
    decor(6, 0.01, z, 3, 0.035, 0.14, 0xa78968, "paving seam");
}

function rockCave(
  add: ReturnType<typeof makeWorld>["add"],
  group: THREE.Group,
) {
  const rock = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    seed: number,
  ) => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const uneven =
        1 +
        0.12 *
          Math.sin(
            positions.getX(i) * 17 +
              positions.getY(i) * 11 +
              positions.getZ(i) * 7 +
              seed,
          );
      positions.setXYZ(
        i,
        positions.getX(i) * uneven,
        positions.getY(i) * uneven,
        positions.getZ(i) * uneven,
      );
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: seed % 2 ? 0x796956 : 0x625748,
        roughness: 1,
        flatShading: true,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = "weathered cave rock";
    group.add(mesh);
  };
  // A broad mouth opens into a real 18 m chamber. Collision stays behind
  // the visible rock faces, leaving a clear floor beneath the high ceiling.
  for (const [x, z, w, d] of [
    [-16, 67, 3, 18],
    [0, 67, 3, 18],
    [-8, 79, 19, 3],
  ] as const) {
    add(x, 0, z, w, 9, d, 0x625748, "cave bedrock").visible = false;
    rock(x, 3.8, z, w * 0.9, 6, d * 0.75, x + z);
  }
  add(-8, 7, 69, 19, 3, 22, 0x625748, "cave ceiling").visible = false;
  rock(-8, 9.4, 69, 12, 3.6, 13, 3);
  rock(-17, 2, 58, 4, 4, 5, 4);
  rock(1, 2, 59, 4, 5, 5, 5);
  const shade = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 18),
    new THREE.MeshStandardMaterial({ color: 0x433b31, roughness: 1 }),
  );
  shade.rotation.x = -Math.PI / 2;
  shade.position.set(-8, 0.015, 69);
  shade.name = "cave interior floor";
  group.add(shade);
}

function trade(scene: THREE.Scene): WorldData {
  const { group, add, decor, finish } = makeWorld(scene, "jerusalem");
  decor(0, -0.5, 24, 80, 0.5, 120, 0xc4a780, "stone road and desert");
  add(-36, 0, 6, 0.9, 7, 68, 0xa98b69, "western city wall");
  add(36, 0, 6, 0.9, 7, 68, 0xa98b69, "eastern city wall");
  add(0, 0, -28, 73, 7, 0.9, 0xa98b69, "northern city wall");
  add(-20, 0, 40, 32, 7, 0.9, 0xa98b69, "southern gate wall");
  add(20, 0, 40, 32, 7, 0.9, 0xa98b69, "southern gate wall");
  add(0, 5.6, 40, 8, 1.4, 0.9, 0xa98b69, "gate lintel");
  storyNeighborhood(add, decor, group);
  // Laban stands in an open audience court. Tables suggest the family's offer.
  for (const x of [-8, 8]) {
    column(group, x, -20, 5.4, 0.48, palette.paleStone);
    add(x, 0, -20, 0.8, 5.4, 0.8, palette.paleStone, "audience pillar");
  }
  add(0, 0, -25, 8, 0.4, 3.5, 0xd7bd95, "audience step");
  for (const x of [-5.8, 5.8]) {
    add(x, 0, -14, 2.7, 0.8, 1.5, palette.timber, "offering table");
    vessel(group, x, 0.8, -14, 1, palette.brass);
  }
  label(group, "THE TREASURE OFFER", 0, 5.8, -27.3, 5.4);
  label(group, "SOUTH GATE", 0, 6.7, 39.4, 3.5);
  // Beyond the gate a winding road reaches a broad cave mouth.
  for (const [x, z, w] of [
    [-19, 54, 4],
    [13, 58, 4],
    [11, 67, 5],
  ] as const)
    decor(x, 0, z, w, 1.1, 2.8, 0x977f66, "desert boulder");
  rockCave(add, group);
  return {
    name: "The Treasure Offer",
    subtitle:
      "Offer the family's treasures to Laban, then escape through the south gate",
    spawn: { x: 0, y: 0, z: 25, yaw: Math.PI },
    story: {
      laban: { x: 0, y: 0, z: -20 },
      gate: { x: 0, y: 0, z: 40 },
      cave: { x: -8, y: 0, z: 72 },
      brothers: { x: 0, y: 0, z: 43 },
    },
    goal: { x: 0, y: 0, z: -20, radius: 3 },
    escapeGoal: { x: -8, y: 0, z: 72, radius: 3 },
    pursuers: [
      { x: -4, y: 0, z: -17 },
      { x: 7, y: 0, z: -19 },
    ],
    bounds: { minX: -35.2, maxX: 35.2, minZ: -27.2, maxZ: 77 },
    ...finish(),
  };
}

function night(scene: THREE.Scene): WorldData {
  const { group, add, decor, finish } = makeWorld(scene, "jerusalem");
  scene.background = new THREE.Color(0x263c5a);
  scene.fog = new THREE.Fog(0x263c5a, 55, 128);
  for (const light of scene.children) {
    if (light instanceof THREE.HemisphereLight) {
      light.color.setHex(0xa9c4e9);
      light.groundColor.setHex(0x556079);
      light.intensity = 2.3;
    } else if (light instanceof THREE.DirectionalLight) {
      light.color.setHex(0xbfd7fb);
      light.intensity = 2.1;
      light.position.set(-24, 33, -20);
    }
  }
  decor(0, -0.5, 9, 76, 0.5, 79, 0x777d83, "moonlit street");
  add(-36, 0, 0, 0.9, 8, 60, 0x74767d, "west city wall");
  add(36, 0, 0, 0.9, 8, 60, 0x74767d, "east city wall");
  add(0, 0, -30, 73, 8, 0.9, 0x74767d, "north city wall");
  add(-21, 0, 28, 30, 8, 0.9, 0x74767d, "gate wall");
  add(21, 0, 28, 30, 8, 0.9, 0x74767d, "gate wall");
  add(0, 6.6, 28, 12, 1.4, 0.9, 0x74767d, "gate lintel");
  storyNeighborhood(add, decor, group);
  // Open crossings connect the gate, Laban's position, and the treasury.
  for (const [x, z] of [
    [-10, 14],
    [11, 5],
    [-8, -18],
    [9, -7],
  ] as const) {
    oilLamp(group, x, 1.2, z);
    const glow = new THREE.PointLight(0xffcb80, 13, 11);
    glow.position.set(x, 3.1, z);
    group.add(glow);
  }
  add(14, 0, -26.5, 12, 5.7, 0.8, 0x978f8b, "treasury facade");
  decor(14, 0.03, -26.02, 5.2, 3.7, 0.15, 0x403c45, "treasury door");
  label(group, "THE TREASURY", 14, 4.4, -25.9, 3.8);
  label(group, "SOUTH GATE", 0, 7.7, 27.4, 3.8);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(4, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xe4edff }),
  );
  moon.position.set(-30, 39, -48);
  group.add(moon);
  return {
    name: "Jerusalem by Night",
    subtitle:
      "Find the plates in the sleeping city and return to your brothers",
    spawn: { x: 0, y: 0, z: 42, yaw: Math.PI },
    story: {
      laban: { x: -19.5, y: 0, z: -14 },
      treasury: { x: 14, y: 0, z: -17 },
      plates: { x: 14, y: 0, z: -22 },
      gate: { x: 0, y: 0, z: 28 },
      brothers: { x: 0, y: 0, z: 43 },
    },
    goal: { x: -19.5, y: 0, z: -14, radius: 3 },
    escapeGoal: { x: 0, y: 0, z: 43, radius: 3 },
    pursuers: [
      { x: -19.5, y: 0, z: 7 },
      { x: 10, y: 0, z: -11 },
    ],
    bounds: { minX: -35.2, maxX: 35.2, minZ: -29.2, maxZ: 48 },
    ...finish(),
  };
}

export function buildWorld(id: WorldId, scene: THREE.Scene): WorldData {
  switch (id) {
    case "hub":
      return gallery(scene);
    case "streets":
      return streets(scene);
    case "house":
      return house(scene);
    case "palace":
      return palace(scene);
    case "trade":
      return trade(scene);
    case "night":
      return night(scene);
  }
}
