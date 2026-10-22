import * as T from "three";
import type { Solid } from "./physics";

export type CameraPlayer = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  grounded?: boolean;
  runSpeed?: number;
  crouching?: boolean;
};
export type CameraOrbit = {
  orbitX: number;
  orbitY: number;
  recenter: boolean;
  zoom?: number;
};
export type CameraMode = "hub" | "streets" | "house" | "palace";

const MODES: Record<
  CameraMode,
  { distance: number; elevation: number; targetHeight: number }
> = {
  hub: { distance: 7.4, elevation: 0.53, targetHeight: 1.1 },
  streets: { distance: 7, elevation: 0.53, targetHeight: 1.1 },
  house: { distance: 6.2, elevation: 0.52, targetHeight: 1.1 },
  palace: { distance: 7, elevation: 0.52, targetHeight: 1.1 },
};

const ZOOM_DISTANCES = [0.6, 1, 1.4] as const;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
const ease = (speed: number, dt: number) =>
  1 - Math.exp(-speed * Math.min(Math.max(dt, 0), 0.1));

/** Cast the target-to-camera segment against the axis-aligned level solids. */
export function resolveCameraPosition(
  target: T.Vector3,
  desired: T.Vector3,
  solids: readonly Solid[],
  radius = 0.18,
): T.Vector3 {
  const ray = desired.clone().sub(target);
  let nearest = 1;
  for (const solid of solids) {
    const mins = [
      solid.x - solid.w / 2 - radius,
      solid.y - radius,
      solid.z - solid.d / 2 - radius,
    ];
    const maxs = [
      solid.x + solid.w / 2 + radius,
      solid.y + solid.h + radius,
      solid.z + solid.d / 2 + radius,
    ];
    let enter = 0;
    let exit = 1;
    const origin = [target.x, target.y, target.z];
    const direction = [ray.x, ray.y, ray.z];
    let misses = false;
    for (let axis = 0; axis < 3; axis++) {
      const d = direction[axis];
      if (Math.abs(d) < 1e-8) {
        if (origin[axis] < mins[axis] || origin[axis] > maxs[axis])
          misses = true;
        continue;
      }
      let first = (mins[axis] - origin[axis]) / d;
      let last = (maxs[axis] - origin[axis]) / d;
      if (first > last) [first, last] = [last, first];
      enter = Math.max(enter, first);
      exit = Math.min(exit, last);
    }
    if (!misses && enter <= exit && exit >= 0 && enter < nearest)
      nearest = enter;
  }
  if (nearest >= 1) return desired.clone();
  // Keep the near plane and the character visible even in a tight doorway.
  const distance = ray.length();
  return target
    .clone()
    .addScaledVector(ray, clamp(nearest - 0.12 / distance, 0.12, 1));
}

export class FollowCamera {
  /** Camera-relative movement yaw: 0 points toward world +Z. */
  yaw = 0;
  pitch = MODES.hub.elevation;
  private target = new T.Vector3();
  private manualCooldown = 0;
  private stableHeadingTime = 0;
  private previousHeading = 0;
  private smoothDistance = MODES.hub.distance;
  private zoomLevel = 1;
  private initialized = false;
  private recentering = false;

  constructor(readonly camera: T.PerspectiveCamera) {}

  reset(
    player: CameraPlayer,
    yawOverride = player.yaw,
    mode: CameraMode = "hub",
  ): void {
    const preset = MODES[mode];
    this.yaw = yawOverride;
    this.pitch = preset.elevation;
    this.manualCooldown = 0;
    this.stableHeadingTime = 0;
    this.previousHeading = player.yaw;
    this.recentering = false;
    this.zoomLevel = 1;
    this.smoothDistance = preset.distance;
    this.target.set(
      player.x,
      player.y + (player.crouching ? 0.58 : preset.targetHeight),
      player.z,
    );
    this.camera.position.copy(this.desired(this.target, preset.distance));
    this.camera.lookAt(this.target);
    this.initialized = true;
  }

  update(
    dt: number,
    player: CameraPlayer,
    solids: readonly Solid[],
    orbit: CameraOrbit = { orbitX: 0, orbitY: 0, recenter: false },
    mode: CameraMode = "hub",
  ): void {
    if (!this.initialized) this.reset(player, player.yaw, mode);
    dt = clamp(dt, 0, 0.1);
    const preset = MODES[mode];
    if (orbit.zoom)
      this.zoomLevel = clamp(this.zoomLevel + Math.sign(orbit.zoom), 0, 2);
    if (Math.abs(orbit.orbitX) + Math.abs(orbit.orbitY) > 0.0001) {
      this.yaw += orbit.orbitX;
      this.pitch = clamp(this.pitch + orbit.orbitY, 0.13, 1.12);
      this.manualCooldown = 2.5;
      this.stableHeadingTime = 0;
      this.recentering = false;
    } else {
      this.manualCooldown = Math.max(0, this.manualCooldown - dt);
    }
    const headingChange = Math.abs(angleDiff(player.yaw, this.previousHeading));
    this.previousHeading = player.yaw;
    this.stableHeadingTime =
      (player.runSpeed ?? 0) > 2.4 && headingChange < 0.045
        ? Math.min(2, this.stableHeadingTime + dt)
        : 0;
    if (orbit.recenter) {
      this.manualCooldown = 0;
      this.stableHeadingTime = 2;
      this.recentering = true;
    }
    // Locomotion is camera-relative. Following a sustained sideward input would
    // feed the camera's turn back into player heading and make both spiral.
    const nearlyForward = Math.abs(angleDiff(player.yaw, this.yaw)) < 0.25;
    if (
      this.recentering ||
      (this.manualCooldown <= 0 &&
        this.stableHeadingTime > 0.9 &&
        nearlyForward)
    ) {
      this.yaw +=
        angleDiff(player.yaw, this.yaw) *
        ease(this.recentering ? 5.5 : 0.5, dt);
      this.pitch += (preset.elevation - this.pitch) * ease(1.3, dt);
      if (Math.abs(angleDiff(player.yaw, this.yaw)) < 0.015)
        this.recentering = false;
    }
    const wantedTarget = new T.Vector3(
      player.x,
      player.y + (player.crouching ? 0.58 : preset.targetHeight),
      player.z,
    );
    this.target.lerp(wantedTarget, ease(10, dt));
    const desired = this.desired(
      this.target,
      preset.distance * ZOOM_DISTANCES[this.zoomLevel],
    );
    const safe = resolveCameraPosition(this.target, desired, solids);
    const safeDistance = safe.distanceTo(this.target);
    // Move inward immediately at walls; zoom back out smoothly once there is space.
    this.smoothDistance =
      safeDistance < this.smoothDistance
        ? safeDistance
        : this.smoothDistance +
          (safeDistance - this.smoothDistance) * ease(3, dt);
    this.camera.position
      .copy(this.target)
      .addScaledVector(safe.sub(this.target).normalize(), this.smoothDistance);
    this.camera.lookAt(this.target);
  }

  private desired(target: T.Vector3, distance: number): T.Vector3 {
    const planar = Math.cos(this.pitch) * distance;
    return new T.Vector3(
      target.x - Math.sin(this.yaw) * planar,
      target.y + Math.sin(this.pitch) * distance,
      target.z - Math.cos(this.yaw) * planar,
    );
  }
}
