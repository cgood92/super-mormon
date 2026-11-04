import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createCharacter } from "../../src/game/characters/character";

// ============================================================================
// DATA STRUCTURES & CONFIGURATION TYPES
// ============================================================================

export type Gender = "male" | "female";

export interface VarietyCardConfig {
  id: string;
  category:
    "hair" | "beard" | "robe" | "face" | "body" | "feminine" | "comparison";
  number?: number;
  title: string;
  subtitle: string;
  description: string;
  gender: Gender;
  hairStyleId: number;
  hairColor?: number;
  beardStyleId: number;
  robeStyleId: number;
  skinColor?: number;
  robeColor?: number;
  coatColor?: number;
  trimColor?: number;
  noseProfile?: "aquiline" | "straight" | "button" | "broad" | "delicate";
  browProfile?: "arched" | "straight" | "bushy" | "gentle" | "angled";
  jawProfile?: "square" | "oval" | "tapered" | "round";
  heightScale?: number;
  widthScale?: number;
  shoulderWidth?: number;
  waistWidth?: number;
  useGameActorRole?: "sariah" | "maidservant" | "nephi" | "lehi";
}

// Standard color palettes (respectful, diverse, historically grounded)
export const PALETTES = {
  skin: {
    warmBronze: 0xba8665,
    mediterraneanOlive: 0xb58b68,
    desertTan: 0xc49574,
    deepOchre: 0x9e6a4b,
    fairHoney: 0xd4a887,
    weatheredElder: 0xaa7b5b,
    feminineWarm: 0xc69678,
    feminineSoft: 0xd0a386,
  },
  hair: {
    ravenBlack: 0x1f1d1b,
    darkChestnut: 0x3d2b22,
    warmBrown: 0x593e2f,
    auburn: 0x6e3b28,
    goldenBrown: 0x8a633c,
    silverGray: 0x8e8d89,
    patriarchWhite: 0xd4d2cc,
  },
  fabrics: {
    naturalLinen: 0xe5dccb,
    parchment: 0xd6cbb5,
    desertSand: 0xcab58b,
    terracotta: 0xad5842,
    deepIndigo: 0x31465e,
    forestSage: 0x526b58,
    royalPlum: 0x5e3c54,
    charcoal: 0x38393b,
    goldTrim: 0xc2a057,
    leatherBrown: 0x543926,
    feminineRoseLinen: 0xce9e94,
    feminineSkyLinen: 0x9bb7c4,
    feminineLilacLinen: 0xa896b0,
    feminineGoldLinen: 0xd6be83,
  },
};

// ============================================================================
// PROCEDURAL MESH BUILDER FOR EXPLORATION MODELS
// ============================================================================

/** Builds an expressive, stylized character mannequin with interchangeable parts */
export function buildVarietyMannequin(cfg: VarietyCardConfig): T.Group {
  const root = new T.Group();
  root.name = `mannequin-${cfg.id}`;

  const isFemale = cfg.gender === "female";
  const heightScale = cfg.heightScale ?? (isFemale ? 0.94 : 1.0);
  const widthScale = cfg.widthScale ?? (isFemale ? 0.88 : 1.0);

  // Material setup
  const skinColor =
    cfg.skinColor ??
    (isFemale ? PALETTES.skin.feminineWarm : PALETTES.skin.warmBronze);
  const hairColor =
    cfg.hairColor ??
    (isFemale ? PALETTES.hair.darkChestnut : PALETTES.hair.darkChestnut);
  const robeColor =
    cfg.robeColor ??
    (isFemale
      ? PALETTES.fabrics.feminineSkyLinen
      : PALETTES.fabrics.naturalLinen);
  const coatColor =
    cfg.coatColor ??
    (isFemale
      ? PALETTES.fabrics.feminineRoseLinen
      : PALETTES.fabrics.desertSand);
  const trimColor = cfg.trimColor ?? PALETTES.fabrics.goldTrim;

  const matSkin = new T.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.82,
    metalness: 0.05,
  });
  const matHair = new T.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.65,
    metalness: 0.08,
  });
  const matRobe = new T.MeshStandardMaterial({
    color: robeColor,
    roughness: 0.88,
    metalness: 0.02,
  });
  const matCoat = new T.MeshStandardMaterial({
    color: coatColor,
    roughness: 0.85,
    metalness: 0.03,
    side: T.DoubleSide,
  });
  const matTrim = new T.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.5,
    metalness: 0.35,
  });
  const matLeather = new T.MeshStandardMaterial({
    color: PALETTES.fabrics.leatherBrown,
    roughness: 0.75,
    metalness: 0.1,
  });
  const matEyeWhite = new T.MeshStandardMaterial({
    color: 0xf5f3ee,
    roughness: 0.3,
  });
  const matIris = new T.MeshStandardMaterial({
    color: 0x332219,
    roughness: 0.2,
  });
  const matLip = new T.MeshStandardMaterial({
    color: isFemale ? 0xb56360 : 0x9e5c4a,
    roughness: 0.65,
  });

  // Base proportions
  const shoulderHalf =
    (cfg.shoulderWidth ?? (isFemale ? 0.29 : 0.39)) * widthScale;
  const waistHalf = (cfg.waistWidth ?? (isFemale ? 0.21 : 0.29)) * widthScale;
  const hipHalf = (isFemale ? 0.33 : 0.28) * widthScale;
  const headRadius = isFemale ? 0.185 : 0.205;
  const headY = 1.48 * heightScale;

  // --- HEAD & FACE ---
  const headGroup = new T.Group();
  headGroup.name = "head-group";
  headGroup.position.set(0, headY, 0);
  root.add(headGroup);

  // Cranium / Face base
  const craniumGeo = new T.SphereGeometry(headRadius, 24, 20);
  craniumGeo.scale(isFemale ? 0.85 : 0.92, isFemale ? 1.08 : 1.05, 0.95);
  const cranium = new T.Mesh(craniumGeo, matSkin);
  headGroup.add(cranium);

  // Jaw & Chin
  const jawGeo = new T.CylinderGeometry(
    headRadius * (isFemale ? 0.75 : 0.9),
    headRadius * (isFemale ? 0.42 : cfg.jawProfile === "square" ? 0.75 : 0.58),
    headRadius * 0.95,
    16,
  );
  jawGeo.scale(isFemale ? 0.82 : 0.92, 1, 0.88);
  const jaw = new T.Mesh(jawGeo, matSkin);
  jaw.position.set(0, -headRadius * 0.48, headRadius * 0.12);
  headGroup.add(jaw);

  // Cheeks (softer for female, chiseled for male)
  for (const side of [-1, 1]) {
    const cheekGeo = new T.SphereGeometry(
      headRadius * (isFemale ? 0.32 : 0.36),
      12,
      12,
    );
    cheekGeo.scale(0.85, 0.85, 0.65);
    const cheek = new T.Mesh(cheekGeo, matSkin);
    cheek.position.set(
      side * headRadius * (isFemale ? 0.58 : 0.62),
      -headRadius * 0.18,
      headRadius * 0.52,
    );
    headGroup.add(cheek);
  }

  // Eyes & Almond Sockets
  for (const side of [-1, 1]) {
    const eyeX = side * headRadius * (isFemale ? 0.44 : 0.42);
    const eyeY = headRadius * 0.05;
    const eyeZ = headRadius * 0.82;

    const eyeGeo = new T.SphereGeometry(
      headRadius * (isFemale ? 0.13 : 0.12),
      12,
      12,
    );
    eyeGeo.scale(isFemale ? 1.4 : 1.25, isFemale ? 0.85 : 0.75, 0.5);
    const eye = new T.Mesh(eyeGeo, matEyeWhite);
    eye.position.set(eyeX, eyeY, eyeZ);
    headGroup.add(eye);

    // Iris
    const irisGeo = new T.SphereGeometry(headRadius * 0.065, 10, 10);
    irisGeo.scale(1, 1, 0.3);
    const iris = new T.Mesh(irisGeo, matIris);
    iris.position.set(eyeX, eyeY, eyeZ + 0.016);
    headGroup.add(iris);

    // Eyelid crease
    const lidGeo = new T.TorusGeometry(
      headRadius * (isFemale ? 0.14 : 0.13),
      0.007,
      6,
      12,
      Math.PI,
    );
    const lid = new T.Mesh(lidGeo, matSkin);
    lid.position.set(eyeX, eyeY + 0.015, eyeZ + 0.012);
    lid.rotation.x = Math.PI * 0.1;
    headGroup.add(lid);
  }

  // Eyebrows
  const browShape = cfg.browProfile ?? (isFemale ? "arched" : "straight");
  const browThickness = isFemale
    ? 0.009
    : browShape === "bushy"
      ? 0.022
      : 0.014;
  for (const side of [-1, 1]) {
    const browCurve = new T.CatmullRomCurve3([
      new T.Vector3(
        side * headRadius * 0.22,
        headRadius * 0.18,
        headRadius * 0.84,
      ),
      new T.Vector3(
        side * headRadius * 0.45,
        headRadius *
          (browShape === "arched"
            ? 0.26
            : browShape === "angled"
              ? 0.27
              : 0.21),
        headRadius * 0.86,
      ),
      new T.Vector3(
        side * headRadius * 0.68,
        headRadius * (browShape === "arched" ? 0.19 : 0.16),
        headRadius * 0.74,
      ),
    ]);
    const browGeo = new T.TubeGeometry(browCurve, 12, browThickness, 6, false);
    const brow = new T.Mesh(browGeo, matHair);
    headGroup.add(brow);
  }

  // Nose
  const noseType = cfg.noseProfile ?? (isFemale ? "delicate" : "straight");
  const noseGroup = new T.Group();
  const bridgeLength = headRadius * (isFemale ? 0.38 : 0.45);
  const bridgeRadius =
    headRadius * (isFemale ? 0.055 : noseType === "broad" ? 0.095 : 0.075);
  const bridgeGeo = new T.CylinderGeometry(
    bridgeRadius * 0.8,
    bridgeRadius * 1.15,
    bridgeLength,
    8,
  );
  const bridge = new T.Mesh(bridgeGeo, matSkin);
  bridge.rotation.x = noseType === "aquiline" ? 0.36 : 0.24;
  bridge.position.set(0, -headRadius * 0.12, headRadius * 0.88);
  noseGroup.add(bridge);

  const tipGeo = new T.SphereGeometry(
    bridgeRadius * (noseType === "button" ? 1.4 : 1.1),
    10,
    10,
  );
  tipGeo.scale(noseType === "broad" ? 1.4 : 1.1, 0.95, 1.1);
  const tip = new T.Mesh(tipGeo, matSkin);
  tip.position.set(0, -headRadius * 0.28, headRadius * 0.96);
  noseGroup.add(tip);
  headGroup.add(noseGroup);

  // Lips / Mouth
  const lipWidth = headRadius * (isFemale ? 0.38 : 0.44);
  const lipGeo = new T.CylinderGeometry(0.009, 0.012, lipWidth, 8);
  lipGeo.rotateZ(Math.PI / 2);
  const lip = new T.Mesh(lipGeo, matLip);
  lip.position.set(0, -headRadius * 0.52, headRadius * 0.79);
  headGroup.add(lip);

  // Ears
  for (const side of [-1, 1]) {
    const earGeo = new T.SphereGeometry(headRadius * 0.28, 8, 8);
    earGeo.scale(0.3, 1, 0.6);
    const ear = new T.Mesh(earGeo, matSkin);
    ear.position.set(
      side * headRadius * 0.88,
      -headRadius * 0.08,
      headRadius * 0.02,
    );
    ear.rotation.y = side * 0.25;
    headGroup.add(ear);
  }

  // --- HAIRSTYLES (1 to 12 Male, or 1 to 5 Female) ---
  const hairGroup = new T.Group();
  hairGroup.name = "hair-group";
  headGroup.add(hairGroup);

  if (isFemale) {
    buildFemaleHairstyle(
      hairGroup,
      cfg.hairStyleId,
      headRadius,
      matHair,
      matTrim,
    );
  } else {
    buildMaleHairstyle(
      hairGroup,
      cfg.hairStyleId,
      headRadius,
      matHair,
      matTrim,
      matLeather,
    );
  }

  // --- BEARD STYLES (Male only) ---
  if (!isFemale && cfg.beardStyleId > 1) {
    const beardGroup = new T.Group();
    beardGroup.name = "beard-group";
    headGroup.add(beardGroup);
    buildBeardStyle(beardGroup, cfg.beardStyleId, headRadius, matHair);
  }

  // --- NECK & TORSO ---
  const neckGeo = new T.CylinderGeometry(
    headRadius * (isFemale ? 0.42 : 0.54),
    headRadius * (isFemale ? 0.5 : 0.65),
    0.22,
    16,
  );
  const neck = new T.Mesh(neckGeo, matSkin);
  neck.position.set(0, headY - 0.16, 0);
  root.add(neck);

  // Robe / Body Mesh based on robeStyleId
  const bodyGroup = new T.Group();
  bodyGroup.name = "body-outfit";
  root.add(bodyGroup);

  if (isFemale) {
    buildFemaleOutfit(
      bodyGroup,
      cfg.robeStyleId,
      shoulderHalf,
      waistHalf,
      hipHalf,
      heightScale,
      matRobe,
      matCoat,
      matTrim,
      matLeather,
    );
  } else {
    buildMaleOutfit(
      bodyGroup,
      cfg.robeStyleId,
      shoulderHalf,
      waistHalf,
      hipHalf,
      heightScale,
      matRobe,
      matCoat,
      matTrim,
      matLeather,
      matSkin,
    );
  }

  // --- ARMS & HANDS ---
  for (const side of [-1, 1]) {
    const armGroup = new T.Group();
    armGroup.position.set(side * (shoulderHalf + 0.06), headY - 0.28, 0);
    bodyGroup.add(armGroup);

    // Upper arm
    const armRadius = isFemale ? 0.062 : 0.088;
    const upperGeo = new T.CylinderGeometry(
      armRadius,
      armRadius * 0.9,
      0.32,
      12,
    );
    const upperArm = new T.Mesh(upperGeo, matRobe);
    upperArm.position.y = -0.16;
    armGroup.add(upperArm);

    // Forearm / Sleeve
    const foreGeo = new T.CylinderGeometry(
      armRadius * 0.9,
      armRadius * 0.8,
      0.32,
      12,
    );
    const foreArm = new T.Mesh(
      foreGeo,
      cfg.robeStyleId === 2 || cfg.robeStyleId === 7 ? matSkin : matRobe,
    );
    foreArm.position.y = -0.46;
    armGroup.add(foreArm);

    // Hand
    const handGeo = new T.SphereGeometry(isFemale ? 0.055 : 0.07, 8, 8);
    handGeo.scale(0.8, 1.2, 0.6);
    const hand = new T.Mesh(handGeo, matSkin);
    hand.position.set(0, -0.66, 0.02);
    armGroup.add(hand);

    // Gentle natural pose
    armGroup.rotation.z = side * -0.09;
    armGroup.rotation.x = 0.04;
  }

  // --- LEGS & SANDALS ---
  for (const side of [-1, 1]) {
    const legX = side * (hipHalf * 0.55);
    const legRadius = isFemale ? 0.065 : 0.095;

    // Trouser / Inner leg
    const legGeo = new T.CylinderGeometry(
      legRadius,
      legRadius * 0.85,
      0.72,
      10,
    );
    const leg = new T.Mesh(legGeo, matRobe);
    leg.position.set(legX, 0.38, 0);
    root.add(leg);

    // Sandal sole
    const soleGeo = new T.BoxGeometry(0.12 * widthScale, 0.04, 0.26);
    const sole = new T.Mesh(soleGeo, matLeather);
    sole.position.set(legX, 0.02, 0.04);
    root.add(sole);

    // Sandal straps
    const strapGeo = new T.TorusGeometry(0.06, 0.012, 6, 12, Math.PI);
    const strap = new T.Mesh(strapGeo, matLeather);
    strap.position.set(legX, 0.05, 0.04);
    strap.rotation.x = Math.PI * 0.2;
    root.add(strap);
  }

  return root;
}

