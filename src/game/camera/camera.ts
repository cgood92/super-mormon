import * as T from "three";
import type { Solid } from "../physics/physics";

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
export type CameraMode =
  "hub" | "conference" | "streets" | "house" | "palace" | "trade" | "night";

const MODES: Record<
  CameraMode,
  { distance: number; elevation: number; targetHeight: number }
> = {
  hub: { distance: 7.2, elevation: 0.2, targetHeight: 1 },
  conference: { distance: 9.5, elevation: 0.22, targetHeight: 2 },
  streets: { distance: 7.2, elevation: 0.2, targetHeight: 1 },
  house: { distance: 6.2, elevation: 0.2, targetHeight: 1 },
  palace: { distance: 7, elevation: 0.2, targetHeight: 1 },
  trade: { distance: 7.2, elevation: 0.2, targetHeight: 1 },
  night: { distance: 7, elevation: 0.2, targetHeight: 1 },
};

const ZOOM_DISTANCES = [0.6, 1, 1.4] as const;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
const ease = (speed: number, dt: number) =>
  1 - Math.exp(-speed * Math.min(Math.max(dt, 0), 0.1));

/** Swept camera volume; unlike target-ray clamping, a blocked route is rejected. */
export function cameraSegmentClear(
  start: T.Vector3,
  end: T.Vector3,
  solids: readonly Solid[],
  radius = 0.28,
): boolean {
  const direction = end.clone().sub(start);
  return !solids.some((solid) => {
    const min = [
      solid.x - solid.w / 2 - radius,
      solid.y - radius,
      solid.z - solid.d / 2 - radius,
    ];
    const max = [
      solid.x + solid.w / 2 + radius,
      solid.y + solid.h + radius,
      solid.z + solid.d / 2 + radius,
    ];
    let enter = 0,
      exit = 1;
    for (let axis = 0; axis < 3; axis++) {
      const origin = start.getComponent(axis),
        delta = direction.getComponent(axis);
      if (Math.abs(delta) < 1e-9) {
        if (origin < min[axis] || origin > max[axis]) return false;
      } else {
        let a = (min[axis] - origin) / delta,
          b = (max[axis] - origin) / delta;
        if (a > b) [a, b] = [b, a];
        enter = Math.max(enter, a);
        exit = Math.min(exit, b);
        if (enter > exit) return false;
      }
    }
    return exit >= 0 && enter <= 1;
  });
}

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
  /** Movement frame before the small look-ahead pan, measured toward the player. */
  yaw = 0;
  pitch = MODES.hub.elevation;
  private target = new T.Vector3();
  private lead = new T.Vector3();
  private lastEye = new T.Vector3();
  private smoothDistance = MODES.hub.distance;
  private speedPullback = 0;
  private orbitTarget: number | null = null;
  private recenterTime = 0;
  private restoreTime = 0;
  obstructionAmount = 0;
  get obstructed(): boolean {
    return this.obstructionAmount > 0.001;
  }
  private zoomLevel = 1;
  private initialized = false;

  constructor(readonly camera: T.PerspectiveCamera) {}

  reset(
    player: CameraPlayer,
    yawOverride = player.yaw,
    mode: CameraMode = "hub",
  ): void {
    const preset = MODES[mode];
    this.yaw = yawOverride;
    this.pitch = preset.elevation;
    this.orbitTarget = null;
    this.recenterTime = this.restoreTime = this.speedPullback = 0;
    this.obstructionAmount = 0;
    this.zoomLevel = 1;
    this.smoothDistance = preset.distance;
    this.target.set(
      player.x,
      player.y + (player.crouching ? 0.58 : preset.targetHeight),
      player.z,
    );
    this.lead.set(0, 0, 0);
    this.camera.position.copy(this.desired(this.target, preset.distance));
    this.camera.lookAt(this.target);
    this.lastEye.copy(this.camera.position);
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
    const previous = this.camera.position.clone();
    const externallyMoved = previous.distanceToSquared(this.lastEye) > 0.0025;
    this.target.x = player.x;
    this.target.z = player.z;
    const wantedHeight =
      player.y + (player.crouching ? 0.58 : preset.targetHeight);
    this.target.y +=
      (wantedHeight - this.target.y) *
      ease(player.grounded === false ? 3 : 9, dt);
    // Keeping the prior eye as the geometric pivot is what makes held sideways
    // input trace an arc, while forward input pulls the camera behind the player.
    const dx = this.target.x - previous.x,
      dz = this.target.z - previous.z;
    if (Math.hypot(dx, dz) > 0.1) this.yaw = Math.atan2(dx, dz);
    if (externallyMoved) {
      this.smoothDistance = previous.distanceTo(this.target);
      this.pitch = clamp(
        Math.atan2(previous.y - this.target.y, Math.hypot(dx, dz)),
        0.08,
        1.12,
      );
      this.restoreTime = 1;
      this.orbitTarget = null;
      this.lead.set(0, 0, 0);
    }
    if (orbit.zoom)
      this.zoomLevel = clamp(this.zoomLevel + Math.sign(orbit.zoom), 0, 2);
    if (Math.abs(orbit.orbitX) + Math.abs(orbit.orbitY) > 0.0001) {
      if (Math.abs(orbit.orbitX) > 0.45)
        this.orbitTarget = (this.orbitTarget ?? this.yaw) + orbit.orbitX;
      else {
        this.orbitTarget = null;
        this.yaw += orbit.orbitX;
      }
      this.pitch = clamp(this.pitch + orbit.orbitY, 0.08, 1.12);
      this.recenterTime = this.restoreTime = 0;
    }
    if (this.orbitTarget !== null) {
      this.yaw += angleDiff(this.orbitTarget, this.yaw) * ease(16, dt);
      if (Math.abs(angleDiff(this.orbitTarget, this.yaw)) < 0.002) {
        this.yaw = this.orbitTarget;
        this.orbitTarget = null;
      }
    }
    if (orbit.recenter) {
      this.orbitTarget = null;
      this.recenterTime = 0.8;
    }
    if (this.recenterTime > 0) {
      this.yaw += angleDiff(player.yaw, this.yaw) * ease(7, dt);
      this.pitch += (preset.elevation - this.pitch) * ease(5, dt);
      this.recenterTime = Math.max(0, this.recenterTime - dt);
    }
    if (this.restoreTime > 0) {
      this.pitch += (preset.elevation - this.pitch) * ease(4, dt);
      this.restoreTime = Math.max(0, this.restoreTime - dt);
    }
    this.speedPullback +=
      (Math.min(1, (player.runSpeed ?? 0) / 6.5) * 0.7 - this.speedPullback) *
      ease(2, dt);
    const requestedDistance =
      (preset.distance + this.speedPullback) * ZOOM_DISTANCES[this.zoomLevel];
    const requested = this.desired(this.target, requestedDistance);
    const safe = resolveCameraPosition(this.target, requested, solids, 0.22);
    const safeDistance = safe.distanceTo(this.target);
    this.obstructionAmount = clamp(
      (requestedDistance - safeDistance) / requestedDistance,
      0,
      1,
    );
    this.smoothDistance =
      safeDistance < this.smoothDistance && this.obstructed
        ? safeDistance
        : this.smoothDistance +
          (safeDistance - this.smoothDistance) * ease(11, dt);
    const candidate = resolveCameraPosition(
      this.target,
      this.desired(this.target, this.smoothDistance),
      solids,
      0.22,
    );
    const pointClear = (eye: T.Vector3) =>
      cameraSegmentClear(eye, eye, solids, 0.2);
    const visible = (eye: T.Vector3) =>
      pointClear(eye) && cameraSegmentClear(this.target, eye, solids, 0.18);
    let final = candidate;
    const recovering = !visible(previous);
    if (
      !visible(candidate) ||
      (!recovering && !cameraSegmentClear(previous, candidate, solids, 0.2))
    ) {
      // Search reachable clear views before retaining the old eye. A camera that
      // starts embedded (or has a prop move into it) recovers directly to safety.
      let replacement: T.Vector3 | undefined;
      for (const lift of [0, 1, 2, 4, 8]) {
        for (const turn of [0, 0.25, -0.25, 0.5, -0.5, 1, -1, Math.PI]) {
          const trial = this.desired(
            this.target,
            this.smoothDistance,
            this.yaw + turn,
          );
          trial.y += lift;
          const clipped = resolveCameraPosition(
            this.target,
            trial,
            solids,
            0.22,
          );
          if (
            visible(clipped) &&
            (recovering || cameraSegmentClear(previous, clipped, solids, 0.2))
          ) {
            replacement = clipped;
            break;
          }
        }
        if (replacement) break;
      }
      if (replacement) final = replacement;
      else if (visible(previous)) final = previous;
      else if (visible(candidate)) final = candidate;
      else final = previous;
    }
    if (final.distanceToSquared(candidate) > 0.0001) {
      this.pitch = Math.atan2(
        final.y - this.target.y,
        Math.hypot(final.x - this.target.x, final.z - this.target.z),
      );
      this.restoreTime = 1;
    }
    this.camera.position.copy(final);
    this.smoothDistance = final.distanceTo(this.target);
    const finalDx = this.target.x - final.x,
      finalDz = this.target.z - final.z;
    if (Math.hypot(finalDx, finalDz) > 0.1)
      this.yaw = Math.atan2(finalDx, finalDz);
    const leadSpeed = Math.min(1, (player.runSpeed ?? 0) / 6.5) * 0.29;
    const desiredLead = new T.Vector3(
      Math.sin(player.yaw) * leadSpeed,
      0,
      Math.cos(player.yaw) * leadSpeed,
    );
    this.lead.lerp(desiredLead, ease(5, dt));
    const focus = this.target.clone().add(this.lead);
    this.camera.lookAt(
      cameraSegmentClear(final, focus, solids, 0.05) ? focus : this.target,
    );
    this.lastEye.copy(final);
  }

  private desired(
    target: T.Vector3,
    distance: number,
    yaw = this.yaw,
  ): T.Vector3 {
    const planar = Math.cos(this.pitch) * distance;
    return new T.Vector3(
      target.x - Math.sin(yaw) * planar,
      target.y + Math.sin(this.pitch) * distance,
      target.z - Math.cos(yaw) * planar,
    );
  }
}
