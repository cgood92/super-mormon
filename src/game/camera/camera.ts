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
  role?: string;
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
  hub: { distance: 7.2, elevation: 0.15, targetHeight: 1.15 },
  conference: { distance: 6.8, elevation: 0.15, targetHeight: 1.15 },
  streets: { distance: 7.2, elevation: 0.15, targetHeight: 1.15 },
  house: { distance: 6.2, elevation: 0.15, targetHeight: 1.15 },
  palace: { distance: 7.0, elevation: 0.15, targetHeight: 1.15 },
  trade: { distance: 7.2, elevation: 0.15, targetHeight: 1.15 },
  night: { distance: 7.0, elevation: 0.15, targetHeight: 1.15 },
};

// Mario's normal exploration view is close; C-Down remains the wide option.
const ZOOM_DISTANCES = [0.58, 0.76, 1.18] as const;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
const ease = (speed: number, dt: number) =>
  1 - Math.exp(-speed * Math.min(Math.max(dt, 0), 0.1));

/**
 * SM64 Lakitu ceiling awareness: find the lowest overhead solid whose XZ
 * footprint crosses the target-to-eye segment.  Returns Infinity when the
 * path is under open sky.  Only solids whose bottom face (s.y) is above
 * `minY` are considered, so ground-floor slabs and lower furniture are
 * ignored.  The proposed `eye.y` must reach into the solid's vertical
 * range for it to count — a slab far overhead that the camera would never
 * touch is not a ceiling constraint.  Works on every level — balconies at
 * y=4.8, y=16.8, y=28.8, doorway transoms, or any future low overhang.
 */
