import * as T from "three";
import {
  capsule,
  ellipsoid,
  sculpt,
  smoothUnion,
  type DistanceField,
} from "./sculpture";

export type SculptedLehi = { group: T.Group; dispose: () => void };

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
    waist: 0.355,
    hem: 0.445,
    beard: 0.19,
    nose: 0.073,
    cloak: 0.45,
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
};

function makeMaterials(index: number): Materials {
  const physical = (color: number, roughness: number) =>
    new T.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      clearcoat: roughness < 0.7 ? 0.15 : 0.03,
      side: T.DoubleSide,
    });
  const warmer = index === 2;
  return {
    skin: physical(warmer ? 0xba8665 : 0xad7959, 0.58),
    robe: physical(warmer ? 0xdac7a6 : 0xd2bd9a, 0.94),
    robeShadow: physical(0xbca482, 0.96),
    mantle: physical(index === 4 ? 0x796149 : 0x80634a, 0.91),
    mantleLining: physical(0xa78a69, 0.91),
    leather: physical(0x57402d, 0.74),
    hair: physical(0xaaa49c, 0.86),
    beard: physical(0xc4bbb0, 0.76),
    eyeWhite: physical(0xe9dfcf, 0.34),
    iris: physical(0x382f29, 0.26),
  };
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

