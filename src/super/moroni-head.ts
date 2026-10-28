import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Dedicated adult commander portrait. All surfaces are owned by the caller's add/dispose path. */
export function addMoroniHead(
  group: T.Group,
  add: (
    geometry: T.BufferGeometry,
    material: T.Material,
    name: string,
  ) => T.Mesh,
  extraMaterials: T.Material[],
  headY: number,
  headZ: number,
  headRadius: number,
  quality: "hero" | "npc" | "crowd",
): void {
  const crowd = quality === "crowd",
    hero = quality === "hero",
    r = headRadius / 0.337;
  for (const name of [
    "sculpted-face-neck-nose",
    "single-sculpted-hair-cap",
    "left-eye",
    "right-eye",
    "left-iris",
    "right-iris",
    "left-brow",
    "right-brow",
    "character-mouth",
    "left-ear",
    "right-ear",
    "character-ear-left",
    "character-ear-right",
    "sculpted-beard",
    "single-sculpted-beard",
    "one-piece-sculpted-beard",
  ]) {
    const old = group.getObjectByName(name);
    old?.removeFromParent();
  }
  const mat = (color: number, roughness = 0.8) => {
    const m = new T.MeshStandardMaterial({ color, roughness });
    extraMaterials.push(m);
    return m;
  };
  const skin = mat(0xbc8760),
    lip = mat(0x815142),
    hair = mat(0x30231c),
    white = mat(0xd8cdb8, 0.5),
    iris = mat(0x38291b, 0.4);
  const place = (
    g: T.BufferGeometry,
    m: T.Material,
    n: string,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    g.scale(r, r, r);
    g.translate(x * r, headY + y * r, headZ + z * r);
    const mesh = add(g, m, n);
    mesh.castShadow = true;
    return mesh;
  };
  // Rings shape a broad mandible, projecting chin, cheekbones and a longer adult midface.
  const profile = [
    [-0.4, 0.145, 0.125, -0.055],
    [-0.3, 0.15, 0.135, -0.025],
    [-0.255, 0.185, 0.17, 0.005],
    [-0.215, 0.235, 0.19, 0.003],
    [-0.15, 0.267, 0.202, -0.005],
    [-0.07, 0.287, 0.216, -0.012],
    [0.02, 0.279, 0.217, -0.02],
    [0.11, 0.275, 0.222, -0.024],
    [0.2, 0.264, 0.227, -0.025],
    [0.28, 0.21, 0.19, -0.03],
    [0.325, 0.09, 0.09, -0.035],
    [0.34, 0.001, 0.001, -0.035],
  ];
  const sample = (y: number, col: number) => {
    let i = 0;
    while (i < profile.length - 2 && y > profile[i + 1][0]) i++;
    const t = T.MathUtils.clamp(
      (y - profile[i][0]) / (profile[i + 1][0] - profile[i][0]),
      0,
      1,
    );
    return T.MathUtils.lerp(profile[i][col], profile[i + 1][col], t);
  };
  const gauss = (x: number, c: number, w: number) =>
    Math.exp(-(((x - c) / w) ** 2));
  const front = (x: number, y: number) => {
    const width = sample(y, 1),
      depth = sample(y, 2),
      base =
        sample(y, 3) + depth * Math.sqrt(Math.max(0, 1 - (x / width) ** 2));
    return (
      base +
      0.071 * gauss(x, 0, 0.041) * gauss(y, 0.012, 0.115) +
      0.075 * gauss(x, 0, 0.052) * gauss(y, -0.043, 0.038) +
      0.021 * gauss(x, 0, 0.095) * gauss(y, -0.218, 0.035) +
      0.017 * gauss(x, 0, 0.09) * gauss(y, -0.133, 0.034) -
      0.026 *
        (gauss(x, -0.12, 0.063) + gauss(x, 0.12, 0.063)) *
        gauss(y, 0.035, 0.038) +
      0.017 *
        (gauss(x, -0.15, 0.065) + gauss(x, 0.15, 0.065)) *
        gauss(y, -0.045, 0.036)
    );
  };
  const grid = (
    rows: number,
    cols: number,
    fn: (v: number, u: number) => T.Vector3,
    reverse = true,
  ) => {
    const positions: number[] = [],
      indices: number[] = [];
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const v = fn(j / rows, i / cols);
        positions.push(v.x, v.y, v.z);
      }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const a = j * (cols + 1) + i,
          b = a + cols + 1;
        if (reverse) indices.push(a, a + 1, b, b, a + 1, b + 1);
        else indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  };
  place(
    grid(crowd ? 10 : hero ? 40 : 26, crowd ? 12 : hero ? 48 : 32, (v, u) => {
      const y = -0.4 + v * 0.74,
        a = u * Math.PI * 2,
        x = Math.sin(a) * sample(y, 1);
      const z =
        Math.cos(a) >= 0
          ? front(x, y)
          : sample(y, 3) + Math.cos(a) * sample(y, 2);
      return new T.Vector3(x, y, z);
    }),
    skin,
    "sculpted-face-neck-nose",
  );
  // A cut hair shell supplies the back and temples; overlapping tapered locks define its swept crown.
  place(
    grid(crowd ? 5 : 10, crowd ? 12 : 24, (v, u) => {
      const a = u * Math.PI * 2,
        lower = 0.015 + 0.13 * Math.max(0, Math.cos(a)),
        p = (1 - v) * Math.acos(lower / 0.41);
      return new T.Vector3(
        0.33 * Math.sin(p) * Math.sin(a),
        0.41 * Math.cos(p),
        -0.025 + 0.285 * Math.sin(p) * Math.cos(a),
      );
    }),
    hair,
    "single-sculpted-hair-cap",
  );
  const locks = crowd ? 4 : 10;
  for (let k = 0; k < locks; k++) {
    const x = -0.25 + (k / (locks - 1)) * 0.48;
    place(
      grid(
        crowd ? 4 : 8,
        crowd ? 4 : 6,
        (v, u) => {
          const a = u * Math.PI * 2,
            taper = 0.24 + 0.76 * Math.sin(Math.PI * v) ** 0.55,
            side = x + 0.1 * Math.sin(v * Math.PI) * (0.7 + x),
            y =
              0.23 +
              (0.13 + 0.035 * Math.sin(k * 0.8)) * Math.sin(v * Math.PI) +
              0.035 * (1 - x),
            z = 0.21 - 0.43 * v;
          return new T.Vector3(
            side + 0.062 * taper * Math.cos(a),
            y + 0.043 * taper * Math.sin(a),
            z,
          );
        },
        false,
      ),
      hair,
      `moroni-swept-lock-${k}`,
    );
  }
  const oval = (
    name: string,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const g = new T.SphereGeometry(1, crowd ? 4 : 10, crowd ? 3 : 6);
    g.scale(sx, sy, sz);
    return place(g, m, name, x, y, z);
  };
  for (const side of [-1, 1]) {
    const label = side < 0 ? "left" : "right",
      x = side * 0.117,
      ey = 0.035,
      ez = front(x, ey) + 0.008;
    // Fitted patches follow the face curvature, preventing ball-like floating eyes.
    const patch = (
      name: string,
      material: T.Material,
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      offset: number,
    ) => {
      const geo = grid(
        crowd ? 2 : 4,
        crowd ? 8 : 16,
        (v, u) => {
          const a = u * Math.PI * 2,
            px = cx + rx * v * Math.cos(a),
            py = cy + ry * v * Math.sin(a);
          return new T.Vector3(
            px,
            py,
            front(px, py) + offset + 0.003 * (1 - v * v),
          );
        },
        false,
      );
      return place(geo, material, name);
    };
    const eye = patch(`${label}-eye`, white, x, ey, 0.056, 0.014, 0.007);
    eye.geometry.translate(-x * r, -headY - ey * r, -headZ - ez * r);
    eye.position.set(x * r, headY + ey * r, headZ + ez * r);
    patch(
      `${label}-iris`,
      iris,
      x - side * 0.003,
      ey + 0.001,
      0.022,
      0.013,
      0.012,
    );
    const brow = grid(
      crowd ? 1 : 3,
      crowd ? 6 : 12,
      (v, u) => {
        const px = x + (u - 0.5) * 0.14,
          py =
            0.077 +
            0.009 * side * (u - 0.5) +
            (0.5 - v) * 0.019 * Math.sin(Math.PI * u) ** 0.3;
        return new T.Vector3(
          px,
          py,
          front(px, py) + 0.006 + 0.006 * Math.sin(Math.PI * v),
        );
      },
      false,
    );
    place(brow, hair, `${label}-brow`);
    if (!crowd) {
      for (const upper of [true, false]) {
        const g = grid(
          2,
          12,
          (v, u) => {
            const px = x + (u - 0.5) * 0.116,
              arc = Math.sin(Math.PI * u),
              py = ey + (upper ? 1 : -1) * (0.013 * arc + v * 0.006);
            return new T.Vector3(
              px,
              py,
              front(px, py) + 0.008 + 0.004 * Math.sin(Math.PI * v),
            );
          },
          upper,
        );
        place(g, skin, `moroni-${label}-${upper ? "upper" : "lower"}-lid`);
      }
    }
    oval(
      `character-ear-${label}`,
      skin,
      side * 0.284,
      -0.012,
      -0.023,
      0.041,
      0.081,
      0.043,
    );
    if (!crowd) {
      oval(
        `moroni-${label}-ear-concha`,
        lip,
        side * 0.311,
        -0.012,
        0.002,
        0.01,
        0.041,
        0.023,
      );
      oval(
        `moroni-${label}-ear-tragus`,
        skin,
        side * 0.307,
        -0.024,
        0.024,
        0.012,
        0.022,
        0.014,
      );
    }
  }
  const mouth = grid(crowd ? 1 : 2, crowd ? 8 : 18, (v, u) => {
    const x = (u - 0.5) * 0.145,
      y =
        -0.135 + (v - 0.5) * 0.006 + 0.004 * Math.cos((u - 0.5) * Math.PI * 2);
    return new T.Vector3(x, y, front(x, y) + 0.002);
  });
  place(mouth, lip, "character-mouth");
  // Batch static facial patches and rooted locks while preserving the rig's canonical nodes.
  const batch = (ownerName: string, select: (name: string) => boolean) => {
    const owner = group.getObjectByName(ownerName) as T.Mesh;
    const parts = group.children.filter(
      (o) => o instanceof T.Mesh && select(o.name),
    ) as T.Mesh[];
    if (!parts.length) return;
    for (const part of parts) part.geometry.deleteAttribute("uv");
    const merged = mergeGeometries([
      owner.geometry,
      ...parts.map((p) => p.geometry),
    ]);
    if (!merged) throw new Error("Moroni head surface merge failed");
    const replacement = add(merged, owner.material as T.Material, ownerName);
    replacement.castShadow = true;
    owner.removeFromParent();
    for (const part of parts) part.removeFromParent();
  };
  batch("single-sculpted-hair-cap", (name) =>
    name.startsWith("moroni-swept-lock-"),
  );
  batch("sculpted-face-neck-nose", (name) =>
    /^moroni-(left|right)-(upper-lid|lower-lid|ear-tragus)$/.test(name),
  );
  const face = group.getObjectByName("sculpted-face-neck-nose")!;
  const hairShell = group.getObjectByName("single-sculpted-hair-cap")!;
  for (const child of [...group.children]) {
    if (child.name.startsWith("moroni-swept-lock-")) hairShell.add(child);
    else if (
      /^moroni-(left|right)-(upper-lid|lower-lid|ear-concha|ear-tragus)$/.test(
        child.name,
      )
    )
      face.add(child);
  }
}