function ceilingAbovePath(
  target: T.Vector3,
  eye: T.Vector3,
  solids: readonly Solid[],
  minY: number,
  radius = 0.28,
): number {
  let minCeil = Infinity;
  // The camera's proposed maximum height — solids entirely above this
  // cannot be hit and are not a useful ceiling constraint.
  const maxCamY = Math.max(target.y, eye.y) + radius;
  // Quick bounding-box envelope of the XZ segment, padded by radius.
  const segMinX = Math.min(target.x, eye.x) - radius;
  const segMaxX = Math.max(target.x, eye.x) + radius;
  const segMinZ = Math.min(target.z, eye.z) - radius;
  const segMaxZ = Math.max(target.z, eye.z) + radius;
  const dx = eye.x - target.x;
  const dz = eye.z - target.z;

  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (s.y < minY || s.y >= minCeil) continue;
    // Skip thin stair treads and narrow rails — only substantial overhead
    // geometry (ceilings, balconies, transoms, bridges) constrains the camera.
    if (s.h <= 0.35 && (s.d < 1.0 || s.w < 1.0)) continue;
    if (s.w < 0.5 && s.h < 0.5) continue;
    // Skip solids whose bottom face is above the proposed camera height —
    // they are too high to act as a ceiling for the current follow arc.
    if (s.y > maxCamY) continue;
    // Broad-phase rejection against segment envelope.
    if (
      s.x + s.w / 2 < segMinX ||
      s.x - s.w / 2 > segMaxX ||
      s.z + s.d / 2 < segMinZ ||
      s.z - s.d / 2 > segMaxZ
    )
      continue;
    // 2-D slab intersection: does the XZ segment cross the padded AABB?
    const sMinX = s.x - s.w / 2 - radius;
    const sMaxX = s.x + s.w / 2 + radius;
    const sMinZ = s.z - s.d / 2 - radius;
    const sMaxZ = s.z + s.d / 2 + radius;
    let tmin = 0,
      tmax = 1;
    if (Math.abs(dx) < 1e-8) {
      if (target.x < sMinX || target.x > sMaxX) continue;
    } else {
      let t1 = (sMinX - target.x) / dx;
      let t2 = (sMaxX - target.x) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (Math.abs(dz) < 1e-8) {
      if (target.z < sMinZ || target.z > sMaxZ) continue;
    } else {
      let t1 = (sMinZ - target.z) / dz;
      let t2 = (sMaxZ - target.z) / dz;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    minCeil = s.y;
  }
  return minCeil;
}

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
    return exit > 1e-5 && enter < 1 - 1e-5 && enter <= exit;
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
function recoverCameraEye(
  eye: T.Vector3,
  solids: readonly Solid[],
  playerY?: number,
): T.Vector3 {
  const radius = 0.22;
  if (cameraSegmentClear(eye, eye, solids, radius)) return eye.clone();
  let nearest: T.Vector3 | undefined;
  for (const axis of [0, 1, 2]) {
    for (const direction of [-1, 1]) {
      // Never recover downward below the walking floor when recovering vertically
      if (
        axis === 1 &&
        direction === -1 &&
        playerY !== undefined &&
        eye.y <= playerY + 0.5
      )
        continue;
      const trial = eye.clone();
      // Each pass moves monotonically beyond an overlapping solid on this axis.
      for (let pass = 0; pass <= solids.length; pass++) {
        const overlap = solids.find(
          (solid) => !cameraSegmentClear(trial, trial, [solid], radius),
        );
        if (!overlap) break;
        // Never push downward through a floor slab
        if (
          axis === 1 &&
          direction === -1 &&
          overlap.h <= 0.6 &&
          trial.y >= overlap.y + overlap.h - 0.25
        ) {
          trial.y = -Infinity;
          break;
        }
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
      if (trial.y === -Infinity) continue;
      if (playerY !== undefined && trial.y < playerY + 0.15) continue;
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
  playerY?: number,
): T.Vector3 {
  const start = recoverCameraEye(previous, solids, playerY);
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
  playerY?: number,
): T.Vector3[] {
  const delta = requested.clone().sub(previous);
  const forward = Math.abs(delta.x) > Math.abs(delta.z) ? 0 : 2;
  const side = forward === 0 ? 2 : 0;
  let blocker: Solid | undefined;
  let nearest = Infinity;
  for (const solid of solids) {
    if (solid.y >= requested.y - 0.2 || (solid.w > 3 && solid.d > 3)) continue;
    if (cameraSegmentClear(previous, requested, [solid], 0.22)) continue;
    const hit = moveCameraEye(previous, requested, [solid], playerY);
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

/** True when a substantial wall (not a thin column or prop) occludes the sightline. */
function isWallOccluded(
  target: T.Vector3,
  eye: T.Vector3,
  solids: readonly Solid[],
  radius = 0.15,
): boolean {
  return solids.some((solid) => {
    // Narrow columns (isotropic posts with w and d <= 1.8) do not count as occluding walls
    const maxDim = Math.max(solid.w, solid.d);
    const minDim = Math.min(solid.w, solid.d);
    if (maxDim <= 1.8 && minDim >= 0.5 * maxDim) return false;
    // Low props and benches (height <= 0.8) do not count as occluding walls
    if (solid.h <= 0.8 && maxDim <= 2.5) return false;
    // Overhead lintels / transoms above standing clearance do not occlude horizontal sightlines
    if (solid.y >= target.y + 1.2) return false;
    return !cameraSegmentClear(target, eye, [solid], radius);
  });
}

/** Search for the best clear viewpoint on the player's side of an occluding wall. */
function findClearViewpoint(
  target: T.Vector3,
  currentYaw: number,
  baseDistance: number,
  elevation: number,
  solids: readonly Solid[],
  room?: CameraRoom,
  maxCeilY = Infinity,
): { eye: T.Vector3; yaw: number; dist: number } | undefined {
  const angleOffsets = [
    0,
    0.25,
    -0.25,
    0.5,
    -0.5,
    0.75,
    -0.75,
    1.0,
    -1.0,
    1.25,
    -1.25,
  ];
  const distances = [
    baseDistance,
    baseDistance * 0.85,
    baseDistance * 0.7,
    3.5,
    2.5,
    1.8,
  ];

  let best:
    { eye: T.Vector3; yaw: number; dist: number; score: number } | undefined;

  for (const deltaYaw of angleOffsets) {
    const yaw = currentYaw + deltaYaw;
    const planar = Math.cos(elevation);

    for (const dist of distances) {
      let eyeY = target.y + Math.sin(elevation) * dist;
      if (maxCeilY < Infinity) eyeY = Math.min(eyeY, maxCeilY - 0.28);

      let eyeX = target.x - Math.sin(yaw) * planar * dist;
      let eyeZ = target.z - Math.cos(yaw) * planar * dist;
      const roomClamp = room?.viewBounds ?? room?.bounds;
      if (roomClamp) {
        eyeX = clamp(eyeX, roomClamp.minX + 0.55, roomClamp.maxX - 0.55);
        eyeZ = clamp(eyeZ, roomClamp.minZ + 0.55, roomClamp.maxZ - 0.55);
        if (roomClamp.minY !== undefined && roomClamp.maxY !== undefined) {
          eyeY = clamp(eyeY, roomClamp.minY + 0.25, roomClamp.maxY - 0.28);
        }
      }

      const naturalEye = new T.Vector3(eyeX, eyeY, eyeZ);
      const safeEye = resolveCameraPosition(target, naturalEye, solids, 0.22);
      if (maxCeilY < Infinity) safeEye.y = Math.min(safeEye.y, maxCeilY - 0.28);
      if (roomClamp) {
        safeEye.x = clamp(
          safeEye.x,
          roomClamp.minX + 0.55,
          roomClamp.maxX - 0.55,
        );
        safeEye.z = clamp(
          safeEye.z,
          roomClamp.minZ + 0.55,
          roomClamp.maxZ - 0.55,
        );
        if (roomClamp.minY !== undefined && roomClamp.maxY !== undefined) {
          safeEye.y = clamp(
            safeEye.y,
            roomClamp.minY + 0.25,
            roomClamp.maxY - 0.28,
          );
        }
      }

      const actualDist = safeEye.distanceTo(target);
      if (actualDist < 1.8) continue;

      if (!cameraSegmentClear(safeEye, safeEye, solids, 0.2)) continue;
      if (isWallOccluded(target, safeEye, solids, 0.15)) continue;

      const score = actualDist * 1.5 - Math.abs(deltaYaw) * 5;
      if (!best || score > best.score) {
        best = { eye: safeEye, yaw, dist: actualDist, score };
      }
    }
  }

  return best;
}

/** A clear corner waypoint around a solid building corner when direct follow is blocked. */
function cameraCornerWaypoint(
  previous: T.Vector3,
  candidate: T.Vector3,
  target: T.Vector3,
  solids: readonly Solid[],
  radius = 0.22,
): T.Vector3 | undefined {
  let blocker: Solid | undefined;
  let nearest = Infinity;
  for (const solid of solids) {
    if (solid.y >= candidate.y - 0.2) continue;
    if (cameraSegmentClear(previous, candidate, [solid], radius)) continue;
    const hit = moveCameraEye(previous, candidate, [solid]);
    const distance = hit.distanceToSquared(previous);
    if (distance < nearest) {
      nearest = distance;
      blocker = solid;
    }
  }
  if (!blocker) return undefined;

  const corners = [
    {
      x: blocker.x - blocker.w / 2,
      z: blocker.z - blocker.d / 2,
      dirX: -1,
      dirZ: -1,
    },
    {
      x: blocker.x + blocker.w / 2,
      z: blocker.z - blocker.d / 2,
      dirX: 1,
      dirZ: -1,
    },
    {
      x: blocker.x - blocker.w / 2,
      z: blocker.z + blocker.d / 2,
      dirX: -1,
      dirZ: 1,
    },
    {
      x: blocker.x + blocker.w / 2,
      z: blocker.z + blocker.d / 2,
      dirX: 1,
      dirZ: 1,
    },
  ];

  let bestWaypoint: T.Vector3 | undefined;
  let bestScore = Infinity;

  const margin = radius + 0.14;
  for (const c of corners) {
    const wp = new T.Vector3(
      c.x + c.dirX * margin,
      previous.y,
      c.z + c.dirZ * margin,
    );

    if (!cameraSegmentClear(wp, wp, solids, radius)) continue;
    if (!cameraSegmentClear(previous, wp, solids, radius)) continue;

    const clearToCandidate = cameraSegmentClear(wp, candidate, solids, radius);
    const clearToTarget = cameraSegmentClear(wp, target, solids, 0.15);
    if (!clearToCandidate && !clearToTarget) continue;

    const totalDist = previous.distanceTo(wp) + wp.distanceTo(candidate);
    if (totalDist < bestScore) {
      bestScore = totalDist;
      bestWaypoint = wp;
    }
  }

  return bestWaypoint;
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
    this.smoothDistance = preset.distance * ZOOM_DISTANCES[this.zoomLevel];
    const isChild = player.role === "child";
    const defaultTargetHeight = isChild ? 0.65 : preset.targetHeight;
    this.target.set(
      player.x,
      player.y + (player.crouching ? 0.58 : defaultTargetHeight),
      player.z,
    );
    this.lead.set(0, 0, 0);
    this.camera.position.copy(this.desired(this.target, this.smoothDistance));
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
      const prevDir = new T.Vector3(
        focus.x - previous.x,
        0,
        focus.z - previous.z,
      );
      if (prevDir.lengthSq() > 0.001) prevDir.normalize();

      const currentClear =
        cameraSegmentClear(previous, previous, solids, 0.22) &&
        cameraSegmentClear(focus, previous, solids, 0.05);

      const safe = anchors
        .map((p) => new T.Vector3(p.x, p.y, p.z))
        .filter(
          (eye) =>
            cameraSegmentClear(eye, eye, solids) &&
            cameraSegmentClear(focus, eye, solids, 0.05),
        );
      // Recovery when loading inside a room or when a prop blocks its door shot.
      // Search only on a room transition; normal play never hunts for visibility.
      if (!safe.length && room && !currentClear) {
        for (const distance of [preset.distance, 2.0, 1.5])
          for (let i = 0; i < 8; i++) {
            const angleOffset =
              i === 0
                ? 0
                : (i % 2 === 1 ? 1 : -1) *
                  Math.ceil(i / 2) *
                  (Math.PI / 4);
            const yaw = player.yaw + angleOffset;
            const roomClamp = room?.viewBounds ?? room?.bounds;
            const eye = new T.Vector3(
              roomClamp
                ? clamp(
                    focus.x - Math.sin(yaw) * distance,
                    roomClamp.minX + 0.55,
                    roomClamp.maxX - 0.55,
                  )
                : focus.x - Math.sin(yaw) * distance,
              focus.y + 1.2,
              roomClamp
                ? clamp(
                    focus.z - Math.cos(yaw) * distance,
                    roomClamp.minZ + 0.55,
                    roomClamp.maxZ - 0.55,
                  )
                : focus.z - Math.cos(yaw) * distance,
            );
            if (
              cameraSegmentClear(eye, eye, solids) &&
              cameraSegmentClear(focus, eye, solids, 0.05)
            )
              safe.push(eye);
          }
      }
      // Never snap to a viewpoint that inverts/reverses the camera viewing direction
      // if an aligned anchor is available.
      const aligned = safe.filter((eye) => {
        const candidateDir = new T.Vector3(
          focus.x - eye.x,
          0,
          focus.z - eye.z,
        ).normalize();
        return candidateDir.dot(prevDir) >= -0.15;
      });
      if (aligned.length > 0) {
        aligned.sort((a, b) => {
          const dirA = new T.Vector3(focus.x - a.x, 0, focus.z - a.z).normalize();
          const dirB = new T.Vector3(focus.x - b.x, 0, focus.z - b.z).normalize();
          const dotA = dirA.dot(prevDir);
          const dotB = dirB.dot(prevDir);
          if (Math.abs(dotA - dotB) > 0.2) return dotB - dotA;
          const distErrA = Math.abs(a.distanceTo(focus) - preset.distance);
          const distErrB = Math.abs(b.distanceTo(focus) - preset.distance);
          return distErrA - distErrB;
        });
        previous = aligned[0];
      } else if (safe.length > 0) {
        safe.sort(
          (a, b) => a.distanceToSquared(focus) - b.distanceToSquared(focus),
        );
        previous = safe[0];
      }
      if (safe[0]) {
        this.camera.position.copy(previous);
        this.lastEye.copy(previous);
      }
      const hadPriorRoom = this.room !== undefined;
      this.room = room;
      if (safe[0] || !hadPriorRoom) {
        this.pitch = preset.elevation;
        this.smoothDistance = preset.distance;
      }
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
    const isChild = player.role === "child";
    const defaultTargetHeight = isChild ? 0.65 : preset.targetHeight;
    const wantedHeight =
      player.y + (player.crouching ? 0.58 : defaultTargetHeight);
    this.target.y +=
      (wantedHeight - this.target.y) *
      ease(player.grounded === false ? 3 : 9, dt);
    // Keeping the prior eye as the geometric pivot is what makes held sideways
    // input trace an arc, while forward input pulls the camera behind the player.
    const dx = this.target.x - previous.x,
      dz = this.target.z - previous.z;
    if (!this.eyeDetour.length && !this.finishingDetour) {
      if (Math.hypot(dx, dz) > 0.1) this.yaw = Math.atan2(dx, dz);
    }
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
      const baseDps =
        speed >= 0.05
          ? 12 * clamp(speed / 6.5, 0.35, 1)
          : orbit.movementIntent
            ? 5.2734375
            : 42.1875;
      const degreesPerSecond =
        this.eyeDetour.length || this.finishingDetour
          ? Math.max(baseDps, 45)
          : baseDps;
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

    // SM64 / Lakitu spring arm: when navigating, raycast from character target along the camera boom.
    // If a solid wall, building or barrier lies along the boom, shorten the tether
    // so the camera stays on the character's side of the wall.
    // Slender columns (isotropic w and d <= 1.8) and low props are excluded to prevent jitter.
    if (playerTravel > 0.0001 || (player.runSpeed ?? 0) > 0.1) {
      const boomEye = this.desired(this.target, this.smoothDistance);
      const wallSolids = solids.filter((s) => {
        const maxDim = Math.max(s.w, s.d);
        const minDim = Math.min(s.w, s.d);
        if (maxDim <= 1.8 && minDim >= 0.5 * maxDim) return false;
        if (s.h <= 0.8 && maxDim <= 2.5) return false;
        return s.y < this.target.y + 1.2;
      });
      const safeBoomEye = resolveCameraPosition(
        this.target,
        boomEye,
        wallSolids,
        0.22,
      );
      const clearBoomDist = safeBoomEye.distanceTo(this.target);
      if (clearBoomDist < this.smoothDistance - 0.05) {
        this.smoothDistance = Math.max(1.8, clearBoomDist);
      }
    }
    // SM64 Lakitu behavior: lower the camera under low ceilings (balconies,
    // transoms, overhangs) instead of flying into them.  Probe the current
    // desired eye position and, if a ceiling is in the way, flatten pitch so
    // the eye stays safely underneath.  Works on all three conference levels
    // and any future world with low overhead geometry.
    let ceilingY = Infinity;
    {
      const planar = Math.cos(preset.elevation) * this.smoothDistance;
      const naturalEye = new T.Vector3(
        this.target.x - Math.sin(this.yaw) * planar,
        this.target.y + Math.sin(preset.elevation) * this.smoothDistance,
        this.target.z - Math.cos(this.yaw) * planar,
      );
      ceilingY = ceilingAbovePath(
        this.target,
        naturalEye,
        solids,
        player.y + (player.crouching || isChild ? 0.9 : 1.75),
      );
      if (ceilingY < Infinity) {
        const maxEyeY = ceilingY - 0.28;
        const maxPitch = Math.asin(
          clamp(
            (maxEyeY - this.target.y) / Math.max(0.1, this.smoothDistance),
            0.02,
            preset.elevation,
          ),
        );
        if (this.pitch > maxPitch) {
          // Pull down quickly so the camera never enters the ceiling.
          this.pitch += (maxPitch - this.pitch) * ease(12, dt);
          if (this.pitch > maxPitch + 0.01) this.pitch = maxPitch + 0.01;
        } else if (this.pitch < maxPitch - 0.005) {
          // Under a ceiling, smoothly track any ceiling rise or floor drop.
          this.pitch += (maxPitch - this.pitch) * ease(6, dt);
        }
      } else if (
        this.pitch < preset.elevation - 0.01 &&
        !this.manualIdleView &&
        this.orbitTarget === null &&
        this.recenterTime === 0 &&
        this.restoreTime === 0
      ) {
        // Open sky above: gently restore the preset elevation angle.
        this.pitch += (preset.elevation - this.pitch) * ease(4, dt);
      }
    }
    const candidate = this.desired(this.target, this.smoothDistance);
    // Safety clamp: ensure candidate.y stays below any detected ceiling.
    if (ceilingY < Infinity) {
      candidate.y = Math.min(candidate.y, ceilingY - 0.28);
    }
    const roomClamp = room?.viewBounds ?? room?.bounds;
    if (roomClamp) {
      candidate.x = clamp(
        candidate.x,
        roomClamp.minX + 0.55,
        roomClamp.maxX - 0.55,
      );
      candidate.z = clamp(
        candidate.z,
        roomClamp.minZ + 0.55,
        roomClamp.maxZ - 0.55,
      );
      if (roomClamp.minY !== undefined && roomClamp.maxY !== undefined) {
        candidate.y = clamp(
          candidate.y,
          roomClamp.minY + 0.25,
          roomClamp.maxY - 0.28,
        );
      }
    }
    const directClear = cameraSegmentClear(previous, candidate, solids, 0.22);
    if (directClear) this.eyeDetour = [];
    else if (!this.eyeDetour.length && playerTravel > 0.0001) {
      this.eyeDetour = cameraEyeDetour(previous, candidate, solids, player.y);
      if (!this.eyeDetour.length) {
        const cornerWp = cameraCornerWaypoint(
          previous,
          candidate,
          this.target,
          solids,
          0.22,
        );
        if (cornerWp) this.eyeDetour = [cornerWp];
      }
      if (
        roomClamp &&
        this.eyeDetour.some(
          (eye) =>
            eye.x < roomClamp.minX + 0.55 ||
            eye.x > roomClamp.maxX - 0.55 ||
            eye.z < roomClamp.minZ + 0.55 ||
            eye.z > roomClamp.maxZ - 0.55 ||
            (roomClamp.minY !== undefined &&
              eye.y < roomClamp.minY + 0.25) ||
            (roomClamp.maxY !== undefined && eye.y > roomClamp.maxY - 0.28),
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
    let final = moveCameraEye(previous, motionGoal, solids, player.y);
    const instantTarget = new T.Vector3(
      player.x,
      player.y + (player.crouching ? 0.58 : defaultTargetHeight),
      player.z,
    );
    const lowerFloorEye = this.desired(
      instantTarget,
      (preset.distance + this.speedPullback) * ZOOM_DISTANCES[this.zoomLevel],
    );
    // Check whether an overhead floor slab or deck separates the previous eye from the player.
    const isSeparatedByFloor = solids.some(
      (solid) =>
        solid.h <= 1.5 &&
        (solid.w >= 1.5 || solid.d >= 1.5 || solid.w * solid.d >= 2.0) &&
        previous.y >= solid.y + solid.h - 0.1 &&
        player.y + defaultTargetHeight < solid.y + 0.2 &&
        !cameraSegmentClear(previous, instantTarget, [solid], 0.1),
    );
    // Vertical target easing is useful for ordinary steps, but it can retain a
    // former upper-floor height after a player drops through an open well or
    // walks down stairs beneath a deck.
    // Put both focus and eye on the lower floor as a single safe transition.
    const verticalSeparation = previous.y - player.y;
    if (
      player.grounded !== false &&
      (verticalSeparation > 6 ||
        (isSeparatedByFloor && verticalSeparation > 2.0)) &&
      final.y - player.y > 2.0 &&
      cameraSegmentClear(lowerFloorEye, lowerFloorEye, solids, 0.28) &&
      cameraSegmentClear(instantTarget, lowerFloorEye, solids, 0.05)
    ) {
      this.target.copy(instantTarget);
      final = lowerFloorEye;
      this.eyeDetour = [];
      this.finishingDetour = false;
    }
    // A balcony slab or deck can separate the eye from a player who jumped into an
    // open stairwell or descended below. Once the player and follow eye are
    // below it, cut to that clear lower-floor view rather than remaining above the slab.
    // This is a floor-change recovery, never a response to a column sightline.
    if (
      (verticalSeparation > 6 ||
        (isSeparatedByFloor && verticalSeparation > 2.0)) &&
      candidate.y < previous.y - 1.2 &&
      !directClear &&
      cameraSegmentClear(candidate, candidate, solids, 0.28) &&
      cameraSegmentClear(
        new T.Vector3(player.x, player.y + defaultTargetHeight, player.z),
        candidate,
        solids,
        0.05,
      ) &&
      solids.some(
        (solid) =>
          solid.h <= 1.5 &&
          (solid.w >= 1.5 || solid.d >= 1.5 || solid.w * solid.d >= 2.0) &&
          previous.y >= solid.y + solid.h - 0.1 &&
          player.y + 1.2 < solid.y + solid.h &&
          candidate.y < solid.y - 0.22 &&
          !cameraSegmentClear(previous, candidate, [solid], 0.22),
      )
    ) {
      final = candidate;
      this.eyeDetour = [];
      this.finishingDetour = false;
    }
    // SM64 / Lakitu rule: when moving, a solid wall must never separate the player from the camera.
    // Thin columns (w <= 2 && d <= 2) are permitted to briefly cross sightlines without
    // zooming, but broad walls and buildings (w > 2 || d > 2) trigger clear-viewpoint recovery.
    if (
      playerTravel > 0.0001 &&
      !this.eyeDetour.length &&
      !this.finishingDetour &&
      isWallOccluded(this.target, final, solids)
    ) {
      const recovered = findClearViewpoint(
        this.target,
        this.yaw,
        preset.distance,
        this.pitch,
        solids,
        room,
        ceilingY,
      );
      if (
        recovered &&
        (room ||
          cameraSegmentClear(previous, recovered.eye, solids, 0.18) ||
          previous.distanceTo(this.target) > 5.5)
      ) {
        final = recovered.eye;
        this.yaw = recovered.yaw;
        this.smoothDistance = recovered.dist;
        this.eyeDetour = [];
        this.finishingDetour = false;
      }
    }
    if (directClear && !this.eyeDetour.length) {
      if (final.distanceTo(candidate) < 0.2) this.finishingDetour = false;
      this.obstructionAmount = 0;
    } else {
      if (!this.eyeDetour.length && final.distanceTo(candidate) < 0.15)
        this.finishingDetour = false;
      this.obstructionAmount = clamp(
        final.distanceTo(candidate) /
          Math.max(0.001, previous.distanceTo(candidate)),
        0,
        1,
      );
    }
    final.y = Math.max(final.y, player.y + 0.22);
    this.camera.position.copy(final);
    if (!this.eyeDetour.length && !this.finishingDetour) {
      const finalDx = this.target.x - final.x,
        finalDz = this.target.z - final.z;
      if (Math.hypot(finalDx, finalDz) > 0.1)
        this.yaw = Math.atan2(finalDx, finalDz);
    }
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
