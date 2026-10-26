import type { Point } from "./worlds";

/** Playable interpretation of the wall at Zarahemla; these dimensions are not historical claims. */
export const SAMUEL_WALL = { x: 0, z: 0, w: 48, d: 4, top: 8 } as const;
export const SAMUEL_SPAWN: Point = { x: -12, y: 0, z: 10, yaw: Math.PI };
export const SAMUEL_EXIT: Point = { x: 12, y: 0, z: 10 };
/** Centers of the exterior protruding stones, then the clear wall-top speaking place. */
export const SAMUEL_CLIMB: readonly Point[] = [
  { x: -12, y: 1.15, z: 3.2 },
  { x: -9.6, y: 2.3, z: 3.2 },
  { x: -7.2, y: 3.45, z: 3.2 },
  { x: -4.8, y: 4.6, z: 3.2 },
  { x: -2.4, y: 5.75, z: 3.2 },
  { x: 0, y: 6.9, z: 3.2 },
  { x: 0.8, y: SAMUEL_WALL.top, z: 0.8 },
];
