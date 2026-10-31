import * as T from "three";
import type { PlayerState } from "./physics";
import {
  resolveCameraPosition,
  cameraSegmentClear,
} from "../../src/game/camera/camera";
import type { Solid } from "../../src/game/physics/physics";
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** Throwaway geometric trailing-camera experiment; inspired by SM64, independently tuned. */
export class TrailingCamera {
  yaw = 0;
  pitch = 0.2;
  private distance = 7.2;
  private anchor = new T.Vector3();
  private lead = new T.Vector3();
  private recentering = 0;
  constructor(readonly camera: T.PerspectiveCamera) {}
  reset(p: PlayerState) {
    this.yaw = p.yaw;
    this.pitch = 0.2;
    this.distance = 7.2;
    this.lead.set(0, 0, 0);
    this.recentering = 0;
    this.anchor.set(p.x, p.y + 1, p.z);
    this.camera.position.set(
      p.x - Math.sin(this.yaw) * this.distance,
      this.anchor.y + Math.tan(this.pitch) * this.distance,
      p.z - Math.cos(this.yaw) * this.distance,
    );
    this.camera.lookAt(this.anchor);
  }
  update(
    dt: number,
    p: PlayerState,
    orbit: { orbitX: number; orbitY: number; recenter: boolean },
    solids: Solid[] = [],
  ) {
    dt = Math.min(0.05, Math.max(0, dt));
    this.distance +=
      (7.2 + Math.min(1, p.runSpeed / 6.5) * 0.7 - this.distance) * ease(2, dt);
    this.anchor.x = p.x;
    this.anchor.z = p.z;
    // Keep small jump motions out of the camera; follow sustained elevation smoothly.
    this.anchor.y += (p.y + 1 - this.anchor.y) * ease(p.grounded ? 9 : 3, dt);
    // Preserve the previous camera's horizontal position before enforcing its leash.
    // Sideways input moves tangent to this leash, changing the next input frame.
    const dx = p.x - this.camera.position.x,
      dz = p.z - this.camera.position.z;
    if (Math.hypot(dx, dz) > 0.1) this.yaw = Math.atan2(dx, dz);
    this.yaw += orbit.orbitX;
    this.pitch = T.MathUtils.clamp(this.pitch + orbit.orbitY, 0.08, 0.8);
    if (orbit.recenter) this.recentering = 0.8;
    if (Math.abs(orbit.orbitX) > 0.0001) this.recentering = 0;
    if (this.recentering > 0) {
      this.yaw += angleDiff(p.yaw, this.yaw) * ease(7, dt);
      this.recentering -= dt;
    }
    const desired = new T.Vector3(
      p.x - Math.sin(this.yaw) * this.distance,
      this.anchor.y + Math.tan(this.pitch) * this.distance,
      p.z - Math.cos(this.yaw) * this.distance,
    );
    const safe = resolveCameraPosition(this.anchor, desired, solids, 0.22);
    if (cameraSegmentClear(this.camera.position, safe, solids, 0.22))
      this.camera.position.copy(safe);
    else
      this.camera.position.copy(
        resolveCameraPosition(this.anchor, this.camera.position, solids, 0.22),
      );
    // Modest look-ahead affects framing, independently of the locomotion reference.
    this.lead.lerp(new T.Vector3(p.vx * 0.045, 0, p.vz * 0.045), ease(5, dt));
    this.camera.lookAt(this.anchor.clone().add(this.lead));
  }
}
/** Existing game input supplies deadzone removal; this adds SM64-like magnitude shaping. */
export function shapeStick(x: number, y: number, curved: boolean) {
  const magnitude = Math.min(1, Math.hypot(x, y));
  const length = Math.hypot(x, y);
  const response = curved ? magnitude * magnitude : magnitude;
  return {
    x: length ? (x / length) * response : 0,
    y: length ? (y / length) * response : 0,
    magnitude,
    response,
  };
}