// ============================================================================
// 12 DISTINCT MALE HAIRSTYLES
// ============================================================================

function buildMaleHairstyle(
  group: T.Group,
  styleId: number,
  r: number,
  matHair: T.Material,
  matTrim: T.Material,
  matLeather: T.Material,
) {
  // Base skull cap covering crown and rear
  const baseCapGeo = new T.SphereGeometry(
    r * 1.03,
    18,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.62,
  );
  const baseCap = new T.Mesh(baseCapGeo, matHair);
  baseCap.position.y = 0.01;
  group.add(baseCap);

  switch (styleId) {
    case 1: {
      // #1: Classic Short Crop - Clean tapered sides, neat forward-brushed texture
      const cropGeo = new T.SphereGeometry(
        r * 1.07,
        16,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.45,
      );
      cropGeo.scale(0.96, 0.92, 1.04);
      const crop = new T.Mesh(cropGeo, matHair);
      crop.position.set(0, 0.04, 0.02);
      group.add(crop);
      break;
    }
    case 2: {
      // #2: Side-Parted Sleek - Clean part on left side, swept across crown
      const sideSweep = new T.SphereGeometry(
        r * 1.08,
        18,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.48,
      );
      sideSweep.scale(1.02, 0.94, 0.98);
      const part = new T.Mesh(sideSweep, matHair);
      part.position.set(r * 0.08, 0.05, 0.01);
      part.rotation.z = -0.15;
      group.add(part);

      // Defined parting notch
      const notchGeo = new T.BoxGeometry(0.015, 0.04, r * 0.8);
      const notch = new T.Mesh(notchGeo, matHair);
      notch.position.set(-r * 0.38, r * 0.88, 0);
      group.add(notch);
      break;
    }
    case 3: {
      // #3: Textured Brush-Up - Lifted front pompadour/brush-up
      const liftGeo = new T.CylinderGeometry(r * 0.65, r * 0.82, r * 0.42, 14);
      liftGeo.scale(0.85, 1, 1.15);
      const lift = new T.Mesh(liftGeo, matHair);
      lift.position.set(0, r * 0.98, r * 0.22);
      lift.rotation.x = -0.22;
      group.add(lift);
      break;
    }
    case 4: {
      // #4: Swept Flow - Wavy hair reaching lower neck / collar
      const flowTop = new T.SphereGeometry(
        r * 1.09,
        16,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.55,
      );
      const topMesh = new T.Mesh(flowTop, matHair);
      topMesh.position.set(0, 0.03, -0.02);
      group.add(topMesh);

      // Falling waves at sides & back
      for (const side of [-1, 1]) {
        const sideLockCurve = new T.CatmullRomCurve3([
          new T.Vector3(side * r * 0.82, r * 0.35, -r * 0.2),
          new T.Vector3(side * r * 0.88, -r * 0.15, -r * 0.3),
          new T.Vector3(side * r * 0.82, -r * 0.55, -r * 0.35),
        ]);
        const lockGeo = new T.TubeGeometry(
          sideLockCurve,
          10,
          r * 0.16,
          8,
          false,
        );
        group.add(new T.Mesh(lockGeo, matHair));
      }
      break;
    }
    case 5: {
      // #5: Desert Nomad Wavy Crown + Leather Headband
      const wavyTop = new T.SphereGeometry(
        r * 1.12,
        18,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.6,
      );
      const wavy = new T.Mesh(wavyTop, matHair);
      group.add(wavy);

      // Leather Headband wrapping around forehead
      const bandGeo = new T.TorusGeometry(r * 0.98, 0.022, 8, 32);
      const band = new T.Mesh(bandGeo, matLeather);
      band.position.set(0, r * 0.38, 0);
      band.rotation.x = Math.PI * 0.48;
      group.add(band);

      // Hanging band tie at back
      const tieGeo = new T.BoxGeometry(0.035, 0.24, 0.015);
      const tie = new T.Mesh(tieGeo, matLeather);
      tie.position.set(0, -r * 0.25, -r * 1.02);
      group.add(tie);
      break;
    }
    case 6: {
      // #6: Close Buzz / Military Crew - Minimalist warrior fade
      baseCap.scale.set(0.99, 0.98, 0.99);
      break;
    }
    case 7: {
      // #7: Receding Crown (Mature Patriarch) - Bare/thinning crown with temple/back fringes
      baseCap.visible = false;
      const fringeGeo = new T.TorusGeometry(
        r * 0.92,
        r * 0.26,
        10,
        24,
        Math.PI * 1.25,
      );
      const fringe = new T.Mesh(fringeGeo, matHair);
      fringe.position.set(0, -r * 0.05, -r * 0.12);
      fringe.rotation.x = Math.PI * 0.55;
      fringe.rotation.z = Math.PI * 0.38;
      group.add(fringe);
      break;
    }
    case 8: {
      // #8: Warrior Topknot / High Knot - Hair pulled into high bun with tie
      const slickCap = new T.SphereGeometry(
        r * 1.04,
        16,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.55,
      );
      group.add(new T.Mesh(slickCap, matHair));

      // Topknot bun
      const bunGeo = new T.SphereGeometry(r * 0.36, 12, 12);
      bunGeo.scale(1.1, 0.9, 1.1);
      const bun = new T.Mesh(bunGeo, matHair);
      bun.position.set(0, r * 1.12, -r * 0.15);
      group.add(bun);

      // Hair tie cord
      const cordGeo = new T.TorusGeometry(r * 0.26, 0.018, 6, 16);
      const cord = new T.Mesh(cordGeo, matTrim);
      cord.position.set(0, r * 0.98, -r * 0.15);
      cord.rotation.x = Math.PI / 2;
      group.add(cord);
      break;
    }
    case 9: {
      // #9: Long Cascading Waves - Past upper back and chest
      const crownMesh = new T.Mesh(
        new T.SphereGeometry(
          r * 1.1,
          16,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.58,
        ),
        matHair,
      );
      group.add(crownMesh);

      // Heavy back drape
      const backGeo = new T.CylinderGeometry(
        r * 0.85,
        r * 1.15,
        0.58,
        14,
        1,
        false,
        0,
        Math.PI,
      );
      const backHair = new T.Mesh(backGeo, matHair);
      backHair.position.set(0, -0.28, -r * 0.55);
      backHair.rotation.y = Math.PI * 0.5;
      group.add(backHair);
      break;
    }
    case 10: {
      // #10: Ancient Braided Plaits - Near-Eastern layered plaits along crown
      const plaitCap = new T.Mesh(
        new T.SphereGeometry(
          r * 1.05,
          16,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.52,
        ),
        matHair,
      );
      group.add(plaitCap);

      for (let i = -2; i <= 2; i++) {
        const braidCurve = new T.CatmullRomCurve3([
          new T.Vector3(i * 0.055, r * 0.88, r * 0.45),
          new T.Vector3(i * 0.065, r * 0.98, -0.05),
          new T.Vector3(i * 0.075, r * 0.65, -r * 0.85),
          new T.Vector3(i * 0.08, -0.08, -r * 0.95),
        ]);
        const plait = new T.Mesh(
          new T.TubeGeometry(braidCurve, 12, 0.022, 6, false),
          matHair,
        );
        group.add(plait);
      }
      break;
    }
    case 11: {
      // #11: Tight Curly Texture - Rounded textured coils
      const curlDome = new T.SphereGeometry(
        r * 1.15,
        16,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.65,
      );
      const curly = new T.Mesh(curlDome, matHair);
      group.add(curly);

      // Procedural curls / bumps
      for (let i = 0; i < 28; i++) {
        const phi = Math.random() * Math.PI * 0.5;
        const theta = Math.random() * Math.PI * 2;
        const bump = new T.Mesh(new T.SphereGeometry(r * 0.18, 6, 6), matHair);
        bump.position.set(
          r * 1.08 * Math.sin(phi) * Math.sin(theta),
          r * 1.08 * Math.cos(phi),
          r * 1.08 * Math.sin(phi) * Math.cos(theta),
        );
        group.add(bump);
      }
      break;
    }
    case 12: {
      // #12: Desert Linen Turban / Headwrap - Wrapped traveler fabric
      const turbanWrap = new T.TorusGeometry(r * 0.98, r * 0.32, 10, 24);
      const turban = new T.Mesh(turbanWrap, matTrim);
      turban.position.set(0, r * 0.45, -0.02);
      turban.rotation.x = Math.PI * 0.52;
      group.add(turban);

      // Crown dome
      const innerDome = new T.Mesh(
        new T.SphereGeometry(
          r * 1.02,
          14,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.4,
        ),
        matTrim,
      );
      innerDome.position.y = r * 0.45;
      group.add(innerDome);

      // Hanging neck tail
      const tailGeo = new T.BoxGeometry(0.18, 0.38, 0.04);
      const tail = new T.Mesh(tailGeo, matTrim);
      tail.position.set(r * 0.25, -0.15, -r * 0.85);
      tail.rotation.z = -0.18;
      group.add(tail);
      break;
    }
  }
}

