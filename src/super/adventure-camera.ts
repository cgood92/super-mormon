import * as T from "three";
import { cameraSegmentClear } from "./camera";
import type { Solid } from "./physics";

/** Authored views own the camera while active; the follow camera must not also move it. */
export function applyAdventureCamera(
  camera: T.PerspectiveCamera,
  shot: {
    /** Static edited cutaway: never sweep the view through intervening scenery. */
    cut?: boolean;
    position: { x: number; y: number; z: number };
    focus: { x: number; y: number; z: number };
  },
  solids: readonly Solid[],
  dt: number,
) {
  const destination = new T.Vector3(
    shot.position.x,
    shot.position.y,
    shot.position.z,
  );
  // Recover an authored endpoint upward before starting a transition into scenery.
  for (
    let i = 0;
    i < 32 && !cameraSegmentClear(destination, destination, solids, 0.2);
    i++
  )
    destination.y += 0.3;
  if (!cameraSegmentClear(destination, destination, solids, 0.2)) return;
  const candidate = camera.position
    .clone()
    .lerp(destination, 1 - Math.exp(-8 * Math.min(dt, 0.1)));
  // Cutting safely across an obstruction is preferable to showing the inside of it.
  camera.position.copy(
    !shot.cut && cameraSegmentClear(camera.position, candidate, solids, 0.2)
      ? candidate
      : destination,
  );
  camera.lookAt(shot.focus.x, shot.focus.y, shot.focus.z);
}

/** Movement follows the visible authored view, even after orbiting the follow camera. */
export function adventureCameraYaw(
  shot:
    | { position: { x: number; z: number }; focus: { x: number; z: number } }
    | undefined,
  fallback: number,
): number {
  if (!shot) return fallback;
  const dx = shot.focus.x - shot.position.x;
  const dz = shot.focus.z - shot.position.z;
  return Number.isFinite(dx) && Number.isFinite(dz) && Math.hypot(dx, dz) > 1e-5
    ? Math.atan2(dx, dz)
    : fallback;
}
