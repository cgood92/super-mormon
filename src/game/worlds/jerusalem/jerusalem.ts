import { createLehiOpening } from "./lehi-opening";
import { markScenery, sceneryBox, terracedRock } from "../shared/scenery";
import * as THREE from "three";
import type { WorldData, Solid } from "../../runtime/worlds";
import {
  ambient,
  banner,
  box,
  column,
  datePalm,
  label,
  oilLamp,
  palette,
  vessel,
} from "../../rendering/art";
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
    const shape = { x, y: ybase, z, w, h, d };
    solids.push(shape);
    const mesh = box(group, x, ybase, z, w, h, d, color, name);
    markScenery(mesh, { kind: "solid", solids: [shape] });
    return mesh;
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
        if (object instanceof THREE.InstancedMesh) object.dispose();
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

function rockCave(
  add: ReturnType<typeof makeWorld>["add"],
  group: THREE.Group,
  solids: Solid[],
) {
  // The shell uses the same visible dimensions as its physical surfaces.
  // Keep the broad 13 m mouth and standing clearance beneath the 7 m ceiling.
  const stone = new THREE.MeshStandardMaterial({
    color: 0x796956,
    roughness: 1,
  });
  for (const [x, z, w, d] of [
    [-16, 67, 3, 18],
    [0, 67, 3, 18],
    [-8, 79, 19, 3],
  ] as const)
    sceneryBox(
      group,
      solids,
      stone,
      { x, y: 0, z, w, h: 9, d },
      "weathered cave rock wall",
    );
  sceneryBox(
    group,
    solids,
    stone,
    { x: -8, y: 7, z: 69, w: 19, h: 3, d: 22 },
    "weathered cave rock ceiling",
  );
  for (const [x, z, h] of [
    [-17, 58, 6],
    [1, 59, 7],
  ] as const)
    terracedRock(
      group,
      solids,
      new THREE.MeshStandardMaterial({ color: 0x796956, roughness: 1 }),
      { x, y: 0, z, w: 8, h, d: 10 },
      "Cave entrance boulder",
    );
  const shade = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 18),
    new THREE.MeshStandardMaterial({ color: 0x433b31, roughness: 1 }),
  );
  shade.rotation.x = -Math.PI / 2;
  shade.position.set(-8, 0.015, 69);
  shade.name = "cave interior floor";
  group.add(shade);
}