// ============================================================================
// 8 DISTINCT BEARD STYLES (MALE)
// ============================================================================

function buildBeardStyle(
  group: T.Group,
  beardId: number,
  r: number,
  matHair: T.Material,
) {
  switch (beardId) {
    case 2: {
      // #2: Rugged Stubble / Scruff - 5 o'clock shadow along jawline, chin, and upper lip
      const scruffGeo = new T.CylinderGeometry(
        r * 0.88,
        r * 0.72,
        r * 0.52,
        16,
        1,
        true,
        Math.PI * 0.15,
        Math.PI * 1.7,
      );
      const scruff = new T.Mesh(scruffGeo, matHair);
      scruff.position.set(0, -r * 0.42, r * 0.14);
      scruff.scale.set(0.96, 1.0, 0.92);
      group.add(scruff);

      // Stubble mustache
      const stacheGeo = new T.TorusGeometry(r * 0.24, 0.018, 6, 12, Math.PI);
      const stache = new T.Mesh(stacheGeo, matHair);
      stache.position.set(0, -r * 0.32, r * 0.84);
      group.add(stache);

      // Chin stubble pad
      const chinPad = new T.Mesh(new T.SphereGeometry(r * 0.28, 8, 8), matHair);
      chinPad.scale.set(1.1, 0.7, 0.5);
      chinPad.position.set(0, -r * 0.65, r * 0.52);
      group.add(chinPad);
      break;
    }
    case 3: {
      // #3: Short Boxed Beard - Chiseled neat trimmed jawline & mustache
      const boxedGeo = new T.CylinderGeometry(
        r * 0.92,
        r * 0.82,
        r * 0.58,
        16,
        1,
        true,
        Math.PI * 0.12,
        Math.PI * 1.76,
      );
      const boxed = new T.Mesh(boxedGeo, matHair);
      boxed.position.set(0, -r * 0.46, r * 0.16);
      boxed.scale.set(0.98, 1, 0.95);
      group.add(boxed);

      // Neat trimmed mustache
      const stache = new T.Mesh(
        new T.TorusGeometry(r * 0.26, 0.026, 6, 14, Math.PI),
        matHair,
      );
      stache.position.set(0, -r * 0.32, r * 0.85);
      group.add(stache);

      // Boxed chin front
      const chinBox = new T.Mesh(
        new T.BoxGeometry(r * 0.68, r * 0.38, r * 0.32),
        matHair,
      );
      chinBox.position.set(0, -r * 0.65, r * 0.56);
      group.add(chinBox);
      break;
    }
    case 4: {
      // #4: Pointed Goatee & Mustache - Tapered chin goatee
      const goateeGeo = new T.ConeGeometry(r * 0.36, r * 0.82, 12);
      const goatee = new T.Mesh(goateeGeo, matHair);
      goatee.position.set(0, -r * 0.78, r * 0.62);
      goatee.rotation.x = -0.22;
      group.add(goatee);

      // Soul patch
      const patch = new T.Mesh(
        new T.BoxGeometry(r * 0.14, r * 0.18, 0.02),
        matHair,
      );
      patch.position.set(0, -r * 0.48, r * 0.78);
      group.add(patch);

      const stache = new T.Mesh(
        new T.TorusGeometry(r * 0.25, 0.026, 6, 12, Math.PI),
        matHair,
      );
      stache.position.set(0, -r * 0.32, r * 0.85);
      group.add(stache);
      break;
    }
    case 5: {
      // #5: Squared Royal Beard - Ancient Near-Eastern regal block trim
      const royalGeo = new T.BoxGeometry(r * 0.78, r * 0.88, r * 0.44);
      const royal = new T.Mesh(royalGeo, matHair);
      royal.position.set(0, -r * 0.78, r * 0.48);
      group.add(royal);

      // 3 horizontal fluted ridges
      for (let i = 0; i < 3; i++) {
        const ridge = new T.Mesh(
          new T.BoxGeometry(r * 0.84, 0.024, r * 0.48),
          matHair,
        );
        ridge.position.set(0, -r * 0.55 - i * 0.18, r * 0.49);
        group.add(ridge);
      }

      // Royal trimmed mustache
      const stache = new T.Mesh(
        new T.TorusGeometry(r * 0.28, 0.028, 6, 14, Math.PI),
        matHair,
      );
      stache.position.set(0, -r * 0.32, r * 0.86);
      group.add(stache);
      break;
    }
    case 6: {
      // #6: Full Flowing Patriarch Beard (Chest-length elder Lehi style)
      const elderCurve = new T.CatmullRomCurve3([
        new T.Vector3(0, -r * 0.35, r * 0.72),
        new T.Vector3(0, -r * 0.75, r * 0.65),
        new T.Vector3(0, -r * 1.35, r * 0.45),
        new T.Vector3(0, -r * 2.0, r * 0.25),
      ]);
      const elderGeo = new T.TubeGeometry(elderCurve, 16, r * 0.48, 12, false);
      const elder = new T.Mesh(elderGeo, matHair);
      group.add(elder);

      // Side drapes joining temples to beard
      for (const side of [-1, 1]) {
        const sideBeard = new T.Mesh(
          new T.BoxGeometry(0.04, r * 0.85, r * 0.38),
          matHair,
        );
        sideBeard.position.set(side * r * 0.88, -r * 0.45, r * 0.22);
        group.add(sideBeard);
      }

      const stache = new T.Mesh(
        new T.TorusGeometry(r * 0.32, 0.035, 6, 14, Math.PI),
        matHair,
      );
      stache.position.set(0, -r * 0.32, r * 0.88);
      group.add(stache);
      break;
    }
    case 7: {
      // #7: Forked / Dual-Pointed Beard - Warrior twin taper
      for (const side of [-1, 1]) {
        const forkGeo = new T.ConeGeometry(r * 0.26, r * 0.75, 10);
        const fork = new T.Mesh(forkGeo, matHair);
        fork.position.set(side * r * 0.24, -r * 0.82, r * 0.54);
        fork.rotation.z = side * 0.2;
        fork.rotation.x = -0.18;
        group.add(fork);
      }

      // Center jaw connection
      const centerGeo = new T.BoxGeometry(r * 0.65, r * 0.35, r * 0.35);
      const center = new T.Mesh(centerGeo, matHair);
      center.position.set(0, -r * 0.55, r * 0.48);
      group.add(center);

      const stache = new T.Mesh(
        new T.TorusGeometry(r * 0.26, 0.026, 6, 12, Math.PI),
        matHair,
      );
      stache.position.set(0, -r * 0.32, r * 0.85);
      group.add(stache);
      break;
    }
    case 8: {
      // #8: Sideburns / Mutton Chops with Chin Strap
      for (const side of [-1, 1]) {
        const chopGeo = new T.BoxGeometry(0.05, r * 0.78, r * 0.42);
        const chop = new T.Mesh(chopGeo, matHair);
        chop.position.set(side * r * 0.9, -r * 0.42, r * 0.22);
        group.add(chop);
      }
      const strapGeo = new T.TorusGeometry(
        r * 0.78,
        0.035,
        6,
        16,
        Math.PI * 0.8,
      );
      const strap = new T.Mesh(strapGeo, matHair);
      strap.position.set(0, -r * 0.58, r * 0.08);
      strap.rotation.x = Math.PI * 0.42;
      group.add(strap);
      break;
    }
  }
}

// ============================================================================
// 8 DISTINCT MALE ROBE & OUTFIT CUTS (NOT JUST COLORS!)
// ============================================================================

