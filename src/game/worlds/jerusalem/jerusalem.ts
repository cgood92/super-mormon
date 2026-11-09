import { createLehiOpening } from "./lehi-opening";
import { markScenery, sceneryBox, terracedRock } from "../shared/scenery";
import * as THREE from "three";
import type { WorldData, Solid } from "../../runtime/worlds";
import type { CameraRoom } from "../../camera/camera-rooms";
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

function createJerusalemGroundTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // High-frequency sand grain + gentle dune waves
      const grain =
        (((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) + 1) * 0.5;
      const wave = Math.sin(x * 0.35) * Math.cos(y * 0.35) * 0.5 + 0.5;
      const dune = Math.sin(x * 0.08 + y * 0.12) * 0.5 + 0.5;
      // Subtle natural variation (95% to 105%) around original base color (0xc4a780)
      const factor = 0.95 + grain * 0.05 + wave * 0.03 + dune * 0.02;
      data[idx] = Math.min(255, Math.round(196 * factor));
      data[idx + 1] = Math.min(255, Math.round(167 * factor));
      data[idx + 2] = Math.min(255, Math.round(128 * factor));
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 78);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Authentic 600 BC Israelite Four-Room Dwelling with flat roof and parapet (Deut 22:8). */
function cityBlock(
  add: ReturnType<typeof makeWorld>["add"],
  decor: ReturnType<typeof makeWorld>["decor"],
  group: THREE.Group,
  solids: Solid[],
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: number,
): void {
  // Flat roofs, plaster parapets, timber lintels, and street-facing clay vessels.
  // Physical support extends to the roof surface (h + 0.17) so feet do not sink,
  // while the dwelling wall render stops at h beneath the roof slab to eliminate coplanar z-fighting.
  const shape = { x, y: 0, z, w, h: h + 0.17, d };
  solids.push(shape);
  const dwellingMesh = box(
    group,
    x,
    0,
    z,
    w,
    h,
    d,
    color,
    "Jerusalem dwelling",
  );
  markScenery(dwellingMesh, { kind: "solid", solids: [shape] });
  decor(x, h, z, w + 0.25, 0.17, d + 0.25, palette.paleStone, "flat roof");

  for (const side of [-1, 1]) {
    // Leave a gap on the west side of the stair terrace building so player can enter roof
    if (x === 27 && z === 14 && side === -1) {
      add(
        x + side * (w / 2 - 0.12),
        h + 0.17,
        z + 2.5,
        0.24,
        0.4,
        d - 5,
        palette.sandstone,
        "roof parapet",
      );
    } else {
      add(
        x + side * (w / 2 - 0.12),
        h + 0.17,
        z,
        0.24,
        0.4,
        d,
        palette.sandstone,
        "roof parapet",
      );
    }
    add(
      x,
      h + 0.17,
      z + side * (d / 2 - 0.12),
      w,
      0.4,
      0.24,
      palette.sandstone,
      "roof parapet",
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

/** Stylized Iron Age pack donkey with pack saddle / panniers for market & stable squares. */
function packDonkey(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  yaw = 0,
  solids?: Solid[],
): void {
  const donkeyGroup = new THREE.Group();
  donkeyGroup.position.set(x, y, z);
  donkeyGroup.rotation.y = yaw;
  donkeyGroup.name = "Jerusalem pack donkey";

  const donkeyMat = new THREE.MeshStandardMaterial({
    color: 0x8a7355,
    roughness: 0.9,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x42382f,
    roughness: 0.9,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: palette.timber,
    roughness: 0.85,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0xb58a5c,
    roughness: 0.95,
  });

  const part = (
    geom: THREE.BufferGeometry,
    mat: THREE.Material,
    px: number,
    py: number,
    pz: number,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(px, py, pz);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    donkeyGroup.add(mesh);
    markScenery(mesh, {
      kind: "decoration",
      reason:
        "Ambient pack donkey; solid physical obstacle prevents pass-through.",
    });
    return mesh;
  };

  const boxGeom = new THREE.BoxGeometry(1, 1, 1);
  // Torso
  part(boxGeom, donkeyMat, 0, 0.75, 0, 0.55, 0.52, 1.1);
  // Neck & Head
  part(boxGeom, donkeyMat, 0, 1.15, 0.5, 0.32, 0.45, 0.4);
  part(boxGeom, donkeyMat, 0, 1.25, 0.7, 0.28, 0.28, 0.35);
  // Muzzle
  part(boxGeom, darkMat, 0, 1.15, 0.88, 0.22, 0.18, 0.2);
  // Ears
  for (const s of [-1, 1]) {
    const ear = part(boxGeom, donkeyMat, s * 0.12, 1.5, 0.55, 0.08, 0.28, 0.08);
    ear.rotation.z = s * 0.25;
  }
  // 4 Legs
  for (const lx of [-0.2, 0.2]) {
    for (const lz of [-0.4, 0.38]) {
      part(boxGeom, darkMat, lx, 0.26, lz, 0.12, 0.52, 0.12);
    }
  }
  // Pack saddle & side baskets (panniers)
  part(boxGeom, clothMat, 0, 1.03, 0, 0.6, 0.08, 0.75);
  for (const s of [-1, 1]) {
    part(boxGeom, woodMat, s * 0.36, 0.75, 0, 0.24, 0.36, 0.55);
  }

  group.add(donkeyGroup);

  if (solids) {
    const cos = Math.abs(Math.cos(yaw));
    const sin = Math.abs(Math.sin(yaw));
    const bw = Math.max(0.8, 0.85 * cos + 1.25 * sin);
    const bd = Math.max(0.8, 0.85 * sin + 1.25 * cos);
    solids.push({ x, y, z, w: bw, h: 1.35, d: bd });
  }
}

/** Stylized woolly flock sheep resting in city animal pen. */
function sheepModel(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  yaw = 0,
  solids?: Solid[],
): void {
  const sheepGroup = new THREE.Group();
  sheepGroup.position.set(x, y, z);
  sheepGroup.rotation.y = yaw;
  sheepGroup.name = "Jerusalem flock sheep";

  const woolMat = new THREE.MeshStandardMaterial({
    color: 0xe6dfc5,
    roughness: 0.95,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x584434,
    roughness: 0.9,
  });

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), woolMat);
  body.scale.set(0.75, 0.65, 1.1);
  body.position.set(0, 0.55, 0);
  sheepGroup.add(body);
  markScenery(body, {
    kind: "decoration",
    reason:
      "Resting flock sheep; solid physical obstacle prevents pass-through.",
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), darkMat);
  head.position.set(0, 0.72, 0.55);
  sheepGroup.add(head);
  markScenery(head, {
    kind: "decoration",
    reason: "Resting flock sheep head.",
  });

  const boxGeom = new THREE.BoxGeometry(0.09, 0.32, 0.09);
  for (const lx of [-0.18, 0.18]) {
    for (const lz of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(boxGeom, darkMat);
      leg.position.set(lx, 0.16, lz);
      sheepGroup.add(leg);
      markScenery(leg, {
        kind: "decoration",
        reason: "Resting flock sheep leg.",
      });
    }
  }

  group.add(sheepGroup);

  if (solids) {
    const cos = Math.abs(Math.cos(yaw));
    const sin = Math.abs(Math.sin(yaw));
    const bw = Math.max(0.7, 0.75 * cos + 1.05 * sin);
    const bd = Math.max(0.7, 0.75 * sin + 1.05 * cos);
    solids.push({ x, y, z, w: bw, h: 0.85, d: bd });
  }
}

function rockCave(
  add: ReturnType<typeof makeWorld>["add"],
  group: THREE.Group,
  solids: Solid[],
) {
  // Natural terraced rock formations instead of boxy geometry
  const stone = new THREE.MeshStandardMaterial({
    color: 0x796956,
    roughness: 1,
  });
  terracedRock(
    group,
    solids,
    stone,
    { x: -16, y: 0, z: 88, w: 7, h: 7.5, d: 9 },
    "west cave ridge",
  );
  terracedRock(
    group,
    solids,
    stone,
    { x: -16, y: 0, z: 96, w: 7, h: 8, d: 9 },
    "west cave flank",
  );
  terracedRock(
    group,
    solids,
    stone,
    { x: 0, y: 0, z: 88, w: 7, h: 7.5, d: 9 },
    "east cave ridge",
  );
  terracedRock(
    group,
    solids,
    stone,
    { x: 0, y: 0, z: 96, w: 7, h: 8, d: 9 },
    "east cave flank",
  );
  terracedRock(
    group,
    solids,
    stone,
    { x: -8, y: 0, z: 102, w: 17, h: 8.5, d: 7 },
    "rear cave cliff",
  );
  terracedRock(
    group,
    solids,
    stone,
    { x: -8, y: 6.5, z: 92, w: 15, h: 3, d: 13 },
    "cave rock ceiling",
  );
  for (const [x, z, h] of [
    [-15, 80, 5],
    [-1, 81, 5.5],
  ] as const)
    terracedRock(
      group,
      solids,
      new THREE.MeshStandardMaterial({ color: 0x796956, roughness: 1 }),
      { x, y: 0, z, w: 7, h, d: 8 },
      "Cave entrance boulder",
    );
  const shade = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 16),
    new THREE.MeshStandardMaterial({ color: 0x433b31, roughness: 1 }),
  );
  shade.rotation.x = -Math.PI / 2;
  shade.position.set(-8, 0.015, 92);
  shade.name = "cave interior floor";
  markScenery(shade, {
    kind: "decoration",
    reason:
      "Cave interior shaded floor; ground mesh provides physical support.",
  });
  group.add(shade);
}

