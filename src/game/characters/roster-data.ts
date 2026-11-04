import * as T from "three";
import type { CharacterRole } from "./character-types";
import { SCULPTED_CAST_TRAITS } from "./lehi-sculpted-models";

export type CharacterFaction =
  | "Jerusalem & Wilderness"
  | "Promised Land & Teachers"
  | "Missions & Kings"
  | "War Chapters"
  | "Prophets & Signs"
  | "Final Records & Jaredites"
  | "Contemporary";

export type CharacterArchetype =
  | "Prophets & Patriarchs"
  | "Warriors & Soldiers"
  | "Women of Faith"
  | "Youth & Children"
  | "Leaders & Rulers"
  | "Dissenters & Adversaries"
  | "Artisans & Citizens";

export type RosterEntry = {
  role: CharacterRole;
  name: string;
  faction: CharacterFaction;
  archetype: CharacterArchetype;
  gender: "male" | "female" | "child";
  description: string;
  scriptureRef?: string;
};

export const CHARACTER_ROSTER: readonly RosterEntry[] = [
  // Final Records & Jaredites
  {
    role: "peace-builder",
    name: "Community Artisan",
    faction: "Final Records & Jaredites",
    archetype: "Artisans & Citizens",
    gender: "male",
    description:
      "Imagined adult artisan with wavy hair, clean-shaven, and belt mallet; builds dwellings and workshops in the city of peace.",
    scriptureRef: "4 Nephi 1:1-18",
  },
  {
    role: "mormon",
    name: "Mormon",
    faction: "Final Records & Jaredites",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Powerful Nephite general and prophet in commander's cuirass and deep navy mantle with swept hair; large in stature, appointed leader of armies at age sixteen.",
    scriptureRef: "Mormon 1-6; Words of Mormon 1",
  },
  {
    role: "ammaron",
    name: "Ammaron",
    faction: "Final Records & Jaredites",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Elder custodian with receding silver hair, long beard, and wide record case; hid the sacred plates in the hill Shim and instructed young Mormon.",
    scriptureRef: "4 Nephi 1:47-49; Mormon 1:2-5",
  },
  {
    role: "jared",
    name: "Jared",
    faction: "Final Records & Jaredites",
    archetype: "Leaders & Rulers",
    gender: "male",
    description:
      "Patriarch with swept hair, square jaw, clean-shaven, and travel rope; led his family through the ancient wilderness.",
    scriptureRef: "Ether 1:33-43; Ether 2",
  },
  {
    role: "jared-brother",
    name: "The Brother of Jared",
    faction: "Final Records & Jaredites",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Prophet and builder with wavy hair, clean-shaven, and builder's tool pouch; possessed great faith to see the finger of the Lord on Mount Shelem.",
    scriptureRef: "Ether 1-3; Ether 6",
  },
  {
    role: "ether",
    name: "Ether",
    faction: "Final Records & Jaredites",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Resolute prophet of royal Jaredite lineage with heroic swept hair and weathered slate mantle; testified boldly before kings.",
    scriptureRef: "Ether 12-15",
  },
  {
    role: "moroni-keeper",
    name: "Moroni, Son of Mormon",
    faction: "Final Records & Jaredites",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Record keeper with swept hair and clean-shaven; survived the fall of his people, sealed the gold plates in Cumorah, and gave the final exhortation.",
    scriptureRef: "Mormon 8-9; Moroni 1-10",
  },

  // War Chapters
  {
    role: "moroni",
    name: "Captain Moroni",
    faction: "War Chapters",
    archetype: "Warriors & Soldiers",
    gender: "male",
    description:
      "Chief captain of the Nephites in blue cloak, sculpted bronze breastplate, and helmet; raised the Title of Liberty to defend faith and freedom.",
    scriptureRef: "Alma 43; Alma 46; Alma 48",
  },
  {
    role: "teancum",
    name: "Teancum",
    faction: "War Chapters",
    archetype: "Warriors & Soldiers",
    gender: "male",
    description:
      "Lean veteran scout and warrior with teal clothing, hooded cowl, face wrap, and short cape; courageous stealth infiltrator in nocturnal camp missions.",
    scriptureRef: "Alma 50:35; Alma 51:30-37; Alma 62:35-37",
  },
  {
    role: "teancum-soldier",
    name: "Teancum's Soldier",
    faction: "War Chapters",
    archetype: "Warriors & Soldiers",
    gender: "male",
    description:
      "Patrol soldier in teal tunic, hardened leather greaves, and patrol helmet; guards the defensive perimeter and coastal borders.",
    scriptureRef: "Alma 50:33-36; Alma 52",
  },
  {
    role: "morianton-follower",
    name: "Morianton's Follower",
    faction: "War Chapters",
    archetype: "Dissenters & Adversaries",
    gender: "male",
    description:
      "Follower of Morianton in rust travel mantle and pack, attempting an unauthorized border crossing toward the land northward.",
    scriptureRef: "Alma 50:25-34",
  },
  {
    role: "morianton",
    name: "Morianton",
    faction: "War Chapters",
    archetype: "Dissenters & Adversaries",
    gender: "male",
    description:
      "Passionate and obstinate leader with rust mantle and impatient expression; led his people in a border dispute and attempted flight.",
    scriptureRef: "Alma 50:25-36",
  },
  {
    role: "amalickiah",
    name: "Amalickiah",
    faction: "War Chapters",
    archetype: "Dissenters & Adversaries",
    gender: "male",
    description:
      "Tall, imposing Nephite traitor in royal plum and polished bronze armor; used deception and intrigue to make himself king of the Lamanites.",
    scriptureRef: "Alma 46; Alma 47; Alma 51",
  },
  {
    role: "lehonti",
    name: "Lehonti",
    faction: "War Chapters",
    archetype: "Leaders & Rulers",
    gender: "male",
    description:
      "Lamanite general atop Mount Antipas with ochre mantle and trimmed beard; opposed war until poisoned by degrees.",
    scriptureRef: "Alma 47:8-19",
  },
  {
    role: "lamanite-laman",
    name: "Laman of Gid",
    faction: "War Chapters",
    archetype: "Warriors & Soldiers",
    gender: "male",
    description:
      "Brave and faithful soldier of Lamanite descent; volunteered to deliver wine to the intoxicated guards at the city of Gid to free prisoners of war.",
    scriptureRef: "Alma 55:4-24",
  },
  {
    role: "guard",
    name: "Palace Servant / Guard",
    faction: "War Chapters",
    archetype: "Warriors & Soldiers",
    gender: "male",
    description:
      "Palace sentry with bronze helm, torso cuirass, and vigilant posture; guards the royal courtyard and defensive ramparts.",
    scriptureRef: "Mosiah 11; Alma 47; Alma 55",
  },
  {
    role: "maidservant",
    name: "Morianton's Maidservant",
    faction: "War Chapters",
    archetype: "Women of Faith",
    gender: "female",
    description:
      "Courageous maidservant with sculpted hair bun and flared full-length desert dress; escaped unjust beatings in Morianton's camp to inform Captain Moroni.",
    scriptureRef: "Alma 50:30-32",
  },

  // Prophets & Signs
  {
    role: "samuel",
    name: "Samuel the Lamanite",
    faction: "Prophets & Signs",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Calm and resolute prophet upon the city walls of Zarahemla; wore an imagined rust mantle and ochre tunic while prophesying of the Savior's birth.",
    scriptureRef: "Helaman 13-16",
  },
  {
    role: "warning-runner",
    name: "Warning Runner",
    faction: "Prophets & Signs",
    archetype: "Artisans & Citizens",
    gender: "male",
    description:
      "Agile Nephite messenger in desert sash and light footwear; dispatched to warn outlying cities of approaching armies and signs.",
    scriptureRef: "Alma 43:24-28; Helaman 16",
  },

  // Missions & Kings
  {
    role: "ammon",
    name: "Ammon",
    faction: "Missions & Kings",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Strong young son of Mosiah who chose royal servitude; defended the flocks of King Lamoni at the waters of Sebus with a cord sling.",
    scriptureRef: "Alma 17-20",
  },
  {
    role: "lamoni",
    name: "King Lamoni",
    faction: "Missions & Kings",
    archetype: "Leaders & Rulers",
    gender: "male",
    description:
      "Lamanite monarch in regal green and gold vestments and bronze crown; converted by Ammon's humility, service, and testimony.",
    scriptureRef: "Alma 18-19",
  },

  // Jerusalem & Wilderness
  {
    role: "nephi",
    name: "Nephi",
    faction: "Jerusalem & Wilderness",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Young, clean-shaven, faithful son of Lehi; skilled hunter, smith, and ocean navigator with linen tunic, travel mantle, and unwavering faith.",
    scriptureRef: "1 Nephi 1-18; 2 Nephi 1-33",
  },
  {
    role: "nephi-disguised",
    name: "Nephi in Laban's Clothes",
    faction: "Jerusalem & Wilderness",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Nephi's clean-shaven youthful face disguised in Laban's regal breastplate, ceremonial robes, and sword to retrieve the plates of brass.",
    scriptureRef: "1 Nephi 4:19-27",
  },
  {
    role: "sam",
    name: "Sam",
    faction: "Jerusalem & Wilderness",
    archetype: "Artisans & Citizens",
    gender: "male",
    description:
      "Gentle, humble older brother of Nephi with olive mantle and supportive spirit; believed Nephi's words and stood by him.",
    scriptureRef: "1 Nephi 2:17; 2 Nephi 5:6",
  },
  {
    role: "lehi",
    name: "Lehi",
    faction: "Jerusalem & Wilderness",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Patriarch and prophet of Jerusalem with flowing white hair, full elder beard, long travel robe, and coat; led his family into the Arabian desert.",
    scriptureRef: "1 Nephi 1-18; 2 Nephi 1-4",
  },
  {
    role: "sariah",
    name: "Sariah",
    faction: "Jerusalem & Wilderness",
    archetype: "Women of Faith",
    gender: "female",
    description:
      "Matriarch of the founding family with mature face, linen head covering, and sage travel clothing; bore children in the wilderness with enduring courage.",
    scriptureRef: "1 Nephi 2:5; 1 Nephi 5:1-8",
  },
  {
    role: "laman",
    name: "Laman",
    faction: "Jerusalem & Wilderness",
    archetype: "Dissenters & Adversaries",
    gender: "male",
    description:
      "Eldest son in civilian desert travel clothes with dark scruff and reserved demeanor; struggled with murmuring and hardheartedness.",
    scriptureRef: "1 Nephi 2:11-12; 1 Nephi 3-4",
  },
  {
    role: "lemuel",
    name: "Lemuel",
    faction: "Jerusalem & Wilderness",
    archetype: "Dissenters & Adversaries",
    gender: "male",
    description:
      "Second son with lean silhouette, dark desert mantle, and pointed goatee; frequently persuaded by his older brother Laman.",
    scriptureRef: "1 Nephi 2:11-13; 1 Nephi 16-17",
  },
  {
    role: "laban",
    name: "Laban",
    faction: "Jerusalem & Wilderness",
    archetype: "Leaders & Rulers",
    gender: "male",
    description:
      "Arrogant custodian of the Jerusalem military treasury; opulent regal robes, bronze headband, and commanding presence.",
    scriptureRef: "1 Nephi 3:11-14; 1 Nephi 4:7-18",
  },
  {
    role: "laban-undressed",
    name: "Laban (Linen Undergarment)",
    faction: "Jerusalem & Wilderness",
    archetype: "Artisans & Citizens",
    gender: "male",
    description:
      "Laban after his official outer armor and robes were removed by Nephi, showing the modest plain linen undergarments beneath.",
    scriptureRef: "1 Nephi 4:19",
  },
  {
    role: "zoram",
    name: "Zoram",
    faction: "Jerusalem & Wilderness",
    archetype: "Artisans & Citizens",
    gender: "male",
    description:
      "Former servant to Laban who made an oath of peace and joined Lehi's family into the desert; wearing practical civilian traveler garb.",
    scriptureRef: "1 Nephi 4:31-38; 2 Nephi 1:30-32",
  },
  {
    role: "child",
    name: "Nephi's Child",
    faction: "Jerusalem & Wilderness",
    archetype: "Youth & Children",
    gender: "child",
    description:
      "Youthful child scaled to half adult height with distinct rust-orange coat, cropped side hair, and curious upright exploration stance.",
    scriptureRef: "1 Nephi 18:7; 2 Nephi 5:6",
  },
  {
    role: "wife",
    name: "Family Camp Wife",
    faction: "Jerusalem & Wilderness",
    archetype: "Women of Faith",
    gender: "female",
    description:
      "Adult family member with sculpted hair bun, shoulder sash, and modest full-length flared dress suited for the wilderness trek.",
    scriptureRef: "1 Nephi 16:7; 1 Nephi 17:1-2",
  },
  {
    role: "lamans-wife",
    name: "Laman's Wife",
    faction: "Jerusalem & Wilderness",
    archetype: "Women of Faith",
    gender: "female",
    description:
      "Daughter of Ishmael who married Laman; imagined festive purple full-length flared dress and sculpted back hair fall.",
    scriptureRef: "1 Nephi 16:7",
  },
  {
    role: "lemuels-wife",
    name: "Lemuel's Wife",
    faction: "Jerusalem & Wilderness",
    archetype: "Women of Faith",
    gender: "female",
    description:
      "Daughter of Ishmael who married Lemuel; imagined coral festive full-length flared dress and sculpted back hair fall.",
    scriptureRef: "1 Nephi 16:7",
  },

  // Promised Land & Teachers
  {
    role: "jacob",
    name: "Jacob",
    faction: "Promised Land & Teachers",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Nephi's righteous younger brother born in the desert; faithful priest, teacher, and poet of the olive vineyard with blue mantle and clean-shaven jaw.",
    scriptureRef: "2 Nephi 2; Jacob 1-7",
  },
  {
    role: "sherem",
    name: "Sherem",
    faction: "Promised Land & Teachers",
    archetype: "Dissenters & Adversaries",
    gender: "male",
    description:
      "Articulate, learned adversary with pointed goatee, plum mantle, and polished belt who sought to overthrow the doctrine of Christ at the temple.",
    scriptureRef: "Jacob 7:1-23",
  },
  {
    role: "alma",
    name: "Alma",
    faction: "Promised Land & Teachers",
    archetype: "Prophets & Patriarchs",
    gender: "male",
    description:
      "Former priest of King Noah who repented upon Abinadi's words; teacher and baptizer at the secluded Waters of Mormon in forest green and linen.",
    scriptureRef: "Mosiah 17:1-4; Mosiah 18",
  },
  {
    role: "convert",
    name: "Alma's Potential Convert",
    faction: "Promised Land & Teachers",
    archetype: "Artisans & Citizens",
    gender: "male",
    description:
      "Civilian resident of the City of Nephi slipping quietly into the thicket of Mormon to hear the words of life.",
    scriptureRef: "Mosiah 18:3-7",
  },
  {
    role: "spy",
    name: "Noah's Spy",
    faction: "Promised Land & Teachers",
    archetype: "Dissenters & Adversaries",
    gender: "male",
    description:
      "Clandestine watcher in dark clothing with hooded silhouette and actively scanning gaze, sent by the king to discover the believers.",
    scriptureRef: "Mosiah 18:31-33",
  },

  // Contemporary
  {
    role: "missionary",
    name: "Missionary",
    faction: "Contemporary",
    archetype: "Artisans & Citizens",
    gender: "male",
    description:
      "Modern young visitor in clean white collared shirt, black necktie, dark slacks, and black name badge.",
    scriptureRef: "Doctrine and Covenants 4",
  },
];

