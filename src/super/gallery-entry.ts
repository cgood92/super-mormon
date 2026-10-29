import type { PlayerState, Solid } from "./physics";
import type { WorldData, WorldId, Point } from "./worlds";

/** Coordinates are the visible canvas plane; north faces +Z, east faces -X. */
export type PaintingPortal = {
  x: number;
  z: number;
  y?: number;
  facing?: "north" | "east";
};
const WIDTH = 3.36;
const HEIGHT = 4.36;
const THICKNESS = 0.2;

export function paintingCollider(portal: PaintingPortal): Solid {
  const east = portal.facing === "east";
  return {
    x: portal.x,
    z: portal.z,
    y: portal.y ?? 0.59,
    w: east ? THICKNESS : WIDTH,
    h: HEIGHT,
    d: east ? WIDTH : THICKNESS,
  };
}

/** The contact shell is outside the solid canvas, reachable while pressing it. */
export function canJumpIntoPainting(
  player: Pick<PlayerState, "x" | "y" | "z" | "grounded">,
  portal: PaintingPortal,
): boolean {
  const east = portal.facing === "east";
  const normal = east ? portal.x - player.x : player.z - portal.z;
  const tangent = east ? player.z - portal.z : player.x - portal.x;
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

/** Return to the story's own floor, clear of the canvas and caption plinth. */
export function galleryReturnSpawn(
  world: Pick<WorldData, "spawn" | "portals">,
  story: WorldId | undefined,
): Point {
  const portal = world.portals?.find((entry) => entry.id === story);
  if (!portal) return world.spawn;
  return {
    x: portal.x - (portal.facing === "east" ? 3 : 0),
    y: portal.y - 0.59,
    z: portal.z + (portal.facing === "east" ? 0 : 3),
    yaw: portal.facing === "east" ? -Math.PI / 2 : 0,
  };
}
