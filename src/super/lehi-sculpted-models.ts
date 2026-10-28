import { addMoroniHead } from "./moroni-head";
import { addMoroniCommander, shapeMoroni } from "./moroni-commander";
import * as T from "three";
import type { CharacterRole } from "./character-types";
import { APPROVED_NEPHI_FACE } from "./nephi-appearance";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import {
  capsule,
  ellipsoid,
  sculpt,
  smoothUnion,
  type DistanceField,
} from "./sculpture";

export type SculptedLehi = { group: T.Group; dispose: () => void };

export type SculptedCharacterRole = CharacterRole;
export type SculptedCharacterQuality = "hero" | "npc" | "crowd";
/** Optional anatomical study; ordinary cast builds never apply a profile. */
export type SculptedFaceProfile = {
  faceWidth?: number;
  faceHeight?: number;
  faceDepth?: number;
  jawWidth?: number;
  lowerFaceTaper?: number;
  jawSquareness?: number;
  jawDrop?: number;
  chinLength?: number;
  jawDepth?: number;
  cheekbone?: number;
  noseWidth?: number;
  noseProjection?: number;
  noseBridge?: number;
  eyeSpacing?: number;
  eyeHeight?: number;
  eyeOpening?: number;
  softUnderEyes?: boolean;
  eyeWidth?: number;
  browLift?: number;
  browAngle?: number;
  browThickness?: number;
  mouthWidth?: number;
  mouthHeight?: number;
  smile?: number;
  hairColor?: number;
  hairCut?:
    | "crew"
    | "side-part"
    | "crop"
    | "brush-up"
    | "ivy"
    | "side-sweep"
    | "buzz"
    | "texture";
  hairLength?: number;
};

type CastTraits = {
  skin: number;
  robe: number;
  coat: number;
  trim: number;
  hair: number;
  head: number;
  tall: number;
  faceWidth: number;
  jaw: number;
  nose: number;
  hairStyle: "receding" | "swept" | "waves" | "cropped" | "shawl";
  beard: "elder" | "none" | "scruff" | "trimmed";
  hem: number;
  width: number;
  brow: number;
  outfit: "travel" | "regal" | "undertunic" | "armor" | "shawl";
};

// Identity changes anatomy, hair and the garment cut as well as color. These
// are storybook costume choices, not claims about historical royal clothing.
const ORIGINAL_CAST_TRAITS: Readonly<
  Record<
    Exclude<
      SculptedCharacterRole,
      | "moroni"
      | "teancum"
      | "morianton"
      | "amalickiah"
      | "lehonti"
      | "lamanite-laman"
      | "samuel"
      | "jacob"
      | "sherem"
      | "alma"
      | "convert"
      | "spy"
      | "ammon"
      | "lamoni"
      | "wife"
      | "lamans-wife"
      | "lemuels-wife"
    >,
    CastTraits
  >
> = {
  lehi: {
    skin: 0xba8665,
    robe: 0xdac7a6,
    coat: 0x80634a,
    trim: 0xa78a69,
    hair: 0x99958e,
    head: 0.337,
    tall: 1,
    faceWidth: 0.94,
    jaw: 0.76,
    nose: 0.073,
    hairStyle: "receding",
    beard: "elder",
    hem: 0.24,
    width: 0.37,
    brow: 0,
    outfit: "travel",
  },
  nephi: {
    skin: 0xbd8c69,
    robe: 0xe4d2ae,
    coat: 0x477d82,
    trim: 0x9a734a,
    hair: 0x38291f,
    head: 0.313,
    tall: 1.05,
    faceWidth: 0.92,
    jaw: 0.72,
    nose: 0.064,
    hairStyle: "swept",
    beard: "none",
    hem: 0.29,
    width: 0.35,
    brow: 0.02,
    outfit: "travel",
  },
  "nephi-disguised": {
    skin: 0xbd8c69,
    robe: 0xe2c497,
    coat: 0x64466e,
    trim: 0xcba45d,
    hair: 0x38291f,
    head: 0.313,
    tall: 1.05,
    faceWidth: 0.92,
    jaw: 0.72,
    nose: 0.064,
    hairStyle: "swept",
    beard: "none",
    hem: 0.17,
    width: 0.39,
    brow: 0.02,
    outfit: "regal",
  },
  sam: {
    skin: 0xc4916e,
    robe: 0xd5c69f,
    coat: 0x758a68,
    trim: 0xa48a60,
    hair: 0x533b29,
    head: 0.309,
    tall: 1.03,
    faceWidth: 0.9,
    jaw: 0.65,
    nose: 0.06,
    hairStyle: "waves",
    beard: "none",
    hem: 0.25,
    width: 0.355,
    brow: 0.035,
    outfit: "travel",
  },
  laman: {
    skin: 0xaf7b59,
    robe: 0xc3a081,
    coat: 0x88604d,
    trim: 0xa3835e,
    hair: 0x36271f,
    head: 0.328,
    tall: 1.04,
    faceWidth: 0.95,
    jaw: 0.79,
    nose: 0.076,
    hairStyle: "waves",
    beard: "scruff",
    hem: 0.25,
    width: 0.38,
    brow: -0.01,
    outfit: "travel",
  },
  lemuel: {
    skin: 0xb58361,
    robe: 0xc8b28e,
    coat: 0x6f7560,
    trim: 0x9c7954,
    hair: 0x443127,
    head: 0.317,
    tall: 1.09,
    faceWidth: 0.88,
    jaw: 0.7,
    nose: 0.072,
    hairStyle: "cropped",
    beard: "scruff",
    hem: 0.23,
    width: 0.36,
    brow: -0.005,
    outfit: "travel",
  },
  sariah: {
    skin: 0xc08b6c,
    robe: 0xd8c5af,
    coat: 0x798f8b,
    trim: 0xb4a181,
    hair: 0x625047,
    head: 0.309,
    tall: 1.07,
    faceWidth: 0.89,
    jaw: 0.61,
    nose: 0.058,
    hairStyle: "shawl",
    beard: "none",
    hem: 0.12,
    width: 0.39,
    brow: 0.045,
    outfit: "shawl",
  },
  laban: {
    skin: 0xb38160,
    robe: 0xe2c497,
    coat: 0x64466e,
    trim: 0xcba45d,
    hair: 0x3e3029,
    head: 0.34,
    tall: 1.05,
    faceWidth: 0.99,
    jaw: 0.84,
    nose: 0.082,
    hairStyle: "cropped",
    beard: "trimmed",
    hem: 0.17,
    width: 0.39,
    brow: 0,
    outfit: "regal",
  },
  "laban-undressed": {
    skin: 0xb38160,
    robe: 0xe2d5b9,
    coat: 0xe2d5b9,
    trim: 0xbda98a,
    hair: 0x3e3029,
    head: 0.34,
    tall: 1.05,
    faceWidth: 0.99,
    jaw: 0.84,
    nose: 0.082,
    hairStyle: "cropped",
    beard: "trimmed",
    hem: 0.25,
    width: 0.37,
    brow: 0,
    outfit: "undertunic",
  },
  guard: {
    skin: 0xa87958,
    robe: 0x9d9c89,
    coat: 0x595d61,
    trim: 0xb59a66,
    hair: 0x342c27,
    head: 0.325,
    tall: 1.01,
    faceWidth: 0.96,
    jaw: 0.84,
    nose: 0.076,
    hairStyle: "cropped",
    beard: "scruff",
    hem: 0.38,
    width: 0.38,
    brow: -0.025,
    outfit: "armor",
  },
  zoram: {
    skin: 0xba8c68,
    robe: 0xd2c2a3,
    coat: 0x5d7d82,
    trim: 0x9b8262,
    hair: 0x48372b,
    head: 0.315,
    tall: 1.1,
    faceWidth: 0.86,
    jaw: 0.66,
    nose: 0.071,
    hairStyle: "cropped",
    beard: "trimmed",
    hem: 0.27,
    width: 0.35,
    brow: 0.015,
    outfit: "travel",
  },
  child: {
    skin: 0xc59373,
    robe: 0xe3c68e,
    coat: 0xb56745,
    trim: 0xaa885b,
    hair: 0x4a3427,
    head: 0.35,
    tall: 0.98,
    faceWidth: 0.96,
    jaw: 0.61,
    nose: 0.05,
    hairStyle: "waves",
    beard: "none",
    hem: 0.32,
    width: 0.34,
    brow: 0.05,
    outfit: "travel",
  },
};

// New story identities retain the approved garment construction and motion rig.
export const SCULPTED_CAST_TRAITS: Readonly<
  Record<SculptedCharacterRole, CastTraits>