export type CarriedPropType =
  "none" | "plates" | "jar" | "crate" | "pack" | "banner";

/** Builds a detailed, self-contained 3D carried prop that attaches between hands or into sockets. */
export function createCarriedProp(type: CarriedPropType): T.Group | null {
  if (type === "none") return null;
  const group = new T.Group();
  group.name = `carried-prop-${type}`;

  if (type === "plates") {
    // Golden Plates stack with 3 binding rings and wooden box base
    const boxMat = new T.MeshStandardMaterial({
      color: 0x5a3e28,
      roughness: 0.7,
      metalness: 0.1,
    });
    const goldMat = new T.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.85,
    });
    const ringMat = new T.MeshStandardMaterial({
      color: 0xcd7f32,
      roughness: 0.3,
      metalness: 0.9,
    });

    const stack = new T.Mesh(new T.BoxGeometry(0.32, 0.14, 0.22), goldMat);
    stack.position.y = 0.07;
    group.add(stack);

    // Three D-rings along one spine edge
    for (let i = -1; i <= 1; i++) {
      const ring = new T.Mesh(
        new T.TorusGeometry(0.045, 0.008, 8, 16, Math.PI * 1.5),
        ringMat,
      );
      ring.position.set(-0.165, 0.07, i * 0.07);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }
  } else if (type === "jar") {
    // Ancient desert terracotta amphora / water pitcher
    const jarMat = new T.MeshStandardMaterial({
      color: 0xb86845,
      roughness: 0.8,
      metalness: 0.05,
    });
    const belly = new T.Mesh(
      new T.CylinderGeometry(0.13, 0.09, 0.26, 12),
      jarMat,
    );
    belly.position.y = 0.13;
    group.add(belly);

    const neck = new T.Mesh(
      new T.CylinderGeometry(0.065, 0.12, 0.12, 12),
      jarMat,
    );
    neck.position.y = 0.31;
    group.add(neck);

    const rim = new T.Mesh(new T.TorusGeometry(0.07, 0.015, 8, 16), jarMat);
    rim.position.y = 0.37;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    // Twin side handles
    for (const side of [-1, 1]) {
      const handle = new T.Mesh(
        new T.TorusGeometry(0.055, 0.012, 6, 12, Math.PI),
        jarMat,
      );
      handle.position.set(side * 0.125, 0.24, 0);
      handle.rotation.z = (side * Math.PI) / 2;
      group.add(handle);
    }
  } else if (type === "crate") {
    // Timber cargo crate with plank banding
    const woodMat = new T.MeshStandardMaterial({
      color: 0x826449,
      roughness: 0.85,
    });
    const bandMat = new T.MeshStandardMaterial({
      color: 0x483a2d,
      roughness: 0.9,
    });

    const crate = new T.Mesh(new T.BoxGeometry(0.34, 0.26, 0.28), woodMat);
    crate.position.y = 0.13;
    group.add(crate);

    // Cross braces
    const brace1 = new T.Mesh(new T.BoxGeometry(0.35, 0.035, 0.29), bandMat);
    brace1.position.y = 0.03;
    group.add(brace1);

    const brace2 = new T.Mesh(new T.BoxGeometry(0.35, 0.035, 0.29), bandMat);
    brace2.position.y = 0.23;
    group.add(brace2);
  } else if (type === "pack") {
    // Linen traveler's rolled bundle
    const clothMat = new T.MeshStandardMaterial({
      color: 0xd2c4ab,
      roughness: 0.95,
    });
    const strapMat = new T.MeshStandardMaterial({
      color: 0x594231,
      roughness: 0.8,
    });

    const roll = new T.Mesh(
      new T.CylinderGeometry(0.12, 0.12, 0.36, 12),
      clothMat,
    );
    roll.position.y = 0.12;
    roll.rotation.z = Math.PI / 2;
    group.add(roll);

    for (const side of [-0.1, 0.1]) {
      const strap = new T.Mesh(
        new T.TorusGeometry(0.125, 0.01, 6, 16),
        strapMat,
      );
      strap.position.set(side, 0.12, 0);
      strap.rotation.y = Math.PI / 2;
      group.add(strap);
    }
  } else if (type === "banner") {
    // Title of Liberty banner on spear pole
    const woodMat = new T.MeshStandardMaterial({
      color: 0x6e523b,
      roughness: 0.7,
    });
    const clothMat = new T.MeshStandardMaterial({
      color: 0xeee8dc,
      roughness: 0.9,
      side: T.DoubleSide,
    });

    const pole = new T.Mesh(
      new T.CylinderGeometry(0.018, 0.02, 1.85, 8),
      woodMat,
    );
    pole.position.y = 0.7;
    group.add(pole);

    const flag = new T.Mesh(new T.PlaneGeometry(0.65, 0.45), clothMat);
    flag.position.set(0.33, 1.35, 0.01);
    group.add(flag);
  }

  group.traverse((obj) => {
    if (obj instanceof T.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return group;
}

export type CharacterDiagnosticReport = {
  role: CharacterRole;
  totalVertices: number;
  totalTriangles: number;
  meshCount: number;
  boundingBox: { width: number; height: number; depth: number };
  shoesClosed: boolean;
  normalsValid: boolean;
  warnings: string[];
};

/** Analyzes a rendered character rig to catch geometry gaps, unclosed shoes, or normal defects. */
export function analyzeCharacterMesh(actor: {
  group: T.Group;
}): CharacterDiagnosticReport {
  actor.group.updateMatrixWorld(true);
  const warnings: string[] = [];
  let totalVertices = 0;
  let totalTriangles = 0;
  let meshCount = 0;
  let normalsValid = true;
  let shoesClosed = true;

  const box = new T.Box3().setFromObject(actor.group);
  const size = new T.Vector3();
  box.getSize(size);

  actor.group.traverse((obj) => {
    if (!(obj instanceof T.Mesh)) return;
    meshCount++;
    const geo = obj.geometry;
    const pos = geo.getAttribute("position");
    if (!pos || pos.count === 0) {
      warnings.push(`Mesh "${obj.name}" has empty position buffer`);
      return;
    }
    totalVertices += pos.count;
    totalTriangles += geo.index ? geo.index.count / 3 : pos.count / 3;

    // Validate normal length & NaN
    const normals = geo.getAttribute("normal");
    if (normals) {
      for (let i = 0; i < normals.count; i++) {
        const nx = normals.getX(i),
          ny = normals.getY(i),
          nz = normals.getZ(i);
        const len = Math.hypot(nx, ny, nz);
        if (!Number.isFinite(len) || len < 0.1 || len > 2.0) {
          normalsValid = false;
          warnings.push(
            `Mesh "${obj.name}" contains abnormal normal vector at #${i}`,
          );
          break;
        }
      }
    }

    // Footwear check for shoes
    if (obj.name.includes("sandal") || obj.name.includes("boot")) {
      const positions = pos;
      const vertexIds: number[] = [];
      const welded = new Map<string, number>();
      for (let i = 0; i < positions.count; i++) {
        const key = [positions.getX(i), positions.getY(i), positions.getZ(i)]
          .map((v) => Math.round(v * 1e5))
          .join(",");
        if (!welded.has(key)) welded.set(key, welded.size);
        vertexIds.push(welded.get(key)!);
      }
      const indices =
        geo.index?.array ??
        Uint32Array.from({ length: positions.count }, (_, i) => i);
      const edges = new Map<string, number>();
      for (let i = 0; i < indices.length; i += 3) {
        const tri = [
          vertexIds[indices[i]],
          vertexIds[indices[i + 1]],
          vertexIds[indices[i + 2]],
        ];
        if (new Set(tri).size < 3) continue;
        for (let j = 0; j < 3; j++) {
          const a = tri[j],
            b = tri[(j + 1) % 3];
          const edgeKey = a < b ? `${a}:${b}` : `${b}:${a}`;
          edges.set(edgeKey, (edges.get(edgeKey) ?? 0) + 1);
        }
      }
      const nonManifold = [...edges.values()].filter((c) => c !== 2).length;
      if (edges.size === 0 || nonManifold > 0) {
        shoesClosed = false;
        warnings.push(
          `Shoe mesh "${obj.name}" has ${nonManifold} unclosed edges`,
        );
      }
    }
  });

  return {
    role: actor.group.name.replace("-character", "") as CharacterRole,
    totalVertices,
    totalTriangles,
    meshCount,
    boundingBox: {
      width: Math.round(size.x * 100) / 100,
      height: Math.round(size.y * 100) / 100,
      depth: Math.round(size.z * 100) / 100,
    },
    shoesClosed,
    normalsValid,
    warnings,
  };
}
