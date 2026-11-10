import * as THREE from "three";

export type ApostleId =
  | "oaks"
  | "eyring"
  | "christofferson"
  | "uchtdorf"
  | "bednar"
  | "cook"
  | "andersen"
  | "rasband"
  | "stevenson"
  | "renlund"
  | "gong"
  | "soares"
  | "kearon"
  | "causse"
  | "gilbert";

export type ApostleRacer = {
  id: ApostleId;
  name: string;
  shortName: string;
  title: string;
  number: number;
  kartName: string;
  kartColor: number;
  kartTrimColor: number;
  suitColor: number;
  tieColor: number;
  skinTone: string;
  hairColor: string;
  hairStyle:
    | "bald-top"
    | "tall-bald"
    | "pompadour"
    | "silver-sidepart"
    | "dark-sidepart"
    | "receding-white"
    | "swept-silver"
    | "tall-silver"
    | "athletic-silver"
    | "surgeon-neat"
    | "neat-dark"
    | "brazilian-dark"
    | "wavy-silver"
    | "french-gray"
    | "collegiate-dark";
  hasGlasses: boolean;
  glassesColor: string;
  glassesShape:
    "rimless" | "round-wire" | "rect-wire" | "modern-rect" | "aviator" | "none";
  features: string[];
  catchphrases: string[];
  stats: {
    topSpeed: number; // 0.8 - 1.2
    acceleration: number; // 0.8 - 1.2
    weight: number; // 0.8 - 1.2 (affects bumping)
    handling: number; // 0.8 - 1.2
    miniTurbo: number; // 0.8 - 1.2
  };
};