> = {
  ...ORIGINAL_CAST_TRAITS,
  moroni: {
    ...ORIGINAL_CAST_TRAITS.guard,
    outfit: "armor",
    beard: "none",
    hair: 0x39271d,
    hairStyle: "swept",
    coat: 0x335b78,
    robe: 0xd7c3a0,
    trim: 0xb8a16d,
    faceWidth: 0.87,
    width: 0.36,
    brow: 0.035,
  },
  teancum: {
    ...ORIGINAL_CAST_TRAITS.guard,
    outfit: "armor",
    beard: "trimmed",
    hairStyle: "cropped",
    hair: 0x3e3027,
    coat: 0x3f7066,
    robe: 0x88785d,
    trim: 0x9a9e85,
    faceWidth: 0.82,
    width: 0.34,
    tall: 1.07,
  },
  morianton: {
    ...ORIGINAL_CAST_TRAITS.laman,
    beard: "scruff",
    hairStyle: "swept",
    coat: 0x8c5944,
    robe: 0xb99a6a,
    trim: 0x65513f,
    brow: -0.025,
  },
  amalickiah: {
    ...ORIGINAL_CAST_TRAITS.laban,
    beard: "trimmed",
    hairStyle: "swept",
    coat: 0x623955,
    robe: 0x9b795d,
    trim: 0xc0a168,
    faceWidth: 0.93,
    brow: -0.04,
    tall: 1.12,
  },
  lehonti: {
    ...ORIGINAL_CAST_TRAITS.zoram,
    beard: "trimmed",
    hairStyle: "cropped",
    coat: 0x967947,
    robe: 0xbcb598,
    trim: 0x5c706a,
    faceWidth: 0.9,
    tall: 1.04,
  },
  "lamanite-laman": {
    ...ORIGINAL_CAST_TRAITS.sam,
    beard: "scruff",
    hairStyle: "cropped",
    coat: 0x7b6f8f,
    robe: 0xc1b49b,
    trim: 0x76634d,
    faceWidth: 0.84,
  },
  // Samuel's face and clothing are an illustrative reading, not details
  // specified by Helaman 13–16 or 3 Nephi 1.
  samuel: {
    ...ORIGINAL_CAST_TRAITS.zoram,
    hair: 0x28231f,
    hairStyle: "cropped",
    beard: "trimmed",
    robe: 0xc6a16f,
    coat: 0x8d503d,
    trim: 0x665f48,
    head: 0.318,
    faceWidth: 0.9,
    jaw: 0.72,
    nose: 0.069,
    tall: 1.07,
    width: 0.35,
    brow: 0.045,
  },
  jacob: {
    ...ORIGINAL_CAST_TRAITS.lehi,
    hair: 0x645648,
    beard: "trimmed",
    head: 0.32,
    faceWidth: 0.88,
    width: 0.35,
    tall: 1.05,
    robe: 0xdfd0b2,
    coat: 0x536b83,
    trim: 0x9a8360,
  },
  sherem: {
    ...ORIGINAL_CAST_TRAITS.zoram,
    hairStyle: "swept",
    beard: "none",
    coat: 0x69526f,
    robe: 0xccbaa1,
    trim: 0xa78961,
    brow: -0.01,
  },
  alma: {
    ...ORIGINAL_CAST_TRAITS.sam,
    beard: "trimmed",
    hair: 0x514235,
    robe: 0xe5d9be,
    coat: 0x718877,
    trim: 0xa08d70,
    tall: 1.08,
  },
  convert: {
    ...ORIGINAL_CAST_TRAITS.sam,
    beard: "none",
    hairStyle: "cropped",
    coat: 0x9b7654,
    robe: 0xd6c5a4,
    width: 0.34,
  },
  ammon: {
    ...ORIGINAL_CAST_TRAITS.nephi,
    hair: 0x4d3628,
    hairStyle: "cropped",
    coat: 0x8c5145,
    robe: 0xe0ccab,
    trim: 0xab8b5d,
    beard: "none",
  },
  lamoni: {
    ...ORIGINAL_CAST_TRAITS.laban,
    hair: 0x30291f,
    coat: 0x456e62,
    robe: 0xc7b386,
    trim: 0xbca45d,
    beard: "trimmed",
    faceWidth: 0.94,
  },
  wife: {
    ...ORIGINAL_CAST_TRAITS.sariah,
    hairStyle: "waves",
    outfit: "travel",
    hair: 0x49352b,
    coat: 0x9d8069,
    robe: 0xe1cfaf,
    head: 0.3,
    faceWidth: 0.86,
    width: 0.33,
    hem: 0.2,
    brow: 0.045,
  },
  "lamans-wife": {
    ...ORIGINAL_CAST_TRAITS.sariah,
    hairStyle: "waves",
    outfit: "undertunic",
    hair: 0x49322b,
    robe: 0x886690,
    coat: 0x886690,
    trim: 0xc9a46c,
    head: 0.3,
    faceWidth: 0.87,
    width: 0.33,
    hem: 0.5,
  },
  "lemuels-wife": {
    ...ORIGINAL_CAST_TRAITS.sariah,
    hairStyle: "waves",
    outfit: "undertunic",
    hair: 0x684632,
    robe: 0xba715f,
    coat: 0xba715f,
    trim: 0xd3af70,
    head: 0.3,
    faceWidth: 0.85,
    width: 0.32,
    hem: 0.47,
  },
  spy: {
    ...ORIGINAL_CAST_TRAITS.guard,
    hairStyle: "cropped",
    coat: 0x51465b,
    trim: 0x776578,
    robe: 0x5c5665,
  },
};

type Shape = {
  name: string;
  head: number;
  headY: number;
  headTall: number;
  shoulder: number;
  waist: number;
  hem: number;
  beard: number;
  nose: number;
  cloak: number;
  collar: number;
  folds: number;
  lean: number;
};

const SHAPES: Shape[] = [
  {
    name: "cinematic-adventurer",
    head: 0.282,
    headY: 1.69,
    headTall: 1.07,
    shoulder: 0.41,
    waist: 0.315,
    hem: 0.365,
    beard: 0.31,
    nose: 0.078,
    cloak: 0.48,
    collar: 0.09,
    folds: 11,
    lean: 0.0,
  },
  {
    name: "illustrated-epic",
    head: 0.255,
    headY: 1.72,
    headTall: 1.25,
    shoulder: 0.39,
    waist: 0.285,
    hem: 0.53,
    beard: 0.43,
    nose: 0.087,
    cloak: 0.63,
    collar: 0.12,
    folds: 9,
    lean: -0.015,
  },
  {
    name: "soft-animation",
    head: 0.337,
    headY: 1.67,
    headTall: 1.0,
    shoulder: 0.36,
    waist: 0.29,
    hem: 0.37,
    beard: 0.19,
    nose: 0.073,
    cloak: 0.39,
    collar: 0.055,
    folds: 12,
    lean: 0.015,
  },
  {
    name: "heroic-guardian",
    head: 0.267,
    headY: 1.71,
    headTall: 1.05,
    shoulder: 0.52,
    waist: 0.38,
    hem: 0.46,
    beard: 0.28,
    nose: 0.08,
    cloak: 0.58,
    collar: 0.15,
    folds: 10,
    lean: -0.025,
  },
  {
    name: "quiet-wanderer",
    head: 0.27,
    headY: 1.68,
    headTall: 1.1,
    shoulder: 0.35,
    waist: 0.285,
    hem: 0.42,
    beard: 0.395,
    nose: 0.073,
    cloak: 0.54,
    collar: 0.125,
    folds: 8,
    lean: 0.035,
  },
  {
    name: "stylized-film",
    head: 0.296,
    headY: 1.69,
    headTall: 1.065,
    shoulder: 0.415,
    waist: 0.31,
    hem: 0.445,
    beard: 0.33,
    nose: 0.09,
    cloak: 0.53,
    collar: 0.1,
    folds: 14,
    lean: 0.005,
  },
];

type Materials = {
  skin: T.MeshPhysicalMaterial;
  robe: T.MeshPhysicalMaterial;
  robeShadow: T.MeshPhysicalMaterial;
  mantle: T.MeshPhysicalMaterial;
  mantleLining: T.MeshPhysicalMaterial;
  leather: T.MeshPhysicalMaterial;
  hair: T.MeshPhysicalMaterial;
  beard: T.MeshPhysicalMaterial;
  eyeWhite: T.MeshPhysicalMaterial;
  iris: T.MeshPhysicalMaterial;
  mouth: T.MeshPhysicalMaterial;
};

function makeMaterials(index: number, traits?: CastTraits): Materials {
  const physical = (color: number, roughness: number) =>
    new T.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      clearcoat: roughness < 0.7 ? 0.15 : 0.03,
      side: T.DoubleSide,
    });
  const warmer = index === 2;
  const materials = {
    skin: physical(warmer ? 0xba8665 : 0xad7959, 0.58),
    robe: physical(warmer ? 0xdac7a6 : 0xd2bd9a, 0.94),
    robeShadow: physical(0xbca482, 0.96),
    mantle: physical(index === 4 ? 0x796149 : 0x80634a, 0.91),
    mantleLining: physical(0xa78a69, 0.91),
    leather: physical(0x57402d, 0.74),
    hair: physical(index === 2 ? 0x99958e : 0xaaa49c, 0.86),
    beard: physical(0xc4bbb0, 0.76),
    eyeWhite: physical(0xe9dfcf, 0.34),
    iris: physical(0x382f29, 0.26),
    mouth: physical(0x805446, 0.85),
  };
  for (const material of [
    materials.robe,
    materials.robeShadow,
    materials.mantle,
    materials.mantleLining,
  ])
    material.clearcoat = 0;
  for (const material of [
    materials.skin,
    materials.hair,
    materials.beard,
    materials.leather,
  ]) {
    material.roughness = 1;
    material.clearcoat = 0;
    material.specularIntensity = 0;
  }
  if (traits) {
    for (const [key, color] of Object.entries({
      skin: traits.skin,
      robe: traits.robe,
      robeShadow: traits.robe,
      mantle: traits.coat,
      mantleLining: traits.trim,
      hair: traits.hair,
      beard: traits.hair,
    }))
      materials[key as keyof Materials].color.setHex(color);
    if (traits.outfit === "armor") {
      materials.mantle.metalness = 0.45;
      materials.mantle.roughness = 0.6;
    }
    if (traits.outfit === "regal") {
      materials.mantleLining.metalness = 0.58;
      materials.mantleLining.roughness = 0.43;
    }
  }
  return materials;
}

