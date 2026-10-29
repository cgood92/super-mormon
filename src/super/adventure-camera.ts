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
  const focus = new T.Vector3(shot.focus.x, shot.focus.y, shot.focus.z);
  // Edited cutaways need a clear sightline; aim views may deliberately target a wall.
  const clear = (eye: T.Vector3) =>
    cameraSegmentClear(eye, eye, solids, 0.2) &&
    (!shot.cut || cameraSegmentClear(eye, focus, solids, 0.2));
  // Recover both the eye and sightline before entering an edited view.
  for (let i = 0; i < 32 && !clear(destination); i++) destination.y += 0.3;
  if (!clear(destination)) return;
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
