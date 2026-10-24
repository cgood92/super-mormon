import * as T from "three";
import { cameraSegmentClear } from "./camera";
import type { Solid } from "./physics";

/** Authored views own the camera while active; the follow camera must not also move it. */
export function applyAdventureCamera(
  camera: T.PerspectiveCamera,
  shot: {
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
    cameraSegmentClear(camera.position, candidate, solids, 0.2)
      ? candidate
      : destination,
  );
  camera.lookAt(shot.focus.x, shot.focus.y, shot.focus.z);
}
