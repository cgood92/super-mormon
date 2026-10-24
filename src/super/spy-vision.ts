import type { Solid } from "./physics";

type Point = { x: number; y: number; z: number };
export type SpyVision = {
  eye: Point;
  /** World radians: yaw zero faces +Z; positive pitch looks upward. */
  headYaw: number;
  headPitch: number;
  playerPosition: Point;
  playerHeight?: number;
  playerRadius?: number;
  solids: readonly Solid[];
  maxDistance?: number;
  /** The wider warning hint may use this; actual detection uses the default. */
  halfAngleRadians?: number;
};

export function spyEyePosition(position: Point, height = 1.65): Point {
  return { x: position.x, y: position.y + height, z: position.z };
}

/** Closed segment against physical boxes, including an eye embedded in scenery. */
export function spySightLineClear(
  start: Point,
  end: Point,
  solids: readonly Solid[],
): boolean {
  return !solids.some((solid) => {
    let enter = 0,
      exit = 1;
    for (const [origin, delta, min, max] of [
      [start.x, end.x - start.x, solid.x - solid.w / 2, solid.x + solid.w / 2],
      [start.y, end.y - start.y, solid.y, solid.y + solid.h],
      [start.z, end.z - start.z, solid.z - solid.d / 2, solid.z + solid.d / 2],
    ]) {
      if (Math.abs(delta) < 1e-9) {
        if (origin < min || origin > max) return false;
      } else {
        const a = (min - origin) / delta,
          b = (max - origin) / delta;
        enter = Math.max(enter, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
        if (enter > exit) return false;
      }
    }
    return true;
  });
}

/** Only the rendered head's gaze counts. Body facing and proximity confer no sight. */
export function spyCanSeePlayer(options: SpyVision): boolean {
  const { eye, headYaw, headPitch, playerPosition: player, solids } = options;
  const height = options.playerHeight ?? 1.65;
  const radius = options.playerRadius ?? 0.32;
  const maxDistance = options.maxDistance ?? 18;
  const threshold = Math.cos(options.halfAngleRadians ?? (8 * Math.PI) / 180);
  const gaze = {
    x: Math.sin(headYaw) * Math.cos(headPitch),
    y: Math.sin(headPitch),
    z: Math.cos(headYaw) * Math.cos(headPitch),
  };
  // Samples lie inside the visible torso/head silhouette, never at feet or outside
  // the player's body. Alignment and occlusion must pass for the SAME sample.
  const lateral = {
    x: Math.cos(headYaw) * radius * 0.7,
    z: -Math.sin(headYaw) * radius * 0.7,
  };
  for (const fraction of [0.58, 0.9, 0.98]) {
    for (const side of [0, -1, 1]) {
      const target = {
        x: player.x + lateral.x * side,
        y: player.y + height * fraction,
        z: player.z + lateral.z * side,
      };
      const dx = target.x - eye.x,
        dy = target.y - eye.y,
        dz = target.z - eye.z;
      const distance = Math.hypot(dx, dy, dz);
      if (distance < 1e-6 || distance > maxDistance) continue;
      const alignment = (dx * gaze.x + dy * gaze.y + dz * gaze.z) / distance;
      if (
        alignment + 1e-12 >= threshold &&
        spySightLineClear(eye, target, solids)
      )
        return true;
    }
  }
  return false;
}