export const APOSTLE_ROSTER: readonly ApostleRacer[] = [
  {
    id: "oaks",
    name: "President Dallin H. Oaks",
    shortName: "Pres. Oaks",
    title: "18th President of the Church",
    number: 1,
    kartName: "The Supreme Gavel",
    kartColor: 0x1b365d, // Deep presidential navy
    kartTrimColor: 0xd4af37, // Gold trim
    suitColor: 0x1e272e,
    tieColor: 0x990000, // Classic crimson silk tie
    skinTone: "#f5d3b3",
    hairColor: "#e0e0e0",
    hairStyle: "bald-top",
    hasGlasses: true,
    glassesColor: "#silver",
    glassesShape: "rimless",
    features: [
      "Distinguished bald crown",
      "Rimless rectangular spectacles",
      "Warm judicial smile",
      "Presidential seal",
    ],
    catchphrases: [
      "Order on the track!",
      "Hold fast to the iron rod!",
      "It is wrong to criticize leaders... even on the podium!",
      "First place is sustained by unanimous consent!",
      "Accelerating according to fundamental law!",
    ],
    stats: {
      topSpeed: 1.05,
      acceleration: 1.05,
      weight: 1.1,
      handling: 1.0,
      miniTurbo: 1.05,
    },
  },
  {
    id: "eyring",
    name: "President Henry B. Eyring",
    shortName: "Pres. Eyring",
    title: "First Counselor, First Presidency",
    number: 2,
    kartName: "Heartfelt Tears",
    kartColor: 0x2c3e50,
    kartTrimColor: 0x3498db, // Tear blue
    suitColor: 0x222f3e,
    tieColor: 0x2980b9, // Deep heartfelt blue
    skinTone: "#f7dac0",
    hairColor: "#efefef",
    hairStyle: "tall-bald",
    hasGlasses: true,
    glassesColor: "#b8860b",
    glassesShape: "round-wire",
    features: [
      "High dome forehead",
      "Round wire spectacles",
      "Warm smiling eyes",
      "Tender heart emblem",
    ],
    catchphrases: [
      "I felt inspired to take this turn!",
      "My heart is full as I draft behind you!",
      "I knew we could make this jump!",
      "The Spirit whispered: hit the gas!",
    ],
    stats: {
      topSpeed: 0.95,
      acceleration: 1.15,
      weight: 0.9,
      handling: 1.1,
      miniTurbo: 1.15,
    },
  },
  {
    id: "christofferson",
    name: "President D. Todd Christofferson",
    shortName: "Pres. Christofferson",
    title: "Second Counselor, First Presidency",
    number: 3,
    kartName: "The Covenant Highway",
    kartColor: 0x2f3640,
    kartTrimColor: 0x718093,
    suitColor: 0x192a56,
    tieColor: 0x7f8c8d, // Distinguished slate gray
    skinTone: "#f9e0cb",
    hairColor: "#f5f6fa",
    hairStyle: "silver-sidepart",
    hasGlasses: true,
    glassesColor: "#7f8c8d",
    glassesShape: "modern-rect",
    features: [
      "Pristine silver side-part hair",
      "Modern rectangular glasses",
      "Crisp diplomatic posture",
    ],
    catchphrases: [
      "Walking the covenant path at 65 mph!",
      "Steadfast and immovable around this chicane!",
      "A principled overtake!",
    ],
    stats: {
      topSpeed: 1.02,
      acceleration: 1.0,
      weight: 1.05,
      handling: 1.1,
      miniTurbo: 1.0,
    },
  },
  {
    id: "uchtdorf",
    name: "President Dieter F. Uchtdorf",
    shortName: "Pres. Uchtdorf",
    title: "Acting President, Quorum of the Twelve",
    number: 4,
    kartName: "Silver Falcon 747",
    kartColor: 0xdcdde1, // Gleaming aircraft silver
    kartTrimColor: 0xe84118, // Lufthansa red
    suitColor: 0x130f40,
    tieColor: 0x0984e3, // Aviation sky blue
    skinTone: "#f5cbab",
    hairColor: "#ffffff",
    hairStyle: "pompadour",
    hasGlasses: false,
    glassesColor: "#000000",
    glassesShape: "aviator",
    features: [
      "Magnificent silver pompadour",
      "Lufthansa pilot wings",
      "Charismatic aviation grin",
    ],
    catchphrases: [
      "Clear for takeoff on Runway 1!",
      "Fly high, brothers! Never crash!",
      "You are beloved cockpit crew members!",
      "Keep turbulence to a minimum!",
      "Engaging afterburners!",
    ],
    stats: {
      topSpeed: 1.18,
      acceleration: 0.92,
      weight: 1.0,
      handling: 1.05,
      miniTurbo: 1.1,
    },
  },
  {
    id: "bednar",
    name: "Elder David A. Bednar",
    shortName: "Elder Bednar",
    title: "Quorum of the Twelve Apostles",
    number: 5,
    kartName: "Scripture Speedster",
    kartColor: 0x8b0000, // Crimson leather scriptures
    kartTrimColor: 0xd4af37, // Gilded page ribbon
    suitColor: 0x111111,
    tieColor: 0xb71540, // Bold red tie
    skinTone: "#fae1cf",
    hairColor: "#222222",
    hairStyle: "dark-sidepart",
    hasGlasses: true,
    glassesColor: "#576574",
    glassesShape: "rect-wire",
    features: [
      "Pitch dark parted hair",
      "Piercing earnest gaze",
      "Thin rectangular glasses",
      "Red scripture marker",
    ],
    catchphrases: [
      "Quick to observe the racing line!",
      "Are ye drifting with full purpose of heart?",
      "Line upon line, corner upon corner!",
      "Do not stand until the kart is parked!",
    ],
    stats: {
      topSpeed: 1.08,
      acceleration: 1.05,
      weight: 1.05,
      handling: 1.15,
      miniTurbo: 0.95,
    },
  },
  {
    id: "cook",
    name: "Elder Quentin L. Cook",
    shortName: "Elder Cook",
    title: "Quorum of the Twelve Apostles",
    number: 6,
    kartName: "The British Isles Cruiser",
    kartColor: 0x273c75,
    kartTrimColor: 0xe1b12c,
    suitColor: 0x192a56,
    tieColor: 0xf39c12, // Gold & navy stripe
    skinTone: "#fae3d2",
    hairColor: "#f1f2f6",
    hairStyle: "receding-white",
    hasGlasses: true,
    glassesColor: "#d4af37",
    glassesShape: "round-wire",
    features: [
      "Cheerful rounded face",
      "Gold wireframe glasses",
      "Receding white hair",
      "Friendly crinkle eyes",
    ],
    catchphrases: [
      "Non-members are waving from the grandstands!",
      "Historical records confirm I am in front!",
      "A peaceful and pleasant Sunday drive!",
    ],
    stats: {
      topSpeed: 0.98,
      acceleration: 0.98,
      weight: 1.18,
      handling: 0.98,
      miniTurbo: 1.0,
    },
  },
  {
    id: "andersen",
    name: "Elder Neil L. Andersen",
    shortName: "Elder Andersen",
    title: "Quorum of the Twelve Apostles",
    number: 7,
    kartName: "En Avant Express",
    kartColor: 0x0097e6,
    kartTrimColor: 0xffffff,
    suitColor: 0x2f3640,
    tieColor: 0xe84118, // Bright French red
    skinTone: "#f5d5bc",
    hairColor: "#e5e5e5",
    hairStyle: "swept-silver",
    hasGlasses: false,
    glassesColor: "#ffffff",
    glassesShape: "none",
    features: [
      "Swept back silver hair",
      "Enormous energetic smile",
      "French mission crest",
    ],
    catchphrases: [
      "Give Brother Joseph a break... and pass on the left!",
      "En avant! Full speed ahead!",
      "Faith is not by chance, but by turbo boost!",
    ],
    stats: {
      topSpeed: 1.05,
      acceleration: 1.08,
      weight: 0.98,
      handling: 1.05,
      miniTurbo: 1.08,
    },
  },
  {
    id: "rasband",
    name: "Elder Ronald A. Rasband",
    shortName: "Elder Rasband",
    title: "Quorum of the Twelve Apostles",
    number: 8,
    kartName: "By Divine Design",
    kartColor: 0x353b48,
    kartTrimColor: 0xc23616,
    suitColor: 0x1e272e,
    tieColor: 0x800000,
    skinTone: "#f8dac3",
    hairColor: "#eaeaea",
    hairStyle: "tall-silver",
    hasGlasses: false,
    glassesColor: "#000000",
    glassesShape: "none",
    features: [
      "Tall broad forehead",
      "Smiling silver hair",
      "Hearty executive smile",
    ],
    catchphrases: [
      "By divine design, I found this shortcut!",
      "There are no coincidences on this track!",
      "Moving forward under inspiration!",
    ],
    stats: {
      topSpeed: 1.02,
      acceleration: 0.96,
      weight: 1.2,
      handling: 0.95,
      miniTurbo: 1.0,
    },
  },
  {
    id: "stevenson",
    name: "Elder Gary E. Stevenson",
    shortName: "Elder Stevenson",
    title: "Quorum of the Twelve Apostles",
    number: 9,
    kartName: "Icon Fitness Sprinter",
    kartColor: 0x44bd32, // Athletic racing green
    kartTrimColor: 0xffffff,
    suitColor: 0x1b1464,
    tieColor: 0x8c7ae6, // Purple athletic tie
    skinTone: "#f6d4b7",
    hairColor: "#dcdde1",
    hairStyle: "athletic-silver",
    hasGlasses: false,
    glassesColor: "#000000",
    glassesShape: "none",
    features: [
      "Athletic jawline",
      "Modern textured silver hair",
      "Sports-executive grin",
    ],
    catchphrases: [
      "Game day energy at Temple Square!",
      "Playbook execution on this drift!",
      "Touchdown across the finish line!",
    ],
    stats: {
      topSpeed: 1.06,
      acceleration: 1.08,
      weight: 1.02,
      handling: 1.12,
      miniTurbo: 1.1,
    },
  },
  {
    id: "renlund",
    name: "Elder Dale G. Renlund",
    shortName: "Elder Renlund",
    title: "Quorum of the Twelve Apostles",
    number: 10,
    kartName: "The Cardio Pulse",
    kartColor: 0x00a8ff,
    kartTrimColor: 0x00cec9,
    suitColor: 0x2d3436,
    tieColor: 0x00b894, // Surgical teal
    skinTone: "#fae0cb",
    hairColor: "#bdc3c7",
    hairStyle: "surgeon-neat",
    hasGlasses: true,
    glassesColor: "#636e72",
    glassesShape: "rect-wire",
    features: [
      "Cardiologist precision",
      "Thin rectangular frames",
      "Calm surgeon demeanor",
    ],
    catchphrases: [
      "Steady heartbeat around this apex!",
      "Defibrillator boost activated!",
      "Precision steering, millimeter accuracy.",
    ],
    stats: {
      topSpeed: 1.0,
      acceleration: 1.06,
      weight: 0.95,
      handling: 1.2,
      miniTurbo: 1.05,
    },
  },
  {
    id: "gong",
    name: "Elder Gerrit W. Gong",
    shortName: "Elder Gong",
    title: "Quorum of the Twelve Apostles",
    number: 11,
    kartName: "The Campfire Camper",
    kartColor: 0xe67e22, // Warm campfire orange
    kartTrimColor: 0xf1c40f,
    suitColor: 0x2c3e50,
    tieColor: 0xd35400, // Warm festive silk
    skinTone: "#f3cfa5",
    hairColor: "#2c3e50",
    hairStyle: "neat-dark",
    hasGlasses: true,
    glassesColor: "#2f3640",
    glassesShape: "modern-rect",
    features: [
      "Asian heritage",
      "Rectangular glasses",
      "Radiant joyful smile",
      "Campfire badge",
    ],
    catchphrases: [
      "Room at the campfire, room on the track!",
      "All nations, kindreds, tongues... and karts!",
      "Always remember... to hit the gas!",
    ],
    stats: {
      topSpeed: 0.99,
      acceleration: 1.12,
      weight: 0.92,
      handling: 1.15,
      miniTurbo: 1.18,
    },
  },
  {
    id: "soares",
    name: "Elder Ulisses Soares",
    shortName: "Elder Soares",
    title: "Quorum of the Twelve Apostles",
    number: 12,
    kartName: "The Samba Rocket",
    kartColor: 0xfbc531, // Brazilian bright canary yellow
    kartTrimColor: 0x4cd137, // Brazilian green
    suitColor: 0x1e272e,
    tieColor: 0x10ac84, // Emerald green tie
    skinTone: "#e2b896",
    hairColor: "#333333",
    hairStyle: "brazilian-dark",
    hasGlasses: false,
    glassesColor: "#000000",
    glassesShape: "none",
    features: [
      "Warm Brazilian complexion",
      "Dark hair with silver sides",
      "Radiant sunny smile",
    ],
    catchphrases: [
      "Avante com alegria!",
      "One in Christ, first to the checkered flag!",
      "With all my heart, I drift!",
    ],
    stats: {
      topSpeed: 1.08,
      acceleration: 1.1,
      weight: 0.96,
      handling: 1.08,
      miniTurbo: 1.12,
    },
  },
  {
    id: "kearon",
    name: "Elder Patrick Kearon",
    shortName: "Elder Kearon",
    title: "Quorum of the Twelve Apostles",
    number: 13,
    kartName: "The British Grand Tourer",
    kartColor: 0x10ac84, // British racing green
    kartTrimColor: 0xf5f6fa,
    suitColor: 0x222f3e,
    tieColor: 0x833471, // English plum tie
    skinTone: "#fbe0cc",
    hairColor: "#f1f2f6",
    hairStyle: "wavy-silver",
    hasGlasses: true,
    glassesColor: "#718093",
    glassesShape: "round-wire",
    features: [
      "Wavy silver hair",
      "British charm",
      "Kind crinkle eyes",
      "Gentle dry wit",
    ],
    catchphrases: [
      "God's intent is to bring you home... across the finish line!",
      "A wonderfully British overtake, if I do say so myself.",
      "Cheerio from the front row!",
    ],
    stats: {
      topSpeed: 1.04,
      acceleration: 1.02,
      weight: 1.04,
      handling: 1.08,
      miniTurbo: 1.05,
    },
  },
  {
    id: "causse",
    name: "Elder Gérald Caussé",
    shortName: "Elder Caussé",
    title: "Quorum of the Twelve Apostles",
    number: 14,
    kartName: "Parisian Grand Touring",
    kartColor: 0x487eb0, // French blue
    kartTrimColor: 0xe84118, // French red accent
    suitColor: 0x2d3436,
    tieColor: 0x0984e3, // Silk blue tie
    skinTone: "#fae0cd",
    hairColor: "#7f8c8d",
    hairStyle: "french-gray",
    hasGlasses: true,
    glassesColor: "#2d3436",
    glassesShape: "modern-rect",
    features: [
      "Parisian finesse",
      "Designer frames",
      "Concert pianist hands on the steering wheel",
    ],
    catchphrases: [
      "Magnifique! C'est le Grand Prix!",
      "Playing this engine like a Steinway grand!",
      "Harmonious acceleration!",
    ],
    stats: {
      topSpeed: 1.06,
      acceleration: 1.04,
      weight: 0.98,
      handling: 1.12,
      miniTurbo: 1.08,
    },
  },
  {
    id: "gilbert",
    name: "Elder Clark G. Gilbert",
    shortName: "Elder Gilbert",
    title: "Quorum of the Twelve Apostles",
    number: 15,
    kartName: "BYU-Pathway Rocket",
    kartColor: 0x002e5d, // BYU Navy Blue
    kartTrimColor: 0xffffff,
    suitColor: 0x1e272e,
    tieColor: 0x002e5d, // BYU tie
    skinTone: "#f8dac2",
    hairColor: "#3d3d3d",
    hairStyle: "collegiate-dark",
    hasGlasses: true,
    glassesColor: "#2c3e50",
    glassesShape: "modern-rect",
    features: [
      "Youthful educator face",
      "Modern rectangular glasses",
      "Pathway scholar enthusiasm",
    ],
    catchphrases: [
      "Accelerating education and horsepower!",
      "Pathway to first place is wide open!",
      "Innovation on the inside corner!",
    ],
    stats: {
      topSpeed: 1.07,
      acceleration: 1.08,
      weight: 0.97,
      handling: 1.06,
      miniTurbo: 1.12,
    },
  },
];

