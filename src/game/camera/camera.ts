import * as T from "three";
import type { Solid } from "../physics/physics";
import type { CameraRoom } from "./camera-rooms";

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
  movementIntent?: boolean;
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

/** Recover an eye embedded by a spawn, authored cut, or moving prop locally. */
function recoverCameraEye(eye: T.Vector3, solids: readonly Solid[]): T.Vector3 {
  const radius = 0.22;
  if (cameraSegmentClear(eye, eye, solids, radius)) return eye.clone();
  let nearest: T.Vector3 | undefined;
  for (const axis of [0, 1, 2]) {
    for (const direction of [-1, 1]) {
      const trial = eye.clone();
      // Each pass moves monotonically beyond an overlapping solid on this axis.
      for (let pass = 0; pass <= solids.length; pass++) {
        const overlap = solids.find(
          (solid) => !cameraSegmentClear(trial, trial, [solid], radius),
        );
        if (!overlap) break;
        const center =
          axis === 0
            ? overlap.x
            : axis === 1
              ? overlap.y + overlap.h / 2
              : overlap.z;
        const size =
          axis === 0 ? overlap.w : axis === 1 ? overlap.h : overlap.d;
        trial.setComponent(
          axis,
          center + direction * (size / 2 + radius + 0.001),
        );
      }
      if (
        cameraSegmentClear(trial, trial, solids, radius) &&
        (!nearest ||
          trial.distanceToSquared(eye) < nearest.distanceToSquared(eye))
      )
        nearest = trial;
    }
  }
  return nearest ?? eye.clone();
}

/** Clamp only physical eye travel; scenery may occlude the player freely. */
function moveCameraEye(
  previous: T.Vector3,
  requested: T.Vector3,
  solids: readonly Solid[],
): T.Vector3 {
  const start = recoverCameraEye(previous, solids);
  if (cameraSegmentClear(start, requested, solids, 0.22)) return requested;
  let clear = 0,
    blocked = 1;
  for (let iteration = 0; iteration < 24; iteration++) {
    const fraction = (clear + blocked) / 2;
    const trial = start.clone().lerp(requested, fraction);
    if (cameraSegmentClear(start, trial, solids, 0.22)) clear = fraction;
    else blocked = fraction;
  }
  return start.lerp(requested, clear);
}

/** A local two-corner route around the first physical eye blocker. */
function cameraEyeDetour(
  previous: T.Vector3,
  requested: T.Vector3,
  solids: readonly Solid[],
): T.Vector3[] {
  const delta = requested.clone().sub(previous);
  const forward = Math.abs(delta.x) > Math.abs(delta.z) ? 0 : 2;
  const side = forward === 0 ? 2 : 0;
  let blocker: Solid | undefined;
  let nearest = Infinity;
  for (const solid of solids) {
    if (cameraSegmentClear(previous, requested, [solid], 0.22)) continue;
    const hit = moveCameraEye(previous, requested, [solid]);
    const distance = hit.distanceToSquared(previous);
    if (distance < nearest) {
      nearest = distance;
      blocker = solid;
    }
  }
  if (!blocker || Math.abs(delta.getComponent(forward)) < 0.0001) return [];
  const center = side === 0 ? blocker.x : blocker.z;
  const size = side === 0 ? blocker.w : blocker.d;
  const direction = previous.getComponent(side) < center ? -1 : 1;
  const around = center + direction * (size / 2 + 0.27);
  // Broad walls remain barriers; this is a short sidestep around a local prop.
  if (Math.abs(around - previous.getComponent(side)) > 3) return [];
  const first = previous.clone().setComponent(side, around);
  const exitCenter = forward === 0 ? blocker.x : blocker.z;
  const exitSize = forward === 0 ? blocker.w : blocker.d;
  const second = first
    .clone()
    .setComponent(
      forward,
      exitCenter +
        Math.sign(delta.getComponent(forward)) * (exitSize / 2 + 0.27),
    );
  if (
    !cameraSegmentClear(previous, first, solids, 0.22) ||
    !cameraSegmentClear(first, second, solids, 0.22)
  )
    return [];
  return [first, second];
}

