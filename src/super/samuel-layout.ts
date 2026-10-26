import type { Point, Solid } from "./worlds";

/** Playable interpretation of the wall at Zarahemla; these dimensions are not historical claims. */
export const SAMUEL_WALL = { x: 0, z: 0, w: 48, d: 4, top: 8 } as const;
export const SAMUEL_SPAWN: Point = { x: -12, y: 0, z: 10, yaw: Math.PI };
export const SAMUEL_EXIT: Point = { x: 12, y: 0, z: 10 };
export const SAMUEL_SPEAKING_POINT: Point = {
  x: 0.8,
  y: SAMUEL_WALL.top,
  z: 0.8,
};

export type SamuelBlock = {
  id: string;
  x: number;
  top: number;
  width: number;
  depth: number;
  thickness: number;
};

/** Fixed, irregular stones across the wall. Routes share the starter, fork,
 * reverse once, and rejoin the broad top; the eastern field gives another
 * approach from the plain. The rear 0.04 m of every stone embeds in the wall. */
export const SAMUEL_BLOCKS: readonly SamuelBlock[] = [
  { id: "starter", x: -12, top: 1.05, width: 2.8, depth: 3.1, thickness: 0.4 },
  {
    id: "west-low",
    x: -15.1,
    top: 2.2,
    width: 2.8,
    depth: 3.5,
    thickness: 0.48,
  },
  {
    id: "west-outlook",
    x: -18.4,
    top: 3.28,
    width: 3,
    depth: 3.4,
    thickness: 0.38,
  },
  {
    id: "west-turn",
    x: -16,
    top: 4.48,
    width: 2.8,
    depth: 1.45,
    thickness: 0.44,
  },
  {
    id: "west-return",
    x: -12.7,
    top: 5.55,
    width: 3.1,
    depth: 2.8,
    thickness: 0.35,
  },
  {
    id: "west-high",
    x: -10.5,
    top: 6.75,
    width: 2.8,
    depth: 2.4,
    thickness: 0.42,
  },
  {
    id: "right-low",
    x: -9.2,
    top: 2.15,
    width: 2.7,
    depth: 3.4,
    thickness: 0.36,
  },
  {
    id: "right-outlook",
    x: -6.1,
    top: 3.35,
    width: 3,
    depth: 3.4,
    thickness: 0.45,
  },
  {
    id: "right-turn",
    x: -8.4,
    top: 4.45,
    width: 2.8,
    depth: 1.45,
    thickness: 0.4,
  },
  {
    id: "right-return",
    x: -5,
    top: 5.6,
    width: 3.1,
    depth: 2.1,
    thickness: 0.38,
  },
  {
    id: "right-high",
    x: -2.1,
    top: 6.82,
    width: 2.8,
    depth: 2.6,
    thickness: 0.44,
  },
  {
    id: "far-east-low",
    x: 16.5,
    top: 1.05,
    width: 2.9,
    depth: 3.1,
    thickness: 0.37,
  },
  {
    id: "far-east-out",
    x: 19.8,
    top: 2.17,
    width: 3.1,
    depth: 3.4,
    thickness: 0.46,
  },
  {
    id: "far-east-turn",
    x: 17.4,
    top: 3.26,
    width: 2.8,
    depth: 1.45,
    thickness: 0.4,
  },
  {
    id: "far-east-middle",
    x: 14.8,
    top: 4.4,
    width: 3,
    depth: 3.1,
    thickness: 0.43,
  },
  {
    id: "far-east-return",
    x: 11.4,
    top: 5.55,
    width: 2.9,
    depth: 2.5,
    thickness: 0.36,
  },
  {
    id: "far-east-high",
    x: 8.9,
    top: 6.72,
    width: 2.8,
    depth: 2.7,
    thickness: 0.44,
  },
];

/** Two immediate choices from the starter, plus a third entrance along the
 * eastern stretch. These are examples through the whole visible stone field. */
export const SAMUEL_ROUTES = {
  left: [
    "starter",
    "west-low",
    "west-outlook",
    "west-turn",
    "west-return",
    "west-high",
  ],
  right: [
    "starter",
    "right-low",
    "right-outlook",
    "right-turn",
    "right-return",
    "right-high",
  ],
  farEast: [
    "far-east-low",
    "far-east-out",
    "far-east-turn",
    "far-east-middle",
    "far-east-return",
    "far-east-high",
  ],
} as const;

export function samuelBlockSolid(block: SamuelBlock): Solid {
  return {
    x: block.x,
    y: block.top - block.thickness,
    z: SAMUEL_WALL.z + SAMUEL_WALL.d / 2 - 0.04 + block.depth / 2,
    w: block.width,
    h: block.thickness,
    d: block.depth,
  };
}

export function samuelBlockPoint(block: SamuelBlock): Point {
  return { x: block.x, y: block.top, z: samuelBlockSolid(block).z };
}