/** Every visit constructs this same city, including its accessible palace rooms. */
export function buildJerusalem(
  id: "streets" | "palace" | "trade" | "night",
  scene: THREE.Scene,
): WorldData {
  const { group, add, decor, finish, solids } = makeWorld(scene, "jerusalem");
  decor(0, -0.5, 25, 80, 0.5, 120, 0xc4a780, "Jerusalem earth and desert road");
  add(-36, 0, 5.5, 0.9, 8, 69, 0xa98b69, "west city wall");
  add(36, 0, 5.5, 0.9, 8, 69, 0xa98b69, "east city wall");
  add(0, 0, -29, 73, 8, 0.9, 0xa98b69, "north city wall");
  for (const x of [-20, 20])
    add(x, 0, 40, 32, 8, 0.9, 0xa98b69, "south gate wall");
  add(0, 5.6, 40, 8, 2.4, 0.9, 0xa98b69, "south gate lintel");
  for (const x of [
    -34, -30, -26, -22, -18, -14, -10, 10, 14, 18, 22, 26, 30, 34,
  ])
    decor(x, 8, 40, 2.4, 0.7, 1.3, 0xb89a74, "battlement");
  label(group, "SOUTH GATE", 0, 6.6, 39.4, 3.5);
  for (const [x, z, w, d, h, c] of [
    [-27, 31, 10, 10, 5.1, 0xd1ac84],
    [27, 31, 10, 10, 5.6, 0xe0bd91],
    [-27, 14, 10, 10, 4.2, 0xbfa17d],
    [27, 14, 10, 10, 5, 0xd9bd94],
    [-27, -1, 10, 10, 5.4, 0xd8b18a],
    [27, -1, 10, 10, 4.3, 0xb68e69],
    [-27, -15, 10, 10, 5, 0xcfad86],
    [27, -18, 10, 10, 5.4, 0xc49a70],
    [0, 14, 18, 12, 4.6, 0xcfad86],
    [-6, 0, 14, 8, 5.2, 0xd1ac84],
  ])
    cityBlock(add, decor, group, x, z, w, d, h, c);
  decor(-32.06, 0, -15, 0.12, 2.8, 2.8, palette.indigo, "Lehi indigo doorway");
  decor(-32.15, 2.8, -15, 0.28, 0.2, 3.2, palette.timber, "Lehi door lintel");
  const sign = label(group, "LEHI’S HOUSE", -32.22, 3.5, -15, 2.6);
  sign.rotation.y = -Math.PI / 2;
  // A broad audience hall with a west exit passage and a separate east treasury.
  add(-18, 0, -19, 0.7, 7, 20, 0xb19472, "palace west exterior");
  add(18, 0, -19, 0.7, 7, 20, 0xb19472, "palace east exterior");
  add(0, 0, -28.5, 36, 7, 0.7, 0xb19472, "palace back wall");
  for (const [x, z, w, d] of [
    [-12, -22.5, 0.65, 11],
    [-12, -10, 0.65, 2],
    [8, -22.5, 0.65, 11],
    [8, -10.5, 0.65, 3],
    [-7.5, -9, 9, 0.65],
    [5.5, -9, 5, 0.65],
    [10, -9, 4, 0.65],
    [17, -9, 2, 0.65],
    [10, -18, 4, 0.65],
    [17, -18, 2, 0.65],
  ])
    add(x, 0, z, w, 6.5, d, 0xc6a780, "palace room wall");
  // High lintels leave standing clearance through the city exit and treasury corridor.
  for (const [x, z, w, d] of [
    [0, -9, 6, 0.65],
    [-15, -9, 6, 0.65],
    [-12, -14, 0.65, 6],
    [8, -14, 0.65, 6],
    [14, -18, 4, 0.65],
    [14, -9, 4, 0.65],
  ])
    add(x, 4.8, z, w, 1.7, d, 0xc6a780, "palace doorway lintel");
  decor(-2, 0.015, -18, 20, 0.035, 18, 0xd0b38a, "audience court paving");
  for (const x of [-9, 5])
    for (const z of [-24, -18, -12]) {
      column(group, x, z, 6.1, 0.48, palette.paleStone);
      add(x, 0, z, 0.85, 6.1, 0.85, palette.paleStone, "audience hall column");
    }
  for (const x of [-10.8, 6.8]) banner(group, x, 3, -24, palette.indigo);
  add(0, 0, -20, 8, 0.8, 6, 0xd9c29c, "audience dais");
  add(0, 0, -16.4, 8, 0.4, 1.6, 0xc5a67f, "dais step");
  add(0, 0.8, -22.5, 3, 1.15, 1.2, palette.timber, "Laban audience seat");
  decor(0, 1.95, -22.9, 3, 2.4, 0.35, palette.timber, "carved seat back");
  decor(0, 4.1, -23, 4.2, 0.28, 0.7, palette.brass, "audience canopy");
  for (const x of [-7, 5.8]) {
    add(x, 0, -11.5, 2, 0.85, 1.3, palette.timber, "offering table");
    vessel(group, x, 0.85, -11.5, 0.8, palette.brass);
  }
  label(group, "LABAN’S PALACE", -2, 6, -28.08, 5);
  label(group, "TREASURY", 14, 4, -18.4, 3);
  // Shelves surround a real treasury chamber; its central aisle remains open.
  for (const x of [10, 16.8])
    for (const z of [-22, -26]) {
      add(x, 0, z, 1.2, 1.1, 2, palette.timber, "treasury chest");
      vessel(group, x, 1.1, z, 0.7, palette.brass);
    }
  for (const [x, z] of [
    [-17, 22],
    [20, 5],
    [20, -10],
    [-30, 23],
    [13, 47],
  ]) {
    datePalm(group, x, z, 4.8);
    add(x, 0, z, 0.32, 4.8, 0.32, palette.timber, "date palm trunk");
  }
  for (let i = 0; i < 12; i++)
    add(
      19,
      i * 0.35,
      24 - i * 1.1,
      2.2,
      0.35,
      1.1,
      0xc5a681,
      "optional roof stair",
    );
  add(20.5, 4.2, 10, 5.2, 0.35, 3.2, 0xd4b690, "roof terrace landing");
  for (const [x, z] of [
    [-17, 30],
    [16, 26],
    [-19.5, -19],
    [10, -14],
    [14, -25],
    [-6, -25],
  ]) {
    oilLamp(group, x, 1, z);
    if (id === "night") {
      const glow = new THREE.PointLight(0xffcb80, 14, 12);
      glow.position.set(x, 3, z);
      group.add(glow);
    }
  }
  for (const z of [25, 6, -6])
    decor(0, 0.01, z, 36, 0.035, 0.18, 0xac906e, "cross street paving seam");
  for (const [x, z, w] of [
    [-23, 53, 4],
    [13, 58, 4],
    [12, 69, 5],
  ])
    terracedRock(
      group,
      solids,
      new THREE.MeshStandardMaterial({ color: 0x977f66, roughness: 1 }),
      { x, y: 0, z, w, h: 1.2, d: 3 },
      "desert boulder",
    );
  rockCave(add, group, solids);
  if (id === "night") {
    scene.background = new THREE.Color(0x263c5a);
    scene.fog = new THREE.Fog(0x263c5a, 60, 140);
    for (const light of scene.children) {
      if (light instanceof THREE.HemisphereLight) {
        light.color.setHex(0xa9c4e9);
        light.groundColor.setHex(0x556079);
        light.intensity = 2.3;
      }
      if (light instanceof THREE.DirectionalLight) {
        light.color.setHex(0xbfd7fb);
        light.intensity = 2.1;
        light.position.set(-24, 33, -20);
      }
    }
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(4, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0xe4edff }),
    );
    moon.position.set(-30, 39, -48);
    group.add(moon);
  }
  const audience = { x: 0, y: 0.8, z: -21.1 };
  const brothers = { x: 0, y: 0, z: 43 };
  const cave = { x: -8, y: 0, z: 72 };
  // The doorway faces the outer lane, discovered by turning around the dwelling
  // at the cross street. Every story still builds exactly the same city.
  const home = { x: -33.2, y: 0, z: -15, radius: 1.25 };
  const laban = id === "night" ? { x: -19.5, y: 0, z: -6 } : audience;
  return {
    name:
      id === "streets"
        ? "Jerusalem"
        : id === "palace"
          ? "Laban’s Palace"
          : id === "trade"
            ? "The Treasure Offer"
            : "Jerusalem by Night",
    subtitle:
      id === "streets"
        ? "Find the indigo doorway around the western homes"
        : id === "palace"
          ? "Ask Laban for the brass plates, then return to your brothers"
          : id === "trade"
            ? "Offer the family’s treasures, then find refuge in the cave"
            : "Find Laban in the city and follow Zoram to the palace treasury",
    spawn: { x: 0, y: 0, z: id === "night" ? 44 : 25, yaw: Math.PI },
    actorParent: group,
    adventure:
      id === "streets"
        ? (hooks) =>
            createLehiOpening(group, solids, { x: 0, y: 0, z: 25 }, home, hooks)
        : undefined,
    story: {
      laban,
      treasury: { x: 14, y: 0, z: -21 },
      plates: { x: 14, y: 0, z: -24 },
      gate: { x: 0, y: 0, z: 40 },
      brothers,
      cave,
    },
    goal:
      id === "streets"
        ? home
        : id === "night"
          ? { ...laban, radius: 3 }
          : { x: 0, y: 0.8, z: -18, radius: 3.2 },
    escapeGoal:
      id === "trade" ? { ...cave, radius: 3 } : { ...brothers, radius: 3 },
    portals:
      id === "streets"
        ? [
            {
              id: "house",
              x: home.x,
              y: 0,
              z: home.z,
              title: "Enter Lehi’s House",
            },
          ]
        : undefined,
    pursuers:
      id === "streets"
        ? [
            { x: -6, y: 0, z: 25 },
            { x: 8, y: 0, z: 25 },
          ]
        : id === "night"
          ? [
              { x: -19.5, y: 0, z: 12 },
              { x: 10, y: 0, z: -14 },
            ]
          : [
              { x: -6, y: 0, z: -24 },
              { x: 6.5, y: 0, z: -24 },
            ],
    climbables: [
      {
        id: "jerusalem-west-palm",
        x: -17,
        z: 22,
        y: 0,
        height: 4.8,
        radius: 0.23,
      },
    ],
    tokens:
      id === "streets" ? [{ id: "roof-route", x: 19, y: 5, z: 10 }] : undefined,
    bounds: { minX: -35.2, maxX: 35.2, minZ: -28.2, maxZ: 80 },
    ...finish(),
  };
}
