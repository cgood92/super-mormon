import type { Solid } from "./physics";
type Point = { x: number; y: number; z: number };
/** Feet-based player coordinates; inspect from the character's eyes, above low furniture. */
export function hasLineOfSight(
  player: Point,
  target: Point,
  solids: readonly Solid[],
): boolean {
  const origin = [player.x, player.y + 1.45, player.z];
  const delta = [
    target.x - origin[0],
    target.y + 0.25 - origin[1],
    target.z - origin[2],
  ];
  for (const s of solids) {
    let lo = 0,
      hi = 1;
    const min = [s.x - s.w / 2, s.y, s.z - s.d / 2],
      max = [s.x + s.w / 2, s.y + s.h, s.z + s.d / 2];
    for (let axis = 0; axis < 3; axis++) {
      if (Math.abs(delta[axis]) < 0.0001) {
        if (origin[axis] < min[axis] || origin[axis] > max[axis]) {
          hi = -1;
          break;
        }
      } else {
        const a = (min[axis] - origin[axis]) / delta[axis],
          b = (max[axis] - origin[axis]) / delta[axis];
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
      }
    }
    if (lo < hi && hi > 0.06 && lo < 0.88) return false;
  }
  return true;
}
