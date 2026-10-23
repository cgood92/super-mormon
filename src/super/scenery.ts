import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { softBoxGeometry } from "./soft-geometry";
import * as T from "three";
import type { Solid } from "./physics";

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
