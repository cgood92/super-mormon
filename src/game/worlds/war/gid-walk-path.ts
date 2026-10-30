import type { Point, Solid } from "../../runtime/worlds";

/** Small Gid courtyard navigation grid. Physics still owns every actual step. */
export function gidWalkPath(
  start: Point,
  goal: Point,
  solids: readonly Solid[],
): Point[] {
  const free = (x: number, z: number) =>
    x >= -16 &&
    x <= 16 &&
    z >= 12 &&
    z <= 48 &&
    !solids.some(
      (s) =>
        s.y < 1.7 &&
        s.y + s.h > 0.1 &&
        Math.abs(x - s.x) < s.w / 2 + 0.42 &&
        Math.abs(z - s.z) < s.d / 2 + 0.42,
    );
  const key = (x: number, z: number) => `${x},${z}`;
  const sx = Math.round(start.x),
    sz = Math.round(start.z);
  const queue: [number, number][] = [[sx, sz]],
    parents = new Map<string, string | undefined>([[key(sx, sz), undefined]]);
  let best = queue[0],
    distance = Infinity;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [x, z] = queue[cursor],
      d = Math.hypot(goal.x - x, goal.z - z);
    if (d < distance && free(x, z)) {
      distance = d;
      best = [x, z];
    }
    if (d < 0.55) break;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        k = key(nx, nz);
      if (!free(nx, nz) || parents.has(k)) continue;
      parents.set(k, key(x, z));
      queue.push([nx, nz]);
    }
  }
  const path: Point[] = [];
  let cursor: string | undefined = key(...best);
  while (cursor && parents.has(cursor)) {
    const [x, z] = cursor.split(",").map(Number);
    path.push({ x, y: 0, z });
    cursor = parents.get(cursor);
  }
  path.reverse();
  if (path.length) path.shift();
  return path;
}
