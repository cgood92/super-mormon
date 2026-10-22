/// <reference types="vite/client" />
import * as THREE from "three";
import { paintingCollider } from "./gallery-entry";
import type { Climbable } from "./physics";
import {
  ambient,
  box,
  column,
  label,
  oilLamp,
  painting,
  palette,
  vessel,
} from "./art";

import type { WorldData, Solid } from "./worlds";

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
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
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
      for (const light of lighting) {
        light.traverse((object) => {
          if (object instanceof THREE.Light) object.dispose();
        });
        scene.remove(light);
      }
      scene.background = priorBackground;
      scene.fog = priorFog;
    };
    return { solids, dispose };
  };
  return { group, add, decor, finish, solids };
}

export function gallery(scene: THREE.Scene): WorldData {
  const { group, add, decor, finish, solids } = makeWorld(scene, "gallery");
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
        ? `${import.meta.env?.BASE_URL ?? "/"}art/gallery/palace.jpg`
        : x < 0
          ? `${import.meta.env?.BASE_URL ?? "/"}art/gallery/streets.jpg`
          : `${import.meta.env?.BASE_URL ?? "/"}art/gallery/house.jpg`,
      x === 0 ? 0xffffff : x < 0 ? 0xe7e4db : 0xe7f0ec,
    );
  }
  label(group, "JERUSALEM STREETS", -11, 0.61, -17.65, 4.2);
  label(group, "LABAN’S PALACE", 0, 0.61, -17.65, 4.0);
  label(group, "LEHI’S HOUSE", 11, 0.61, -17.65, 3.6);
  for (const [z, file, title] of [
    [-5, "trade.jpg", "THE TREASURE OFFER"],
    [5, "night.jpg", "JERUSALEM BY NIGHT"],
    [15, "tree.jpg", "THE TREE OF LIFE"],
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
      `${import.meta.env?.BASE_URL ?? "/"}art/gallery/${file}`,
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
  const portals: NonNullable<WorldData["portals"]> = [
    { id: "streets", x: -11, y: 0.59, z: -20.7, title: "Jerusalem Streets" },
    { id: "palace", x: 0, y: 0.59, z: -20.7, title: "Laban’s Palace" },
    { id: "house", x: 11, y: 0.59, z: -20.7, title: "Lehi’s House" },
    {
      id: "trade",
      x: 18.22,
      y: 0.59,
      z: -5,
      title: "The Treasure Offer",
      facing: "east",
    },
    {
      id: "night",
      x: 18.22,
      y: 0.59,
      z: 5,
      title: "Jerusalem by Night",
      facing: "east",
    },
    {
      id: "tree",
      x: 18.22,
      y: 0.59,
      z: 15,
      title: "The Tree of Life",
      facing: "east",
    },
  ];
  for (const portal of portals) solids.push(paintingCollider(portal));
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
    portals,
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

export function house(scene: THREE.Scene): WorldData {
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