function buildMaleOutfit(
  group: T.Group,
  robeId: number,
  shoulder: number,
  waist: number,
  hip: number,
  scale: number,
  matRobe: T.Material,
  matCoat: T.Material,
  matTrim: T.Material,
  matLeather: T.Material,
  matSkin: T.Material,
) {
  // Base Torso Tunic: Elliptical human chest depth (~52% of shoulder), sloping shoulders
  // Ends at Y = 1.18 * scale, leaving full neck and chin unobstructed
  const torsoGeo = new T.CylinderGeometry(shoulder, waist, 0.48 * scale, 18);
  const torso = new T.Mesh(torsoGeo, matRobe);
  torso.scale.set(1.0, 1.0, 0.52);
  torso.position.y = 0.94 * scale;
  group.add(torso);

  // V-Neck / Open Collar Trim dipping down in front
  const collarGeo = new T.TorusGeometry(shoulder * 0.38, 0.02, 6, 16, Math.PI);
  const collar = new T.Mesh(collarGeo, matTrim);
  collar.position.set(0, 1.16 * scale, waist * 0.48);
  collar.rotation.x = Math.PI * 0.38;
  group.add(collar);

  switch (robeId) {
    case 1: {
      // #1: Classic Patriarch Robe - Ankle length skirt + Draped Open Mantle
      const skirtGeo = new T.CylinderGeometry(
        waist,
        hip * 1.35,
        0.85 * scale,
        18,
      );
      const skirt = new T.Mesh(skirtGeo, matRobe);
      skirt.scale.set(1.0, 1.0, 0.6);
      skirt.position.y = 0.52 * scale;
      group.add(skirt);

      // Draped Outer Mantle / Cape hanging across back and over shoulders (top at 1.18)
      const mantleGeo = new T.CylinderGeometry(
        shoulder * 1.04,
        hip * 1.34,
        1.15 * scale,
        18,
        1,
        true,
        Math.PI * 0.42,
        Math.PI * 1.16,
      );
      const mantle = new T.Mesh(mantleGeo, matCoat);
      mantle.scale.set(1.04, 1.0, 0.54);
      mantle.position.set(0, 0.6 * scale, -0.04);
      group.add(mantle);

      // Leather Waist Belt with Sash
      buildBelt(group, waist * 1.05, 0.98 * scale, matLeather, matTrim);
      break;
    }
    case 0:
    default: {
      // Clean baseline tunic for hair/beard showcases
      const skirtGeo = new T.CylinderGeometry(
        waist,
        hip * 1.15,
        0.75 * scale,
        16,
      );
      const skirt = new T.Mesh(skirtGeo, matRobe);
      skirt.scale.set(1.0, 1.0, 0.58);
      skirt.position.y = 0.58 * scale;
      group.add(skirt);
      buildBelt(group, waist * 1.04, 0.98 * scale, matLeather, matTrim);
      break;
    }
    case 2: {
      // #2: Artisan Work Tunic - Knee length, rolled sleeves, leather tool belt
      const kneeSkirt = new T.Mesh(
        new T.CylinderGeometry(waist, hip * 1.15, 0.45 * scale, 16),
        matRobe,
      );
      kneeSkirt.scale.set(1.0, 1.0, 0.58);
      kneeSkirt.position.y = 0.72 * scale;
      group.add(kneeSkirt);

      // Heavy artisan leather apron / front flap
      const apronGeo = new T.BoxGeometry(0.32, 0.48 * scale, 0.02);
      const apron = new T.Mesh(apronGeo, matLeather);
      apron.position.set(0, 0.72 * scale, waist * 0.56);
      group.add(apron);

      // Sturdy double-buckle belt
      buildBelt(group, waist * 1.05, 0.98 * scale, matLeather, matTrim);
      break;
    }
    case 3: {
      // #3: Desert Cowl & Crossed Sash Traveler - Draped neck wrap, diagonal sash
      const midSkirt = new T.Mesh(
        new T.CylinderGeometry(waist, hip * 1.25, 0.65 * scale, 16),
        matRobe,
      );
      midSkirt.scale.set(1.0, 1.0, 0.58);
      midSkirt.position.y = 0.62 * scale;
      group.add(midSkirt);

      // Neck Cowl / Scarf resting on upper chest / shoulders below collar line
      const cowlGeo = new T.TorusGeometry(shoulder * 0.55, 0.055, 8, 20);
      const cowl = new T.Mesh(cowlGeo, matCoat);
      cowl.scale.set(1.0, 0.6, 1.0);
      cowl.position.set(0, 1.16 * scale, 0.04);
      cowl.rotation.x = Math.PI * 0.38;
      group.add(cowl);

      // Diagonal crossed shoulder sash
      const sashGeo = new T.BoxGeometry(0.12, 0.72 * scale, 0.02);
      const sash = new T.Mesh(sashGeo, matCoat);
      sash.position.set(0, 1.04 * scale, waist * 0.55);
      sash.rotation.z = 0.58;
      group.add(sash);
      break;
    }
    case 4: {
      // #4: Royal Stole & Ceremonial Robe - Gold embroidered stole, layered vestments
      const longSkirt = new T.Mesh(
        new T.CylinderGeometry(waist, hip * 1.4, 0.92 * scale, 18),
        matRobe,
      );
      longSkirt.scale.set(1.0, 1.0, 0.6);
      longSkirt.position.y = 0.48 * scale;
      group.add(longSkirt);

      // Broad embroidered Stole hanging from shoulders down front
      for (const side of [-1, 1]) {
        const stoleGeo = new T.BoxGeometry(0.14, 0.88 * scale, 0.025);
        const stole = new T.Mesh(stoleGeo, matTrim);
        stole.position.set(side * shoulder * 0.52, 0.85 * scale, waist * 0.58);
        group.add(stole);
      }

      // Royal Gold Collar on chest
      const collarGeo = new T.TorusGeometry(shoulder * 0.65, 0.035, 8, 24);
      const collar = new T.Mesh(collarGeo, matTrim);
      collar.scale.set(1.0, 0.55, 1.0);
      collar.position.set(0, 1.17 * scale, 0);
      collar.rotation.x = Math.PI * 0.4;
      group.add(collar);
      break;
    }
    case 5: {
      // #5: Asymmetric Draped Toga / Scholar Wrap - Draped over left shoulder only
      const scholarSkirt = new T.Mesh(
        new T.CylinderGeometry(waist, hip * 1.3, 0.82 * scale, 18),
        matRobe,
      );
      scholarSkirt.scale.set(1.0, 1.0, 0.58);
      scholarSkirt.position.y = 0.54 * scale;
      group.add(scholarSkirt);

      // Asymmetric drape over left shoulder (stays below neck Y = 1.18)
      const togaGeo = new T.CylinderGeometry(
        shoulder * 1.06,
        hip * 1.32,
        0.95 * scale,
        16,
        1,
        true,
        0.2,
        Math.PI * 1.1,
      );
      const toga = new T.Mesh(togaGeo, matCoat);
      toga.scale.set(1.02, 1.0, 0.56);
      toga.position.set(-0.06, 0.85 * scale, 0);
      toga.rotation.z = -0.15;
      group.add(toga);

      // Brooch / Clasp on shoulder
      const brooch = new T.Mesh(
        new T.CylinderGeometry(0.045, 0.045, 0.02, 10),
        matTrim,
      );
      brooch.position.set(-shoulder * 0.85, 1.18 * scale, 0.12);
      brooch.rotation.x = Math.PI / 2;
      group.add(brooch);
      break;
    }
    case 6: {
      // #6: Warrior Armor Gambeson - Cuirass, leather skirt pteruges, pauldrons
      const cuirassGeo = new T.CylinderGeometry(
        shoulder * 1.04,
        waist * 1.02,
        0.48 * scale,
        16,
      );
      const cuirass = new T.Mesh(cuirassGeo, matCoat);
      cuirass.scale.set(1.0, 1.0, 0.54);
      cuirass.position.y = 0.95 * scale;
      group.add(cuirass);

      // Leather pteruges (hanging armor strips)
      for (let i = 0; i < 10; i++) {
        const strip = new T.Mesh(
          new T.BoxGeometry(0.08, 0.38 * scale, 0.025),
          matLeather,
        );
        const a = (i / 10) * Math.PI * 2;
        strip.position.set(
          Math.sin(a) * waist * 1.06,
          0.65 * scale,
          Math.cos(a) * waist * 0.58,
        );
        strip.rotation.y = a;
        group.add(strip);
      }

      // Bronze Shoulder Pauldrons on shoulder edges
      for (const side of [-1, 1]) {
        const pauldron = new T.Mesh(
          new T.SphereGeometry(0.12, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
          matTrim,
        );
        pauldron.position.set(side * (shoulder + 0.04), 1.18 * scale, 0);
        group.add(pauldron);
      }
      break;
    }
    case 7: {
      // #7: Wilderness Hunter Tunic - Short agility tunic, quiver strap, arm bracers
      const shortTunic = new T.Mesh(
        new T.CylinderGeometry(waist, hip * 1.1, 0.42 * scale, 14),
        matRobe,
      );
      shortTunic.scale.set(1.0, 1.0, 0.56);
      shortTunic.position.y = 0.74 * scale;
      group.add(shortTunic);

      // Diagonal quiver chest strap
      const strapGeo = new T.BoxGeometry(0.075, 0.72 * scale, 0.02);
      const strap = new T.Mesh(strapGeo, matLeather);
      strap.position.set(0, 1.02 * scale, waist * 0.55);
      strap.rotation.z = -0.65;
      group.add(strap);
      break;
    }
    case 8: {
      // #8: Tiered Ceremonial Cloak - High standing collar, tiered double-hem
      const innerSkirt = new T.Mesh(
        new T.CylinderGeometry(waist, hip * 1.32, 0.88 * scale, 18),
        matRobe,
      );
      innerSkirt.scale.set(1.0, 1.0, 0.58);
      innerSkirt.position.y = 0.5 * scale;
      group.add(innerSkirt);

      // Tiered outer mantle
      const tier1 = new T.Mesh(
        new T.CylinderGeometry(
          shoulder * 1.08,
          hip * 1.25,
          0.62 * scale,
          18,
          1,
          true,
        ),
        matCoat,
      );
      tier1.scale.set(1.02, 1.0, 0.56);
      tier1.position.y = 0.92 * scale;
      group.add(tier1);

      // Standing High Collar at back of neck (open in front)
      const collar = new T.Mesh(
        new T.CylinderGeometry(
          shoulder * 0.48,
          shoulder * 0.44,
          0.14 * scale,
          16,
          1,
          true,
          Math.PI * 0.45,
          Math.PI * 1.1,
        ),
        matTrim,
      );
      collar.position.set(0, 1.22 * scale, -0.06);
      group.add(collar);
      break;
    }
  }
}

// ============================================================================
// FEMININE CAST REDESIGN: HAIRSTYLES, PROPORTIONS & GOWNS
// ============================================================================

function buildFemaleHairstyle(
  group: T.Group,
  styleId: number,
  r: number,
  matHair: T.Material,
  matTrim: T.Material,
) {
  // Soft feminine skull cap with natural curved hairline
  const baseCapGeo = new T.SphereGeometry(
    r * 1.03,
    18,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.58,
  );
  const baseCap = new T.Mesh(baseCapGeo, matHair);
  group.add(baseCap);

  switch (styleId) {
    case 1: {
      // Fem #1: Long Side Braid - Elegant thick braid draped over front shoulder with ribbon
      const sideCap = new T.Mesh(
        new T.SphereGeometry(
          r * 1.06,
          16,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.52,
        ),
        matHair,
      );
      group.add(sideCap);

      // The sweeping braid curve flowing from back of head over the right front shoulder
      const braidCurve = new T.CatmullRomCurve3([
        new T.Vector3(r * 0.35, r * 0.25, -r * 0.75),
        new T.Vector3(r * 0.65, -r * 0.15, -r * 0.45),
        new T.Vector3(r * 0.68, -r * 0.55, 0.05),
        new T.Vector3(r * 0.55, -r * 1.15, r * 0.35),
        new T.Vector3(r * 0.45, -r * 1.75, r * 0.42),
      ]);
      const braidGeo = new T.TubeGeometry(braidCurve, 24, r * 0.22, 8, false);
      const braid = new T.Mesh(braidGeo, matHair);
      group.add(braid);

      // Ribbon tie at braid end
      const ribbon = new T.Mesh(
        new T.TorusGeometry(r * 0.18, 0.025, 6, 16),
        matTrim,
      );
      ribbon.position.set(r * 0.45, -r * 1.72, r * 0.42);
      group.add(ribbon);
      break;
    }
    case 2: {
      // Fem #2: High Elegant Chignon / Bun - Sculpted topknot bun + soft face tendrils
      const bunGeo = new T.SphereGeometry(r * 0.42, 14, 14);
      bunGeo.scale(1.2, 0.85, 1.1);
      const bun = new T.Mesh(bunGeo, matHair);
      bun.position.set(0, r * 0.98, -r * 0.35);
      group.add(bun);

      // Ornamental hair pin / filigree ring
      const pin = new T.Mesh(
        new T.TorusGeometry(r * 0.35, 0.022, 6, 20),
        matTrim,
      );
      pin.position.set(0, r * 0.88, -r * 0.35);
      pin.rotation.x = Math.PI * 0.4;
      group.add(pin);

      // Soft curling tendrils framing the temples
      for (const side of [-1, 1]) {
        const tendrilCurve = new T.CatmullRomCurve3([
          new T.Vector3(side * r * 0.72, r * 0.25, r * 0.35),
          new T.Vector3(side * r * 0.82, -r * 0.15, r * 0.25),
          new T.Vector3(side * r * 0.75, -r * 0.48, r * 0.18),
        ]);
        group.add(
          new T.Mesh(
            new T.TubeGeometry(tendrilCurve, 10, 0.018, 6, false),
            matHair,
          ),
        );
      }
      break;
    }
    case 3: {
      // Fem #3: Reverent Draped Linen Veil / Shawl (Sariah Matriarch style)
      const veilGeo = new T.SphereGeometry(
        r * 1.14,
        20,
        18,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.65,
      );
      veilGeo.scale(1.04, 1.12, 1.06);
      const veil = new T.Mesh(veilGeo, matTrim);
      veil.position.set(0, 0.04, -0.02);
      group.add(veil);

      // Draped linen sides falling past shoulders
      const drapeGeo = new T.CylinderGeometry(
        r * 1.08,
        r * 1.45,
        0.68,
        18,
        1,
        true,
        0.7,
        Math.PI * 1.6,
      );
      const drape = new T.Mesh(drapeGeo, matTrim);
      drape.position.set(0, -0.28, -0.05);
      group.add(drape);
      break;
    }
    case 4: {
      // Fem #4: Flowing Shoulder Curls + Golden Diadem / Circlet
      const crownHair = new T.Mesh(
        new T.SphereGeometry(
          r * 1.1,
          16,
          14,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.58,
        ),
        matHair,
      );
      group.add(crownHair);

      // Cascading curls down back and over shoulders
      for (const side of [-1, 1]) {
        const curlCurve = new T.CatmullRomCurve3([
          new T.Vector3(side * r * 0.65, r * 0.35, -r * 0.2),
          new T.Vector3(side * r * 0.85, -r * 0.25, -r * 0.35),
          new T.Vector3(side * r * 0.78, -r * 0.85, -r * 0.25),
          new T.Vector3(side * r * 0.62, -r * 1.35, 0.05),
        ]);
        group.add(
          new T.Mesh(
            new T.TubeGeometry(curlCurve, 14, r * 0.18, 8, false),
            matHair,
          ),
        );
      }

      // Golden Diadem / Head Circlet
      const circlet = new T.Mesh(
        new T.TorusGeometry(r * 0.96, 0.016, 6, 28),
        matTrim,
      );
      circlet.position.set(0, r * 0.32, 0.02);
      circlet.rotation.x = Math.PI * 0.46;
      group.add(circlet);
      break;
    }
    case 5: {
      // Fem #5: Half-Up Crown Wrap - Practical desert working hair
      const topPuff = new T.Mesh(
        new T.SphereGeometry(r * 0.35, 10, 10),
        matHair,
      );
      topPuff.position.set(0, r * 0.75, -r * 0.45);
      group.add(topPuff);

      // Fabric wrap holding it
      const wrap = new T.Mesh(
        new T.TorusGeometry(r * 0.28, 0.022, 6, 16),
        matTrim,
      );
      wrap.position.set(0, r * 0.75, -r * 0.45);
      group.add(wrap);

      // Lower waves falling down back
      const backWaves = new T.Mesh(
        new T.CylinderGeometry(
          r * 0.7,
          r * 0.95,
          0.52,
          12,
          1,
          true,
          0,
          Math.PI,
        ),
        matHair,
      );
      backWaves.position.set(0, -0.22, -r * 0.55);
      backWaves.rotation.y = Math.PI * 0.5;
      group.add(backWaves);
      break;
    }
  }
}

function buildFemaleOutfit(
  group: T.Group,
  robeId: number,
  shoulder: number,
  waist: number,
  hip: number,
  scale: number,
  matRobe: T.Material,
  matCoat: T.Material,
  matTrim: T.Material,
  matLeather: T.Material,
) {
  // Graceful Feminine Torso (tapered waist, defined feminine silhouette, ends at Y = 1.18)
  const bodiceGeo = new T.CylinderGeometry(
    shoulder * 0.92,
    waist,
    0.48 * scale,
    18,
  );
  const bodice = new T.Mesh(bodiceGeo, matRobe);
  bodice.scale.set(1.0, 1.0, 0.52);
  bodice.position.y = 0.94 * scale;
  group.add(bodice);

  // Subtle feminine bust contour
  for (const side of [-1, 1]) {
    const bust = new T.Mesh(
      new T.SphereGeometry(shoulder * 0.32, 12, 10),
      matRobe,
    );
    bust.scale.set(0.9, 0.85, 0.7);
    bust.position.set(side * shoulder * 0.36, 1.06 * scale, waist * 0.52);
    group.add(bust);
  }

  // Graceful Floor/Ankle Gown (flaring outward gracefully)
  const gownGeo = new T.CylinderGeometry(waist, hip * 1.55, 0.98 * scale, 20);
  const gown = new T.Mesh(gownGeo, matRobe);
  gown.scale.set(1.0, 1.0, 0.6);
  gown.position.y = 0.48 * scale;
  group.add(gown);

  // Decorative high-waist sash / empire band
  const sashWrap = new T.Group();
  sashWrap.scale.set(1.0, 1.0, 0.54);
  group.add(sashWrap);

  const sashGeo = new T.TorusGeometry(waist * 1.05, 0.032, 8, 28);
  const sash = new T.Mesh(sashGeo, matTrim);
  sash.position.set(0, 0.98 * scale, 0);
  sash.rotation.x = Math.PI / 2;
  sashWrap.add(sash);

  switch (robeId) {
    case 1: {
      // High-Waisted Empire Gown with embroidered hem
      const hemBorder = new T.Mesh(
        new T.TorusGeometry(hip * 1.54, 0.024, 6, 32),
        matTrim,
      );
      hemBorder.position.set(0, 0.04 * scale, 0);
      hemBorder.rotation.x = Math.PI / 2;
      group.add(hemBorder);
      break;
    }
    case 2:
    case 3: {
      // Layered Matriarch Draped Shawl & Mantle
      const shawlGeo = new T.CylinderGeometry(
        shoulder * 1.12,
        hip * 1.42,
        1.05 * scale,
        18,
        1,
        true,
        0.7,
        Math.PI * 1.6,
      );
      const shawl = new T.Mesh(shawlGeo, matCoat);
      shawl.scale.set(1.02, 1.0, 0.54);
      shawl.position.set(0, 0.75 * scale, 0);
      group.add(shawl);
      break;
    }
    case 4: {
      // Noble Regal Gown with Long Draped Sleeves & Gold Collar
      const nobleCollar = new T.Mesh(
        new T.TorusGeometry(shoulder * 0.65, 0.032, 8, 24),
        matTrim,
      );
      nobleCollar.scale.set(1.0, 0.55, 1.0);
      nobleCollar.position.set(0, 1.18 * scale, 0);
      nobleCollar.rotation.x = Math.PI * 0.4;
      group.add(nobleCollar);
      break;
    }
    case 5: {
      // Practical Working Dress with Waist Apron & Pouch
      const apronGeo = new T.BoxGeometry(0.28, 0.55 * scale, 0.02);
      const apron = new T.Mesh(apronGeo, matCoat);
      apron.position.set(0, 0.65 * scale, waist * 0.56);
      group.add(apron);
      break;
    }
  }
}

function buildBelt(
  group: T.Group,
  r: number,
  y: number,
  matLeather: T.Material,
  matTrim: T.Material,
) {
  const beltWrap = new T.Group();
  beltWrap.scale.set(1.0, 1.0, 0.54);
  group.add(beltWrap);

  const belt = new T.Mesh(new T.TorusGeometry(r, 0.028, 8, 28), matLeather);
  belt.position.y = y;
  belt.rotation.x = Math.PI / 2;
  beltWrap.add(belt);

  // Brass/gold buckle
  const buckle = new T.Mesh(new T.BoxGeometry(0.08, 0.065, 0.025), matTrim);
  buckle.position.set(0, y, r * 0.98);
  beltWrap.add(buckle);
}

// ============================================================================
// CATALOG DATA: 12 HAIRSTYLES, BEARDS, ROBES, FACES, BODY SHAPES, FEMININE CAST
// ============================================================================

export const VARIETY_CATALOG: VarietyCardConfig[] = [
  // --- SECTION 1: 12 DISTINCT HAIRSTYLES ---
  {
    id: "hair-1",
    category: "hair",
    number: 1,
    title: "Hairstyle #1: Classic Short Crop",
    subtitle: "Clean tapered sides · neat forward texture",
    description:
      "Ancient neat crop with side-tapered edges and subtle forward fringe texture. Versatile for scouts, craftsmen, and citizens.",
    gender: "male",
    hairStyleId: 1,
    beardStyleId: 1,
    robeStyleId: 0,
  },
  {
    id: "hair-2",
    category: "hair",
    number: 2,
    title: "Hairstyle #2: Side-Parted Sleek",
    subtitle: "Chiseled left part · swept crown",
    description:
      "Refined young profile with a defined left parting notch and sleek side-sweep. Ideal for Nephi, young leaders, or scholars.",
    gender: "male",
    hairStyleId: 2,
    beardStyleId: 1,
    robeStyleId: 0,
  },
  {
    id: "hair-3",
    category: "hair",
    number: 3,
    title: "Hairstyle #3: Textured Brush-Up",
    subtitle: "Upward front volume · dynamic lift",
    description:
      "Lifted pompadour silhouette adding height and dynamic athletic silhouette. Great for energetic warriors and captains.",
    gender: "male",
    hairStyleId: 3,
    beardStyleId: 1,
    robeStyleId: 0,
  },
  {
    id: "hair-4",
    category: "hair",
    number: 4,
    title: "Hairstyle #4: Shoulder-Length Flow",
    subtitle: "Natural waves reaching collar",
    description:
      "Medium-length wavy hair flowing naturally behind the ears down to the tunic collar. Suitable for messengers and nomads.",
    gender: "male",
    hairStyleId: 4,
    beardStyleId: 1,
    robeStyleId: 0,
  },
  {
    id: "hair-5",
    category: "hair",
    number: 5,
    title: "Hairstyle #5: Desert Nomad Wavy Locks",
    subtitle: "Full wavy crown + wrapped leather headband",
    description:
      "Thick natural waves bound by a wrapped leather headband with tied cords at back. Perfect for wilderness travelers and Lehi's family.",
    gender: "male",
    hairStyleId: 5,
    beardStyleId: 1,
    robeStyleId: 0,
  },
  {
    id: "hair-6",
    category: "hair",
    number: 6,
    title: "Hairstyle #6: Military Buzz / Close Fade",
    subtitle: "Close skull fade · disciplined guard crop",
    description:
      "Minimalist cropped buzz keeping hair close to the skull. Ideal for disciplined city guards, sentinels, and garrison soldiers.",
    gender: "male",
    hairStyleId: 6,
    beardStyleId: 1,
    robeStyleId: 0,
  },
  {
    id: "hair-7",
    category: "hair",
    number: 7,
    title: "Hairstyle #7: Receding Crown (Patriarch)",
    subtitle: "Thinning forehead + temple fringe",
    description:
      "Mature graying crown with bare forehead and soft temple/neck fringes. Dignified appearance for elder patriarchs and wise record keepers.",
    gender: "male",
    hairStyleId: 7,
    hairColor: PALETTES.hair.silverGray,
    beardStyleId: 6,
    robeStyleId: 0,
  },
  {
    id: "hair-8",
    category: "hair",
    number: 8,
    title: "Hairstyle #8: Warrior Topknot / High Knot",
    subtitle: "Pulled-back knot with decorative cord",
    description:
      "Hair tied high on the crown in a compact knot bound with cord, keeping vision clear for archery and combat.",
    gender: "male",
    hairStyleId: 8,
    beardStyleId: 1,
    robeStyleId: 0,
  },
  {
    id: "hair-9",
    category: "hair",
    number: 9,
    title: "Hairstyle #9: Long Cascading Waves",
    subtitle: "Full volume falling past shoulders",
    description:
      "Long flowing waves cascading over the upper back and chest. Traditional Near-Eastern masculine hair worn by prophets and elders.",
    gender: "male",
    hairStyleId: 9,
    beardStyleId: 3,
    robeStyleId: 0,
  },
  {
    id: "hair-10",
    category: "hair",
    number: 10,
    title: "Hairstyle #10: Ancient Braided Plaits",
    subtitle: "Parallel layered cornrows / plaits",
    description:
      "Authentic Near-Eastern braided plaits along the crown and sides. Rich cultural visual distinction for travelers and chieftains.",
    gender: "male",
    hairStyleId: 10,
    beardStyleId: 4,
    robeStyleId: 0,
  },
  {
    id: "hair-11",
    category: "hair",
    number: 11,
    title: "Hairstyle #11: Tight Curly Texture",
    subtitle: "High density rounded coil volume",
    description:
      "Natural curly coil texture with full rounded crown volume. Great diversity of hair texture across different peoples and families.",
    gender: "male",
    hairStyleId: 11,
    beardStyleId: 2,
    robeStyleId: 0,
  },
  {
    id: "hair-12",
    category: "hair",
    number: 12,
    title: "Hairstyle #12: Desert Linen Turban / Headwrap",
    subtitle: "Wound fabric wrap with neck drape",
    description:
      "Folded linen desert wrap protecting against scorching sun and wind, with a hanging tail cloth. Essential wilderness variety.",
    gender: "male",
    hairStyleId: 12,
    beardStyleId: 3,
    robeStyleId: 0,
  },

  // --- SECTION 2: 8 BEARD STYLES ---
  {
    id: "beard-1",
    category: "beard",
    number: 1,
    title: "Beard #1: Clean Shaven",
    subtitle: "Smooth chiseled youthful jaw",
    description:
      "Youthful bare chin and jawline, showing clean sculpted contours. Ideal for young men, youths, and clean-cut citizens.",
    gender: "male",
    hairStyleId: 2,
    beardStyleId: 1,
    robeStyleId: 0,
  },
  {
    id: "beard-2",
    category: "beard",
    number: 2,
    title: "Beard #2: Rugged Stubble / Scruff",
    subtitle: "5 o'clock shadow along jawline",
    description:
      "Rugged stippled stubble shading the jaw and upper lip. Conveys hard travel through the wilderness and days on the trail.",
    gender: "male",
    hairStyleId: 3,
    beardStyleId: 2,
    robeStyleId: 0,
  },
  {
    id: "beard-3",
    category: "beard",
    number: 3,
    title: "Beard #3: Short Boxed Beard",
    subtitle: "Neat trimmed square jawline",
    description:
      "Carefully groomed short beard with clean cheek borders and neat mustache. Dignified mature look for commanders and priests.",
    gender: "male",
    hairStyleId: 1,
    beardStyleId: 3,
    robeStyleId: 0,
  },
  {
    id: "beard-4",
    category: "beard",
    number: 4,
    title: "Beard #4: Pointed Goatee & Mustache",
    subtitle: "Chiseled tapered chin beard",
    description:
      "Distinctive tapered chin goatee paired with a curved mustache. Gives an intellectual, sharp silhouette to scribes and judges.",
    gender: "male",
    hairStyleId: 2,
    beardStyleId: 4,
    robeStyleId: 0,
  },
  {
    id: "beard-5",
    category: "beard",
    number: 5,
    title: "Beard #5: Squared Royal Beard",
    subtitle: "Block beard with fluted horizontal bands",
    description:
      "Ancient royal sculpted block beard with horizontal corded bands. Imparts regal authority for rulers, kings, and nobles.",
    gender: "male",
    hairStyleId: 10,
    beardStyleId: 5,
    robeStyleId: 0,
  },
  {
    id: "beard-6",
    category: "beard",
    number: 6,
    title: "Beard #6: Full Flowing Patriarch Beard",
    subtitle: "Long chest-length wavy beard",
    description:
      "Grand full-length patriarch beard flowing down over the chest. The hallmark of revered ancient prophets (Lehi, Mormon).",
    gender: "male",
    hairStyleId: 7,
    hairColor: PALETTES.hair.patriarchWhite,
    beardStyleId: 6,
    robeStyleId: 0,
  },
  {
    id: "beard-7",
    category: "beard",
    number: 7,
    title: "Beard #7: Forked Dual-Pointed Beard",
    subtitle: "Warrior double-tapered chin beard",
    description:
      "Fierce dual-tapered forked beard. Adds great personality to frontier captains and battle-tested veterans.",
    gender: "male",
    hairStyleId: 8,
    beardStyleId: 7,
    robeStyleId: 0,
  },
  {
    id: "beard-8",
    category: "beard",
    number: 8,
    title: "Beard #8: Sideburns / Mutton Chops",
    subtitle: "Sculpted jawline burns + clean chin",
    description:
      "Full sideburns running down the cheeks and connecting along the jawline with a clean-shaven chin center.",
    gender: "male",
    hairStyleId: 4,
    beardStyleId: 8,
    robeStyleId: 0,
  },

  // --- SECTION 3: 8 ROBE & OUTFIT CUTS ---
  {
    id: "robe-1",
    category: "robe",
    number: 1,
    title: "Robe #1: Classic Patriarch Robe + Mantle",
    subtitle: "Ankle-length gown + draped open cape",
    description:
      "Full-length flowing tunic with a wide open draped mantle over the shoulders and a leather waist sash. Reverent and graceful.",
    gender: "male",
    hairStyleId: 7,
    beardStyleId: 6,
    robeStyleId: 1,
    robeColor: PALETTES.fabrics.parchment,
    coatColor: PALETTES.fabrics.deepIndigo,
  },
  {
    id: "robe-2",
    category: "robe",
    number: 2,
    title: "Robe #2: Artisan Work Tunic",
    subtitle: "Knee-length tunic · apron · rolled sleeves",
    description:
      "Practical knee-length work tunic with rolled elbow sleeves, heavy leather apron, and double-buckle tool belt. Built for work.",
    gender: "male",
    hairStyleId: 1,
    beardStyleId: 2,
    robeStyleId: 2,
    robeColor: PALETTES.fabrics.desertSand,
    coatColor: PALETTES.fabrics.leatherBrown,
  },
  {
    id: "robe-3",
    category: "robe",
    number: 3,
    title: "Robe #3: Desert Cowl & Crossed Sash",
    subtitle: "Traveler cowl scarf · diagonal band",
    description:
      "Linen desert cowl protecting neck and throat, paired with a diagonal crossed chest sash and layered wilderness wrap.",
    gender: "male",
    hairStyleId: 5,
    beardStyleId: 2,
    robeStyleId: 3,
    robeColor: PALETTES.fabrics.naturalLinen,
    coatColor: PALETTES.fabrics.terracotta,
  },
  {
    id: "robe-4",
    category: "robe",
    number: 4,
    title: "Robe #4: Royal Stole & Ceremonial Robe",
    subtitle: "Gold embroidered stole + gold collar",
    description:
      "Opulent ceremonial vestment featuring two broad gold-embroidered stoles hanging down the front with a golden torque collar.",
    gender: "male",
    hairStyleId: 2,
    beardStyleId: 3,
    robeStyleId: 4,
    robeColor: PALETTES.fabrics.royalPlum,
    coatColor: PALETTES.fabrics.goldTrim,
  },
  {
    id: "robe-5",
    category: "robe",
    number: 5,
    title: "Robe #5: Asymmetric One-Shoulder Toga",
    subtitle: "Classical judge wrap with shoulder brooch",
    description:
      "Draped diagonally over the left shoulder and pinned with a circular bronze brooch. Ideal for judges, scholars, and statesmen.",
    gender: "male",
    hairStyleId: 4,
    beardStyleId: 4,
    robeStyleId: 5,
    robeColor: PALETTES.fabrics.naturalLinen,
    coatColor: PALETTES.fabrics.forestSage,
  },
  {
    id: "robe-6",
    category: "robe",
    number: 6,
    title: "Robe #6: Warrior Armor Gambeson",
    subtitle: "Cuirass · leather pteruges · pauldrons",
    description:
      "Bronze breastplate cuirass, leather skirt strips (pteruges), and curved shoulder pauldrons. Battle-ready military silhouette.",
    gender: "male",
    hairStyleId: 6,
    beardStyleId: 1,
    robeStyleId: 6,
    robeColor: PALETTES.fabrics.charcoal,
    coatColor: PALETTES.fabrics.terracotta,
  },
  {
    id: "robe-7",
    category: "robe",
    number: 7,
    title: "Robe #7: Wilderness Scout Tunic",
    subtitle: "Short agile tunic · quiver chest strap",
    description:
      "Short lightweight tunic allowing fast running and climbing, equipped with a cross-body quiver harness and wrist bracers.",
    gender: "male",
    hairStyleId: 8,
    beardStyleId: 2,
    robeStyleId: 7,
    robeColor: PALETTES.fabrics.forestSage,
    coatColor: PALETTES.fabrics.leatherBrown,
  },
  {
    id: "robe-8",
    category: "robe",
    number: 8,
    title: "Robe #8: Tiered Ceremonial Cloak",
    subtitle: "High standing collar · tiered drapery",
    description:
      "Formal tiered ceremonial vestment with a standing stiff collar and overlapping outer mantle tiers. Worn in the temple court.",
    gender: "male",
    hairStyleId: 2,
    beardStyleId: 3,
    robeStyleId: 8,
    robeColor: PALETTES.fabrics.parchment,
    coatColor: PALETTES.fabrics.deepIndigo,
  },

  // --- SECTION 4: FEMININE CAST REDESIGN (FIXING THE GIRLS!) ---
  {
    id: "fem-1",
    category: "feminine",
    number: 1,
    title: "Feminine #1: Graceful Braided Maiden",
    subtitle: "Slender shoulders · defined waist · long side-braid with ribbon",
    description:
      "Redesigned feminine silhouette: narrow sloping shoulders (0.29m vs 0.39m male), tapered waist, long braided hair draped over front shoulder with ribbon tie, delicate jawline and soft eyes.",
    gender: "female",
    hairStyleId: 1,
    hairColor: PALETTES.hair.warmBrown,
    beardStyleId: 1,
    robeStyleId: 1,
    robeColor: PALETTES.fabrics.feminineSkyLinen,
    coatColor: PALETTES.fabrics.feminineRoseLinen,
    noseProfile: "delicate",
    browProfile: "arched",
  },
  {
    id: "fem-2",
    category: "feminine",
    number: 2,
    title: "Feminine #2: Elegant High Chignon",
    subtitle: "High sculpted bun · soft temple tendrils · empire gown",
    description:
      "Sophisticated feminine updo: hair gathered atop crown with ornamental pin and soft tendrils framing delicate cheekbones. Flowing high-waist gown with decorative sash.",
    gender: "female",
    hairStyleId: 2,
    hairColor: PALETTES.hair.darkChestnut,
    beardStyleId: 1,
    robeStyleId: 2,
    robeColor: PALETTES.fabrics.feminineLilacLinen,
    coatColor: PALETTES.fabrics.feminineRoseLinen,
    noseProfile: "delicate",
    browProfile: "arched",
  },
  {
    id: "fem-3",
    category: "feminine",
    number: 3,
    title: "Feminine #3: Reverent Draped Veil (Matriarch)",
    subtitle: "Graceful linen shawl framing soft face · gold trim",
    description:
      "The beloved Sariah benchmark: beautifully draped linen head-covering that frames the face in soft folds, flowing down over the shoulders. Reverent, modest, and undeniably feminine.",
    gender: "female",
    hairStyleId: 3,
    hairColor: PALETTES.hair.silverGray,
    beardStyleId: 1,
    robeStyleId: 3,
    robeColor: PALETTES.fabrics.parchment,
    coatColor: PALETTES.fabrics.feminineSkyLinen,
    trimColor: PALETTES.fabrics.goldTrim,
    noseProfile: "delicate",
    browProfile: "gentle",
  },
  {
    id: "fem-4",
    category: "feminine",
    number: 4,
    title: "Feminine #4: Flowing Curls & Golden Diadem",
    subtitle: "Cascading shoulder waves · golden circlet · noble dress",
    description:
      "Noblewoman / bride silhouette: long soft waves flowing down past shoulders, adorned with a delicate golden forehead circlet. Floor-length layered gown with gold collar.",
    gender: "female",
    hairStyleId: 4,
    hairColor: PALETTES.hair.auburn,
    beardStyleId: 1,
    robeStyleId: 4,
    robeColor: PALETTES.fabrics.feminineGoldLinen,
    coatColor: PALETTES.fabrics.royalPlum,
    trimColor: PALETTES.fabrics.goldTrim,
    noseProfile: "delicate",
    browProfile: "arched",
  },
  {
    id: "fem-5",
    category: "feminine",
    number: 5,
    title: "Feminine #5: Desert Nomad Young Woman",
    subtitle: "Half-up crown wrap · working linen dress · waist apron",
    description:
      "Young woman on the journey: practical gathered half-up hair with linen tie, slim athletic feminine build, working linen dress with waist sash and pouch.",
    gender: "female",
    hairStyleId: 5,
    hairColor: PALETTES.hair.darkChestnut,
    beardStyleId: 1,
    robeStyleId: 5,
    robeColor: PALETTES.fabrics.naturalLinen,
    coatColor: PALETTES.fabrics.forestSage,
    noseProfile: "button",
    browProfile: "gentle",
  },

  // --- SECTION 5: BENCHMARK COMPARISONS (BEFORE VS AFTER) ---
  {
    id: "comp-sariah",
    category: "comparison",
    title: "Benchmark: In-Game Sariah (Approved)",
    subtitle: "Current in-game matriarch · admired reference",
    description:
      "Rendered directly using the current in-game `createCharacter('sariah')` model. The user noted: 'The only girl who looks good is Sariah.' Her draped shawl and ankle robe set the standard.",
    gender: "female",
    hairStyleId: 3,
    beardStyleId: 1,
    robeStyleId: 3,
    useGameActorRole: "sariah",
  },
  {
    id: "comp-maidservant",
    category: "comparison",
    title: "Before: In-Game Maidservant (Needs Help)",
    subtitle: "Current in-game maidservant · boxy masculine silhouette",
    description:
      "Rendered directly using `createCharacter('maidservant')`. Shows the problem: male wave hair cap, wide boxy shoulders, masculine torso and tunic cut.",
    gender: "female",
    hairStyleId: 1,
    beardStyleId: 1,
    robeStyleId: 1,
    useGameActorRole: "maidservant",
  },
  {
    id: "comp-redesign",
    category: "comparison",
    title: "After: Redesigned Maidservant / Young Maiden",
    subtitle: "Graceful feminine proportions · chignon bun · tailored waist",
    description:
      "The proposed replacement: slender feminine shoulders, defined waist, high chignon with falling temple curls, and a graceful feminine bodice and gown.",
    gender: "female",
    hairStyleId: 2,
    hairColor: PALETTES.hair.darkChestnut,
    beardStyleId: 1,
    robeStyleId: 5,
    robeColor: PALETTES.fabrics.naturalLinen,
    coatColor: PALETTES.fabrics.terracotta,
    noseProfile: "delicate",
    browProfile: "arched",
  },

  // --- SECTION 6: BODY BUILDS & HEIGHTS ---
  {
    id: "body-1",
    category: "body",
    number: 1,
    title: "Build #1: Athletic Hero / Warrior",
    subtitle: "1.78m height · 1.0x build · balanced warrior",
    description:
      "Standard athletic proportions with broad shoulders and strong posture. The baseline hero build for Nephi, Moroni, and leaders.",
    gender: "male",
    hairStyleId: 2,
    beardStyleId: 1,
    robeStyleId: 1,
    heightScale: 1.0,
    widthScale: 1.0,
    shoulderWidth: 0.39,
  },
  {
    id: "body-2",
    category: "body",
    number: 2,
    title: "Build #2: Tall & Lean Scout / Runner",
    subtitle: "1.92m height · 0.88x width · long stride",
    description:
      "Elongated silhouette with longer limbs and narrow waist. Ideal for warning runners, scouts, and fast messengers.",
    gender: "male",
    hairStyleId: 1,
    beardStyleId: 2,
    robeStyleId: 7,
    heightScale: 1.12,
    widthScale: 0.88,
    shoulderWidth: 0.35,
    waistWidth: 0.25,
  },
  {
    id: "body-3",
    category: "body",
    number: 3,
    title: "Build #3: Broad Stocky Artisan / Builder",
    subtitle: "1.66m height · 1.25x chest · sturdy power",
    description:
      "Shorter, heavily muscled frame with wide shoulders, thick chest, and powerful stance. Perfect for stonemasons, shipbuilders, and blacksmiths.",
    gender: "male",
    hairStyleId: 5,
    beardStyleId: 3,
    robeStyleId: 2,
    heightScale: 0.92,
    widthScale: 1.25,
    shoulderWidth: 0.46,
    waistWidth: 0.36,
  },
  {
    id: "body-4",
    category: "body",
    number: 4,
    title: "Build #4: Slender Youth / Adolescent",
    subtitle: "1.50m height · 0.78x scale · young profile",
    description:
      "Smaller stature with narrower shoulders, youthful face, and agile stance. Fits younger brothers, sons, and youthful companions.",
    gender: "male",
    hairStyleId: 1,
    beardStyleId: 1,
    robeStyleId: 2,
    heightScale: 0.82,
    widthScale: 0.78,
    shoulderWidth: 0.28,
    waistWidth: 0.22,
    noseProfile: "button",
    browProfile: "gentle",
  },
];

// ============================================================================
// RUNTIME CONTROLLER, SCISSOR RENDERER & INTERACTIVE CARD SYSTEM
// ============================================================================

interface CardItem {
  cfg: VarietyCardConfig;
  article: HTMLElement;
  viewContainer: HTMLElement;
  pickBtn: HTMLElement;
  scene: T.Scene;
  camera: T.PerspectiveCamera;
  modelGroup: T.Group;
  gameActor?: ReturnType<typeof createCharacter>;
  yaw: number;
  pitch: number;
  zoom: number;
  targetY: number;
  headTargetY: number;
  fullTargetY: number;
  isHeadView: boolean;
  defaultZoom: number;
}

// Global state
let activeCategory = "all";
let isSpinning = true;
let isPlaying = true;
let animTime = 0;
let disposed = false;
let queued = false;
let lastCanvasWidth = 0;
let lastCanvasHeight = 0;

// User's chosen favorites
const selectedPicks = new Map<string, string>();

// DOM Elements
const gridCanvas = document.getElementById("grid-canvas") as HTMLCanvasElement;
const gridContainer = document.getElementById("grid") as HTMLElement;
const selectionsList = document.getElementById(
  "selections-list",
) as HTMLElement;
const selectionsDrawer = document.getElementById(
  "selections-drawer",
) as HTMLElement;
const copyPicksBtn = document.getElementById(
  "copy-picks-btn",
) as HTMLButtonElement;
const searchInput = document.getElementById("search-input") as HTMLInputElement;

// WebGL Renderer Setup
const gridRenderer = new T.WebGLRenderer({
  canvas: gridCanvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
gridRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
gridRenderer.toneMapping = T.ACESFilmicToneMapping;
gridRenderer.toneMappingExposure = 1.05;
gridRenderer.setScissorTest(true);

// Environment
const pmremGenerator = new T.PMREMGenerator(gridRenderer);
const roomEnvironment = new RoomEnvironment();
const envTexture = pmremGenerator.fromScene(roomEnvironment).texture;
roomEnvironment.dispose();
pmremGenerator.dispose();

const cards: CardItem[] = [];

// Base card builder
function createCardItem(cfg: VarietyCardConfig): CardItem {
  const article = document.createElement("article");
  article.className = "variety-card";
  article.dataset.category = cfg.category;
  article.dataset.id = cfg.id;

  // Header
  const header = document.createElement("div");
  header.className = "card-header";

  const titleGroup = document.createElement("div");
  titleGroup.className = "card-title-group";

  const metaRow = document.createElement("div");
  metaRow.className = "card-meta-row";

  if (cfg.number) {
    const numBadge = document.createElement("span");
    numBadge.className = "badge badge-number";
    numBadge.textContent = `#${cfg.number}`;
    metaRow.append(numBadge);
  }

  const catBadge = document.createElement("span");
  catBadge.className = "badge";
  catBadge.textContent = cfg.category.toUpperCase();
  metaRow.append(catBadge);

  const title = document.createElement("h2");
  title.textContent = cfg.title;

  const subtitle = document.createElement("div");
  subtitle.className = "card-subtitle";
  subtitle.textContent = cfg.subtitle;

  titleGroup.append(metaRow, title, subtitle);

  // Pick / Select Star Button
  const pickBtn = document.createElement("button");
  pickBtn.className = "btn-pick";
  pickBtn.title = "Add to your selection list";
  pickBtn.innerHTML = `<span>★</span> Pick`;

  header.append(titleGroup, pickBtn);

  // Viewport
  const viewContainer = document.createElement("div");
  viewContainer.className = "view-container";

  const hints = document.createElement("div");
  hints.className = "view-hints";
  hints.innerHTML = `<span>Drag to rotate · Scroll zoom</span>`;

  const isBeard = cfg.category === "beard";
  const isHeadFocus = cfg.category === "hair" || isBeard;
  const heightScale = cfg.heightScale ?? (cfg.gender === "female" ? 0.94 : 1.0);
  const headTargetY =
    (cfg.useGameActorRole ? 1.48 : isBeard ? 1.36 : 1.45) * heightScale;
  const fullTargetY = cfg.category === "feminine" ? 1.02 : 0.88;
  const initialTargetY = isHeadFocus ? headTargetY : fullTargetY;
  const defaultZoom = isBeard
    ? 1.15
    : isHeadFocus
      ? 1.32
      : cfg.category === "feminine"
        ? 2.3
        : 3.1;
  const initialPitch = isBeard ? -0.02 : isHeadFocus ? 0.02 : 0.05;
  const focusLabel = isBeard ? "🔍 Beard View" : "🔍 Head View";

  const overlay = document.createElement("div");
  overlay.className = "view-controls-overlay";

  const viewBtn = document.createElement("button");
  viewBtn.className = "view-btn";
  viewBtn.textContent = isHeadFocus ? "🧍 Full Body" : focusLabel;
  viewBtn.title = "Toggle camera view";

  const resetBtn = document.createElement("button");
  resetBtn.className = "view-btn";
  resetBtn.textContent = "↺ Reset";
  resetBtn.title = "Reset camera";
  overlay.append(viewBtn, resetBtn);

  viewContainer.append(hints, overlay);

  // Content / Description
  const content = document.createElement("div");
  content.className = "card-content";
  const desc = document.createElement("p");
  desc.className = "card-description";
  desc.textContent = cfg.description;
  content.append(desc);

  article.append(header, viewContainer, content);
  gridContainer.append(article);

  // Scene & Lighting
  const scene = new T.Scene();
  scene.environment = envTexture;
  scene.environmentIntensity = 0.45;

  const hemiLight = new T.HemisphereLight(0xfff8ea, 0x6e786b, 1.3);
  const dirLight = new T.DirectionalLight(0xfff2dc, 2.8);
  dirLight.position.set(-2.5, 4.5, 4.5);
  scene.add(hemiLight, dirLight);

  // Ground shadow disc for grounding
  const groundDisc = new T.Mesh(
    new T.CircleGeometry(0.55, 24),
    new T.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
    }),
  );
  groundDisc.rotation.x = -Math.PI / 2;
  groundDisc.position.y = 0.005;
  scene.add(groundDisc);

  // Model creation
  let modelGroup: T.Group;
  let gameActor: ReturnType<typeof createCharacter> | undefined;

  if (cfg.useGameActorRole) {
    gameActor = createCharacter(cfg.useGameActorRole, { quality: "hero" });
    modelGroup = gameActor.group;
    scene.add(modelGroup);
  } else {
    modelGroup = buildVarietyMannequin(cfg);
    scene.add(modelGroup);
  }

  // Camera
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 20);
  camera.position.set(0, initialTargetY + 0.1, defaultZoom);
  camera.lookAt(0, initialTargetY, 0);

  const cardItem: CardItem = {
    cfg,
    article,
    viewContainer,
    pickBtn,
    scene,
    camera,
    modelGroup,
    gameActor,
    yaw: 0.15,
    pitch: initialPitch,
    zoom: defaultZoom,
    targetY: initialTargetY,
    headTargetY,
    fullTargetY,
    isHeadView: isHeadFocus,
    defaultZoom,
  };

  viewBtn.onclick = (e) => {
    e.stopPropagation();
    cardItem.isHeadView = !cardItem.isHeadView;
    cardItem.targetY = cardItem.isHeadView
      ? cardItem.headTargetY
      : cardItem.fullTargetY;
    cardItem.zoom = cardItem.isHeadView
      ? defaultZoom
      : cfg.category === "feminine"
        ? 2.3
        : 3.1;
    cardItem.pitch = cardItem.isHeadView ? initialPitch : 0.05;
    viewBtn.textContent = cardItem.isHeadView ? "🧍 Full Body" : focusLabel;
    requestRender();
  };

  // Orbital drag interactions
  let dragStart: {
    x: number;
    y: number;
    startYaw: number;
    startPitch: number;
  } | null = null;
  viewContainer.onpointerdown = (e) => {
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      startYaw: cardItem.yaw,
      startPitch: cardItem.pitch,
    };
    viewContainer.setPointerCapture(e.pointerId);
  };

  viewContainer.onpointermove = (e) => {
    if (!dragStart) return;
    const deltaX = (e.clientX - dragStart.x) * 0.012;
    const deltaY = (e.clientY - dragStart.y) * 0.008;
    cardItem.yaw = dragStart.startYaw + deltaX;
    cardItem.pitch = Math.max(
      -0.75,
      Math.min(0.75, dragStart.startPitch - deltaY),
    );
    requestRender();
  };

  viewContainer.onpointerup = viewContainer.onpointercancel = () => {
    dragStart = null;
  };

  viewContainer.onwheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.003;
    cardItem.zoom = Math.max(0.7, Math.min(5.5, cardItem.zoom + zoomDelta));
    requestRender();
  };

  resetBtn.onclick = (e) => {
    e.stopPropagation();
    cardItem.yaw = 0.15;
    cardItem.pitch = initialPitch;
    cardItem.zoom = defaultZoom;
    cardItem.targetY = initialTargetY;
    cardItem.isHeadView = isHeadFocus;
    viewBtn.textContent = isHeadFocus ? "🧍 Full Body" : focusLabel;
    requestRender();
  };

  // Pick Toggle
  pickBtn.onclick = (e) => {
    e.stopPropagation();
    togglePick(cfg);
  };

  return cardItem;
}

