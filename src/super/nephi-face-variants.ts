import { APPROVED_NEPHI_FACE } from "./nephi-appearance";
import {
  buildSculptedCharacter,
  type SculptedFaceProfile,
  type SculptedLehi,
} from "./lehi-sculpted-models";

/** Temporary studies only: the playable Nephi remains unchanged. */
export const NEPHI_FACE_VARIANTS = [
  {
    id: 1,
    name: "Clean crew cut",
    description:
      "Light chestnut crew cut; lean oval face; small straight nose.",
  },
  {
    id: 2,
    name: "Neat side part",
    description: "Dark blond side part with cropped sides; fine tapered chin.",
  },
  {
    id: 3,
    name: "Textured crop",
    description: "Light brown cropped fringe; slim jaw; compact nose.",
  },
  {
    id: 4,
    name: "Short brushed up",
    description: "Warm chestnut, a short lifted front; youthful narrow face.",
  },
  {
    id: 5,
    name: "Ivy League",
    description:
      "Tidy golden brown part; close sides; understated almond eyes.",
  },
  {
    id: 6,
    name: "Flat side sweep",
    description: "Soft light brown sweep with low volume; fine, clean jaw.",
  },
  {
    id: 7,
    name: "Close buzz cut",
    description:
      "Dark blond close crop; clear silhouette; small nose and gentle smile.",
  },
  {
    id: 8,
    name: "Short textured top",
    description:
      "Sandy chestnut textured top and cropped sides; lean heart-shaped face.",
  },
] as const;

const COMMON: SculptedFaceProfile = {
  faceWidth: 0.82,
  faceHeight: 0.98,
  faceDepth: 0.79,
  jawWidth: 0.58,
  lowerFaceTaper: 0.76,
  jawSquareness: 1.08,
  jawDrop: 0.47,
  chinLength: 0.37,
  jawDepth: 0.59,
  cheekbone: 0.1,
  noseWidth: 0.037,
  noseProjection: 0.68,
  noseBridge: 0.45,
  eyeSpacing: 0.325,
  eyeHeight: 0.13,
  eyeOpening: 0.135,
  eyeWidth: 0.195,
  browAngle: 0.025,
  browLift: 0.015,
  browThickness: 0.019,
  mouthWidth: 0.205,
  mouthHeight: 0.34,
  smile: 0.012,
};

const PROFILES: readonly SculptedFaceProfile[] = [
  {
    ...COMMON,
    hairCut: "crew",
    hairColor: 0x99724f,
    hairLength: 0.009,
    faceWidth: 0.83,
    jawWidth: 0.62,
    lowerFaceTaper: 0.77,
    jawSquareness: 1.16,
    eyeSpacing: 0.33,
    eyeOpening: 0.125,
    noseWidth: 0.037,
  },
  APPROVED_NEPHI_FACE,
  {
    ...COMMON,
    hairCut: "crop",
    hairColor: 0x916943,
    hairLength: 0.013,
    faceWidth: 0.815,
    faceHeight: 0.95,
    jawWidth: 0.59,
    jawDrop: 0.45,
    eyeSpacing: 0.315,
    eyeOpening: 0.13,
    noseWidth: 0.034,
    noseProjection: 0.6,
    mouthWidth: 0.21,
  },
  {
    ...COMMON,
    hairCut: "brush-up",
    hairColor: 0xa27a55,
    hairLength: 0.028,
    faceWidth: 0.8,
    faceHeight: 1.005,
    jawWidth: 0.55,
    chinLength: 0.4,
    eyeSpacing: 0.32,
    eyeOpening: 0.137,
    noseWidth: 0.039,
    noseProjection: 0.72,
    browLift: 0.025,
  },
  {
    ...COMMON,
    hairCut: "ivy",
    hairColor: 0x9e7c4d,
    hairLength: 0.015,
    faceWidth: 0.835,
    jawWidth: 0.63,
    lowerFaceTaper: 0.79,
    jawSquareness: 1.2,
    eyeSpacing: 0.33,
    eyeOpening: 0.12,
    eyeWidth: 0.205,
    noseWidth: 0.036,
    noseProjection: 0.7,
    mouthWidth: 0.21,
  },
  {
    ...COMMON,
    hairCut: "side-sweep",
    hairColor: 0x987451,
    hairLength: 0.024,
    faceWidth: 0.8,
    faceHeight: 0.97,
    jawWidth: 0.55,
    lowerFaceTaper: 0.74,
    eyeSpacing: 0.335,
    eyeOpening: 0.14,
    noseWidth: 0.035,
    mouthWidth: 0.195,
    smile: 0.014,
  },
  {
    ...COMMON,
    hairCut: "buzz",
    hairColor: 0x9d825b,
    hairLength: 0.004,
    faceWidth: 0.84,
    faceHeight: 0.96,
    jawWidth: 0.62,
    jawDrop: 0.46,
    lowerFaceTaper: 0.79,
    chinLength: 0.35,
    eyeSpacing: 0.33,
    noseWidth: 0.036,
    mouthWidth: 0.215,
    smile: 0.014,
  },
  {
    ...COMMON,
    hairCut: "texture",
    hairColor: 0xb08c64,
    hairLength: 0.019,
    faceWidth: 0.835,
    faceHeight: 0.98,
    jawWidth: 0.53,
    lowerFaceTaper: 0.7,
    chinLength: 0.39,
    eyeSpacing: 0.345,
    eyeOpening: 0.14,
    noseWidth: 0.035,
    noseProjection: 0.64,
    mouthWidth: 0.2,
    smile: 0.016,
  },
];

/** Zero-based index; each returned study owns all geometry and materials. */
export function buildNephiFaceVariant(index: number): SculptedLehi {
  if (!Number.isInteger(index) || index < 0 || index >= PROFILES.length)
    throw new RangeError(`Unknown Nephi face variant ${index}`);
  const result = buildSculptedCharacter("nephi", {
    quality: "hero",
    faceProfile: PROFILES[index],
  });
  result.group.name = `nephi-face-${index + 1}`;
  result.group.userData.faceVariant = NEPHI_FACE_VARIANTS[index];
  return result;
}