function surface(
  uCount: number,
  vCount: number,
  point: (u: number, v: number) => T.Vector3,
): T.BufferGeometry {
  const positions = new Float32Array((uCount + 1) * (vCount + 1) * 3);
  const indices: number[] = [];
  for (let j = 0; j <= vCount; j++) {
    for (let i = 0; i <= uCount; i++) {
      const p = point(i / uCount, j / vCount);
      const n = (j * (uCount + 1) + i) * 3;
      positions[n] = p.x;
      positions[n + 1] = p.y;
      positions[n + 2] = p.z;
      if (i < uCount && j < vCount) {
        const a = j * (uCount + 1) + i;
        const b = a + 1;
        const c = a + uCount + 1;
        indices.push(a, b, c, b, c + 1, c);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeSculpted(
  index: number,
  role?: SculptedCharacterRole,
  quality: SculptedCharacterQuality = "hero",
  faceProfile?: SculptedFaceProfile,
): SculptedLehi {
  const traits = role ? SCULPTED_CAST_TRAITS[role] : undefined;
  // Lehi's accepted hero geometry is deliberately identical to the style slab.
  const cast = role !== "lehi" ? traits : undefined;
  const base = SHAPES[index];
  const s =
    base && cast
      ? {
          ...base,
          head: cast.head,
          headTall: cast.tall,
          nose: faceProfile?.noseWidth ?? cast.nose,
          hem: cast.width,
          beard:
            cast.beard === "trimmed"
              ? 0.045
              : cast.beard === "scruff"
                ? 0.01
                : base.beard,
        }
      : base;
  const resolution = (full: number, shell = false) =>
    quality === "hero"
      ? full
      : Math.max(
          shell
            ? quality === "crowd"
              ? 48
              : 60
            : quality === "crowd"
              ? 9
              : 12,
          Math.round(full * (quality === "crowd" ? 0.26 : 0.55)),
        );
  if (!s) throw new RangeError(`Unknown sculpted Lehi variant ${index}`);
  const group = new T.Group();
  group.name = `lehi-${s.name}`;
  const materials = makeMaterials(index, cast);
  if (faceProfile) {
    // Preview studies use a soft, matte complexion and lighter short hair.
    materials.skin.roughness = 0.87;
    materials.skin.clearcoat = 0;
    if (faceProfile.hairColor !== undefined)
      materials.hair.color.setHex(faceProfile.hairColor);
  }
  group.userData.characterRole = role ?? "lehi";
  group.userData.characterQuality = quality;
  group.userData.sculptedTraits = traits;
  const geometries: T.BufferGeometry[] = [];
  const extraMaterials: T.Material[] = [];
  const add = (
    geometry: T.BufferGeometry,
    material: T.Material,
    name: string,
  ) => {
    // Marching cubes emits independent triangle vertices. Welding identical
    // position/normal pairs saves buffers on NPCs without changing the surface.
    if (role && !(role === "lehi" && quality === "hero")) {
      const compact = mergeVertices(geometry);
      geometry.dispose();
      geometry = compact;
    }
    geometries.push(geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const athletic =
    role === "nephi" ||
    role === "nephi-disguised" ||
    role === "ammon" ||
    role === "moroni";
  // Chest and shoulders retain their breadth while the waist and garment depth
  // taper. The tunic, fitted coat and sash all sample these same dimensions.
  const body = athletic
    ? {
        chestWidth: 0.375,
        chestDepth: 0.245,
        chestY: 1.215,
        chestTall: 0.3,
        waistWidth: 0.252,
        waistDepth: 0.225,
        waistY: 1.015,
        waistTall: 0.24,
        skirtWaist: 0.255,
        skirtDepth: 0.235,
        hemDepth: 0.27,
        hemWidth: role === "nephi-disguised" ? 0.35 : 0.32,
      }
    : undefined;

  // One continuous cloth field joins shoulders, torso, and both sleeves.
  const shirt: DistanceField = (x, y, z) => {
    if (role === "moroni") {
      let d = ellipsoid(x, y, z, 0, 1.215, s.lean, 0.375, 0.3, 0.245);
      d = smoothUnion(
        d,
        ellipsoid(x, y, z, 0, 1.015, s.lean, 0.252, 0.24, 0.225),
        0.055,
      );
      for (const side of [-1, 1])
        d = smoothUnion(
          d,
          capsule(
            x,
            y,
            z,
            side * 0.32,
            1.35,
            0,
            side * 0.47,
            1.19,
            0.03,
            0.085,
          ),
          0.035,
        );
      return d;
    }
    let d = ellipsoid(
      x,
      y,
      z,
      0,
      body?.chestY ?? 1.17,
      s.lean,
      body?.chestWidth ?? s.shoulder,
      body?.chestTall ?? 0.36,
      body?.chestDepth ?? 0.3,
    );
    d = smoothUnion(
      d,
      ellipsoid(
        x,
        y,
        z,
        0,
        body?.waistY ?? 1.02,
        s.lean,
        body?.waistWidth ?? s.waist + 0.065,
        body?.waistTall ?? 0.28,
        body?.waistDepth ?? 0.31,
      ),
      0.12,
    );
    for (const side of [-1, 1]) {
      d = smoothUnion(
        d,
        capsule(
          x,
          y,
          z,
          side * (s.shoulder - 0.08),
          1.29,
          0,
          side * (s.shoulder + 0.14),
          0.93,
          0.035,
          athletic ? 0.115 : index === 3 ? 0.155 : 0.13,
        ),
        0.12,
      );
      d = smoothUnion(
        d,
        ellipsoid(
          x,
          y,
          z,
          side * (s.shoulder + 0.12),
          1.0,
          0.03,
          athletic ? 0.12 : 0.14,
          athletic ? 0.175 : 0.19,
          athletic ? 0.12 : 0.14,
        ),
        0.05,
      );
    }
    return d;
  };
  // One implicit tunic joins the torso, sleeves and skirt. Separate overlapping
  // shirt/skirt surfaces previously cut through each other below the sash.
  const longGarment = (
    x: number,
    y: number,
    z: number,
    hem = cast?.hem ?? 0.24,
  ) => {
    const t = T.MathUtils.clamp((y - hem) / (1.08 - hem), 0, 1);
    const rx = T.MathUtils.lerp(
      body?.hemWidth ?? cast?.width ?? 0.37,
      body?.skirtWaist ?? 0.31,
      t,
    );
    const rz = T.MathUtils.lerp(
      body?.hemDepth ?? 0.31,
      body?.skirtDepth ?? 0.29,
      t,
    );
    const a = Math.atan2(x, z);
    const folds = 0.009 * (1 - t) * Math.sin(10 * a + y * 2);
    const skirt = Math.max(
      (Math.hypot(x / rx, (z - 0.015) / rz) - 1) * Math.min(rx, rz) + folds,
      hem - y,
      y - 1.12,
    );
    return smoothUnion(shirt(x, y, z), skirt, 0.075);
  };
  const hasOuterCoat = cast?.outfit !== "undertunic";
  add(
    sculpt({
      bounds: [
        [-0.82, index === 2 && !hasOuterCoat ? 0.16 : 0.66, -0.5],
        [0.82, 1.64, 0.5],
      ],
      resolution: resolution(index === 2 && !hasOuterCoat ? 64 : 48),
      field: index === 2 && !hasOuterCoat ? longGarment : shirt,
      material: materials.robe,
    }).geometry,
    materials.robe,
    "continuous-robe-and-sleeves",
  );
  if (index === 2 && hasOuterCoat) {
    // The coat's opening reveals a narrow, actual front panel. The rest of the
    // old full-length white skirt was buried inside the coat and could escape
    // through its side during a turn. This surface ends beneath the shirt.
    add(
      surface(16, 20, (u, v) => {
        const y = T.MathUtils.lerp(
          role === "moroni" ? 0.69 : (cast?.hem ?? 0.24),
          0.82,
          v,
        );
        const width =
          role === "moroni"
            ? T.MathUtils.lerp(0.024, 0.055, v)
            : T.MathUtils.lerp(0.09, 0.135, v);
        const x = (u * 2 - 1) * width;
        const t = T.MathUtils.clamp(
          (y - (cast?.hem ?? 0.24)) / (1.08 - (cast?.hem ?? 0.24)),
          0,
          1,
        );
        const rx = T.MathUtils.lerp(
          body?.hemWidth ?? cast?.width ?? 0.37,
          body?.skirtWaist ?? 0.31,
          t,
        );
        const rz = T.MathUtils.lerp(
          body?.hemDepth ?? 0.31,
          body?.skirtDepth ?? 0.29,
          t,
        );
        return new T.Vector3(
          x,
          y,
          0.015 + rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)),
        );
      }),
      materials.robe,
      "visible-front-tunic",
    );
  }

  // The adventure, animated, guardian and film silhouettes expose real legs.
  // Each trouser is a tapered sculpted volume under its shorter tunic.
  if (index === 0 || index === 2 || index === 3 || index === 5) {
    const trouserTop =
      role === "moroni" ? 0.95 : index === 2 ? 0.73 : index === 3 ? 0.67 : 0.72;
    for (const side of [-1, 1]) {
      const cx = side * 0.205;
      const trouser: DistanceField = (x, y, z) => {
        let d = capsule(
          x,
          y,
          z,
          cx,
          trouserTop,
          -0.005,
          cx,
          0.22,
          0.005,
          index === 3 ? 0.14 : 0.115,
        );
        d = smoothUnion(
          d,
          ellipsoid(
            x,
            y,
            z,
            cx,
            trouserTop - 0.12,
            0,
            index === 3 ? 0.16 : 0.13,
            0.23,
            0.13,
          ),
          0.05,
        );
        // The coat conceals the hip. Keep the knee-reaching leg for crawling
        // and climbing, but do not build a full buried white thigh volume.
        return index === 2 && hasOuterCoat && role !== "moroni"
          ? Math.max(d, y - 0.64)
          : d;
      };
      add(
        sculpt({
          bounds: [
            [cx - 0.21, 0.08, -0.22],
            [cx + 0.21, role === "moroni" ? 1.08 : 0.89, 0.22],
          ],
          resolution: resolution(32),
          field: trouser,
          material:
            role === "moroni"
              ? materials.skin
              : index === 3
                ? materials.mantle
                : materials.robeShadow,
        }).geometry,
        role === "moroni"
          ? materials.skin
          : index === 3
            ? materials.mantle
            : materials.robeShadow,
        side < 0 ? "left-trouser" : "right-trouser",
      );
    }
  }

  // Cloth hangs as a curved surface with weight at the hem, irregular folds,
  // and asymmetry; it is not a cone or a stack of rotational primitives.
  const hemY = [0.51, 0.105, 0.24, 0.43, 0.105, 0.29][index];
  // A smooth outer envelope covers folds without copying every ripple into
  // the overcoat. It continues above the waist to avoid a horizontal kink.
  const robeRadiusAt = (_a: number, y: number) => {
    const v = T.MathUtils.clamp((y - hemY) / (1.15 - hemY), 0, 1);
    return s.waist + (s.hem - s.waist) * Math.pow(1 - v, 1.35);
  };
  const robeGeometry = surface(96, 42, (u, v) => {
    const a = u * Math.PI * 2;
    const flare = Math.pow(1 - v, 1.35);
    const radius = s.waist + (s.hem - s.waist) * flare;
    const fold =
      (0.012 + 0.025 * flare) *
      (Math.sin(s.folds * a + 2.2 * v) +
        0.36 * Math.sin((s.folds + 5) * a - 3.8 * v));
    const y =
      hemY +
      v * (1.15 - hemY) +
      (1 - v) * (0.018 * Math.sin(a * 3 + index) + 0.012 * Math.sin(a * 7));
    return new T.Vector3(
      (radius + fold) * Math.sin(a),
      y,
      (radius + fold) * Math.cos(a) + 0.022 * Math.sin(2 * a + v),
    );
  });
  if (index !== 2) add(robeGeometry, materials.robe, "continuous-folded-robe");
  else robeGeometry.dispose();
  const underHem = surface(96, 2, (u, v) => {
    const a = u * Math.PI * 2;
    const r = s.hem - v * 0.045;
    return new T.Vector3(
      r * Math.sin(a),
      hemY - 0.006 + 0.015 * Math.sin(a * 3),
      r * Math.cos(a),
    );
  });
  if (index !== 2) add(underHem, materials.robeShadow, "robe-hem-thickness");
  else underHem.dispose();

  // Mantle is an open-front draped sheet with its own shoulder and hem flow.
  const cloakHem = [0.86, 0.1, 0.17, 0.54, 0.12, 0.36][index];
  const cloakStart = [0.8, 0.36, 0.84, 0.67, 0.55, 0.62][index];
  const cloakEnd = [5.5, 5.65, 5.45, 5.6, 5.73, 5.45][index];
  const cloakPoint = (u: number, v: number) => {
    const a = cloakStart + u * (cloakEnd - cloakStart);
    const shoulder = T.MathUtils.smoothstep(v, 0, 0.24);
    const spread = Math.pow(v, 1.35);
    const xRadius =
      T.MathUtils.lerp(0.18, s.shoulder + 0.02, shoulder) +
      (s.cloak - s.shoulder) * spread +
      0.018 * Math.sin(12 * a + v * 5) * spread;
    const zRadius =
      T.MathUtils.lerp(0.145, 0.255, shoulder) +
      (s.cloak - s.shoulder) * spread * 0.75 +
      0.014 * Math.sin(10 * a + v * 4) * spread;
    const hem =
      cloakHem +
      0.05 * Math.sin(a * 2.5 + index * 0.7) +
      (index === 5 ? 0.18 * Math.sin(a + 0.7) : 0) +
      (index === 1 ? 0.17 * Math.sin(a - 0.8) : 0);
    const y = 1.49 + (hem - 1.49) * v;
    const point = new T.Vector3(
      xRadius * Math.sin(a) + 0.02 * Math.sin(3 * a) * v,
      y,
      zRadius * Math.cos(a) -
        0.015 -
        0.06 * spread +
        0.014 * Math.sin(7 * a + v * 4),
    );
    // The tunic has its own flared, folded surface below the shoulder. Keep
    // the mantle outside both garments, including the moving tunic's margin.
    // Project along the cloth's radial drape rather than widening every layer.
    for (let pass = 0; pass < 3; pass++) {
      const penetration = 0.022 - shirt(point.x, point.y, point.z);
      if (penetration <= 0) break;
      point.x += Math.sin(a) * penetration * 1.1;
      point.z += Math.cos(a) * penetration * 1.1;
    }
    if (point.y >= hemY - 0.01 && point.y <= 1.32) {
      const theta = Math.atan2(point.x, point.z);
      const zCenter = 0.022 * Math.sin(2 * theta + v);
      const radial = Math.hypot(point.x, point.z - zCenter);
      // A few centimeters accommodate the procedural folds and the small
      // animated sway of the tunic without making the shoulder balloon.
      const needed =
        (robeRadiusAt(theta, point.y) + 0.075 - radial) *
        (1 - T.MathUtils.smoothstep(point.y, 1.15, 1.32));
      if (needed > 0) {
        point.x += (point.x / radial) * needed;
        point.z += ((point.z - zCenter) / radial) * needed;
      }
    }
    return point;
  };
  const thicken = (
    geometry: T.BufferGeometry,
    uCount: number,
    vCount: number,
  ) => {
    const outer = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const positions = new Float32Array(outer.count * 6);
    for (let i = 0; i < outer.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        const value = outer.getComponent(i, axis);
        positions[i * 3 + axis] = value;
        positions[(i + outer.count) * 3 + axis] =
          value - normal.getComponent(i, axis) * 0.014;
      }
    }
    const original = Array.from(geometry.index!.array);
    const indices = [...original];
    for (let i = 0; i < original.length; i += 3)
      indices.push(
        original[i + 2] + outer.count,
        original[i + 1] + outer.count,
        original[i] + outer.count,
      );
    const join = (a: number, b: number) =>
      indices.push(a, b, a + outer.count, b, b + outer.count, a + outer.count);
    for (let u = 0; u < uCount; u++) {
      join(u + 1, u);
      const row = vCount * (uCount + 1);
      join(row + u, row + u + 1);
    }
    for (let v = 0; v < vCount; v++) {
      join(v * (uCount + 1), (v + 1) * (uCount + 1));
      join((v + 1) * (uCount + 1) + uCount, v * (uCount + 1) + uCount);
    }
    geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    // BufferGeometry reuses an existing normal array. The shell now has twice
    // as many positions, so allocate normals again before indexing both sides.
    geometry.deleteAttribute("normal");
    geometry.computeVertexNormals();
    return geometry;
  };
  const fittedCoat = () => {
    // The lower-detail coat samples the same garment's radial envelope directly.
    // Explicit inner/outer faces and joined edges retain real thickness without
    // requiring a dense voxel grid merely to discover a thin cloth shell.
    const uCount = quality === "crowd" ? (role === "moroni" ? 10 : 16) : 36;
    const vCount = quality === "crowd" ? (role === "moroni" ? 6 : 12) : 20;
    const bottom = (cast?.hem ?? 0.24) - 0.05;
    const geometry = surface(uCount, vCount, (u, v) => {
      const y = T.MathUtils.lerp(bottom, 1.58, v);
      const opening = T.MathUtils.lerp(
        0.2,
        0.77,
        T.MathUtils.smoothstep(y, 0.65, 1.12),
      );
      const a = opening + u * (Math.PI * 2 - 2 * opening);
      let lo = 0,
        hi = 0.9;
      for (let step = 0; step < 20; step++) {
        const r = (lo + hi) / 2;
        const x = Math.sin(a) * r,
          z = Math.cos(a) * r;
        const rearReach =
          0.055 *
          (1 - T.MathUtils.smoothstep(y, 0.35, 0.68)) *
          T.MathUtils.smoothstep(-z, 0, 0.17);
        let d = longGarment(x, y, z, bottom) - 0.065 - rearReach;
        if (Math.abs(x) > 0.45 && y < 1.015)
          d = Math.max(d, Math.abs(x) - 0.45);
        if (d < 0) lo = r;
        else hi = r;
      }
      const r = (lo + hi) / 2;
      return new T.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
    });
    return thicken(geometry, uCount, vCount);
  };
  const cloakGeometry =
    index === 2
      ? quality !== "hero"
        ? fittedCoat()
        : sculpt({
            bounds: [
              [-0.87, 0.1, -0.55],
              [0.87, 1.7, 0.55],
            ],
            resolution: resolution(80, true),
            field: (x, y, z) => {
              const base = longGarment(x, y, z, cast ? cast.hem - 0.05 : 0.19);
              const thickness = 0.018;
              const rearReach =
                0.055 *
                (1 - T.MathUtils.smoothstep(y, 0.35, 0.68)) *
                T.MathUtils.smoothstep(-z, 0, 0.17);
              let shell =
                Math.abs(base - (0.027 + thickness + rearReach)) - thickness;
              // Open front and shorter coat sleeves reveal a clean tunic and cuffs.
              const openingWidth = T.MathUtils.lerp(
                0.075,
                0.245,
                T.MathUtils.smoothstep(y, 0.65, 1.12),
              );
              const frontOpening = Math.max(
                0.025 - z,
                Math.abs(x) - openingWidth,
              );
              shell = Math.max(shell, -frontOpening);
              if (Math.abs(x) > 0.45) shell = Math.max(shell, 1.015 - y);
              return shell;
            },
            material: materials.mantle,
          }).geometry
      : surface(78, 35, cloakPoint);
  if (cast?.outfit !== "undertunic") {
    const mantle = add(cloakGeometry, materials.mantle, "flowing-mantle");
    if (role === "moroni") {
      // Alma 46:12 describes a coat torn for the title. This removable cloth
      // layer leaves the illustrative protective equipment intact beneath it.
      const coat = new T.Group();
      coat.name = "moroni-removable-coat";
      coat.visible = false;
      group.add(coat);
      coat.add(mantle);
    }
  } else cloakGeometry.dispose();
  const edgePoints: T.Vector3[] = [];
  for (let i = 0; i <= 32; i++) edgePoints.push(cloakPoint(0, i / 32));
  if (index !== 2)
    add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(edgePoints),
        32,
        0.012,
        6,
        false,
      ),
      materials.mantleLining,
      "mantle-edge",
    );

  if (index === 3) {
    const shoulderMantle = surface(68, 14, (u, v) => {
      const a = 0.38 + u * (Math.PI * 2 - 0.76);
      const r = 0.42 + 0.13 * Math.sin(v * Math.PI * 0.85);
      return new T.Vector3(
        r * Math.sin(a),
        1.47 - v * 0.31,
        r * Math.cos(a) - 0.04,
      );
    });
    add(shoulderMantle, materials.mantle, "broad-guardian-shoulder-mantle");
  }
  if (index === 4) {
    const hood: DistanceField = (x, y, z) => {
      const outer = ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + 0.075,
        -0.075,
        0.385,
        0.44,
        0.37,
      );
      const inner = ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + 0.047,
        0.01,
        0.295,
        0.345,
        0.345,
      );
      const shell = Math.max(outer, -inner, z - 0.195);
      const cowl = Math.max(
        ellipsoid(x, y, z, 0, 1.44, -0.04, 0.42, 0.17, 0.36),
        -ellipsoid(x, y, z, 0, 1.48, 0.02, 0.3, 0.18, 0.28),
      );
      return smoothUnion(shell, cowl, 0.07);
    };
    add(
      sculpt({
        bounds: [
          [-0.46, 1.24, -0.52],
          [0.46, 2.12, 0.25],
        ],
        resolution: resolution(44),
        field: hood,
        material: materials.mantle,
      }).geometry,
      materials.mantle,
      "continuous-hood-and-cowl",
    );
  }
  if (index === 5) {
    const wrap = surface(24, 32, (u, v) => {
      const x = -0.3 + 0.59 * v + (u - 0.5) * (0.19 + 0.065 * v);
      const y = 1.42 - 0.57 * v;
      const z =
        0.31 +
        0.035 * Math.sin(v * Math.PI) +
        0.018 * Math.sin(5 * u * Math.PI + v * 3);
      return new T.Vector3(x, y, z);
    });
    add(wrap, materials.mantleLining, "asymmetric-cross-body-cloth-wrap");
  }

  // Skin hands are sculpted, not spherical caps on tube arms.
  for (const side of [-1, 1]) {
    const hand: DistanceField = (x, y, z) => {
      const cx = side * (s.shoulder + 0.15);
      let d = capsule(
        x,
        y,
        z,
        cx,
        role === "moroni" ? 1.17 : 0.96,
        0.046,
        cx + side * 0.018,
        0.785,
        0.09,
        0.079,
      );
      d = smoothUnion(
        d,
        ellipsoid(x, y, z, cx + side * 0.025, 0.77, 0.105, 0.082, 0.11, 0.064),
        0.04,
      );
      d = smoothUnion(
        d,
        capsule(
          x,
          y,
          z,
          cx - side * 0.035,
          0.83,
          0.147,
          cx - side * 0.07,
          0.755,
          0.158,
          0.027,
        ),
        0.025,
      );
      return d;
    };
    add(
      sculpt({
        bounds: [
          [side < 0 ? -0.83 : 0.25, 0.61, -0.06],
          [side < 0 ? -0.25 : 0.83, 1.09, 0.26],
        ],
        resolution: resolution(30),
        field: hand,
        material: materials.skin,
      }).geometry,
      materials.skin,
      side < 0 ? "left-hand" : "right-hand",
    );
  }

  // Face, cheeks, brow ridge, nose, jaw, and neck share one continuous mesh.
  const headZ = 0.025 + s.lean;
  const faceFront = headZ + s.head * (faceProfile?.faceDepth ?? 0.84);
  const face: DistanceField = (x, y, z) => {
    const faceWidth =
      faceProfile?.faceWidth ??
      cast?.faceWidth ??
      [0.88, 0.78, 0.94, 0.96, 0.79, 0.87][index];
    const jawWidth =
      faceProfile?.jawWidth ??
      cast?.jaw ??
      [0.68, 0.57, 0.76, 0.78, 0.59, 0.66][index];
    let d = ellipsoid(
      x,
      y,
      z,
      0,
      s.headY,
      headZ,
      s.head *
        faceWidth *
        (faceProfile
          ? T.MathUtils.lerp(
              1,
              faceProfile.lowerFaceTaper ?? 1,
              T.MathUtils.smoothstep(s.headY - y, s.head * 0.1, s.head * 0.85),
            )
          : 1),
      s.head * (faceProfile?.faceHeight ?? s.headTall),
      s.head * (faceProfile?.faceDepth ?? 0.84),
    );
    d = smoothUnion(
      d,
      ellipsoid(
        faceProfile?.jawSquareness
          ? Math.sign(x) *
              Math.pow(
                Math.abs(x) / (s.head * jawWidth),
                faceProfile.jawSquareness,
              ) *
              s.head *
              jawWidth
          : x,
        y,
        z,
        0,
        s.headY - s.head * (faceProfile?.jawDrop ?? 0.48),
        headZ + s.head * 0.12,
        s.head * jawWidth,
        s.head * (faceProfile?.chinLength ?? 0.43),
        s.head * (faceProfile?.jawDepth ?? 0.65),
      ),
      0.08,
    );
    d = smoothUnion(
      d,
      capsule(
        x,
        y,
        z,
        0,
        1.39,
        headZ - 0.018,
        0,
        s.headY - s.head * 0.56,
        headZ - 0.015,
        0.115,
      ),
      0.065,
    );
    for (const side of [-1, 1]) {
      if (index !== 2)
        d = smoothUnion(
          d,
          ellipsoid(
            x,
            y,
            z,
            side * s.head * 0.45,
            s.headY - s.head * 0.23,
            faceFront - s.head * 0.045,
            s.head * (index === 2 ? 0.44 : index === 3 ? 0.42 : 0.35),
            s.head * 0.29,
            s.head * 0.19,
          ),
          0.035,
        );
      if (faceProfile)
        d = smoothUnion(
          d,
          ellipsoid(
            x,
            y,
            z,
            side * s.head * 0.54,
            s.headY - s.head * 0.1,
            faceFront - s.head * 0.35,
            s.head * (faceProfile.cheekbone ?? 0.25),
            s.head * 0.17,
            s.head * 0.14,
          ),
          0.045,
        );
      const eyeX = side * s.head * (faceProfile?.eyeSpacing ?? 0.34);
      const socket = ellipsoid(
        x,
        y,
        z,
        eyeX,
        s.headY + s.head * (faceProfile?.eyeHeight ?? 0.105),
        faceFront - s.head * 0.015,
        s.head * (faceProfile?.eyeWidth ?? 0.205),
        s.head * (faceProfile?.eyeOpening ?? 0.14),
        s.head * 0.14,
      );
      d = Math.max(d, -socket);
      // The lid and brow ridge are fused into the face, leaving a narrow
      // almond opening instead of a circular white eye stuck on the surface.
      d = smoothUnion(
        d,
        ellipsoid(
          x,
          y,
          z,
          eyeX,
          s.headY +
            s.head *
              (faceProfile ? (faceProfile.eyeHeight ?? 0.105) + 0.11 : 0.225),
          faceFront - s.head * 0.07,
          s.head * 0.235,
          s.head * (faceProfile ? 0.035 : 0.105),
          s.head * 0.115,
        ),
        0.018,
      );
      d = smoothUnion(
        d,
        ellipsoid(
          x,
          y,
          z,
          eyeX,
          s.headY +
            s.head *
              (faceProfile ? (faceProfile.eyeHeight ?? 0.105) - 0.08 : 0.005),
          faceFront - s.head * (faceProfile?.softUnderEyes ? 0.13 : 0.065),
          s.head * 0.19,
          s.head *
            (faceProfile?.softUnderEyes ? 0.012 : faceProfile ? 0.025 : 0.045),
          s.head * (faceProfile?.softUnderEyes ? 0.025 : 0.095),
        ),
        0.012,
      );
    }
    d = smoothUnion(
      d,
      capsule(
        x,
        y,
        z,
        0,
        s.headY + s.head * 0.14,
        faceFront - s.head * 0.085,
        0,
        s.headY - s.head * 0.22,
        faceFront + s.nose * 0.55 * (faceProfile?.noseProjection ?? 1),
        s.nose * (faceProfile?.noseBridge ?? 0.65),
      ),
      0.025,
    );
    d = smoothUnion(
      d,
      ellipsoid(
        x,
        y,
        z,
        0,
        s.headY - s.head * 0.19,
        faceFront + s.nose * 0.38 * (faceProfile?.noseProjection ?? 1),
        s.nose * 0.83,
        s.nose * 0.58,
        s.nose * 0.68,
      ),
      0.027,
    );
    if (cast)
      for (const side of [-1, 1])
        d = smoothUnion(
          d,
          ellipsoid(
            x,
            y,
            z,
            side * s.head * ((faceProfile?.faceWidth ?? cast.faceWidth) - 0.01),
            s.headY - 0.035,
            headZ + 0.012,
            0.043,
            0.07,
            0.035,
          ),
          0.025,
        );
    return d;
  };
  add(
    sculpt({
      bounds: [
        [-0.48, 1.26, -0.47],
        [0.48, 2.08, 0.53],
      ],
      resolution: resolution(56),
      field: face,
      material: materials.skin,
    }).geometry,
    materials.skin,
    "sculpted-face-neck-nose",
  );

  if (cast) {
    const lip: T.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = (i / 12) * 2 - 1;
      const x = u * s.head * (faceProfile?.mouthWidth ?? 0.205);
      const smile =
        faceProfile?.smile ?? (cast.beard === "none" ? 0.012 : 0.003);
      const y =
        s.headY - s.head * (faceProfile?.mouthHeight ?? 0.36) + smile * u * u;
      let lo = headZ,
        hi = faceFront + 0.1;
      for (let step = 0; step < 20; step++) {
        const z = (lo + hi) / 2;
        if (face(x, y, z) < 0) lo = z;
        else hi = z;
      }
      lip.push(new T.Vector3(x, y, (lo + hi) / 2 + 0.001));
    }
    add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(lip),
        quality === "crowd" ? 6 : 16,
        0.0035,
        4,
        false,
      ),
      materials.mouth,
      "character-mouth",
    );
  }

  const hair: DistanceField = (x, y, z) => {
    const front = T.MathUtils.clamp((z - headZ) / (s.head * 0.88), 0, 1);
    const temple = T.MathUtils.clamp(Math.abs(x) / (s.head * 0.86), 0, 1);
    const hairline =
      s.headY +
      s.head * ((cast ? -0.02 : 0.04) + front * (0.27 + 0.14 * (1 - temple)));
    let d = Math.max(
      ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + s.head * 0.12,
        headZ - s.head * 0.055,
        s.head * (cast ? cast.faceWidth + 0.06 : 0.915),
        s.head * (cast ? cast.tall - 0.045 : 0.92),
        s.head * (cast ? 0.92 : 0.86),
      ),
      hairline - y,
    );
    for (const side of [-1, 1]) {
      d = smoothUnion(
        d,
        capsule(
          x,
          y,
          z,
          side * s.head * 0.73,
          s.headY + s.head * 0.55,
          headZ - s.head * 0.16,
          side * s.head * 0.77,
          s.headY -
            s.head *
              (role === "child" || role === "sam" || role === "laman"
                ? -0.04
                : cast?.hairStyle === "waves" || cast?.hairStyle === "shawl"
                  ? 0.52
                  : 0.16),
          headZ + s.head * 0.16,
          s.head * 0.17,
        ),
        0.035,
      );
      d = smoothUnion(
        d,
        capsule(
          x,
          y,
          z,
          side * s.head * 0.55,
          s.headY + s.head * 0.53,
          headZ + s.head * 0.48,
          side * s.head * 0.18,
          s.headY + s.head * 0.65,
          headZ + s.head * 0.56,
          s.head * (index === 2 ? 0.105 : 0.078),
        ),
        0.027,
      );
    }
    if (index === 2 && !cast) {
      // Receding crown with hair remaining at the sides and back.
      const crown = ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + s.head * 0.65,
        headZ + s.head * 0.25,
        s.head * 0.73,
        s.head * 0.9,
        s.head * 0.87,
      );
      d = Math.max(d, -crown);
      d += 0.006 * Math.sin(x * 75 + y * 18) * Math.sin(z * 52 - y * 12);
    }
    if (cast?.hairStyle === "swept" || cast?.hairStyle === "waves") {
      // A full, softly swept crown distinguishes the young cast from Lehi.
      d = smoothUnion(
        d,
        ellipsoid(
          x,
          y,
          z,
          -0.045,
          s.headY + s.head * 0.72,
          headZ + 0.025,
          s.head * 0.76,
          s.head * 0.39,
          s.head * 0.78,
        ),
        0.045,
      );
      d += 0.003 * Math.sin(27 * x + 13 * y) * Math.sin(24 * z);
    }
    return d;
  };
  if (faceProfile?.hairCut) {
    const profile = faceProfile;
    const cut = profile.hairCut;
    const rx = s.head * (profile.faceWidth ?? cast?.faceWidth ?? 0.92);
    const ry = s.head * (profile.faceHeight ?? s.headTall);
    const rz = s.head * (profile.faceDepth ?? 0.84);
    const topLength = profile.hairLength ?? 0.015;
    const colors: number[] = [];
    const hairBase = new T.Color(profile.hairColor ?? 0x916b49);
    // A complete, fitted scalp cap replaces the old large swept volume. Even
    // the shortest fade keeps a thin opaque layer above the underlying head.
    const geometry = surface(
      quality === "hero" ? 80 : quality === "npc" ? 48 : 24,
      quality === "hero" ? 36 : quality === "npc" ? 24 : 12,
      (u, v) => {
        const a = u * Math.PI * 2;
        const front = Math.max(0, Math.cos(a));
        const side = Math.abs(Math.sin(a));
        const frontHairline =
          cut === "crop"
            ? 0.34
            : cut === "buzz" || cut === "crew"
              ? 0.43
              : 0.47;
        const line =
          T.MathUtils.lerp(-0.4, frontHairline, Math.pow(front, 0.65)) +
          side * 0.12;
        const phi =
          Math.acos(
            T.MathUtils.clamp(line / (profile.faceHeight ?? s.headTall), -1, 1),
          ) *
          (1 - v);
        const ny = Math.cos(phi);
        const top = T.MathUtils.smoothstep(ny, 0.22, 0.82);
        const x = rx * Math.sin(phi) * Math.sin(a);
        const z = rz * Math.sin(phi) * Math.cos(a);
        let length = 0.003 + topLength * top;
        if (cut === "crew")
          length = 0.003 + topLength * T.MathUtils.smoothstep(ny, 0.1, 0.65);
        if (cut === "buzz") length = 0.0035 + topLength * 0.3 * top;
        if (cut === "side-part" || cut === "ivy") {
          const part = Math.exp(-Math.pow((x / rx + 0.3) / 0.045, 2));
          length = 0.003 + topLength * top * (0.72 + 0.28 * (x / rx));
          length -= part * topLength * top * 0.75;
          length += 0.001 * top * Math.sin(92 * (x + z * 0.4));
        }
        if (cut === "crop")
          length =
            0.003 +
            topLength * top * (0.76 + 0.24 * Math.sin(105 * x + 35 * z));
        if (cut === "brush-up")
          length =
            0.003 + topLength * top * (0.35 + 0.65 * front * Math.sin(phi));
        if (cut === "side-sweep")
          length =
            0.003 +
            topLength * top * (0.7 - 0.3 * (x / rx)) +
            0.001 * Math.sin(82 * x - 30 * z) * top;
        if (cut === "texture")
          length =
            0.003 +
            topLength * top * (0.7 + 0.3 * Math.sin(97 * x) * Math.cos(83 * z));
        length = Math.max(0.003, length);
        const normal = new T.Vector3(
          x / (rx * rx),
          ny / ry,
          z / (rz * rz),
        ).normalize();
        const taper = T.MathUtils.lerp(
          1,
          profile.lowerFaceTaper ?? 1,
          T.MathUtils.smoothstep(-ny * ry, s.head * 0.1, s.head * 0.85),
        );
        return new T.Vector3(
          x * taper,
          s.headY + ry * ny,
          headZ + z,
        ).addScaledVector(normal, length);
      },
    );
    // Fine color differences describe a fade without adding bulky side locks.
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const ny = (positions.getY(i) - s.headY) / ry;
      const fade = T.MathUtils.smoothstep(ny, -0.2, 0.72);
      const color = hairBase.clone().multiplyScalar(0.81 + 0.19 * fade);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    // The material remains white so vertex colors preserve the chosen brown.
    const hairMaterial = materials.hair.clone();
    hairMaterial.color.setHex(0xffffff);
    hairMaterial.vertexColors = true;
    extraMaterials.push(hairMaterial);
    add(geometry, hairMaterial, "single-sculpted-hair-cap");
  } else {
    add(
      sculpt({
        bounds: [
          quality === "hero" ? [-0.43, 1.45, -0.42] : [-0.56, 1.35, -0.48],
          quality === "hero"
            ? [0.43, cast ? 2.18 : 2.08, 0.37]
            : [0.56, 2.24, 0.55],
        ],
        resolution: quality === "hero" ? 44 : quality === "npc" ? 28 : 16,
        field: hair,
        material: materials.hair,
      }).geometry,
      materials.hair,
      "single-sculpted-hair-cap",
    );
  }

  const beard: DistanceField = (x, y, z) => {
    if (cast && cast.beard !== "elder") {
      // A close, fitted jaw shell leaves the lips and cheeks visible. Scruff
      // differs in both length and coverage from the elder's long beard.
      const depth = cast.beard === "scruff" ? 0.009 : 0.022;
      const jaw = ellipsoid(
        x,
        y,
        z,
        0,
        s.headY - s.head * 0.45,
        headZ + s.head * 0.13,
        s.head * (cast.jaw + 0.035),
        s.head * 0.46,
        s.head * 0.7,
      );
      return Math.max(
        Math.abs(jaw) - depth,
        y - (s.headY - s.head * 0.31),
        headZ + 0.03 - z,
      );
    }
    const beardWidth = [0.64, 0.49, 0.82, 0.86, 0.59, 0.69][index];
    const chinRadius = [0.29, 0.215, 0.39, 0.39, 0.25, 0.285][index];
    let d = ellipsoid(
      x,
      y,
      z,
      0,
      s.headY - s.head * 0.62,
      faceFront - s.head * 0.075,
      s.head * beardWidth,
      s.head * (index === 2 ? 0.63 : 0.52),
      s.head * 0.44,
    );
    d = smoothUnion(
      d,
      capsule(
        x,
        y,
        z,
        0,
        s.headY - s.head * 0.67,
        faceFront - s.head * 0.04,
        0,
        s.headY - s.head * 0.67 - s.beard,
        faceFront - s.head * 0.16,
        s.head * chinRadius,
      ),
      0.07,
    );
    if (index === 5) {
      for (const side of [-1, 1])
        d = smoothUnion(
          d,
          capsule(
            x,
            y,
            z,
            side * s.head * 0.2,
            s.headY - s.head * 0.89,
            faceFront - s.head * 0.03,
            side * s.head * 0.25,
            s.headY - s.head * 0.85 - s.beard,
            faceFront - s.head * 0.12,
            s.head * 0.16,
          ),
          0.045,
        );
    }
    for (const side of [-1, 1]) {
      d = smoothUnion(
        d,
        capsule(
          x,
          y,
          z,
          side * s.head * 0.59,
          s.headY - s.head * 0.18,
          faceFront - s.head * 0.16,
          side * s.head * 0.37,
          s.headY - s.head * 0.8,
          faceFront - s.head * 0.075,
          s.head * (index === 3 ? 0.27 : 0.19),
        ),
        0.07,
      );
      d = smoothUnion(
        d,
        capsule(
          x,
          y,
          z,
          side * s.head * 0.27,
          s.headY - s.head * 0.34,
          faceFront + s.head * 0.04,
          side * s.head * 0.02,
          s.headY - s.head * 0.43,
          faceFront + s.head * 0.035,
          s.head * 0.102,
        ),
        0.03,
      );
    }
    // Shallow coherent ridges read as combed strands under moving light.
    const strands =
      0.0045 * Math.sin(53 * x + 6 * y) * Math.sin(41 * z - 7 * y);
    return d + strands;
  };
  if (!cast || cast.beard !== "none")
    add(
      sculpt({
        bounds: [
          quality === "hero" ? [-0.39, 1.02, -0.22] : [-0.45, 0.94, -0.25],
          quality === "hero" ? [0.39, 1.75, 0.51] : [0.45, 1.88, 0.67],
        ],
        resolution: resolution(50),
        field: beard,
        material: materials.beard,
      }).geometry,
      materials.beard,
      "one-piece-sculpted-beard",
    );

  // Small anatomical eyes sit inside the carved sockets.
  for (const side of [-1, 1]) {
    const eyeX = side * s.head * (faceProfile?.eyeSpacing ?? 0.34);
    const eyeY = s.headY + s.head * (faceProfile?.eyeHeight ?? 0.105);
    const eyeScale = index === 2 ? 1.14 : index === 3 ? 0.8 : 0.9;
    const eyeball = add(
      new T.SphereGeometry(
        s.head * 0.083 * eyeScale,
        quality === "hero" ? 24 : quality === "npc" ? 12 : 8,
        quality === "hero" ? 16 : quality === "npc" ? 8 : 6,
      ),
      materials.eyeWhite,
      side < 0 ? "left-eye" : "right-eye",
    );
    eyeball.position.set(
      eyeX,
      eyeY,
      faceFront -
        s.head * 0.075 -
        (cast ? 0.005 : 0) -
        (faceProfile?.softUnderEyes ? 0.003 : 0),
    );
    eyeball.scale.set(
      1.36 * ((faceProfile?.eyeWidth ?? 0.205) / 0.205),
      0.51 * ((faceProfile?.eyeOpening ?? 0.14) / 0.14),
      0.48,
    );
    const iris = add(
      new T.SphereGeometry(
        s.head * 0.041 * eyeScale,
        quality === "hero" ? 20 : quality === "npc" ? 10 : 8,
        quality === "hero" ? 12 : 6,
      ),
      materials.iris,
      side < 0 ? "left-iris" : "right-iris",
    );
    iris.position.set(
      eyeX,
      eyeY - s.head * 0.011,
      faceFront -
        s.head * 0.021 -
        (cast ? 0.005 : 0) -
        (faceProfile?.softUnderEyes ? 0.003 : 0),
    );
    iris.scale.z = 0.42;
    const brow = add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3([
          new T.Vector3(
            eyeX - side * s.head * 0.18,
            eyeY +
              s.head *
                (0.155 +
                  (faceProfile?.browAngle ?? cast?.brow ?? 0) +
                  (faceProfile?.browLift ?? 0)),
            faceFront - s.head * 0.035,
          ),
          new T.Vector3(
            eyeX,
            eyeY + s.head * (0.18 + (faceProfile?.browLift ?? 0)),
            faceFront - s.head * 0.019,
          ),
          new T.Vector3(
            eyeX + side * s.head * 0.18,
            eyeY +
              s.head *
                (0.15 -
                  (faceProfile?.browAngle ?? cast?.brow ?? 0) +
                  (faceProfile?.browLift ?? 0)),
            faceFront - s.head * 0.065,
          ),
        ]),
        quality === "hero" ? 16 : quality === "npc" ? 8 : 5,
        s.head * (faceProfile?.browThickness ?? 0.026),
        quality === "hero" ? 6 : 4,
        false,
      ),
      materials.hair,
      side < 0 ? "left-brow" : "right-brow",
    );
    if (faceProfile?.softUnderEyes) brow.position.z -= 0.003;
    brow.castShadow = false;
  }

  // Hair band and belt remain separate legitimate accessories.
  if (index === 0 || index === 1 || index === 3 || index === 5) {
    const band = add(
      new T.TorusGeometry(s.head * 0.93, 0.012, 8, 48),
      materials.mantleLining,
      "lehi-headband",
    );
    band.position.set(0, s.headY + s.head * 0.45, headZ);
    band.rotation.x = Math.PI / 2;
  }
  const sashPoints: T.Vector3[] = [];
  if (index === 2)
    for (let i = 0; i <= 48; i++) {
      const a = -0.6 + (i * 1.2) / 48;
      let lo = 0,
        hi = 0.65;
      for (let step = 0; step < 20; step++) {
        const r = (lo + hi) / 2;
        if (longGarment(Math.sin(a) * r, 1.045, Math.cos(a) * r) < 0) lo = r;
        else hi = r;
      }
      const r = (lo + hi) / 2 + 0.012;
      sashPoints.push(new T.Vector3(Math.sin(a) * r, 1.045, Math.cos(a) * r));
    }
  const belt = add(
    index === 2
      ? new T.TubeGeometry(
          new T.CatmullRomCurve3(sashPoints),
          quality === "hero" ? 48 : quality === "npc" ? 24 : 12,
          0.018,
          quality === "hero" ? 8 : 4,
          false,
        )
      : new T.TorusGeometry(s.waist + 0.04, 0.028, 8, 48, Math.PI),
    materials.leather,
    "leather-belt",
  );
  if (index !== 2) {
    belt.position.y = 1.045;
    belt.rotation.x = Math.PI / 2;
  }

  // Footwear follows the same silhouette language, with grounded soles.
  for (const side of [-1, 1]) {
    const foot: DistanceField = (x, y, z) => {
      const cx = side * 0.195;
      let d = ellipsoid(x, y, z, cx, 0.071, 0.105, 0.145, 0.058, 0.23);
      d = smoothUnion(
        d,
        capsule(x, y, z, cx, 0.17, -0.045, cx, 0.095, 0.13, 0.087),
        0.045,
      );
      if (index === 0 || index === 3)
        d = smoothUnion(
          d,
          capsule(
            x,
            y,
            z,
            cx,
            index === 3 ? 0.36 : 0.205,
            -0.01,
            cx,
            0.12,
            0.035,
            index === 3 ? 0.125 : 0.105,
          ),
          0.055,
        );
      return d;
    };
    // MarchingCubes omits its outside voxel rows. Pad a known closed support
    // box by 2.5 cells on every axis, rather than clipping the toe or sole.
    const footResolution =
      quality === "hero" ? 32 : quality === "npc" ? 22 : 18;
    const cx = side * 0.195;
    const supportMin: [number, number, number] = [cx - 0.18, -0.02, -0.18];
    const supportMax: [number, number, number] = [
      cx + 0.18,
      index === 3 ? 0.51 : 0.32,
      0.38,
    ];
    const padding = supportMin.map(
      (value, axis) =>
        ((supportMax[axis] - value) * 2.5) / (footResolution - 5),
    );
    const footBounds: [[number, number, number], [number, number, number]] = [
      supportMin.map((value, axis) => value - padding[axis]) as [
        number,
        number,
        number,
      ],
      supportMax.map((value, axis) => value + padding[axis]) as [
        number,
        number,
        number,
      ],
    ];
    const crowdFoot = () => {
      // The distant model samples the same solid foot field along radial rays.
      // Its explicit poles close the sole and boot without expensive voxel
      // padding or open boundaries at a coarse marching-cubes resolution.
      let bottomLo = -0.02,
        bottomHi = 0.071;
      for (let i = 0; i < 24; i++) {
        const y = (bottomLo + bottomHi) / 2;
        if (foot(cx, y, 0.105) < 0) bottomHi = y;
        else bottomLo = y;
      }
      let topLo = index === 3 ? 0.3 : 0.18,
        topHi = index === 3 ? 0.46 : 0.32;
      for (let i = 0; i < 24; i++) {
        const y = (topLo + topHi) / 2;
        if (foot(cx, y, -0.01) < 0) topLo = y;
        else topHi = y;
      }
      const bottom = (bottomLo + bottomHi) / 2,
        top = (topLo + topHi) / 2;
      return surface(12, 10, (u, v) => {
        const a = u * Math.PI * 2;
        const y = bottom + (top - bottom) * (0.5 - 0.5 * Math.cos(v * Math.PI));
        const centerZ = T.MathUtils.lerp(
          0.105,
          -0.01,
          T.MathUtils.smoothstep(y, 0.045, 0.24),
        );
        let lo = 0,
          hi = 0.4;
        if (v > 0 && v < 1)
          for (let i = 0; i < 20; i++) {
            const r = (lo + hi) / 2;
            if (foot(cx + Math.sin(a) * r, y, centerZ + Math.cos(a) * r) < 0)
              lo = r;
            else hi = r;
          }
        else hi = 0;
        const r = (lo + hi) / 2;
        return new T.Vector3(
          cx + Math.sin(a) * r,
          y,
          centerZ + Math.cos(a) * r,
        );
      });
    };
    add(
      quality === "crowd"
        ? crowdFoot()
        : sculpt({
            bounds: footBounds,
            resolution: footResolution,
            field: foot,
            material: materials.leather,
          }).geometry,
      materials.leather,
      side < 0 ? "left-sandal" : "right-sandal",
    );
  }

  const fittedHeadwear = (shawl: boolean) => {
    const uCount = quality === "crowd" ? 12 : 24;
    const vCount = quality === "crowd" ? 8 : 14;
    const top = shawl ? 2.68 : Math.acos(0.07 / (s.head * 1.13));
    const geometry = surface(uCount, vCount, (u, v) => {
      const a = shawl ? 0.98 + u * (Math.PI * 2 - 1.96) : u * Math.PI * 2;
      const theta = top * (1 - v);
      return new T.Vector3(
        s.head * (shawl ? 1.03 : 1.04) * Math.sin(theta) * Math.sin(a),
        s.headY +
          (shawl ? 0.02 : 0.035) +
          s.head * (shawl ? 1.2 : 1.13) * Math.cos(theta),
        headZ -
          (shawl ? 0.025 : 0) +
          s.head * (shawl ? 0.99 : 0.98) * Math.sin(theta) * Math.cos(a),
      );
    });
    return thicken(geometry, uCount, vCount);
  };
  if (cast?.outfit === "regal") {
    const bronze = materials.mantleLining.clone();
    bronze.clearcoat = 0;
    bronze.metalness = 0;
    bronze.roughness = 1;
    bronze.specularIntensity = 0;
    extraMaterials.push(bronze);
    // A bronze circlet and fitted embroidered coat edges give Laban stature.
    const circlet = add(
      new T.TorusGeometry(
        s.head * 0.95,
        0.024,
        quality === "hero" ? 8 : 4,
        quality === "hero" ? 48 : quality === "npc" ? 24 : 12,
      ),
      bronze,
      "character-headwear",
    );
    circlet.rotation.x = Math.PI / 2;
    circlet.position.set(0, s.headY + s.head * 0.49, headZ);
    const crest = new T.Mesh(
      new T.SphereGeometry(
        0.038,
        quality === "crowd" ? 8 : 12,
        quality === "crowd" ? 6 : 8,
      ),
      bronze,
    );
    crest.scale.set(0.8, 0.4, 1.25);
    crest.position.set(0, s.head * 0.95, -0.012);
    circlet.add(crest);
    geometries.push(crest.geometry);
    for (const side of [-1, 1]) {
      const points = [
        new T.Vector3(side * 0.25, 1.38, 0.28),
        new T.Vector3(side * 0.253, 1.08, 0.317),
        new T.Vector3(side * 0.25, cast.hem + 0.035, 0.355),
      ];
      if (athletic)
        for (const point of points) {
          let lo = 0,
            hi = 0.7;
          for (let step = 0; step < 20; step++) {
            const z = (lo + hi) / 2;
            if (longGarment(point.x, point.y, z, cast.hem - 0.05) < 0.064)
              lo = z;
            else hi = z;
          }
          point.z = (lo + hi) / 2 + 0.006;
        }
      add(
        new T.TubeGeometry(
          new T.CatmullRomCurve3(points),
          quality === "hero" ? 24 : quality === "npc" ? 12 : 6,
          0.012,
          quality === "hero" ? 6 : 4,
          false,
        ),
        materials.mantleLining,
        side < 0 ? "left-regal-embroidery" : "right-regal-embroidery",
      );
    }
  }
  if (cast?.outfit === "shawl") {
    const shawl: DistanceField = (x, y, z) => {
      const outside = ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + 0.02,
        headZ - 0.025,
        s.head * 1.03,
        s.head * 1.2,
        s.head * 0.99,
      );
      const inside = ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + 0.02,
        headZ - 0.025,
        s.head * 0.94,
        s.head * 1.11,
        s.head * 0.9,
      );
      // Open across the face, draping down the sides and back of the head.
      return Math.max(outside, -inside, z - (headZ + 0.1));
    };
    add(
      quality === "hero"
        ? sculpt({
            bounds: [
              [-0.4, 1.24, -0.4],
              [0.4, 2.12, 0.2],
            ],
            resolution: 56,
            field: shawl,
            material: materials.robe,
          }).geometry
        : fittedHeadwear(true),
      materials.robe,
      "character-headwear",
    );
  }
  if (cast?.outfit === "armor" && role !== "moroni") {
    const helmetMaterial = materials.mantle.clone();
    helmetMaterial.clearcoat = 0;
    helmetMaterial.metalness = 0;
    helmetMaterial.roughness = 1;
    helmetMaterial.specularIntensity = 0;
    extraMaterials.push(helmetMaterial);
    const helmet: DistanceField = (x, y, z) => {
      const outer = ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + 0.035,
        headZ,
        s.head * 1.04,
        s.head * 1.13,
        s.head * 0.98,
      );
      const inner = ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + 0.035,
        headZ,
        s.head * 0.94,
        s.head * 1.03,
        s.head * 0.88,
      );
      return Math.max(outer, -inner, s.headY + 0.07 - y);
    };
    add(
      quality === "hero"
        ? sculpt({
            bounds: [
              [-0.4, 1.58, -0.4],
              [0.4, 2.12, 0.4],
            ],
            resolution: 56,
            field: helmet,
            material: helmetMaterial,
          }).geometry
        : fittedHeadwear(false),
      helmetMaterial,
      "character-headwear",
    );
    {
      const breastplate = add(
        new T.SphereGeometry(
          1,
          quality === "hero" ? 24 : quality === "npc" ? 16 : 8,
          quality === "hero" ? 16 : quality === "npc" ? 10 : 6,
          0,
          Math.PI,
        ),
        materials.mantle,
        "guard-breastplate",
      );
      breastplate.scale.set(0.326, 0.275, 0.085);
      breastplate.position.set(0, 1.23, 0.289);
      const emblem = add(
        new T.TorusGeometry(
          0.065,
          0.012,
          quality === "hero" ? 6 : 4,
          quality === "hero" ? 24 : quality === "npc" ? 16 : 8,
        ),
        materials.mantleLining,
        "guard-armor-emblem",
      );
      emblem.position.set(0, 1.27, 0.379);
    }
  }

  if (role === "moroni") {
    addMoroniCommander(
      group,
      add,
      extraMaterials,
      s.headY,
      headZ,
      s.head,
      quality,
    );
    group.getObjectByName("character-ear-left")?.removeFromParent();
    group.getObjectByName("character-ear-right")?.removeFromParent();
    addMoroniHead(group, add, extraMaterials, s.headY, headZ, s.head, quality);
    shapeMoroni(group);
  }

  // Normalize only once after all silhouettes have been built.
  group.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(group);
  const scale = 2 / (bounds.max.y - bounds.min.y);
  group.scale.setScalar(scale);
  group.position.y = -bounds.min.y * scale;
  return {
    group,
    dispose: () => {
      group.parent?.remove(group);
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
      for (const material of extraMaterials) material.dispose();
      group.clear();
    },
  };
}

