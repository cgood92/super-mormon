import type { Solid } from "./physics";

type GuardRoutePoint = { x: number; z: number };
type GuardRouteBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** Grid route used by pursuing guards; preserves a direct fallback when no route is found. */
export function navigateGuard(
  start: GuardRoutePoint,
  target: GuardRoutePoint,
  solids: Solid[],
  bounds?: GuardRouteBounds,
): { x: number; z: number }[] {
  const size = 1.5,
    b = bounds ?? { minX: -40, maxX: 40, minZ: -40, maxZ: 45 };
  const key = (x: number, z: number) => `${x},${z}`,
    sx = Math.round(start.x / size),
    sz = Math.round(start.z / size),
    tx = Math.round(target.x / size),
    tz = Math.round(target.z / size);
  const queue = [[sx, sz]],
    parent = new Map<string, string | null>([[key(sx, sz), null]]);
  let end = "";
  for (let i = 0; i < queue.length && i < 4000; i++) {
    const [x, z] = queue[i];
    if (Math.abs(x - tx) + Math.abs(z - tz) < 2) {
      end = key(x, z);
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        k = key(nx, nz),
        wx = nx * size,
        wz = nz * size;
      if (
        parent.has(k) ||
        wx < b.minX ||
        wx > b.maxX ||
        wz < b.minZ ||
        wz > b.maxZ
      )
        continue;
      if (
        solids.some(
          (s) =>
            s.y < 1.65 &&
            s.y + s.h > 0.44 &&
            Math.abs(wx - s.x) < s.w / 2 + 0.4 &&
            Math.abs(wz - s.z) < s.d / 2 + 0.4,
        )
      )
        continue;
      parent.set(k, key(x, z));
      queue.push([nx, nz]);
    }
  }
  if (!end) return [{ x: target.x, z: target.z }];
  const path = [];
  for (let k: string | null = end; k; k = parent.get(k) ?? null) {
    const [x, z] = k.split(",").map(Number);
    path.push({ x: x * size, z: z * size });
  }
  return path.reverse().slice(1);
}