// User selection management
function togglePick(cfg: VarietyCardConfig) {
  const key = cfg.id;
  const label = cfg.number
    ? `${cfg.category.toUpperCase()} #${cfg.number}: ${cfg.title.split(":")[1]?.trim() || cfg.title}`
    : cfg.title;

  if (selectedPicks.has(key)) {
    selectedPicks.delete(key);
  } else {
    selectedPicks.set(key, label);
  }
  updateSelectionsUI();
}

function updateSelectionsUI() {
  selectionsList.innerHTML = "";
  cards.forEach((c) => {
    const isPicked = selectedPicks.has(c.cfg.id);
    c.pickBtn.classList.toggle("picked", isPicked);
    c.pickBtn.innerHTML = isPicked
      ? `<span>★</span> Selected`
      : `<span>★</span> Pick`;
  });

  if (selectedPicks.size === 0) {
    selectionsDrawer.classList.remove("visible");
    return;
  }

  selectionsDrawer.classList.add("visible");
  selectedPicks.forEach((label, id) => {
    const pill = document.createElement("span");
    pill.className = "pick-pill";
    pill.innerHTML = `<span>${label}</span> <button class="btn-remove" title="Remove">✕</button>`;
    pill.querySelector(".btn-remove")!.addEventListener("click", () => {
      selectedPicks.delete(id);
      updateSelectionsUI();
    });
    selectionsList.append(pill);
  });
}

