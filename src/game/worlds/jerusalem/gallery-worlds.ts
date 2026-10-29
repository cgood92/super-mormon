/// <reference types="vite/client" />
import * as THREE from "three";
import {
  ambient,
  box,
  column,
  label,
  oilLamp,
  palette,
  vessel,
} from "../../rendering/art";

import type { WorldData, Solid } from "../../runtime/worlds";

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
    if (z < 0) add(8.8, 3.28, z, 10, 0.72, 0.22, 0x866342, "gallery rail");
    else {
      // Keep the real stair opening clear while sealing both landing edges.
      add(4.3, 3.28, z, 1, 0.72, 0.22, 0x866342, "gallery rail");
      add(11, 3.28, z, 5.6, 0.72, 0.22, 0x866342, "gallery rail");
    }
    for (const x of [4.1, 6.8, 9.5, 12.2])
      if (z < 0 || x < 4.8 || x > 8.2)
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