export class FollowCamera {
  /** Movement frame before the small look-ahead pan, measured toward the player. */
  yaw = 0;
  pitch = MODES.hub.elevation;
  private room: CameraRoom | undefined;
  get roomId(): string | undefined {
    return this.room?.id;
  }
  private target = new T.Vector3();
  private lead = new T.Vector3();
  private lastEye = new T.Vector3();
  private smoothDistance = MODES.hub.distance;
  private speedPullback = 0;
  private eyeDetour: T.Vector3[] = [];
  private finishingDetour = false;
  private orbitTarget: number | null = null;
  private manualIdleView = false;
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
    this.manualIdleView = false;
    this.room = undefined;
    this.yaw = yawOverride;
    this.pitch = preset.elevation;
    this.orbitTarget = null;
    this.eyeDetour = [];
    this.finishingDetour = false;
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
    room?: CameraRoom,
  ): void {
    if (!this.initialized) this.reset(player, player.yaw, mode);
    dt = clamp(dt, 0, 0.1);
    const preset = room ?? MODES[mode];
    let previous = this.camera.position.clone();
    const roomChanged = room?.id !== this.room?.id;
    if (roomChanged) {
      const anchors = room?.entryEyes ?? this.room?.exitEyes ?? [];
      const focus = new T.Vector3(
        player.x,
        player.y + preset.targetHeight,
        player.z,
      );
      const safe = anchors
        .map((p) => new T.Vector3(p.x, p.y, p.z))
        .filter(
          (eye) =>
            cameraSegmentClear(eye, eye, solids) &&
            cameraSegmentClear(focus, eye, solids, 0.05),
        );
      // Recovery when loading inside a room or when a prop blocks its door shot.
      // Search only on a room transition; normal play never hunts for visibility.
      if (!safe.length && room) {
        for (const distance of [3, 1.5])
          for (let i = 0; i < 8; i++) {
            const yaw = player.yaw + (i * Math.PI) / 4;
            const eye = new T.Vector3(
              clamp(
                focus.x - Math.sin(yaw) * distance,
                room.bounds.minX + 0.55,
                room.bounds.maxX - 0.55,
              ),
              focus.y + 1.2,
              clamp(
                focus.z - Math.cos(yaw) * distance,
                room.bounds.minZ + 0.55,
                room.bounds.maxZ - 0.55,
              ),
            );
            if (
              cameraSegmentClear(eye, eye, solids) &&
              cameraSegmentClear(focus, eye, solids, 0.05)
            )
              safe.push(eye);
          }
      }
      safe.sort(
        (a, b) => a.distanceToSquared(focus) - b.distanceToSquared(focus),
      );
      // An authored doorway transition may cut across a wall. Ordinary following
      // still sweeps physical eye travel and never zooms for sightline occlusion.
      if (safe[0]) previous = safe[0];
      this.camera.position.copy(previous);
      this.lastEye.copy(previous);
      this.room = room;
      this.pitch = preset.elevation;
      this.smoothDistance = preset.distance;
      this.speedPullback = 0;
      this.eyeDetour = [];
      this.finishingDetour = false;
      this.orbitTarget = null;
      this.lead.set(0, 0, 0);
    }
    const externallyMoved = previous.distanceToSquared(this.lastEye) > 0.0025;
    const playerTravel = Math.hypot(
      player.x - this.target.x,
      player.z - this.target.z,
    );
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
      this.eyeDetour = [];
      this.finishingDetour = false;
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
    if ((player.runSpeed ?? 0) > 0.2) this.manualIdleView = false;
    if (orbit.zoom)
      this.zoomLevel = clamp(this.zoomLevel + Math.sign(orbit.zoom), 0, 2);
    if (Math.abs(orbit.orbitX) + Math.abs(orbit.orbitY) > 0.0001) {
      this.manualIdleView = true;
      this.eyeDetour = [];
      this.finishingDetour = false;
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
      this.manualIdleView = false;
      this.eyeDetour = [];
      this.finishingDetour = false;
      this.orbitTarget = null;
      this.recenterTime = 0.8;
    }
    if (this.recenterTime > 0) {
      this.yaw += angleDiff(player.yaw, this.yaw) * ease(7, dt);
      this.pitch += (preset.elevation - this.pitch) * ease(5, dt);
      this.recenterTime = Math.max(0, this.recenterTime - dt);
    }
    if (
      player.grounded !== false &&
      !this.manualIdleView &&
      this.orbitTarget === null &&
      this.recenterTime === 0 &&
      !externallyMoved
    ) {
      // Keep the moving correction lighter than idle centering so sustained
      // sideways input still arcs around the camera. Physical eye collision
      // remains authoritative. Idle rates derive from SM64's 30 Hz goal steps.
      const speed = player.runSpeed ?? 0;
      const degreesPerSecond =
        speed >= 0.05
          ? 12 * clamp(speed / 6.5, 0.35, 1)
          : orbit.movementIntent
            ? 5.2734375
            : 42.1875;
      const rate = (degreesPerSecond * Math.PI) / 180;
      this.yaw += clamp(angleDiff(player.yaw, this.yaw), -rate * dt, rate * dt);
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
    this.smoothDistance +=
      (requestedDistance - this.smoothDistance) * ease(11, dt);
    const candidate = this.desired(this.target, this.smoothDistance);
    if (room) {
      candidate.x = clamp(
        candidate.x,
        room.bounds.minX + 0.55,
        room.bounds.maxX - 0.55,
      );
      candidate.z = clamp(
        candidate.z,
        room.bounds.minZ + 0.55,
        room.bounds.maxZ - 0.55,
      );
    }
    const directClear = cameraSegmentClear(previous, candidate, solids, 0.22);
    if (directClear) this.eyeDetour = [];
    else if (!this.eyeDetour.length && playerTravel > 0.0001) {
      this.eyeDetour = cameraEyeDetour(previous, candidate, solids);
      if (
        room &&
        this.eyeDetour.some(
          (eye) =>
            eye.x < room.bounds.minX + 0.55 ||
            eye.x > room.bounds.maxX - 0.55 ||
            eye.z < room.bounds.minZ + 0.55 ||
            eye.z > room.bounds.maxZ - 0.55,
        )
      )
        this.eyeDetour = [];
      if (this.eyeDetour.length) this.finishingDetour = true;
    }
    while (
      this.eyeDetour.length &&
      previous.distanceTo(this.eyeDetour[0]) < 0.02
    )
      this.eyeDetour.shift();
    let motionGoal = this.eyeDetour[0] ?? candidate;
    if (this.finishingDetour) {
      const distance = previous.distanceTo(motionGoal);
      motionGoal = previous
        .clone()
        .lerp(motionGoal, Math.min(1, (12 * dt) / Math.max(distance, 0.001)));
    }
    const final = moveCameraEye(previous, motionGoal, solids);
    if (!this.eyeDetour.length && final.distanceTo(candidate) < 0.001)
      this.finishingDetour = false;
    this.obstructionAmount = clamp(
      final.distanceTo(candidate) /
        Math.max(0.001, previous.distanceTo(candidate)),
      0,
      1,
    );
    this.camera.position.copy(final);
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
    this.camera.lookAt(focus);
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
