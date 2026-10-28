import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as T from "three";

/** Moroni's illustrative bronze costume; deliberately angular fitted plates. */
export function addMoroniCommander(
  group: T.Group,
  add: (g: T.BufferGeometry, m: T.Material, n: string) => T.Mesh,
  materials: T.Material[],
  headY: number,
  headZ: number,
  headRadius: number,
  quality: "hero" | "npc" | "crowd",
) {
  const bronze = new T.MeshPhysicalMaterial({
    color: 0x9e692f,
    metalness: 0.7,
    roughness: 0.43,
  });
  const gold = new T.MeshPhysicalMaterial({
    color: 0xc4964d,
    metalness: 0.65,
    roughness: 0.45,
  });
  const red = new T.MeshPhysicalMaterial({
    color: 0x831c2d,
    roughness: 1,
    side: T.DoubleSide,
  });
  const wood = new T.MeshPhysicalMaterial({ color: 0x453022, roughness: 0.9 });
  const cream = new T.MeshPhysicalMaterial({
    color: 0xe5d5b4,
    roughness: 1,
    side: T.DoubleSide,
  });
  materials.push(bronze, gold, red, wood, cream);
  const box = (
    name: string,
    center: number[],
    size: number[],
    mat = bronze,
  ) => {
    const outline = new T.Shape();
    const w = size[0] / 2,
      h = size[1] / 2;
    outline.moveTo(-w * 0.82, -h);
    outline.lineTo(w * 0.82, -h);
    outline.lineTo(w, -h * 0.82);
    outline.lineTo(w, h * 0.82);
    outline.lineTo(w * 0.82, h);
    outline.lineTo(-w * 0.82, h);
    outline.lineTo(-w, h * 0.82);
    outline.lineTo(-w, -h * 0.82);
    outline.closePath();
    const geometry =
      quality === "crowd"
        ? new T.BoxGeometry(size[0], size[1], size[2])
        : new T.ExtrudeGeometry(outline, {
            depth: size[2],
            bevelEnabled: true,
            bevelSize: 0.006,
            bevelThickness: 0.006,
            bevelSegments: 1,
            steps: 1,
          });
    if (quality !== "crowd") geometry.translate(0, 0, -size[2] / 2);
    geometry.translate(center[0], center[1], center[2]);
    return add(geometry, mat, name);
  };
  // Cross sections retain broad shoulders and taper to the belted waist.
  const plate = (name: string, rows: number[][], back = false) => {
    const points: number[] = [],
      indices: number[] = [];
    rows.forEach(([y, width, depth]) => {
      for (const x of [-width, -width * 0.72, 0, width * 0.72, width])
        points.push(
          x,
          y,
          (back ? -1 : 1) * (depth - 0.065 * (Math.abs(x) / width) ** 2),
        );
    });
    for (let r = 0; r < rows.length - 1; r++)
      for (let c = 0; c < 4; c++) {
        const a = r * 5 + c,
          b = a + 1,
          d = a + 5,
          e = d + 1;
        indices.push(...(back ? [a, d, b, b, d, e] : [a, b, d, b, e, d]));
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return add(g, bronze, name);
  };
  plate("moroni-breastplate", [
    [0.91, 0.255, 0.29],
    [1.08, 0.3, 0.335],
    [1.3, 0.39, 0.35],
    [1.48, 0.32, 0.285],
  ]);
  plate(
    "moroni-backplate",
    [
      [0.91, 0.255, 0.29],
      [1.08, 0.3, 0.335],
      [1.3, 0.39, 0.35],
      [1.48, 0.32, 0.285],
    ],
    true,
  );
  for (const side of [-1, 1]) {
    const positions: number[] = [],
      indices: number[] = [];
    for (const [y, w, d] of [
      [0.91, 0.255, 0.29],
      [1.08, 0.3, 0.335],
      [1.3, 0.39, 0.35],
      [1.48, 0.32, 0.285],
    ]) {
      for (let j = 0; j < 5; j++) {
        const t = (j / 4) * Math.PI;
        positions.push(
          side * (w + Math.sin(t) * 0.018),
          y,
          Math.cos(t) * (d - 0.065),
        );
      }
    }
    for (let r = 0; r < 3; r++)
      for (let j = 0; j < 4; j++) {
        const a = r * 5 + j;
        indices.push(a, a + 1, a + 5, a + 1, a + 6, a + 5);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    add(g, bronze, `moroni-${side < 0 ? "left" : "right"}-cuirass-side`);
  }
  if (quality !== "crowd") {
    const seam = (name: string, points: number[][]) =>
      add(
        new T.TubeGeometry(
          new T.CatmullRomCurve3(
            points.map((p) => new T.Vector3(p[0], p[1], p[2])),
          ),
          12,
          0.005,
          3,
          false,
        ),
        gold,
        name,
      );
    seam("moroni-cuirass-center-seam", [
      [0, 0.945, 0.303],
      [0, 1.1, 0.344],
      [0, 1.29, 0.358],
      [0, 1.44, 0.302],
    ]);
    for (const side of [-1, 1]) {
      seam("moroni-cuirass-edge", [
        [side * 0.25, 0.94, 0.295],
        [side * 0.3, 1.1, 0.297],
        [side * 0.38, 1.3, 0.291],
        [side * 0.31, 1.47, 0.233],
      ]);
      seam("moroni-cuirass-seam", [
        [0, 1.12, 0.35],
        [side * 0.15, 1.18, 0.343],
        [side * 0.32, 1.25, 0.313],
      ]);
      seam("moroni-collar-trim", [
        [0, 1.46, 0.302],
        [side * 0.16, 1.48, 0.28],
        [side * 0.31, 1.47, 0.235],
      ]);
    }
  }
  for (const side of [-1, 1]) {
    const label = side < 0 ? "left" : "right";
    // Three overlapping arched trapezoid lames follow the shoulder into the upper arm.
    let shoulder: T.Mesh | undefined;
    for (let tier = 0; tier < 3; tier++) {
      const p: number[] = [],
        ii: number[] = [];
      const seg = quality === "crowd" ? 4 : 8;
      for (let edge = 0; edge < 2; edge++)
        for (let j = 0; j <= seg; j++) {
          const a = -Math.PI / 2 + (j / seg) * Math.PI;
          const along = tier * 0.075 + edge * 0.115;
          const x = side * (0.3 + along);
          const z = Math.sin(a) * (0.22 - tier * 0.015 - edge * 0.008);
          const y =
            1.485 -
            along * 0.58 +
            Math.cos(a) * 0.024 -
            Math.abs(Math.sin(a)) * 0.055;
          p.push(x, y, z);
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
      const mesh = add(
        g,
        bronze,
        tier === 0
          ? `moroni-${label}-pauldron`
          : `moroni-${label}-shoulder-tier-${tier}`,
      );
      if (shoulder) shoulder.add(mesh);
      else shoulder = mesh;
      if (quality !== "crowd") {
        const pts: T.Vector3[] = [];
        for (let j = 0; j <= seg; j++)
          pts.push(
            new T.Vector3(
              ...(p.slice((seg + 1 + j) * 3, (seg + 2 + j) * 3) as [
                number,
                number,
                number,
              ]),
            ),
          );
        const trim = add(
          new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.006, 3, false),
          gold,
          `moroni-${label}-shoulder-edge-${tier}`,
        );
        shoulder!.add(trim);
      }
    }
    const cuff = new T.CylinderGeometry(
      0.105,
      0.085,
      0.29,
      6,
      1,
      true,
      0,
      Math.PI * 2,
    );
    cuff.translate(side * 0.49, 1.0, 0.045);
    const bracer = add(cuff, bronze, `moroni-${label}-bracer`);
    if (quality !== "crowd")
      for (const [y, radius] of [
        [0.865, 0.086],
        [1.135, 0.105],
      ]) {
        const band = new T.CylinderGeometry(
          radius + 0.006,
          radius + 0.006,
          0.021,
          8,
          1,
          true,
        );
        band.translate(side * 0.49, y, 0.045);
        const trim = add(band, gold, `moroni-${label}-bracer-band`);
        bracer.add(trim);
      }
    const shin = new T.CylinderGeometry(
      0.137,
      0.105,
      0.38,
      6,
      1,
      true,
      -Math.PI / 2,
      Math.PI,
    );
    shin.translate(side * 0.205, 0.3, 0.015);
    add(shin, bronze, `moroni-${label}-greave`);
    box(
      `moroni-${label}-greave-trim`,
      [side * 0.205, 0.47, 0.16],
      [0.225, 0.035, 0.035],
      gold,
    );
    const panels = new T.BufferGeometry();
    const pp: number[] = [],
      pi: number[] = [];
    for (let back = 0; back < 2; back++) {
      const offset = pp.length / 3;
      for (let row = 0; row <= 4; row++)
        for (let col = 0; col <= 4; col++) {
          const u = col / 4,
            v = row / 4,
            x = side * 0.19 + (u - 0.5) * (0.29 + 0.04 * v);
          pp.push(
            x,
            0.98 - 0.29 * v,
            (back ? -1 : 1) * (0.2 + 0.055 * Math.sin(u * Math.PI) + 0.025 * v),
          );
        }
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          const n = offset + r * 5 + c;
          pi.push(n, n + 5, n + 1, n + 1, n + 5, n + 6);
        }
    }
    panels.setAttribute("position", new T.Float32BufferAttribute(pp, 3));
    panels.setIndex(pi);
    panels.computeVertexNormals();
    add(panels, cream, `moroni-${label}-hip-lame`);
  }
  box("moroni-belt", [0, 0.965, 0.315], [0.52, 0.065, 0.045], wood);
  const buckle = new T.CylinderGeometry(0.055, 0.055, 0.025, 8);
  buckle.rotateX(Math.PI / 2);
  buckle.translate(0, 0.965, 0.353);
  add(buckle, gold, "moroni-cuirass-emblem");
  const band = new T.CylinderGeometry(
    (0.28 * headRadius) / 0.337,
    (0.28 * headRadius) / 0.337,
    (0.035 * headRadius) / 0.337,
    quality === "crowd" ? 10 : 24,
    1,
    true,
  );
  band.scale(1, 1, 0.84);
  band.translate(0, headY + (0.125 * headRadius) / 0.337, headZ);
  add(band, gold, "moroni-headband");
  // Asymmetric back drape, right shoulder clasp and diagonal front fold.
  const vertices: number[] = [],
    ix: number[] = [];
  for (let r = 0; r <= 12; r++)
    for (let c = 0; c <= 8; c++) {
      const v = r / 12,
        u = c / 8;
      vertices.push(
        T.MathUtils.lerp(-0.09, 0.45, u) * (1 + 0.2 * v),
        T.MathUtils.lerp(1.48, 0.25, v) + 0.065 * Math.sin(u * 3),
        -0.35 - 0.06 * v - 0.024 * Math.sin(u * 26) * v,
      );
    }
  for (let r = 0; r < 12; r++)
    for (let c = 0; c < 8; c++) {
      const a = r * 9 + c;
      ix.push(a, a + 9, a + 1, a + 1, a + 9, a + 10);
    }
  const cape = new T.BufferGeometry();
  cape.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  cape.setIndex(ix);
  cape.computeVertexNormals();
  add(cape, red, "moroni-half-cloak");
  const fold = new T.BufferGeometry();
  fold.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [-0.32, 1.37, 0.32, 0.3, 1.48, 0.32, -0.29, 1.12, 0.36, 0.24, 1.37, 0.39],
      3,
    ),
  );
  fold.setIndex([0, 2, 1, 1, 2, 3]);
  fold.computeVertexNormals();
  add(fold, red, "moroni-cloak-fold");
  const clasp = new T.CylinderGeometry(0.059, 0.059, 0.025, 12);
  clasp.rotateX(Math.PI / 2);
  clasp.translate(0.27, 1.46, 0.355);
  add(clasp, gold, "moroni-cloak-clasp");
  const shield = box(
    "moroni-shield",
    [-0.7, 0.62, 0.12],
    [0.36, 1.05, 0.075],
    wood,
  );
  for (const x of [-0.88, -0.52]) {
    const rim = box(
      "moroni-shield-rim",
      [x, 0.62, 0.168],
      [0.025, 1.08, 0.035],
      gold,
    );
    shield.add(rim);
  }
  for (const y of [0.095, 1.145]) {
    const rim = box(
      "moroni-shield-rim",
      [-0.7, y, 0.168],
      [0.38, 0.025, 0.035],
      gold,
    );
    shield.add(rim);
  }
  if (quality !== "crowd") {
    for (let i = 1; i < 6; i++) {
      const line = box(
        "moroni-shield-plank",
        [-0.88 + i * 0.06, 0.62, 0.163],
        [0.004, 1.0, 0.004],
        bronze,
      );
      shield.add(line);
    }
    for (const sign of [-1, 1])
      for (const top of [-1, 1]) {
        const g = new T.BoxGeometry(0.024, 0.3, 0.022);
        g.rotateZ(sign * 0.58);
        g.translate(-0.7 + sign * 0.08, 0.62 + top * 0.22, 0.184);
        const brace = add(g, gold, "moroni-shield-chevron");
        shield.add(brace);
      }
    const boss = new T.CylinderGeometry(0.082, 0.082, 0.032, 12);
    boss.rotateX(Math.PI / 2);
    boss.translate(-0.7, 0.62, 0.185);
    const mesh = add(boss, gold, "moroni-shield-boss");
    shield.add(mesh);
  }
  const sword = box(
    "moroni-sheathed-sword",
    [0.4, 0.69, -0.03],
    [0.075, 0.52, 0.065],
    wood,
  );
  const hilt = box(
    "moroni-sword-hilt",
    [0.4, 1.015, -0.03],
    [0.045, 0.15, 0.05],
    gold,
  );
  sword.add(hilt);
  const guard = box(
    "moroni-sword-guard",
    [0.4, 0.94, -0.03],
    [0.16, 0.035, 0.075],
    gold,
  );
  sword.add(guard);
  bronze.side = T.DoubleSide;
  // Batch decorative surfaces by their rigid owner and material. Principal
  // armor nodes remain individually named for limb attachment and inspection.
  const mergeInto = (owner: T.Object3D, meshes: T.Mesh[], name: string) => {
    if (meshes.length < 2) return;
    const geometry = mergeGeometries(
      meshes.map((m) => m.geometry),
      false,
    );
    if (!geometry) throw new Error(`Cannot batch Moroni ornament ${name}`);
    const mesh = add(geometry, meshes[0].material as T.Material, name);
    owner.add(mesh);
    for (const source of meshes) source.removeFromParent();
  };
  for (const side of ["left", "right"]) {
    const shoulder = group.getObjectByName(
      `moroni-${side}-pauldron`,
    )! as T.Mesh;
    const tiers = shoulder.children.filter((c) =>
      c.name.includes("shoulder-tier"),
    ) as T.Mesh[];
    if (tiers.length) {
      const geometry = mergeGeometries(
        [shoulder.geometry, ...tiers.map((m) => m.geometry)],
        false,
      )!;
      const owned = add(geometry, bronze, `moroni-${side}-pauldron-batch`);
      shoulder.geometry = owned.geometry;
      owned.removeFromParent();
      tiers.forEach((m) => m.removeFromParent());
    }
    mergeInto(
      shoulder,
      shoulder.children.filter((c) =>
        c.name.includes("shoulder-edge"),
      ) as T.Mesh[],
      `moroni-${side}-shoulder-trim`,
    );
    const bracer = group.getObjectByName(`moroni-${side}-bracer`)!;
    mergeInto(
      bracer,
      bracer.children as T.Mesh[],
      `moroni-${side}-bracer-trim`,
    );
  }
  mergeInto(
    group,
    group.children.filter(
      (c) =>
        (c.name.startsWith("moroni-cuirass-") &&
          c.name !== "moroni-cuirass-emblem") ||
        c.name === "moroni-collar-trim",
    ) as T.Mesh[],
    "moroni-cuirass-seams",
  );
  mergeInto(
    shield,
    shield.children.filter((c) => c.name !== "moroni-shield-plank") as T.Mesh[],
    "moroni-shield-bronze-work",
  );
  mergeInto(
    shield,
    shield.children.filter((c) => c.name === "moroni-shield-plank") as T.Mesh[],
    "moroni-shield-planks",
  );
  mergeInto(sword, sword.children as T.Mesh[], "moroni-sword-hilt");
  group.userData.costume = "illustrative-full-armor";
  group.userData.removableCoat = "moroni-removable-coat";
}