export function getApostleById(id: ApostleId): ApostleRacer {
  return APOSTLE_ROSTER.find((r) => r.id === id) ?? APOSTLE_ROSTER[0];
}

/**
 * Generates a high-res, beautifully stylized 512x512 canvas texture
 * capturing each Apostle's unmistakable facial likeness, hair, glasses, smile,
 * conference microphone, white shirt, and necktie!
 */
export function createApostleFaceCanvas(
  racer: ApostleRacer,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Background / Studio Lighting
  const bgGrad = ctx.createRadialGradient(256, 220, 50, 256, 256, 320);
  bgGrad.addColorStop(0, "#3d4b5c");
  bgGrad.addColorStop(1, "#18212e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft conference hall warm rim light
  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 210, 165, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 230, 180, 0.08)";
  ctx.fill();
  ctx.restore();

  // Dark Suit Shoulders & Lapels
  const suitGrad = ctx.createLinearGradient(120, 380, 392, 512);
  suitGrad.addColorStop(
    0,
    `#${(racer.suitColor | 0x1a1a1a).toString(16).padStart(6, "0")}`,
  );
  suitGrad.addColorStop(
    1,
    `#${(racer.suitColor & 0x0f0f0f).toString(16).padStart(6, "0")}`,
  );
  ctx.fillStyle = suitGrad;

  ctx.beginPath();
  ctx.moveTo(80, 512);
  ctx.quadraticCurveTo(110, 390, 200, 390);
  ctx.lineTo(256, 420);
  ctx.lineTo(312, 390);
  ctx.quadraticCurveTo(402, 390, 432, 512);
  ctx.closePath();
  ctx.fill();

  // Crisp White Dress Shirt Collar
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(200, 390);
  ctx.lineTo(228, 440);
  ctx.lineTo(256, 405);
  ctx.lineTo(284, 440);
  ctx.lineTo(312, 390);
  ctx.lineTo(256, 375);
  ctx.closePath();
  ctx.fill();

  // Collar shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.moveTo(228, 440);
  ctx.lineTo(256, 405);
  ctx.lineTo(284, 440);
  ctx.lineTo(256, 448);
  ctx.closePath();
  ctx.fill();

  // Necktie
  const tieGrad = ctx.createLinearGradient(235, 405, 277, 512);
  const tieHex = `#${racer.tieColor.toString(16).padStart(6, "0")}`;
  tieGrad.addColorStop(0, tieHex);
  tieGrad.addColorStop(1, "#111111");
  ctx.fillStyle = tieGrad;

  ctx.beginPath();
  ctx.moveTo(246, 408);
  ctx.lineTo(266, 408);
  ctx.lineTo(270, 424);
  ctx.lineTo(256, 430);
  ctx.lineTo(242, 424);
  ctx.closePath();
  ctx.fill();

  // Tie body
  ctx.beginPath();
  ctx.moveTo(248, 428);
  ctx.lineTo(264, 428);
  ctx.lineTo(276, 512);
  ctx.lineTo(236, 512);
  ctx.closePath();
  ctx.fill();

  // General Conference Podium Lapel Microphone clip
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(215, 415, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#silver";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(212, 418);
  ctx.lineTo(206, 426);
  ctx.stroke();

  // Neck
  ctx.fillStyle = racer.skinTone;
  ctx.beginPath();
  ctx.moveTo(220, 320);
  ctx.quadraticCurveTo(220, 390, 230, 400);
  ctx.lineTo(282, 400);
  ctx.quadraticCurveTo(292, 390, 292, 320);
  ctx.closePath();
  ctx.fill();

  // Neck shading
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.moveTo(220, 320);
  ctx.quadraticCurveTo(256, 360, 292, 320);
  ctx.lineTo(292, 345);
  ctx.quadraticCurveTo(256, 385, 220, 345);
  ctx.closePath();
  ctx.fill();

  // Head / Jaw Shape
  ctx.save();
  ctx.fillStyle = racer.skinTone;
  ctx.beginPath();
  if (racer.hairStyle === "tall-bald") {
    // Tall cranium (Eyring)
    ctx.moveTo(170, 220);
    ctx.bezierCurveTo(165, 120, 205, 75, 256, 75);
    ctx.bezierCurveTo(307, 75, 347, 120, 342, 220);
    ctx.bezierCurveTo(342, 290, 312, 345, 256, 350);
    ctx.bezierCurveTo(200, 345, 170, 290, 170, 220);
  } else if (racer.id === "cook") {
    // Rounded jovial jaw
    ctx.moveTo(165, 220);
    ctx.bezierCurveTo(165, 130, 205, 95, 256, 95);
    ctx.bezierCurveTo(307, 95, 347, 130, 347, 220);
    ctx.bezierCurveTo(350, 305, 320, 355, 256, 355);
    ctx.bezierCurveTo(192, 355, 162, 305, 165, 220);
  } else if (racer.id === "stevenson" || racer.id === "bednar") {
    // Square athletic / disciplined jaw
    ctx.moveTo(170, 210);
    ctx.bezierCurveTo(170, 135, 205, 95, 256, 95);
    ctx.bezierCurveTo(307, 95, 342, 135, 342, 210);
    ctx.bezierCurveTo(345, 280, 330, 335, 285, 348);
    ctx.lineTo(227, 348);
    ctx.bezierCurveTo(182, 335, 167, 280, 170, 210);
  } else {
    // Classic distinguished oval
    ctx.moveTo(170, 210);
    ctx.bezierCurveTo(168, 128, 205, 90, 256, 90);
    ctx.bezierCurveTo(307, 90, 344, 128, 342, 210);
    ctx.bezierCurveTo(342, 290, 316, 348, 256, 350);
    ctx.bezierCurveTo(196, 348, 170, 290, 170, 210);
  }
  ctx.closePath();
  ctx.fill();

  // Face 3D ambient shading
  const faceShade = ctx.createRadialGradient(256, 200, 30, 256, 220, 150);
  faceShade.addColorStop(0, "rgba(255,255,255,0.18)");
  faceShade.addColorStop(0.7, "rgba(0,0,0,0)");
  faceShade.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = faceShade;
  ctx.fill();
  ctx.restore();

  // Ears
  ctx.fillStyle = racer.skinTone;
  // Left ear
  ctx.beginPath();
  ctx.arc(167, 230, 18, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Right ear
  ctx.beginPath();
  ctx.arc(345, 230, 18, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();
  ctx.stroke();

  // Hair Rendering according to each Apostle's real hairstyle!
  ctx.fillStyle = racer.hairColor;
  ctx.save();
  if (racer.hairStyle === "bald-top") {
    // President Oaks: Clean bald crown with silver side curls and clean temple hair
    ctx.beginPath();
    ctx.moveTo(168, 175);
    ctx.quadraticCurveTo(162, 230, 170, 270);
    ctx.quadraticCurveTo(185, 255, 186, 210);
    ctx.quadraticCurveTo(185, 185, 168, 175);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(344, 175);
    ctx.quadraticCurveTo(350, 230, 342, 270);
    ctx.quadraticCurveTo(327, 255, 326, 210);
    ctx.quadraticCurveTo(327, 185, 344, 175);
    ctx.fill();

    // Bald shine highlight
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath();
    ctx.ellipse(256, 125, 45, 22, -0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (racer.hairStyle === "tall-bald") {
    // President Eyring: Tall bald crown with fine white side hair fringe
    ctx.beginPath();
    ctx.moveTo(167, 190);
    ctx.quadraticCurveTo(160, 240, 170, 275);
    ctx.quadraticCurveTo(184, 260, 184, 220);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(345, 190);
    ctx.quadraticCurveTo(352, 240, 342, 275);
    ctx.quadraticCurveTo(328, 260, 328, 220);
    ctx.fill();

    // Eyring gentle cranium shine
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(256, 115, 40, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (racer.hairStyle === "pompadour") {
    // President Uchtdorf: The legendary majestic silver pompadour!
    ctx.beginPath();
    ctx.moveTo(162, 205);
    ctx.bezierCurveTo(155, 120, 175, 48, 245, 45);
    ctx.bezierCurveTo(285, 42, 355, 65, 355, 145);
    ctx.bezierCurveTo(355, 185, 348, 225, 348, 230);
    ctx.bezierCurveTo(330, 180, 305, 140, 256, 135);
    ctx.bezierCurveTo(210, 130, 180, 160, 162, 205);
    ctx.closePath();
    ctx.fill();

    // Pompadour wave volume highlights
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(245, 95, 40, -Math.PI * 0.7, -Math.PI * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(280, 105, 35, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();
  } else if (
    racer.hairStyle === "silver-sidepart" ||
    racer.hairStyle === "french-gray" ||
    racer.hairStyle === "athletic-silver" ||
    racer.hairStyle === "surgeon-neat"
  ) {
    // Distinguished side part
    ctx.beginPath();
    ctx.moveTo(165, 210);
    ctx.bezierCurveTo(160, 130, 185, 80, 256, 80);
    ctx.bezierCurveTo(320, 80, 348, 120, 346, 210);
    ctx.bezierCurveTo(325, 155, 280, 125, 230, 125);
    ctx.bezierCurveTo(195, 125, 175, 160, 165, 210);
    ctx.closePath();
    ctx.fill();
  } else if (
    racer.hairStyle === "dark-sidepart" ||
    racer.hairStyle === "neat-dark" ||
    racer.hairStyle === "brazilian-dark" ||
    racer.hairStyle === "collegiate-dark"
  ) {
    // Crisp dark parted hair (Bednar / Gong / Soares / Gilbert)
    ctx.beginPath();
    ctx.moveTo(166, 210);
    ctx.bezierCurveTo(162, 125, 190, 82, 256, 82);
    ctx.bezierCurveTo(325, 82, 348, 120, 346, 210);
    ctx.bezierCurveTo(326, 150, 285, 120, 235, 120);
    ctx.bezierCurveTo(195, 120, 176, 155, 166, 210);
    ctx.closePath();
    ctx.fill();
  } else if (racer.hairStyle === "wavy-silver") {
    // Patrick Kearon: Voluminous wavy silver locks
    ctx.beginPath();
    ctx.moveTo(162, 220);
    ctx.bezierCurveTo(150, 130, 180, 75, 256, 75);
    ctx.bezierCurveTo(330, 75, 360, 130, 350, 220);
    ctx.bezierCurveTo(330, 160, 290, 130, 256, 130);
    ctx.bezierCurveTo(220, 130, 180, 160, 162, 220);
    ctx.closePath();
    ctx.fill();
  } else {
    // Receding / Swept
    ctx.beginPath();
    ctx.moveTo(166, 215);
    ctx.bezierCurveTo(162, 135, 195, 88, 256, 88);
    ctx.bezierCurveTo(320, 88, 346, 135, 344, 215);
    ctx.bezierCurveTo(328, 165, 295, 140, 256, 140);
    ctx.bezierCurveTo(215, 140, 185, 165, 166, 215);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Eyebrows
  ctx.strokeStyle =
    racer.hairColor === "#ffffff" || racer.hairColor === "#efefef"
      ? "#95a5a6"
      : racer.hairColor;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  // Left brow
  ctx.beginPath();
  if (racer.id === "eyring") {
    // Tender, raised thoughtful brows
    ctx.moveTo(205, 194);
    ctx.quadraticCurveTo(225, 186, 245, 192);
  } else if (racer.id === "bednar") {
    // Direct, focused straight brow
    ctx.moveTo(200, 195);
    ctx.lineTo(245, 192);
  } else {
    ctx.moveTo(202, 196);
    ctx.quadraticCurveTo(225, 188, 245, 193);
  }
  ctx.stroke();

  // Right brow
  ctx.beginPath();
  if (racer.id === "eyring") {
    ctx.moveTo(267, 192);
    ctx.quadraticCurveTo(287, 186, 307, 194);
  } else if (racer.id === "bednar") {
    ctx.moveTo(267, 192);
    ctx.lineTo(312, 195);
  } else {
    ctx.moveTo(267, 193);
    ctx.quadraticCurveTo(287, 188, 310, 196);
  }
  ctx.stroke();

  // Eyes
  const eyeColor =
    racer.id === "uchtdorf"
      ? "#3498db"
      : racer.id === "gong" || racer.id === "soares"
        ? "#5d4037"
        : "#2980b9";
  // Left eye
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(224, 216, 15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(225, 216, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(225, 216, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Catchlight
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(227, 214, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Right eye
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(288, 216, 15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(287, 216, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(287, 216, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Catchlight
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(289, 214, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Crow's feet & Warm smile eye crinkles
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(204, 214);
  ctx.lineTo(194, 211);
  ctx.moveTo(204, 218);
  ctx.lineTo(193, 220);
  ctx.moveTo(308, 214);
  ctx.lineTo(318, 211);
  ctx.moveTo(308, 218);
  ctx.lineTo(319, 220);
  ctx.stroke();

  // Eyeglasses
  if (racer.hasGlasses) {
    ctx.strokeStyle =
      racer.glassesColor === "#silver"
        ? "#bdc3c7"
        : racer.glassesColor === "#d4af37"
          ? "#f1c40f"
          : "#2c3e50";
    ctx.lineWidth = 3.5;

    if (racer.glassesShape === "round-wire") {
      // Eyring / Cook round wire spectacles
      ctx.beginPath();
      ctx.arc(224, 216, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(288, 216, 19, 0, Math.PI * 2);
      ctx.stroke();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(243, 216);
      ctx.quadraticCurveTo(256, 212, 269, 216);
      ctx.stroke();
    } else {
      // Rectangular / Rimless (Oaks, Bednar, Gong, etc.)
      ctx.strokeRect(202, 203, 44, 26);
      ctx.strokeRect(266, 203, 44, 26);
      // Bridge
      ctx.beginPath();
      ctx.moveTo(246, 214);
      ctx.lineTo(266, 214);
      ctx.stroke();
    }

    // Glass glare reflection
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(210, 205);
    ctx.lineTo(228, 205);
    ctx.lineTo(218, 225);
    ctx.lineTo(205, 225);
    ctx.closePath();
    ctx.fill();
  }

  // Nose
  ctx.strokeStyle = "rgba(0,0,0,0.24)";
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(256, 210);
  ctx.lineTo(252, 260);
  ctx.quadraticCurveTo(256, 266, 262, 260);
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(246, 262, 3.5, 2.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(266, 262, 3.5, 2.5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Big, warm General Conference smile!
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(226, 296);
  ctx.quadraticCurveTo(256, 326, 286, 296);
  ctx.quadraticCurveTo(256, 305, 226, 296);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(222, 294);
  ctx.quadraticCurveTo(256, 328, 290, 294);
  ctx.stroke();

  // Laugh creases on cheeks
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(212, 280);
  ctx.quadraticCurveTo(215, 300, 225, 312);
  ctx.moveTo(300, 280);
  ctx.quadraticCurveTo(297, 300, 287, 312);
  ctx.stroke();

  // Name banner at the top
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, 512, 46);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(racer.name.toUpperCase(), 256, 32);

  return canvas;
}

/**
 * Creates a Three.js CanvasTexture for the Apostle's face
 */
export function createApostleFaceTexture(
  racer: ApostleRacer,
): THREE.CanvasTexture {
  const canvas = createApostleFaceCanvas(racer);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
