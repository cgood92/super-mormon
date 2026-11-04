import * as T from "three";

/**
 * Mormon's Battle Vanguard Armor (Adopted Variation #3)
 *
 * Implements an authentic, sculpted Book of Mormon commander:
 * - Athletic warrior physique with broad shoulders & tapered waist
 * - Form-fitted dark hardened leather cuirass with bronze structural studs
 * - Prominent diagonal leather & bronze baldric strap crossing chest with golden medallion
 * - Sculpted curved bronze pauldron on the left shoulder (shield arm) with gold trim
 * - Pinned royal navy commander cape draped over the right shoulder
 * - Sheathed commander broadsword hung cleanly at hip
 * - Bronze forearm bracers with gold rim bands
 */
export function addMormonVanguard(
  group: T.Group,
  add: (g: T.BufferGeometry, m: T.Material, n: string) => T.Mesh,
  materials: T.Material[],
  quality: "hero" | "npc" | "crowd",
) {
  // Rich military materials
  const hardenedLeather = new T.MeshPhysicalMaterial({
    color: 0x3b2518,
    roughness: 0.65,
    metalness: 0.12,
    clearcoat: 0.1,
  });
  const darkLeather = new T.MeshStandardMaterial({
    color: 0x241710,
    roughness: 0.85,
    metalness: 0.05,
  });
  const bronze = new T.MeshPhysicalMaterial({
    color: 0xa87236,
    metalness: 0.72,
    roughness: 0.4,
    clearcoat: 0.12,
  });
  const gold = new T.MeshPhysicalMaterial({
    color: 0xcca148,
    metalness: 0.78,
    roughness: 0.35,
  });
  const steel = new T.MeshPhysicalMaterial({
    color: 0x939ba2,
    metalness: 0.85,
    roughness: 0.28,
  });

  materials.push(hardenedLeather, darkLeather, bronze, gold, steel);

  const equipment = new T.Group();
  equipment.name = "mormon-equipment";
  group.add(equipment);

  const box = (
    name: string,
    center: [number, number, number],
    size: [number, number, number],
    mat: T.Material = bronze,
  ) => {
    const geo = new T.BoxGeometry(size[0], size[1], size[2]);
    geo.translate(center[0], center[1], center[2]);
    return add(geo, mat, name);
  };

  // --------------------------------------------------------------------------
  // 1. FITTED CURVED LEATHER CUIRASS
  // --------------------------------------------------------------------------
  const plate = (name: string, rows: number[][]) => {
    const points: number[] = [],
      indices: number[] = [];
    rows.forEach(([y, width, depth]) => {
      for (const x of [-width, -width * 0.72, 0, width * 0.72, width]) {
        points.push(x, y, depth - 0.065 * (Math.abs(x) / (width || 1)) ** 2);
      }
    });
    for (let r = 0; r < rows.length - 1; r++) {
      for (let c = 0; c < 4; c++) {
        const a = r * 5 + c,
          b = a + 1,
          d = a + 5,
          e = d + 1;
        indices.push(a, b, d, b, e, d);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return add(g, hardenedLeather, name);
  };

  plate("mormon-leather-cuirass", [
    [0.91, 0.255, 0.298],
    [1.08, 0.3, 0.342],
    [1.3, 0.38, 0.356],
    [1.48, 0.31, 0.292],
  ]);

  // Bronze belt at waistline
  box("mormon-belt", [0, 0.935, 0.308], [0.52, 0.055, 0.038], bronze);

  // Bronze collar trim rim
  const collarCurve = new T.CatmullRomCurve3([
    new T.Vector3(-0.24, 1.47, 0.285),
    new T.Vector3(-0.12, 1.46, 0.32),
    new T.Vector3(0, 1.45, 0.33),
    new T.Vector3(0.12, 1.46, 0.32),
    new T.Vector3(0.24, 1.47, 0.285),
  ]);
  const collarGeo = new T.TubeGeometry(
    collarCurve,
    quality === "crowd" ? 6 : 12,
    0.009,
    quality === "crowd" ? 3 : 5,
    false,
  );
  add(collarGeo, bronze, "mormon-cuirass-collar");

  // --------------------------------------------------------------------------
  // 2. BRONZE RIVETS / STUDS
  // --------------------------------------------------------------------------
  if (quality !== "crowd") {
    const rivetGeo = new T.CylinderGeometry(0.012, 0.012, 0.015, 8);
    rivetGeo.rotateX(Math.PI / 2);

    const rivetCoords: [number, number, number][] = [
      // Left rim rivets
      [-0.23, 1.04, 0.31],
      [-0.27, 1.18, 0.335],
      [-0.3, 1.32, 0.345],
      // Right rim rivets
      [0.23, 1.04, 0.31],
      [0.26, 1.18, 0.335],
      [0.3, 1.32, 0.345],
      // Center seam rivets
      [0, 1.04, 0.345],
      [0, 1.16, 0.358],
      [0, 1.32, 0.36],
    ];

    rivetCoords.forEach(([x, y, z], i) => {
      const g = rivetGeo.clone();
      g.translate(x, y, z);
      add(g, bronze, `mormon-cuirass-rivet-${i}`);
    });
  }

  // --------------------------------------------------------------------------
  // 3. PROMINENT DIAGONAL BALDRIC STRAP & BUCKLE
  // --------------------------------------------------------------------------
  // Sits proudly across the chest from right shoulder (x = 0.22) to left hip (x = -0.34)
  // NO scaling applied so vertices remain at true body height!
  const baldricCurve = new T.CatmullRomCurve3([
    new T.Vector3(0.22, 1.48, 0.305),
    new T.Vector3(0.13, 1.35, 0.36),
    new T.Vector3(0.0, 1.2, 0.38),
    new T.Vector3(-0.15, 1.06, 0.36),
    new T.Vector3(-0.33, 0.94, 0.29),
  ]);

  const baldricGeo = new T.TubeGeometry(
    baldricCurve,
    quality === "crowd" ? 6 : 20,
    0.022,
    quality === "crowd" ? 4 : 8,
    false,
  );
  add(baldricGeo, darkLeather, "mormon-diagonal-baldric");

  // Ornate central bronze buckle / medallion at center of baldric
  const buckleGeo = new T.CylinderGeometry(
    0.046,
    0.046,
    0.02,
    quality === "crowd" ? 6 : 12,
  );
  buckleGeo.rotateX(Math.PI / 2);
  buckleGeo.translate(0.0, 1.2, 0.392);
  add(buckleGeo, gold, "mormon-baldric-buckle");

  // --------------------------------------------------------------------------
  // 4. SCULPTED ASYMMETRICAL LEFT-SHOULDER BATTLE PAULDRON
  // --------------------------------------------------------------------------
  // Follows the shoulder slope into the upper arm on the left side (x < 0)
  const side = -1;
  const label = "left";
  const tierCount = quality === "crowd" ? 1 : 2;
  for (let tier = 0; tier < tierCount; tier++) {
    const p: number[] = [],
      ii: number[] = [];
    const seg = quality === "crowd" ? 4 : 8;
    for (let edge = 0; edge < 2; edge++) {
      for (let j = 0; j <= seg; j++) {
        const a = -Math.PI / 2 + (j / seg) * Math.PI;
        const along = tier * 0.065 + edge * 0.095;
        const x = side * (0.31 + along);
        const z = Math.sin(a) * (0.22 - tier * 0.015 - edge * 0.008);
        const y =
          1.49 -
          along * 0.52 +
          Math.cos(a) * 0.022 -
          Math.abs(Math.sin(a)) * 0.045;
        p.push(x, y, z);
      }
    }
    for (let j = 0; j < seg; j++) {
      const a = j,
        b = j + 1,
        c = j + seg + 1,
        d = c + 1;
      ii.push(a, b, c, b, d, c);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    g.setIndex(ii);
    g.computeVertexNormals();
    add(g, bronze, `mormon-${label}-pauldron-tier-${tier}`);

    // Gold trim bead on pauldron outer edge
    if (quality !== "crowd") {
      const pts: T.Vector3[] = [];
      for (let j = 0; j <= seg; j++) {
        pts.push(
          new T.Vector3(
            p[(seg + 1 + j) * 3],
            p[(seg + 1 + j) * 3 + 1],
            p[(seg + 1 + j) * 3 + 2],
          ),
        );
      }
      const trim = add(
        new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.006, 3, false),
        gold,
        `mormon-${label}-pauldron-trim-${tier}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // 5. SHEATHED COMMANDER BROADSWORD ON LEFT HIP
  // --------------------------------------------------------------------------
  // Hangs neatly along the outside of the left hip (x = -0.38)
  box(
    "mormon-sheathed-sword",
    [-0.38, 0.69, 0.03],
    [0.065, 0.5, 0.052],
    darkLeather,
  );
  if (quality !== "crowd") {
    box(
      "mormon-scabbard-chape",
      [-0.38, 0.46, 0.03],
      [0.069, 0.07, 0.056],
      bronze,
    );
    box(
      "mormon-scabbard-locket",
      [-0.38, 0.925, 0.03],
      [0.072, 0.038, 0.058],
      bronze,
    );
  }
  box("mormon-sword-guard", [-0.38, 0.955, 0.03], [0.15, 0.028, 0.07], bronze);
  box(
    "mormon-sword-hilt",
    [-0.38, 1.03, 0.03],
    [0.036, 0.12, 0.038],
    hardenedLeather,
  );
  if (quality !== "crowd") {
    const pommel = new T.SphereGeometry(0.028, 8, 8);
    pommel.translate(-0.38, 1.105, 0.03);
    add(pommel, bronze, "mormon-sword-pommel");
  }

  // --------------------------------------------------------------------------
  // 7. FOREARM BRACERS (VAMBRACES)
  // --------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    const l = s < 0 ? "left" : "right";
    const cuff = new T.CylinderGeometry(
      0.105,
      0.085,
      0.22,
      quality === "hero" ? 12 : 6,
      1,
      true,
    );
    cuff.translate(s * 0.48, 0.95, 0.045);
    add(cuff, bronze, `mormon-${l}-bracer`);

    if (quality !== "crowd") {
      for (const y of [0.85, 1.05]) {
        const band = new T.CylinderGeometry(0.108, 0.108, 0.016, 12, 1, true);
        band.translate(s * 0.48, y, 0.045);
        add(band, gold, `mormon-${l}-bracer-trim-${y > 0.9 ? "top" : "bot"}`);
      }
    }
  }
}
