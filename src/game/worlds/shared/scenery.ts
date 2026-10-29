import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { softBoxGeometry } from "../../rendering/soft-geometry";
import * as T from "three";
import type { Solid } from "../../physics/physics";

type SceneryPolicy =
  | { kind: "solid"; solids: Solid[] }
  | { kind: "decoration" | "backdrop"; reason: string };
/** Register deliberate physical intent; validation checks the live collision array. */
export function markScenery(object: T.Object3D, policy: SceneryPolicy): void {
  object.userData.scenery = policy;
}
export function sceneryCollisionErrors(
  root: T.Object3D,
  solids: Solid[],
): string[] {
  const errors: string[] = [];
  root.traverse((object) => {
    // Deferred build stages retain their meshes while their collision is inactive.
    // Only invisible ancestry may exclude a surface; visible scenery still validates.
    for (
      let ancestor: T.Object3D | null = object;
      ancestor;
      ancestor = ancestor.parent
    )
      if (!ancestor.visible) return;
    const policy = object.userData.scenery as SceneryPolicy | undefined;
    if (!policy) {
      if (
        object instanceof T.Mesh &&
        /\b(trunk|boulder|limestone|outcrop|crag|rock|ridge|palm)\b/i.test(
          object.name,
        )
      )
        errors.push(
          `${object.name}: unclassified scenery; register collision or explicit decoration/backdrop intent`,
        );
      return;
    }
    if (
      policy.kind === "solid" &&
      (!policy.solids.length || policy.solids.some((s) => !solids.includes(s)))
    )
      errors.push(`${object.name}: missing scenery collision`);
    if (policy.kind !== "solid" && !policy.reason.trim())
      errors.push(`${object.name}: missing nonphysical reason`);
  });
  return errors;
}
/** One dimension source for both the visible box and its physical surface. */
export function sceneryBox(
  parent: T.Group,
  solids: Solid[],
  material: T.Material,
  shape: Solid,
  name: string,
): T.Mesh {
  const mesh = new T.Mesh(
    softBoxGeometry(shape.w, shape.h, shape.d, name),
    material,
  );
  mesh.position.set(shape.x, shape.y + shape.h / 2, shape.z);
  mesh.scale.set(shape.w, shape.h, shape.d);
  mesh.name = name;
  mesh.receiveShadow = true;
  parent.add(mesh);
  solids.push(shape);
  markScenery(mesh, { kind: "solid", solids: [shape] });
  return mesh;
}
/** A round column with one shared diameter/height source and fitted body collision. */
export function sceneryColumn(
  parent: T.Group,
  solids: Solid[],
  material: T.Material,
  shape: { x: number; y: number; z: number; diameter: number; height: number },
  name: string,
): T.Mesh {
  const mesh = new T.Mesh(
    new T.CylinderGeometry(
      shape.diameter / 2,
      shape.diameter / 2,
      shape.height,
      12,
    ),
    material,
  );
  mesh.position.set(shape.x, shape.y + shape.height / 2, shape.z);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const body = {
    x: shape.x,
    y: shape.y,
    z: shape.z,
    w: shape.diameter,
    h: shape.height,
    d: shape.diameter,
  };
  solids.push(body);
  markScenery(mesh, { kind: "solid", solids: [body] });
  parent.add(mesh);
  return mesh;
}

export type CanvasTentShape = {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  eaveHeight: number;
  ridgeHeight: number;
  doorWidth?: number;
};