// Copy Selections to Clipboard
if (copyPicksBtn) {
  copyPicksBtn.onclick = () => {
    const items = Array.from(selectedPicks.values());
    if (items.length === 0) return;
    const text =
      `Chosen Style Selections:\n` + items.map((it) => `- ${it}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      const origText = copyPicksBtn.textContent;
      copyPicksBtn.textContent = "✓ Copied to Clipboard!";
      setTimeout(() => {
        copyPicksBtn.textContent = origText;
      }, 2000);
    });
  };
}

// Scissor rendering loop
function render() {
  queued = false;
  if (disposed || document.hidden) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width !== lastCanvasWidth || height !== lastCanvasHeight) {
    lastCanvasWidth = width;
    lastCanvasHeight = height;
    gridRenderer.setSize(width, height, false);
  }

  gridRenderer.setScissorTest(false);
  gridRenderer.clear();
  gridRenderer.setScissorTest(true);

  for (const card of cards) {
    if (card.article.style.display === "none") continue;
    const rect = card.viewContainer.getBoundingClientRect();
    if (
      rect.bottom < 0 ||
      rect.top > height ||
      rect.right < 0 ||
      rect.left > width
    )
      continue;

    // Orbital camera calculation
    const dist = card.zoom;
    const cy = card.targetY + Math.sin(card.pitch) * dist;
    const horizDist = Math.cos(card.pitch) * dist;
    const cx = Math.sin(card.yaw) * horizDist;
    const cz = Math.cos(card.yaw) * horizDist;

    card.camera.position.set(cx, cy, cz);
    card.camera.lookAt(0, card.targetY, 0);
    card.camera.aspect = rect.width / rect.height;
    card.camera.updateProjectionMatrix();

    gridRenderer.setViewport(
      rect.left,
      height - rect.bottom,
      rect.width,
      rect.height,
    );
    gridRenderer.setScissor(
      rect.left,
      Math.max(0, height - rect.bottom),
      rect.width,
      Math.min(height, rect.bottom) - Math.max(0, rect.top),
    );

    gridRenderer.render(card.scene, card.camera);
  }
}

function requestRender() {
  if (!queued && !disposed) {
    queued = true;
    requestAnimationFrame(render);
  }
}

// Continuous Animation Tick
const clock = new T.Clock();
function tick() {
  if (disposed) return;
  const delta = clock.getDelta();
  if (isPlaying && !document.hidden) {
    const dt = Math.min(0.1, delta);
    animTime += dt;

    cards.forEach((card) => {
      if (card.article.style.display === "none") return;

      // Gentle auto-turntable spin if enabled
      if (isSpinning) {
        card.yaw += dt * 0.45;
      }

      // Subtle breathing idle on procedural models
      if (!card.gameActor) {
        card.modelGroup.position.y = Math.sin(animTime * 2.0) * 0.008;
      } else {
        // Update game actor rig
        card.gameActor.update(dt, {
          x: 0,
          y: 0,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          yaw: 0,
          grounded: true,
          runSpeed: 0,
          move: "idle",
        });
      }
    });

    render();
  }
  requestAnimationFrame(tick);
}

// Category filter handling
function filterCards(cat: string, search = "") {
  activeCategory = cat;
  const query = search.trim().toLowerCase();

  cards.forEach((c) => {
    const matchesCat = cat === "all" || c.cfg.category === cat;
    const matchesSearch =
      !query ||
      c.cfg.title.toLowerCase().includes(query) ||
      c.cfg.subtitle.toLowerCase().includes(query) ||
      c.cfg.description.toLowerCase().includes(query);

    c.article.style.display = matchesCat && matchesSearch ? "flex" : "none";
  });
  requestRender();
}

// Tab click listeners
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = (btn as HTMLElement).dataset.category || "all";
    window.location.hash = cat === "all" ? "" : cat;
    filterCards(cat, searchInput?.value || "");
  });
});

if (searchInput) {
  searchInput.addEventListener("input", () => {
    filterCards(activeCategory, searchInput.value);
  });
}

// Turntable spin toggle
const spinToggle = document.getElementById("toggle-spin") as HTMLInputElement;
if (spinToggle) {
  spinToggle.addEventListener("change", () => {
    isSpinning = spinToggle.checked;
    requestRender();
  });
}

// Background contrast switcher
const contrastSelect = document.getElementById(
  "contrast-select",
) as HTMLSelectElement;
if (contrastSelect) {
  contrastSelect.addEventListener("change", () => {
    document.body.className = contrastSelect.value;
    requestRender();
  });
}

// Initialize catalog cards
VARIETY_CATALOG.forEach((cfg) => {
  cards.push(createCardItem(cfg));
});

// URL hash or param support for direct category linking
const initialCat =
  new URLSearchParams(window.location.search).get("cat") ||
  window.location.hash.replace("#", "") ||
  "all";
if (initialCat && initialCat !== "all") {
  const matchBtn = document.querySelector(
    `.tab-btn[data-category="${initialCat}"]`,
  ) as HTMLElement;
  if (matchBtn) {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    matchBtn.classList.add("active");
    filterCards(initialCat, searchInput?.value || "");
  }
}

// Start loop
requestRender();
tick();

// Lifecycle cleanup
window.addEventListener("resize", requestRender);
window.addEventListener("scroll", requestRender, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) requestRender();
});

window.addEventListener("pagehide", (e) => {
  if (e.persisted) return;
  disposed = true;
  cards.forEach((c) => {
    if (c.gameActor) c.gameActor.dispose();
  });
  envTexture.dispose();
  gridRenderer.dispose();
});
