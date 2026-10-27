import type { PlayerState, Solid } from "./physics";

/** Coordinates are the visible canvas plane; north faces +Z, east faces -X, west faces +X. */
export type PaintingPortal = {
  x: number;
  z: number;
  y?: number;
  facing?: "north" | "east" | "west";
};
const WIDTH = 3.36;
const HEIGHT = 4.36;
const THICKNESS = 0.2;

export function paintingCollider(portal: PaintingPortal): Solid {
  const side = portal.facing === "east" || portal.facing === "west";
  return {
    x: portal.x,
    z: portal.z,
    y: portal.y ?? 0.59,
    w: side ? THICKNESS : WIDTH,
    h: HEIGHT,
    d: side ? WIDTH : THICKNESS,
  };
}

/** The contact shell is outside the solid canvas, reachable while pressing it. */
export function canJumpIntoPainting(
  player: Pick<PlayerState, "x" | "y" | "z" | "grounded">,
  portal: PaintingPortal,
): boolean {
  const side = portal.facing === "east" || portal.facing === "west";
  const normal = side
    ? (portal.facing === "east" ? -1 : 1) * (player.x - portal.x)
    : player.z - portal.z;
  const tangent = side ? player.z - portal.z : player.x - portal.x;
  const bottom = portal.y ?? 0.59;
  return (
    !player.grounded &&
    player.y > bottom - 0.24 &&
    player.y < bottom + HEIGHT &&
    normal >= THICKNESS / 2 &&
    normal <= THICKNESS / 2 + 0.52 &&
    Math.abs(tangent) <= WIDTH / 2 - 0.15
  );
}