/** Open A-frame shelter. The sewn roof and its thin physical bands share one profile. */
export function sceneryCanvasTent(
  parent: T.Group,
  solids: Solid[],
  materials: { canvas: T.Material; wood: T.Material; rope?: T.Material },
  shape: CanvasTentShape,
  name: string,
): T.Group {
  const tent = new T.Group();
  tent.name = name;
  parent.add(tent);
  const halfW = shape.width / 2,
    halfD = shape.depth / 2,
    door = Math.min(shape.doorWidth ?? 2.6, shape.width - 0.6),
    sag = Math.min(0.12, (shape.ridgeHeight - shape.eaveHeight) * 0.09);
  const roofY = (localX: number, localZ: number) => {
    const across = Math.abs(localX) / halfW,
      along = (localZ + halfD) / shape.depth;
    return (
      shape.y +
      shape.eaveHeight +
      (shape.ridgeHeight - shape.eaveHeight) * (1 - across) -
      sag * Math.sin(Math.PI * across) * Math.sin(Math.PI * along)
    );
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    label: string,
    material = materials.canvas,
  ) =>
    sceneryBox(
      tent,
      solids,
      material,
      { x, y, z, w, h, d },
      `${name} · ${label}`,
    );
  for (const side of [-1, 1]) {
    box(
      shape.x + side * halfW,
      shape.y,
      shape.z,
      0.14,
      shape.eaveHeight,
      shape.depth,
      `${side < 0 ? "left" : "right"} canvas wall`,
    );
    box(
      shape.x + (side * (door + (shape.width - door) / 2)) / 2,
      shape.y,
      shape.z - halfD,
      (shape.width - door) / 2,
      shape.eaveHeight,
      0.14,
      "doorway canvas",
    );
    sceneryColumn(
      tent,
      solids,
      materials.wood,
      {
        x: shape.x + side * (halfW - 0.18),
        y: shape.y,
        z: shape.z - halfD + 0.18,
        diameter: 0.14,
        height: shape.eaveHeight + 0.1,
      },
      `${name} · front tent pole`,
    );
    sceneryColumn(
      tent,
      solids,
      materials.wood,
      {
        x: shape.x + side * (halfW - 0.18),
        y: shape.y,
        z: shape.z + halfD - 0.18,
        diameter: 0.14,
        height: shape.eaveHeight + 0.1,
      },
      `${name} · rear tent pole`,
    );
  }
  box(
    shape.x,
    shape.y,
    shape.z + halfD,
    shape.width,
    shape.eaveHeight,
    0.14,
    "back canvas wall",
  );
  box(
    shape.x,
    shape.y + shape.eaveHeight - 0.38,
    shape.z - halfD,
    door,
    0.38,
    0.14,
    "door lintel",
  );

  const roofSupports: Solid[] = [];
  const xSegments = 8,
    zSegments = 3;
  for (const side of [-1, 1]) {
    const positions: number[] = [];
    for (let zi = 0; zi < zSegments; zi++)
      for (let xi = 0; xi < xSegments; xi++) {
        const x0 = side * ((halfW * xi) / xSegments),
          x1 = side * ((halfW * (xi + 1)) / xSegments),
          z0 = -halfD + (shape.depth * zi) / zSegments,
          z1 = -halfD + (shape.depth * (zi + 1)) / zSegments;
        const p = (x: number, z: number) => [
          shape.x + x,
          roofY(x, z),
          shape.z + z,
        ];
        if (side < 0)
          positions.push(
            ...p(x0, z0),
            ...p(x1, z0),
            ...p(x1, z1),
            ...p(x0, z0),
            ...p(x1, z1),
            ...p(x0, z1),
          );
        else
          positions.push(
            ...p(x0, z0),
            ...p(x1, z1),
            ...p(x1, z0),
            ...p(x0, z0),
            ...p(x0, z1),
            ...p(x1, z1),
          );
        const top = roofY((x0 + x1) / 2, (z0 + z1) / 2);
        roofSupports.push({
          x: shape.x + (x0 + x1) / 2,
          y: top - 0.1,
          z: shape.z + (z0 + z1) / 2,
          w: Math.abs(x1 - x0),
          h: 0.1,
          d: z1 - z0,
        });
      }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.computeVertexNormals();
    const roof = new T.Mesh(geometry, materials.canvas);
    roof.name = `${name} · ${side < 0 ? "left" : "right"} sewn roof`;
    roof.castShadow = true;
    roof.receiveShadow = true;
    markScenery(roof, {
      kind: "solid",
      solids: roofSupports.filter((s) => side * (s.x - shape.x) > 0),
    });
    tent.add(roof);
  }
  solids.push(...roofSupports);

  // Two folded front flaps leave a clear central opening; ropes are visual guy lines.
  for (const side of [-1, 1]) {
    const flap = new T.BufferGeometry();
    const x = shape.x + (side * door) / 2,
      front = shape.z - halfD - 0.025;
    flap.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        [
          x,
          shape.y + shape.eaveHeight - 0.38,
          front,
          x + side * 0.46,
          shape.y + 0.65,
          front - 0.1,
          x + side * 0.06,
          shape.y + 0.85,
          front - 0.18,
        ],
        3,
      ),
    );
    flap.computeVertexNormals();
    const mesh = new T.Mesh(flap, materials.canvas);
    mesh.name = `${name} · tied entrance flap`;
    markScenery(mesh, {
      kind: "decoration",
      reason: "Folded cloth hangs beside the open doorway",
    });
    tent.add(mesh);
  }
  const ropePoints: T.Vector3[] = [];
  for (const side of [-1, 1])
    for (const end of [-1, 1]) {
      ropePoints.push(
        new T.Vector3(
          shape.x + side * halfW,
          shape.y + shape.eaveHeight,
          shape.z + end * halfD,
        ),
        new T.Vector3(
          shape.x + side * (halfW + 0.75),
          shape.y + 0.3,
          shape.z + end * (halfD + 0.7),
        ),
      );
    }
  const cord = new T.LineSegments(
    new T.BufferGeometry().setFromPoints(ropePoints),
    materials.rope instanceof T.LineBasicMaterial
      ? materials.rope
      : new T.LineBasicMaterial({ color: 0x725838 }),
  );
  cord.name = `${name} · side guy ropes`;
  markScenery(cord, {
    kind: "decoration",
    reason: "Thin tie ropes do not obstruct walking",
  });
  tent.add(cord);
  return tent;
}
/** Smooth faceted rock shell over fitted shallow physical layers. The shell stays within one step of support. */
export function terracedRock(
  parent: T.Group,
  solids: Solid[],
  material: T.Material,
  shape: Solid,
  name: string,
): T.Group {
  const group = new T.Group();
  group.name = name;
  parent.add(group);
  const tiers = Math.ceil(shape.h / 0.2),
    step = shape.h / tiers,
    sides = 8;
  const variation = 0.84 + 0.18 * Math.sin(shape.x * 0.37 + shape.z * 0.21);
  const profile = (t: number) =>
    0.12 + 0.88 * Math.pow(Math.max(0, Math.cos((t * Math.PI) / 2)), variation);
  const vertices: number[] = [],
    colors: number[] = [];
  const point = (layer: number, j: number) => {
    const t = layer / tiers,
      a = (j / sides) * Math.PI * 2,
      taper = profile(t);
    const outline = [
      [-0.47, -0.5],
      [0.47, -0.5],
      [0.5, -0.47],
      [0.5, 0.47],
      [0.47, 0.5],
      [-0.47, 0.5],
      [-0.5, 0.47],
      [-0.5, -0.47],
    ];
    const [x, z] = outline[((j % sides) + sides) % sides];
    return new T.Vector3(x * shape.w * taper, shape.h * t, z * shape.d * taper);
  };
  const triangle = (a: T.Vector3, b: T.Vector3, c: T.Vector3) => {
    vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (const p of [a, b, c]) {
      const shade = 0.97 + 0.03 * Math.sin(p.x * 0.7 + p.z * 0.4 + p.y * 0.3);
      colors.push(shade, shade, shade);
    }
  };
  for (let i = 0; i < tiers; i++)
    for (let j = 0; j < sides; j++) {
      const a = point(i, j),
        b = point(i, j + 1),
        c = point(i + 1, j + 1),
        d = point(i + 1, j);
      triangle(a, d, b);
      triangle(b, d, c);
    }
  for (let j = 0; j < sides; j++)
    triangle(
      point(tiers, j + 1),
      point(tiers, j),
      new T.Vector3(0, shape.h, 0),
    );
  let geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry = mergeVertices(geometry);
  geometry.computeVertexNormals();
  const stone = material.clone();
  if (stone instanceof T.MeshStandardMaterial) {
    stone.vertexColors = true;
    stone.flatShading = false;
  }
  const mesh = new T.Mesh(geometry, stone);
  mesh.position.set(shape.x, shape.y, shape.z);
  mesh.name = `${name} natural surface`;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);
  const surfaces: Solid[] = [];
  // Five fitted horizontal bands keep rounded corners clear, instead of a mountain-sized AABB.
  const bands = 5;
  for (let i = 0; i < tiers; i++) {
    const taper = profile((i + 1) / tiers);
    for (let j = 0; j < bands; j++) {
      const ranges = [
          [-1, -0.97],
          [-0.97, -0.94],
          [-0.94, 0.94],
          [0.94, 0.97],
          [0.97, 1],
        ],
        [a, b] = ranges[j];
      const width = [0.94, 0.97, 1, 0.97, 0.94][j];
      surfaces.push({
        ...shape,
        y: shape.y + i * step,
        h: step,
        w: shape.w * taper * width,
        z: shape.z + ((a + b) * shape.d * taper) / 4,
        d: (shape.d * taper * (b - a)) / 2,
      });
    }
  }
  solids.push(...surfaces);
  markScenery(mesh, { kind: "solid", solids: surfaces });
  return group;
}
