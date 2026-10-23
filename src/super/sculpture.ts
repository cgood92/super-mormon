import * as T from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";

export type DistanceField = (x: number, y: number, z: number) => number;
export function smoothUnion(a: number, b: number, k = 0.08): number {
  const h = Math.max(0, Math.min(1, 0.5 + (b - a) / (2 * k)));
  return b + (a - b) * h - k * h * (1 - h);
}
export function ellipsoid(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
): number {
  const dx = x - cx,
    dy = y - cy,
    dz = z - cz;
  const k0 = Math.hypot(dx / rx, dy / ry, dz / rz);
  const k1 = Math.hypot(dx / (rx * rx), dy / (ry * ry), dz / (rz * rz));
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}
export function capsule(
  x: number,
  y: number,
  z: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  r: number,
): number {
  const px = x - ax,
    py = y - ay,
    pz = z - az;
  const dx = bx - ax,
    dy = by - ay,
    dz = bz - az;
  const h = T.MathUtils.clamp(
    (px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz || 1),
    0,
    1,
  );
  return Math.hypot(px - dx * h, py - dy * h, pz - dz * h) - r;
}
export function sculpt(options: {
  bounds: [[number, number, number], [number, number, number]];
  resolution?: number;
  field: DistanceField;
  material: T.Material;
  color?: (
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
  ) => T.ColorRepresentation;
}): T.Mesh {
  const size = options.resolution ?? 56;
  const min = new T.Vector3(...options.bounds[0]);
  const max = new T.Vector3(...options.bounds[1]);
  const extent = max.clone().sub(min);
  const center = max.clone().add(min).multiplyScalar(0.5);
  const mc = new MarchingCubes(size, options.material, false, false, 100000);
  mc.isolation = 0;
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        mc.field[z * size * size + y * size + x] = -options.field(
          min.x + (extent.x * x) / size,
          min.y + (extent.y * y) / size,
          min.z + (extent.z * z) / size,
        );
      }
  mc.update();
  const geometry = new T.BufferGeometry();
  const positions = mc.positionArray.slice(0, mc.count * 3);
  const normals = mc.normalArray.slice(0, mc.count * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = center.x + (positions[i] * extent.x) / 2;
    positions[i + 1] = center.y + (positions[i + 1] * extent.y) / 2;
    positions[i + 2] = center.z + (positions[i + 2] * extent.z) / 2;
    const length =
      Math.hypot(
        normals[i] / extent.x,
        normals[i + 1] / extent.y,
        normals[i + 2] / extent.z,
      ) || 1;
    normals[i] = normals[i] / extent.x / length;
    normals[i + 1] = normals[i + 1] / extent.y / length;
    normals[i + 2] = normals[i + 2] / extent.z / length;
  }
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new T.BufferAttribute(normals, 3));
  if (options.color) {
    const colors = new Float32Array(positions.length);
    const c = new T.Color();
    for (let i = 0; i < positions.length; i += 3) {
      c.set(
        options.color(
          positions[i],
          positions[i + 1],
          positions[i + 2],
          normals[i],
          normals[i + 1],
          normals[i + 2],
        ),
      );
      c.toArray(colors, i);
    }
    geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
    if ("vertexColors" in options.material)
      options.material.vertexColors = true;
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  mc.geometry.dispose();
  const mesh = new T.Mesh(geometry, options.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