function makeSculpted(index: number): SculptedLehi {
  const s = SHAPES[index];
  if (!s) throw new RangeError(`Unknown sculpted Lehi variant ${index}`);
  const group = new T.Group();
  group.name = `lehi-${s.name}`;
  const materials = makeMaterials(index);
  const geometries: T.BufferGeometry[] = [];
  const add = (
    geometry: T.BufferGeometry,
    material: T.Material,
    name: string,
  ) => {
    geometries.push(geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // One continuous cloth field joins shoulders, torso, and both sleeves.
  const shirt: DistanceField = (x, y, z) => {
    let d = ellipsoid(x, y, z, 0, 1.17, s.lean, s.shoulder, 0.36, 0.3);
    d = smoothUnion(
      d,
      ellipsoid(x, y, z, 0, 1.02, s.lean, s.waist + 0.065, 0.28, 0.31),
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
          index === 3 ? 0.155 : 0.13,
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
          0.14,
          0.19,
          0.14,
        ),
        0.05,
      );
    }
    return d;
  };
  add(
    sculpt({
      bounds: [
        [-0.82, 0.66, -0.5],
        [0.82, 1.64, 0.5],
      ],
      resolution: 48,
      field: shirt,
      material: materials.robe,
    }).geometry,
    materials.robe,
    "continuous-robe-and-sleeves",
  );

  // The adventure, animated, guardian and film silhouettes expose real legs.
  // Each trouser is a tapered sculpted volume under its shorter tunic.
  if (index === 0 || index === 2 || index === 3 || index === 5) {
    const trouserTop = index === 2 ? 0.73 : index === 3 ? 0.67 : 0.72;
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
        return d;
      };
      add(
        sculpt({
          bounds: [
            [cx - 0.21, 0.08, -0.22],
            [cx + 0.21, 0.89, 0.22],
          ],
          resolution: 32,
          field: trouser,
          material: index === 3 ? materials.mantle : materials.robeShadow,
        }).geometry,
        index === 3 ? materials.mantle : materials.robeShadow,
        side < 0 ? "left-trouser" : "right-trouser",
      );
    }
  }

  // Cloth hangs as a curved surface with weight at the hem, irregular folds,
  // and asymmetry; it is not a cone or a stack of rotational primitives.
  const hemY = [0.51, 0.105, 0.53, 0.43, 0.105, 0.29][index];
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
  add(robeGeometry, materials.robe, "continuous-folded-robe");
  const underHem = surface(96, 2, (u, v) => {
    const a = u * Math.PI * 2;
    const r = s.hem - v * 0.045;
    return new T.Vector3(
      r * Math.sin(a),
      hemY - 0.006 + 0.015 * Math.sin(a * 3),
      r * Math.cos(a),
    );
  });
  add(underHem, materials.robeShadow, "robe-hem-thickness");

  // Mantle is an open-front draped sheet with its own shoulder and hem flow.
  const cloakHem = [0.86, 0.1, 0.86, 0.54, 0.12, 0.36][index];
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
  const cloakGeometry = surface(78, 35, cloakPoint);
  add(cloakGeometry, materials.mantle, "flowing-mantle");
  const edgePoints: T.Vector3[] = [];
  for (let i = 0; i <= 32; i++) edgePoints.push(cloakPoint(0, i / 32));
  add(
    new T.TubeGeometry(new T.CatmullRomCurve3(edgePoints), 32, 0.012, 6, false),
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
        resolution: 44,
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
        0.96,
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
        resolution: 30,
        field: hand,
        material: materials.skin,
      }).geometry,
      materials.skin,
      side < 0 ? "left-hand" : "right-hand",
    );
  }

  // Face, cheeks, brow ridge, nose, jaw, and neck share one continuous mesh.
  const headZ = 0.025 + s.lean;
  const faceFront = headZ + s.head * 0.84;
  const face: DistanceField = (x, y, z) => {
    const faceWidth = [0.88, 0.78, 0.94, 0.96, 0.79, 0.87][index];
    const jawWidth = [0.68, 0.57, 0.76, 0.78, 0.59, 0.66][index];
    let d = ellipsoid(
      x,
      y,
      z,
      0,
      s.headY,
      headZ,
      s.head * faceWidth,
      s.head * s.headTall,
      s.head * 0.84,
    );
    d = smoothUnion(
      d,
      ellipsoid(
        x,
        y,
        z,
        0,
        s.headY - s.head * 0.48,
        headZ + s.head * 0.12,
        s.head * jawWidth,
        s.head * 0.43,
        s.head * 0.65,
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
      const eyeX = side * s.head * 0.34;
      const socket = ellipsoid(
        x,
        y,
        z,
        eyeX,
        s.headY + s.head * 0.105,
        faceFront - s.head * 0.015,
        s.head * 0.205,
        s.head * 0.14,
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
          s.headY + s.head * 0.225,
          faceFront - s.head * 0.07,
          s.head * 0.235,
          s.head * 0.105,
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
          s.headY + s.head * 0.005,
          faceFront - s.head * 0.065,
          s.head * 0.19,
          s.head * 0.045,
          s.head * 0.095,
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
        faceFront + s.nose * 0.55,
        s.nose * 0.65,
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
        faceFront + s.nose * 0.38,
        s.nose * 0.83,
        s.nose * 0.58,
        s.nose * 0.68,
      ),
      0.027,
    );
    return d;
  };
  add(
    sculpt({
      bounds: [
        [-0.48, 1.26, -0.47],
        [0.48, 2.08, 0.53],
      ],
      resolution: 56,
      field: face,
      material: materials.skin,
    }).geometry,
    materials.skin,
    "sculpted-face-neck-nose",
  );

  const hair: DistanceField = (x, y, z) => {
    const front = T.MathUtils.clamp((z - headZ) / (s.head * 0.88), 0, 1);
    const temple = T.MathUtils.clamp(Math.abs(x) / (s.head * 0.86), 0, 1);
    const hairline =
      s.headY + s.head * (0.04 + front * (0.27 + 0.14 * (1 - temple)));
    let d = Math.max(
      ellipsoid(
        x,
        y,
        z,
        0,
        s.headY + s.head * 0.12,
        headZ - s.head * 0.055,
        s.head * 0.915,
        s.head * 0.92,
        s.head * 0.86,
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
          s.headY - s.head * 0.16,
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
    return d;
  };
  add(
    sculpt({
      bounds: [
        [-0.43, 1.45, -0.42],
        [0.43, 2.08, 0.37],
      ],
      resolution: 44,
      field: hair,
      material: materials.hair,
    }).geometry,
    materials.hair,
    "single-sculpted-hair-cap",
  );

  const beard: DistanceField = (x, y, z) => {
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
  add(
    sculpt({
      bounds: [
        [-0.39, 1.02, -0.22],
        [0.39, 1.75, 0.51],
      ],
      resolution: 50,
      field: beard,
      material: materials.beard,
    }).geometry,
    materials.beard,
    "one-piece-sculpted-beard",
  );

  // Small anatomical eyes sit inside the carved sockets.
  for (const side of [-1, 1]) {
    const eyeX = side * s.head * 0.34;
    const eyeY = s.headY + s.head * 0.105;
    const eyeScale = index === 2 ? 1.14 : index === 3 ? 0.8 : 0.9;
    const eyeball = add(
      new T.SphereGeometry(s.head * 0.083 * eyeScale, 24, 16),
      materials.eyeWhite,
      side < 0 ? "left-eye" : "right-eye",
    );
    eyeball.position.set(eyeX, eyeY, faceFront - s.head * 0.075);
    eyeball.scale.set(1.36, 0.51, 0.48);
    const iris = add(
      new T.SphereGeometry(s.head * 0.041 * eyeScale, 20, 12),
      materials.iris,
      side < 0 ? "left-iris" : "right-iris",
    );
    iris.position.set(eyeX, eyeY - s.head * 0.011, faceFront - s.head * 0.021);
    iris.scale.z = 0.42;
    const brow = add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3([
          new T.Vector3(
            eyeX - side * s.head * 0.18,
            eyeY + s.head * 0.155,
            faceFront - s.head * 0.035,
          ),
          new T.Vector3(eyeX, eyeY + s.head * 0.18, faceFront - s.head * 0.019),
          new T.Vector3(
            eyeX + side * s.head * 0.18,
            eyeY + s.head * 0.15,
            faceFront - s.head * 0.065,
          ),
        ]),
        16,
        s.head * 0.026,
        6,
        false,
      ),
      materials.hair,
      side < 0 ? "left-brow" : "right-brow",
    );
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
  const belt = add(
    new T.TorusGeometry(s.waist + 0.04, 0.028, 8, 48, Math.PI),
    materials.leather,
    "leather-belt",
  );
  belt.position.y = 1.045;
  belt.rotation.x = Math.PI / 2;

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
      if (index === 0 || index === 2 || index === 3)
        d = smoothUnion(
          d,
          capsule(
            x,
            y,
            z,
            cx,
            index === 3 ? 0.36 : 0.3,
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
    add(
      sculpt({
        bounds: [
          [side < 0 ? -0.38 : 0.02, -0.01, -0.17],
          [side < 0 ? -0.02 : 0.38, index === 3 ? 0.51 : 0.44, 0.38],
        ],
        resolution: 28,
        field: foot,
        material: materials.leather,
      }).geometry,
      materials.leather,
      side < 0 ? "left-sandal" : "right-sandal",
    );
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
      group.clear();
    },
  };
}

export function buildSculptedLehi(index: number): SculptedLehi {
  return makeSculpted(index);
}