export function buildSculptedLehi(index: number): SculptedLehi {
  return makeSculpted(index);
}

/** The accepted smooth style, with per-person anatomy and fitted costumes. */
export function buildSculptedCharacter(
  role: SculptedCharacterRole,
  options: {
    quality?: SculptedCharacterQuality;
    faceProfile?: SculptedFaceProfile;
  } = {},
): SculptedLehi {
  if (!Object.hasOwn(SCULPTED_CAST_TRAITS, role))
    throw new RangeError(`Unknown sculpted character ${role}`);
  const result = makeSculpted(
    2,
    role,
    options.quality ?? "npc",
    options.faceProfile ??
      (role === "moroni"
        ? {
            faceHeight: 1.01,
            faceDepth: 0.8,
            faceWidth: 0.8,
            lowerFaceTaper: 0.78,
            jawDrop: 0.47,
            jawDepth: 0.6,
            chinLength: 0.43,
            cheekbone: 0.1,
            noseWidth: 0.039,
            noseProjection: 0.72,
            noseBridge: 0.48,
            browThickness: 0.023,
            jawSquareness: 1.08,
            jawWidth: 0.56,
            eyeOpening: 0.105,
            eyeWidth: 0.18,
            hairCut: "side-sweep",
            hairLength: 0.045,
            hairColor: 0x39271d,
          }
        : undefined) ??
      (role === "nephi" || role === "nephi-disguised"
        ? APPROVED_NEPHI_FACE
        : undefined),
  );
  result.group.name = `sculpted-${role}`;
  return result;
}