/** Every visit constructs this same historically enriched 600 BC city. */
export function buildJerusalem(
  id: "streets" | "palace" | "trade" | "night",
  scene: THREE.Scene,
): WorldData {
  const { group, add, decor, finish, solids } = makeWorld(scene, "jerusalem");
  const groundTex = createJerusalemGroundTexture();

  // Vast procedural terrain extending north past the Temple and south past the desert cave
  const ground = decor(
    8,
    -0.5,
    20,
    150,
    0.5,
    195,
    0xffffff,
    "Jerusalem earth and desert road",
  );
  if (ground.material instanceof THREE.MeshStandardMaterial) {
    ground.material.color.setHex(0xffffff);
    ground.material.map = groundTex;
    ground.material.roughness = 0.95;
    ground.material.needsUpdate = true;
  }

  // Clear daytime sky and distant horizon (eliminating unnatural blue rooftop haze)
  if (id !== "night") {
    scene.background = new THREE.Color(0xdce5ec);
    scene.fog = new THREE.Fog(scene.background, 160, 340);
  }

  // ==========================================
  // PERIMETER CITY WALLS & FORTIFICATIONS
  // ==========================================
  // West Broad Wall (Hezekiah's Broad Wall - 7m stone ramparts)
  add(-56, 0, -15, 1.4, 8, 110, 0xa98b69, "west city wall");
  // East Kidron Valley Wall (expanded to x = 72 to encompass Pool of Bethesda district)
  add(72, 0, -15, 1.4, 8, 110, 0xa98b69, "east city wall");
  // North Wall enclosing the Temple Mount and Bethesda (spans x = -56 to x = 72)
  add(8, 0, -70, 129.4, 8, 1.4, 0xa98b69, "north city wall");

  // South Wall and Historic Multi-Chambered Gate (Seamless non-overlapping geometry)
  add(-31.6, 0, 40, 48.8, 8, 0.9, 0xa98b69, "south gate wall west");
  add(-5.6, 0, 40, 3.2, 9.2, 1.8, 0xb89a74, "south gate west tower");
  add(0, 5.6, 40, 8, 2.4, 0.9, 0xa98b69, "south gate lintel");
  add(5.6, 0, 40, 3.2, 9.2, 1.8, 0xb89a74, "south gate east tower");
  add(39.6, 0, 40, 64.8, 8, 0.9, 0xa98b69, "south gate wall east");

  // Crenellated Battlements across City Walls (Solid obstacles for rooftop parkour)
  for (const x of [
    -52, -48, -44, -40, -34, -30, -26, -22, -18, -14, -10, 10, 14, 18, 22, 26,
    30, 34, 40, 44, 48, 52, 56, 60, 64, 68,
  ]) {
    add(x, 8, 40, 2.4, 0.7, 1.3, 0xb89a74, "battlement");
  }
  for (const z of [-65, -55, -45, -35, -25, -15, -5, 5, 15, 25, 35]) {
    add(-56, 8, z, 1.4, 0.7, 2.4, 0xb89a74, "west battlement");
    add(72, 8, z, 1.4, 0.7, 2.4, 0xb89a74, "east battlement");
  }

  // ==========================================
  // NORTHERN PLATEAU: FIRST TEMPLE (SOLOMON'S TEMPLE)
  // ==========================================
  // Elevated Ashlar Limestone Platform on Mount Moriah
  add(23, 0, -58, 44, 1.2, 22, palette.limestone, "temple ashlar platform");
  // Approach steps ascending north onto the platform
  for (let step = 0; step < 4; step++) {
    add(
      23,
      step * 0.3,
      -45.25 - step * 0.5,
      16,
      0.3,
      0.5,
      palette.sandstone,
      "temple approach step",
    );
  }
  // Temple Sanctuary (Debir & Heikhal)
  add(28, 1.2, -61, 16, 7.5, 14, palette.paleStone, "temple sanctuary wall");
  // Solid cedar roof slab so the player stands firmly on top of the roof at y = 9.0m
  add(28, 8.7, -61, 16.5, 0.3, 14.5, palette.timber, "temple cedar roof slab");
  // Temple Portico (Ulam)
  add(28, 1.2, -52.5, 16, 5.5, 3, palette.limestone, "temple portico");
  // Twin Polished Bronze Pillars: Boaz and Jachin (1 Kings 7:15–22)
  column(group, 23.5, -50.5, 5.2, 0.42, palette.brass);
  add(23.5, 1.2, -50.5, 0.9, 5.2, 0.9, palette.brass, "bronze pillar Boaz");
  column(group, 32.5, -50.5, 5.2, 0.42, palette.brass);
  add(32.5, 1.2, -50.5, 0.9, 5.2, 0.9, palette.brass, "bronze pillar Jachin");
  // Temple Outer Courtyard Colonnade
  for (const colX of [6, 12, 40, 44]) {
    column(group, colX, -48, 4.2, 0.32, palette.paleStone);
    add(
      colX,
      1.2,
      -48,
      0.7,
      4.2,
      0.7,
      palette.paleStone,
      "temple court column",
    );
  }
  // Great Bronze Altar of Burnt Offering
  add(12, 1.2, -56, 4.5, 1.4, 4.5, palette.limestone, "temple altar base");
  decor(12, 2.6, -56, 4.7, 0.2, 4.7, palette.brass, "altar bronze brim");
  oilLamp(group, 8, 2.6, -54);
  oilLamp(group, 16, 2.6, -54);

  // ==========================================
  // LOWER CITY: WATERS OF SHILOAH (POOL OF SILOAM)
  // ==========================================
  // Stepped Limestone Reservoir fed by Hezekiah's water conduit (Isaiah 8:6 / 2 Ne 18:6)
  add(37, 0, 33, 17, 0.5, 1, palette.limestone, "siloam south wall");
  add(37, 0, 15, 17, 0.5, 1, palette.limestone, "siloam north wall");
  add(28.5, 0, 24, 1, 0.5, 17, palette.limestone, "siloam west wall");
  add(45.5, 0, 24, 1, 0.5, 17, palette.limestone, "siloam east wall");
  // Stepped interior terraces
  decor(37, 0.02, 24, 16, 0.02, 16, palette.sandstone, "siloam pool floor");
  const waterPool = decor(
    37,
    0.25,
    24,
    16,
    0.02,
    16,
    palette.turquoise,
    "waters of shiloah pool surface",
  );
  markScenery(waterPool, {
    kind: "decoration",
    reason: "Water surface in Pool of Siloam; pool floor provides support.",
  });
  // Conduit mouth representing Hezekiah's Tunnel from Gihon
  decor(37, 0.5, 15, 2.2, 1.2, 1.2, palette.sandstone, "conduit tunnel mouth");
  decor(
    37,
    0.1,
    15.6,
    1.4,
    0.25,
    1.0,
    palette.turquoise,
    "conduit water cascade",
  );
  // Clay water jars set by women along the stone steps
  vessel(group, 29.5, 0.5, 18, 1.1, palette.clay);
  vessel(group, 29.5, 0.5, 22, 0.9, palette.clay);
  vessel(group, 44.5, 0.5, 20, 1.0, palette.clay);

  // ==========================================
  // CENTRAL BAZAAR & PUBLIC CITY WELL / CISTERN
  // ==========================================
  // Public carved stone city well in the market square
  add(0, 0, 4, 2.4, 0.75, 2.4, palette.paleStone, "city well curb");
  const wellWater = decor(
    0,
    0.6,
    4,
    1.8,
    0.02,
    1.8,
    palette.turquoise,
    "well water surface",
  );
  markScenery(wellWater, {
    kind: "decoration",
    reason: "Well water surface; stone curb provides physical support.",
  });
  // Timber winch frame and suspended bucket
  decor(-1, 0.75, 4, 0.18, 1.6, 0.18, palette.timber, "well post left");
  decor(1, 0.75, 4, 0.18, 1.6, 0.18, palette.timber, "well post right");
  decor(0, 2.35, 4, 2.2, 0.18, 0.18, palette.timber, "well crossbeam");
  vessel(group, 0, 1.4, 4, 0.7, palette.darkClay);
  // Animal watering trough beside well
  add(2.2, 0, 4, 0.9, 0.45, 2.2, palette.limestone, "animal water trough");
  decor(
    2.2,
    0.38,
    4,
    0.7,
    0.02,
    2.0,
    palette.turquoise,
    "trough water surface",
  );

  // Market Stalls with Walkable Canopy Awnings (SM64 parkour platforms)
  const stalls = [
    { x: -7, z: 10, color: 0x9b3a28, name: "market awning 1 (textiles)" },
    { x: 7, z: 10, color: 0x314c64, name: "market awning 2 (pottery)" },
    { x: -7, z: -2, color: 0xc89b3c, name: "market awning 3 (grain)" },
    { x: 9.2, z: -2, color: 0x407b78, name: "market awning 4 (spices)" },
  ];
  for (const s of stalls) {
    add(s.x, 0, s.z, 3.2, 0.85, 1.6, palette.timber, `stall table at ${s.x}`);
    for (const px of [-1.4, 1.4]) {
      for (const pz of [-0.6, 0.6]) {
        decor(
          s.x + px,
          0.85,
          s.z + pz,
          0.12,
          1.55,
          0.12,
          palette.timber,
          "stall corner post",
        );
      }
    }
    // Solid canopy awning for rooftop jumping
    add(s.x, 2.4, s.z, 3.4, 0.15, 1.8, s.color, s.name);
  }
  // Market goods
  vessel(group, -7.6, 0.85, 10, 0.7, palette.clay);
  vessel(group, -6.4, 0.85, 10, 0.6, palette.brass);
  vessel(group, 6.4, 0.85, 10, 0.8, palette.clay);
  vessel(group, 7.6, 0.85, 10, 0.7, palette.darkClay);
  decor(-7, 0.85, -2, 0.8, 0.35, 0.6, 0xd4b88a, "grain sack 1");
  decor(-6.2, 0.85, -2, 0.8, 0.35, 0.6, 0xc49a70, "grain sack 2");
  vessel(group, 8.7, 0.85, -2, 0.75, palette.brass);
  vessel(group, 9.7, 0.85, -2, 0.65, palette.clay);

  // Pack donkeys resting at the market and stables
  packDonkey(group, -9.5, 0, 8, Math.PI / 4, solids);
  packDonkey(group, -27, 0, -23, Math.PI / 2, solids);

  // ==========================================
  // RESIDENTIAL DISTRICTS: FOUR-ROOM HOUSES
  // ==========================================
  // Western Upper City Quarter (Lehi's neighborhood & authentic Israelite homes)
  // and Eastern Lower City Quarter (Craftsmen, Weavers & Expanded East Sector)
  for (const [x, z, w, d, h, c] of [
    // Proven core dwellings (tested by follow camera & playtest feedback)
    [-27, 31, 10, 10, 5.1, 0xd1ac84],
    [27, 31, 10, 10, 5.6, 0xe0bd91],
    [-27, 14, 10, 10, 4.2, 0xbfa17d],
    [27, 14, 10, 10, 5.0, 0xd9bd94],
    [-27, -1, 10, 10, 5.4, 0xd8b18a],
    [27, -1, 10, 10, 4.3, 0xb68e69],
    [-27, -15, 10, 10, 5.0, 0xcfad86], // Lehi's house block
    [27, -18, 10, 10, 5.4, 0xc49a70],
    [-6, 0, 14, 8, 5.2, 0xd1ac84],
    // Expanded Upper City Western Quarter (deepening Lehi's neighborhood)
    [-43, 31, 10, 10, 4.8, 0xc8a278],
    [-43, 14, 10, 10, 5.5, 0xdfbe96],
    [-43, -1, 10, 10, 4.5, 0xbda07c],
    [-43, -15, 10, 10, 5.2, 0xd5b088],
    // Expanded Lower City Eastern Quarter (craftsmen & residential terraces)
    [43, 14, 10, 10, 4.6, 0xcfad86],
    [43, -1, 10, 10, 5.2, 0xd1ac84],
    [43, -18, 10, 10, 4.8, 0xcaa680],
    [43, -32, 10, 10, 5.0, 0xd8b58d],
    // Additional eastern blocks expanding Jerusalem exploration
    [59, 14, 10, 10, 4.8, 0xd4b088],
    [59, -1, 10, 10, 5.2, 0xcfad86],
    [59, -18, 10, 10, 4.6, 0xc8a278],
  ]) {
    cityBlock(add, decor, group, solids, x, z, w, d, h, c);
  }

  // Lehi's House Entrance Details: Indigo Doorway, Timber Lintel, Plaque & Lanterns
  decor(-32.06, 0, -15, 0.12, 2.8, 2.8, palette.indigo, "Lehi indigo doorway");
  decor(-32.15, 2.8, -15, 0.28, 0.2, 3.2, palette.timber, "Lehi door lintel");
  const sign = label(group, "LEHI’S HOUSE", -32.22, 3.5, -15, 2.6);
  sign.name = "LEHI’S HOUSE plaque";
  sign.rotation.y = -Math.PI / 2;
  oilLamp(group, -32.15, 1.2, -13.2);
  oilLamp(group, -32.15, 1.2, -16.8);

  // ==========================================
  // ROOFTOP HIGHWAYS & CONNECTING BRIDGES (SM64 FUN)
  // ==========================================
  // Wooden plank bridges spanning narrow alleys between flat rooftops
  add(
    -35,
    4.2,
    14,
    6.0,
    0.22,
    1.4,
    palette.timber,
    "rooftop plank bridge west 1",
  );
  add(
    -35,
    4.4,
    -1,
    6.0,
    0.22,
    1.4,
    palette.timber,
    "rooftop plank bridge west 2",
  );
  add(
    35,
    4.5,
    14,
    6.0,
    0.22,
    1.4,
    palette.timber,
    "rooftop plank bridge east 1",
  );
  add(
    51,
    4.5,
    14,
    6.0,
    0.22,
    1.4,
    palette.timber,
    "rooftop plank bridge east 2",
  );
  add(
    51,
    4.7,
    -1,
    6.0,
    0.22,
    1.4,
    palette.timber,
    "rooftop plank bridge east 3",
  );

  // Rooftop shade arbors (woven reed shelters for sleeping during hot seasons)
  decor(-27, 5.4, 31, 4.5, 0.12, 4.5, 0xcaa680, "rooftop reed canopy 1");
  decor(27, 5.8, 31, 4.5, 0.12, 4.5, 0xcaa680, "rooftop reed canopy 2");

  // East exterior roof stairs
  for (let i = 0; i < 12; i++) {
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
  }
  add(20.5, 4.2, 10, 5.2, 0.35, 3.2, 0xd4b690, "roof terrace landing");

  // West exterior stone roof stairs to access the western residential roof highway
  for (let i = 0; i < 12; i++) {
    add(
      -21,
      i * 0.35,
      24 - i * 1.1,
      2.2,
      0.35,
      1.1,
      0xc5a681,
      "west roof stair",
    );
  }
  add(-20.5, 4.2, 10, 5.2, 0.35, 3.2, 0xd4b690, "west roof terrace landing");

  // Sheep Fold / Corral in the craftsmen quarter near the Waters of Shiloah
  add(40, 0, 36, 8, 1.1, 0.25, palette.timber, "sheep hurdle south");
  add(40, 0, 28, 8, 1.1, 0.25, palette.timber, "sheep hurdle north");
  add(44, 0, 32, 0.25, 1.1, 8, palette.timber, "sheep hurdle east");
  decor(40, 0.02, 32, 7.5, 0.05, 7.5, 0xd4b88a, "sheep fold straw");
  add(37.5, 0, 32, 0.8, 0.45, 1.8, palette.paleStone, "sheep manger");
  sheepModel(group, 39, 0, 31, Math.PI / 3, solids);
  sheepModel(group, 41.5, 0, 33, -Math.PI / 4, solids);

  // ==========================================
  // LABAN'S EXPANDED PALACE & FORTIFIED TREASURY
  // ==========================================
  // Palace stone floor paving covering audience hall, rear gallery, and inner vault
  decor(
    0,
    0.015,
    -27.5,
    36,
    0.035,
    37,
    0xd0b38a,
    "palace interior stone paving",
  );

  // Outer palace exterior walls and room partitions (aligned seamlessly at z = -28.5)
  add(-18, 0, -18.75, 0.7, 7, 19.5, 0xb19472, "palace west exterior");
  add(18, 0, -18.75, 0.7, 7, 19.5, 0xb19472, "palace east exterior");

  // Audience Hall dividing partition and corridor walls
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
    // Rear audience hall partition walls flanking archway to inner courtyard and vault
    [-15, -28.5, 6, 0.7],
    [-7, -28.5, 10, 0.7],
    [6, -28.5, 4, 0.7],
  ]) {
    add(x, 0, z, w, 6.5, d, 0xc6a780, "palace room wall");
  }

  // Doorway lintels (at y = 4.8 for standing clearance)
  for (const [x, z, w, d] of [
    [0, -9, 6, 0.65],
    [-15, -9, 6, 0.65],
    [-12, -14, 0.65, 6],
    [8, -14, 0.65, 6],
    [14, -18, 4, 0.65],
    [14, -9, 4, 0.65],
    [0, -28.5, 4, 0.7], // Arched passage to inner palace courtyard
    [14, -28.5, 4, 0.7], // Secured archway into inner treasury vault
  ]) {
    add(x, 4.8, z, w, 1.7, d, 0xc6a780, "palace doorway lintel");
  }

  // Audience Hall Columns, Dais, Throne & Regalia
  for (const x of [-9, 5]) {
    for (const z of [-24, -18, -12]) {
      column(group, x, z, 6.1, 0.48, palette.paleStone);
      add(x, 0, z, 0.85, 6.1, 0.85, palette.paleStone, "audience hall column");
    }
  }
  for (const x of [-10.8, 6.8]) banner(group, x, 3, -24, palette.indigo);
  add(0, 0, -20, 8, 0.8, 6, 0xd9c29c, "audience dais");
  add(0, 0, -16.4, 8, 0.4, 1.6, 0xc5a67f, "dais step");
  add(0, 0.8, -22.5, 3, 1.15, 1.2, palette.timber, "Laban audience seat");
  add(0, 1.95, -22.9, 3, 2.4, 0.35, palette.timber, "carved seat back");
  add(0, 4.1, -23, 4.2, 0.28, 0.7, palette.brass, "audience canopy");
  for (const x of [-7, 5.8]) {
    add(x, 0, -11.5, 2, 0.85, 1.3, palette.timber, "offering table");
    vessel(group, x, 0.85, -11.5, 0.8, palette.brass);
  }

  // Outer Treasury Antechamber Shelves & Chests (central aisle remains open)
  for (const x of [10, 16.8]) {
    for (const z of [-22, -26]) {
      add(x, 0, z, 1.2, 1.1, 2, palette.timber, "treasury chest");
      vessel(group, x, 1.1, z, 0.7, palette.brass);
    }
  }

  // FORTIFIED INNER TREASURY VAULT (Extended northward so treasury is separated and harder to find!)
  add(8, 0, -32.25, 0.7, 6.5, 7.5, 0xc6a780, "vault west wall");
  add(18, 0, -32.25, 0.7, 6.5, 7.5, 0xc6a780, "vault east wall");
  add(13, 0, -36, 10.7, 6.5, 0.7, 0xb19472, "vault north wall");
  // Stone Pedestal holding the Plates of Brass deep inside the vault
  add(14, 0, -33.5, 2.2, 0.9, 1.8, palette.paleStone, "plates stone pedestal");
  decor(14, 0.9, -33.5, 2.4, 0.15, 2.0, palette.brass, "plates pedestal trim");
  // Vault gold & silver treasure chests
  add(10.5, 0, -34, 1.2, 1.1, 2, palette.timber, "vault gold chest");
  vessel(group, 10.5, 1.1, -34, 0.7, palette.brass);
  add(16.5, 0, -34, 1.2, 1.1, 2, palette.timber, "vault silver chest");
  vessel(group, 16.5, 1.1, -34, 0.7, palette.brass);

  // Palace Inner Peristyle Courtyard Garden (North of Audience Hall)
  add(-12, 0, -33.25, 0.7, 6.5, 9.5, 0xb19472, "courtyard west wall");
  add(-3, 0, -38, 18, 6.5, 0.7, 0xb19472, "courtyard north wall");
  for (const cx of [-9, -3, 3]) {
    column(group, cx, -34, 4.8, 0.34, palette.paleStone);
  }
  // Carved stone palace fountain / water basin
  add(-3, 0, -34, 2.4, 0.6, 2.4, palette.paleStone, "palace garden basin");
  decor(-3, 0.5, -34, 1.8, 0.05, 1.8, palette.turquoise, "palace basin water");

  // Palace Stables & Chariot Yard (West Flank of Palace, terminating at z = -18 to keep street clear)
  add(-25, 0, -32, 14, 2.5, 0.6, palette.limestone, "stable north wall");
  add(-32, 0, -25, 0.6, 2.5, 14, palette.limestone, "stable west wall");
  add(-25, 0, -28, 8, 1.4, 0.3, palette.timber, "stable divider 1");
  add(-25, 0, -22, 8, 1.4, 0.3, palette.timber, "stable divider 2");
  add(-30, 0, -28, 1.2, 0.6, 2.0, palette.paleStone, "stone manger 1");
  decor(-30, 0.55, -28, 1.0, 0.15, 1.8, 0xd4b88a, "manger straw 1");
  add(-30, 0, -22, 1.2, 0.6, 2.0, palette.paleStone, "stone manger 2");
  decor(-30, 0.55, -22, 1.0, 0.15, 1.8, 0xd4b88a, "manger straw 2");

  // ==========================================
  // NORTHEAST DISTRICT: POOL OF BETHESDA (JOHN 5:1–9)
  // ==========================================
  // Ancient twin stepped reservoir near the Sheep Gate with five colonnaded porches
  // Retaining limestone perimeter walls
  add(59, 0, -61.5, 13.6, 0.75, 1.0, palette.limestone, "bethesda north wall");
  add(59, 0, -44.5, 13.6, 0.75, 1.0, palette.limestone, "bethesda south wall");
  add(52.5, 0, -53, 1.0, 0.75, 16.0, palette.limestone, "bethesda west wall");
  add(65.5, 0, -53, 1.0, 0.75, 16.0, palette.limestone, "bethesda east wall");

  // Stepped stone descent into the pool so player can walk into the water
  add(54.5, 0, -53, 1.2, 0.45, 10, palette.sandstone, "bethesda pool step 1");
  add(55.7, 0, -53, 1.2, 0.25, 10, palette.sandstone, "bethesda pool step 2");
  decor(59, 0.02, -53, 12, 0.03, 15, palette.sandstone, "bethesda pool floor");

  // Turquoise pool water surface (walkable shallow wading pool)
  const bethesdaWater = decor(
    59,
    0.22,
    -53,
    11.8,
    0.04,
    14.8,
    0x36a9ba,
    "bethesda pool water surface",
  );
  markScenery(bethesdaWater, {
    kind: "decoration",
    reason:
      "Pool of Bethesda water surface; pool floor provides walking support.",
  });

  // Concentric animated ripple ring meshes when the angel troubles the water
  let bethesdaTime = 0;
  const waterBaseY = bethesdaWater.position.y;
  const bethesdaRipples: THREE.Mesh[] = [];
  const rippleGeom = new THREE.RingGeometry(0.3, 0.65, 24);
  rippleGeom.rotateX(-Math.PI / 2);
  for (let k = 0; k < 3; k++) {
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xd6f7fd,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(rippleGeom, rippleMat);
    ring.position.set(59, 0.25, -53);
    ring.name = `bethesda ripple ring ${k + 1}`;
    markScenery(ring, {
      kind: "decoration",
      reason: "Procedural water ripple ring mesh.",
    });
    group.add(ring);
    bethesdaRipples.push(ring);
  }

  // Five Colonnaded Porches (John 5:2: "having five porches")
  // Porch 1: North Colonnade
  for (const cx of [54, 57.5, 61, 64.5]) {
    column(group, cx, -63.5, 3.6, 0.3, palette.paleStone);
    add(
      cx,
      0,
      -63.5,
      0.65,
      3.6,
      0.65,
      palette.paleStone,
      "bethesda north column",
    );
  }
  add(
    59,
    3.6,
    -63.5,
    12.5,
    0.2,
    3.2,
    palette.timber,
    "bethesda north porch roof",
  );

  // Porch 2: South Colonnade
  for (const cx of [54, 57.5, 61, 64.5]) {
    column(group, cx, -42.5, 3.6, 0.3, palette.paleStone);
    add(
      cx,
      0,
      -42.5,
      0.65,
      3.6,
      0.65,
      palette.paleStone,
      "bethesda south column",
    );
  }
  add(
    59,
    3.6,
    -42.5,
    12.5,
    0.2,
    3.2,
    palette.timber,
    "bethesda south porch roof",
  );

  // Porch 3: West Colonnade
  for (const cz of [-60, -56, -50, -46]) {
    column(group, 50.5, cz, 3.6, 0.3, palette.paleStone);
    add(
      50.5,
      0,
      cz,
      0.65,
      3.6,
      0.65,
      palette.paleStone,
      "bethesda west column",
    );
  }
  add(
    50.5,
    3.6,
    -53,
    3.2,
    0.2,
    16.5,
    palette.timber,
    "bethesda west porch roof",
  );

  // Porch 4: East Colonnade
  for (const cz of [-60, -56, -50, -46]) {
    column(group, 67.5, cz, 3.6, 0.3, palette.paleStone);
    add(
      67.5,
      0,
      cz,
      0.65,
      3.6,
      0.65,
      palette.paleStone,
      "bethesda east column",
    );
  }
  add(
    67.5,
    3.6,
    -53,
    3.2,
    0.2,
    16.5,
    palette.timber,
    "bethesda east porch roof",
  );

  // Porch 5: Central Dividing Colonnade (dividing upper & lower basins)
  for (const cx of [55.5, 59, 62.5]) {
    column(group, cx, -53, 3.6, 0.3, palette.paleStone);
    add(
      cx,
      0,
      -53,
      0.65,
      3.6,
      0.65,
      palette.paleStone,
      "bethesda central column",
    );
  }
  add(
    59,
    0.45,
    -53,
    12,
    0.45,
    0.85,
    palette.limestone,
    "bethesda dividing stylobate",
  );
  add(
    59,
    3.6,
    -53,
    12,
    0.2,
    1.2,
    palette.timber,
    "bethesda central porch beam",
  );

  // Ambient Waiting Infirm & Disabled Figures under the porches
  // Figure 1: Infirm man of 38 years lying on a woven sleeping mat under the west porch
  decor(50.5, 0.03, -49, 1.1, 0.05, 2.1, 0xc4a676, "infirm man sleeping mat");
  decor(50.5, 0.12, -49.6, 0.7, 0.14, 0.35, 0xd4c2a0, "infirm head pillow");
  decor(50.5, 0.16, -49, 0.65, 0.22, 1.4, 0x6e5340, "infirm man mantle");

  // Figure 2: Waiting figure seated against column under south porch
  decor(57.5, 0.03, -42.5, 1.0, 0.03, 1.0, 0x8b5a42, "waiting citizen mat");
  decor(57.5, 0.22, -42.5, 0.55, 0.4, 0.55, 0x564132, "waiting citizen seated");

  // Figure 3: Waiting blind figure with staff on stone bench under north porch
  add(61, 0, -63.5, 2.2, 0.5, 0.8, palette.limestone, "bethesda stone bench");
  decor(61, 0.52, -63.5, 0.55, 0.5, 0.55, 0x7a624d, "seated blind figure");
  decor(
    61.35,
    0.5,
    -63.2,
    0.06,
    0.9,
    0.06,
    palette.timber,
    "blind walking staff",
  );

  // Palace Inner Peristyle Courtyard Garden (North of Audience Hall)
  add(-12, 0, -33.25, 0.7, 6.5, 9.5, 0xb19472, "courtyard west wall");
  add(-3, 0, -38, 18, 6.5, 0.7, 0xb19472, "courtyard north wall");
  for (const cx of [-9, -3, 3]) {
    column(group, cx, -34, 4.8, 0.34, palette.paleStone);
  }
  // Carved stone palace fountain / water basin
  add(-3, 0, -34, 2.4, 0.6, 2.4, palette.paleStone, "palace garden basin");
  decor(-3, 0.5, -34, 1.8, 0.05, 1.8, palette.turquoise, "palace basin water");

  // Palace Stables & Chariot Yard (West Flank of Palace, terminating at z = -18 to keep street clear)
  add(-25, 0, -32, 14, 2.5, 0.6, palette.limestone, "stable north wall");
  add(-32, 0, -25, 0.6, 2.5, 14, palette.limestone, "stable west wall");
  add(-25, 0, -28, 8, 1.4, 0.3, palette.timber, "stable divider 1");
  add(-25, 0, -22, 8, 1.4, 0.3, palette.timber, "stable divider 2");
  add(-30, 0, -28, 1.2, 0.6, 2.0, palette.paleStone, "stone manger 1");
  decor(-30, 0.55, -28, 1.0, 0.15, 1.8, 0xd4b88a, "manger straw 1");
  add(-30, 0, -22, 1.2, 0.6, 2.0, palette.paleStone, "stone manger 2");
  decor(-30, 0.55, -22, 1.0, 0.15, 1.8, 0xd4b88a, "manger straw 2");

  // Date Palms (Trunks are climbables; leaf canopies have physical walking support at y = 4.8)
  const palmCoords = [
    [-17, 22], // jerusalem-west-palm (tested)
    [20, 5], // jerusalem-east-palm-1
    [20, -10], // jerusalem-east-palm-2
    [-30, 23], // jerusalem-northwest-palm
    [13, 47], // jerusalem-outside-south-palm
    [26, 24], // jerusalem-siloam-palm-1
    [46, 24], // jerusalem-siloam-palm-2
    [10, -46], // jerusalem-temple-palm
    [-48, 5], // jerusalem-outer-west-palm
    [-8, -34], // jerusalem-palace-garden-palm
  ] as const;

  for (const [x, z] of palmCoords) {
    datePalm(group, x, z, 4.8);
    add(x, 0, z, 0.32, 4.8, 0.32, palette.timber, "date palm trunk");
    solids.push({ x, y: 4.8, z, w: 2.4, h: 0.25, d: 2.4 });
  }

  // Oil Lamps on solid architectural surfaces
  for (const [x, y, z] of [
    [-7, 0.85, -11.5],
    [5.8, 0.85, -11.5],
    [10, 1.1, -22],
    [16.8, 1.1, -26],
    [12.8, 0.9, -32],
    [15.2, 0.9, -32],
    [0, 1.2, 38], // South gate torch
    [23, 1.2, -49], // Temple approach lamp
  ]) {
    oilLamp(group, x, y, z);
    if (id === "night") {
      const glow = new THREE.PointLight(0xffcb80, 14, 12);
      glow.position.set(x, y + 2, z);
      group.add(glow);
    }
  }

  // Desert approach boulders outside south gate
  for (const [x, z, w] of [
    [-23, 53, 4],
    [13, 58, 4],
    [12, 69, 5],
  ]) {
    terracedRock(
      group,
      solids,
      new THREE.MeshStandardMaterial({ color: 0x977f66, roughness: 1 }),
      { x, y: 0, z, w, h: 1.2, d: 3 },
      "desert boulder",
    );
  }
  rockCave(add, group, solids);

  // Night Atmosphere & Starlight
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
    markScenery(moon, {
      kind: "decoration",
      reason: "Celestial moon sphere for night atmosphere.",
    });
    group.add(moon);
  }

  const audience = { x: 0, y: 0.8, z: -21.1 };
  const brothers = { x: 0, y: 0, z: 46 };
  const cave = { x: -8, y: 0, z: 92 };
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
        ? "Find the indigo doorway to Lehi’s home"
        : id === "palace"
          ? "Ask Laban for the brass plates, then return to your brothers"
          : id === "trade"
            ? "Offer the family’s treasures, then find refuge in the cave"
            : "Find Laban in the city and follow Zoram to the palace treasury",
    spawn: { x: 0, y: 0, z: id === "night" ? 44 : 25, yaw: Math.PI },
    actorParent: group,
    cameraRooms: undefined,
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
        radius: 0.35,
      },
      {
        id: "jerusalem-east-palm-1",
        x: 20,
        z: 5,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
      {
        id: "jerusalem-east-palm-2",
        x: 20,
        z: -10,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
      {
        id: "jerusalem-northwest-palm",
        x: -30,
        z: 23,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
      {
        id: "jerusalem-outside-south-palm",
        x: 13,
        z: 47,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
      {
        id: "jerusalem-siloam-palm-1",
        x: 26,
        z: 24,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
      {
        id: "jerusalem-siloam-palm-2",
        x: 46,
        z: 24,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
      {
        id: "jerusalem-temple-palm",
        x: 10,
        z: -46,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
      {
        id: "jerusalem-outer-west-palm",
        x: -48,
        z: 5,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
      {
        id: "jerusalem-palace-garden-palm",
        x: -8,
        z: -34,
        y: 0,
        height: 4.8,
        radius: 0.35,
      },
    ],
    tokens: undefined,
    bounds: { minX: -56, maxX: 72, minZ: -72, maxZ: 112 },
    update: (dt: number) => {
      bethesdaTime += dt;
      const cycle = bethesdaTime % 6.0;
      if (cycle >= 3.8 && cycle <= 5.8) {
        const prog = (cycle - 3.8) / 2.0;
        bethesdaWater.position.y = waterBaseY + Math.sin(cycle * 14) * 0.035;
        for (let k = 0; k < bethesdaRipples.length; k++) {
          const ring = bethesdaRipples[k];
          const ringProg = (prog + k * 0.3) % 1.0;
          const scale = 1.0 + ringProg * 4.2;
          ring.scale.set(scale, scale, 1);
          const mat = ring.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.sin(ringProg * Math.PI) * 0.65;
        }
      } else {
        bethesdaWater.position.y = waterBaseY;
        for (const ring of bethesdaRipples) {
          (ring.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }
    },
    ...finish(),
  };
}

export const JERUSALEM_PALACE_ROOMS: readonly CameraRoom[] = [
  {
    id: "palace-west-passage",
    // Room boundaries meet at the x=-12 doorway plane. Collision still
    // keeps the eye clear of its solid wall sections.
    bounds: { minX: -17.5, maxX: -12, minZ: -28, maxZ: -9 },
    distance: 3,
    elevation: 0.25,
    targetHeight: 1,
    entryEyes: [
      { x: -15, y: 2.1, z: -12 },
      { x: -15, y: 2.1, z: -14 },
    ],
    exitEyes: [
      { x: -15, y: 2.1, z: -6.5 },
      { x: -10, y: 2.1, z: -14 },
    ],
  },
  {
    id: "palace-audience",
    // Shared wall-center planes avoid an unzoned gap through either door.
    bounds: { minX: -12, maxX: 8, minZ: -28, maxZ: -9.4 },
    distance: 5,
    elevation: 0.28,
    targetHeight: 1,
    entryEyes: [
      { x: -10, y: 2.2, z: -14 },
      { x: 0, y: 2.3, z: -12.5 },
      { x: 6, y: 2.2, z: -14 },
    ],
    exitEyes: [
      { x: -15, y: 2.1, z: -14 },
      { x: 0, y: 2.3, z: -6.5 },
      { x: 11, y: 2.2, z: -14 },
    ],
  },
  {
    id: "palace-treasury-entry",
    // The vestibule and treasury meet at the physical z=-18 doorway.
    bounds: { minX: 8, maxX: 17.4, minZ: -18, maxZ: -9.4 },
    distance: 5,
    elevation: 0.28,
    targetHeight: 1,
    entryEyes: [
      { x: 11, y: 2.2, z: -14 },
      { x: 14, y: 2.2, z: -15.5 },
      { x: 14, y: 2.2, z: -12 },
    ],
    exitEyes: [
      { x: 6, y: 2.2, z: -14 },
      { x: 14, y: 2.2, z: -20.5 },
      { x: 14, y: 2.2, z: -6.5 },
    ],
  },
  {
    id: "palace-treasury",
    // Camera handoff stays in the x=[12,16] opening through the partition.
    bounds: { minX: 8, maxX: 17.4, minZ: -28, maxZ: -18 },
    distance: 5,
    elevation: 0.28,
    targetHeight: 1,
    entryEyes: [{ x: 14, y: 2.2, z: -20.5 }],
    exitEyes: [{ x: 14, y: 2.2, z: -15.5 }],
  },
];