/** Lengthen legs and reduce head while preserving every cast member's base mesh. */
export const moroniHeight = (y: number) =>
  y < 0.1
    ? y
    : y < 0.95
      ? 0.1 + (y - 0.1) * 1.32
      : y < 1.49
        ? 1.222 + (y - 0.95) * 1.08
        : 1.8052 + (y - 1.49) * 0.74;
export function shapeMoroni(group: T.Group) {
  group.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    object.updateMatrix();
    object.geometry.applyMatrix4(object.matrix);
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    const p = object.geometry.getAttribute("position");
    const head = isMoroniHeadPart(object.name);
    for (let i = 0; i < p.count; i++)
      p.setXYZ(
        i,
        p.getX(i) * (head ? 0.57 : 1),
        moroniHeight(p.getY(i)),
        p.getZ(i) * (head ? 0.67 : 1),
      );
    object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
  group.userData.anatomy = "bronze-commander";
}

export function isMoroniHeadPart(name: string) {
  return (
    name.startsWith("moroni-swept-lock-") ||
    /^moroni-(left|right)-(upper-lid|lower-lid|ear-concha|ear-tragus)$/.test(
      name,
    ) ||
    [
      "sculpted-face-neck-nose",
      "single-sculpted-hair-cap",
      "left-eye",
      "right-eye",
      "left-iris",
      "right-iris",
      "left-brow",
      "right-brow",
      "left-ear",
      "right-ear",
      "character-ear-left",
      "character-ear-right",
      "character-mouth",
      "moroni-headband",
    ].includes(name)
  );
}
