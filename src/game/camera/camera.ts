import * as T from "three";
import type { Solid } from "../physics/physics";
import type { CameraRoom } from "./camera-rooms";

/**
 * Lakitu-style follow camera, modelled on SM64 `camera.c` (`update_default_camera`,
 * `rotate_camera_around_walls`, `collide_with_walls`).
 *
 * The whole camera is one rigid boom: a focus point on the player, plus
 * yaw, pitch and distance. Each frame does the same five steps in order:
 *
 *   1. Focus   – follow the player (vertical motion is eased).
 *   2. Yaw     – trail behind the player by dragging the ideal (pre-collision)
 *                eye, then apply controls, centering, and wall avoidance.
 *   3. Pitch   – preset elevation, flattened under low ceilings.
 *   4. Distance – ideal boom length (preset × zoom + run pullback).
 *   5. Spring arm – ONE raycast from focus to the ideal eye. A wall in the way
 *                shortens the boom instantly (the player is never hidden behind
 *                it); once clear, the boom eases back out.
 *
 * Collision only shortens the boom; it never changes yaw. Yaw changes come only
 * from movement, controls, and the smooth wall-avoidance whiskers, so the
 * camera cannot jump, teleport, or fight itself.
 */

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

type Preset = { distance: number; elevation: number; targetHeight: number };

const MODES: Record<CameraMode, Preset> = {
  hub: { distance: 7.2, elevation: 0.15, targetHeight: 1.15 },
  conference: { distance: 6.8, elevation: 0.15, targetHeight: 1.15 },
  streets: { distance: 7.2, elevation: 0.15, targetHeight: 1.15 },
  house: { distance: 6.2, elevation: 0.15, targetHeight: 1.15 },
  palace: { distance: 7.0, elevation: 0.15, targetHeight: 1.15 },
  trade: { distance: 7.2, elevation: 0.15, targetHeight: 1.15 },
  night: { distance: 7.0, elevation: 0.15, targetHeight: 1.15 },
};

/** C-Up (close), default, C-Down (wide). */
const ZOOM_DISTANCES = [0.58, 0.76, 1.18] as const;

/** Camera collision sphere radius. */
const EYE_RADIUS = 0.22;
/** The boom never gets shorter than this unless geometry forces it. */
const MIN_DISTANCE = 1.2;
/** Pitch limits for manual control. */
const MIN_PITCH = 0.08;
const MAX_PITCH = 1.12;
/** Whisker angle and maximum wall-avoidance turn rate (rad, rad/s). */
const WHISKER_ANGLE = 0.4;
const WALL_AVOID_RATE = 2.2;

/** SM64 goal-yaw steps (0x100 and 0x20 per 30 Hz frame) in degrees/second. */
const IDLE_CENTER_DPS = 42.1875;
const IDLE_PUSHING_DPS = 5.2734375;
/** Gentle heading correction while running (at full speed). */
const RUN_CENTER_DPS = 12;
const RUN_SPEED = 6.5;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** Frame-rate independent exponential smoothing factor. */
const ease = (speed: number, dt: number) =>
  1 - Math.exp(-speed * Math.min(Math.max(dt, 0), 0.1));

// ---------------------------------------------------------------------------
// Geometry helpers (shared with authored/cinematic cameras)
// ---------------------------------------------------------------------------

/** Swept sphere test: true when a sphere moving start→end touches no solid. */
export function cameraSegmentClear(
  start: T.Vector3,
  end: T.Vector3,
  solids: readonly Solid[],
  radius = 0.28,
): boolean {
  const direction = end.clone().sub(start);
  return !solids.some((solid) => {
    const minX = solid.x - solid.w / 2 - radius;
    const maxX = solid.x + solid.w / 2 + radius;
    const minZ = solid.z - solid.d / 2 - radius;
    const maxZ = solid.z + solid.d / 2 + radius;

    let enter = 0,
      exit = 1;
    for (const [origin, delta, min, max] of [
      [start.x, direction.x, minX, maxX],
      [start.z, direction.z, minZ, maxZ],
    ] as const) {
      if (Math.abs(delta) < 1e-9) {
        if (origin < min || origin > max) return false;
      } else {
        let a = (min - origin) / delta,
          b = (max - origin) / delta;
        if (a > b) [a, b] = [b, a];
        enter = Math.max(enter, a);
        exit = Math.min(exit, b);
        if (enter > exit) return false;
      }
    }
    if (exit < 1e-5 || enter > 1 - 1e-5 || enter > exit) return false;

    // Check segment height over the solid's footprint:
    // If the lowest point over the footprint is on/above the top surface, it is a floor beneath us.
    const yAtEnter = start.y + enter * direction.y;
    const yAtExit = start.y + exit * direction.y;
    if (Math.min(yAtEnter, yAtExit) >= solid.y + solid.h - 0.02) return false;
    // If the highest point is below the bottom, it passes underneath an overhead ceiling.
    if (Math.max(yAtEnter, yAtExit) <= solid.y - radius + 0.02) return false;

    return true;
  });
}

/**
 * Fraction (0..1) of the ray origin→end that a sphere of `radius` can travel
 * before touching a solid. Solids that already contain the origin are ignored
 * so a focus point brushing a wall never collapses the boom.
 */
function boomFraction(
  origin: T.Vector3,
  end: T.Vector3,
  solids: readonly Solid[],
  radius: number,
): number {
  const o = [origin.x, origin.y, origin.z];
  const d = [end.x - origin.x, end.y - origin.y, end.z - origin.z];
  let nearest = 1;
  for (const solid of solids) {
    const mins = [
      solid.x - solid.w / 2 - radius,
      solid.y - radius,
      solid.z - solid.d / 2 - radius,
    ];
    const maxs = [
      solid.x + solid.w / 2 + radius,
      solid.y + solid.h,
      solid.z + solid.d / 2 + radius,
    ];
    let enter = -Infinity,
      exit = Infinity,
      miss = false;
    for (let axis = 0; axis < 3; axis++) {
      if (Math.abs(d[axis]) < 1e-9) {
        if (o[axis] < mins[axis] || o[axis] > maxs[axis]) miss = true;
        continue;
      }
      let a = (mins[axis] - o[axis]) / d[axis],
        b = (maxs[axis] - o[axis]) / d[axis];
      if (a > b) [a, b] = [b, a];
      enter = Math.max(enter, a);
      exit = Math.min(exit, b);
    }
    if (miss || enter > exit || exit <= 0 || enter < 0) continue;
    if (enter < nearest) nearest = enter;
  }
  return nearest;
}

/** Cast the target-to-camera segment against solids; returns the clear eye. */
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
      solid.y + solid.h,
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
  const distance = ray.length();
  return target
    .clone()
    .addScaledVector(ray, clamp(nearest - 0.12 / distance, 0.12, 1));
}

/** Recover an eye embedded by a spawn, authored cut, or moving prop locally. */
function recoverCameraEye(
  eye: T.Vector3,
  solids: readonly Solid[],
  radius = EYE_RADIUS,
): T.Vector3 {
  if (cameraSegmentClear(eye, eye, solids, radius)) return eye.clone();
  let nearest: T.Vector3 | undefined;
  for (const axis of [0, 1, 2]) {
    for (const direction of [-1, 1]) {
      const trial = eye.clone();
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

/** Highest floor support beneath a point. */
function floorUnderPoint(
  x: number,
  y: number,
  z: number,
  solids: readonly Solid[],
  radius = EYE_RADIUS,
): number {
  let highest = -Infinity;
  for (const s of solids) {
    if (
      x + radius >= s.x - s.w / 2 &&
      x - radius <= s.x + s.w / 2 &&
      z + radius >= s.z - s.d / 2 &&
      z - radius <= s.z + s.d / 2
    ) {
      const top = s.y + s.h;
      if (top <= y + 0.35) highest = Math.max(highest, top);
    }
  }
  return highest;
}

/** Lowest ceiling overhead above a point. */
function ceilingUnderPoint(
  x: number,
  y: number,
  z: number,
  solids: readonly Solid[],
  radius = EYE_RADIUS,
): number {
  let lowest = Infinity;
  for (const s of solids) {
    if (
      x + radius >= s.x - s.w / 2 &&
      x - radius <= s.x + s.w / 2 &&
      z + radius >= s.z - s.d / 2 &&
      z - radius <= s.z + s.d / 2
    ) {
      if (s.y >= y - 0.05) lowest = Math.min(lowest, s.y);
    }
  }
  return lowest;
}

/** Move camera eye while preventing it from passing through solid walls. */
function moveCameraEye(
  previous: T.Vector3,
  requested: T.Vector3,
  solids: readonly Solid[],
  radius = EYE_RADIUS,
): T.Vector3 {
  const prevFloor = floorUnderPoint(
    previous.x,
    previous.y,
    previous.z,
    solids,
    radius,
  );
  const currentY =
    prevFloor > -Infinity
      ? Math.max(previous.y, prevFloor + radius)
      : previous.y;

  // Move horizontally in X/Z, blocked only by vertical walls spanning currentY
  const hStart = new T.Vector3(previous.x, currentY, previous.z);
  const hReq = new T.Vector3(requested.x, currentY, requested.z);
  const hWalls = solids.filter(
    (s) => s.y < currentY - 0.05 && s.y + s.h > currentY + 0.05,
  );

  const start = recoverCameraEye(hStart, hWalls, radius);
  let safeH = hReq.clone();
  if (!cameraSegmentClear(start, hReq, hWalls, radius)) {
    let clear = 0,
      blocked = 1;
    for (let iteration = 0; iteration < 24; iteration++) {
      const fraction = (clear + blocked) / 2;
      const trial = start.clone().lerp(hReq, fraction);
      if (cameraSegmentClear(start, trial, hWalls, radius)) clear = fraction;
      else blocked = fraction;
    }
    safeH = start.clone().lerp(hReq, clear);
  }

  // Resolve vertical position at safe horizontal location
  const floor = floorUnderPoint(safeH.x, currentY, safeH.z, solids, radius);
  const ceil = ceilingUnderPoint(safeH.x, currentY, safeH.z, solids, radius);
  let resY = requested.y;
  if (floor > -Infinity) resY = Math.max(resY, floor + radius);
  if (ceil < Infinity) resY = Math.min(resY, ceil - radius);
  // Smooth descent over step risers (prevent instant 30cm drops)
  if (resY < currentY && floor > -Infinity) {
    resY = Math.max(resY, currentY - 0.12);
  }

  return new T.Vector3(safeH.x, resY, safeH.z);
}

/**
 * Lowest ceiling bottom (y) above the focus→eye path, or Infinity under open sky.
 * Only solids starting above `minY` (player head height) count, so floors,
 * furniture and stair treads are ignored.
 */
function ceilingAbovePath(
  target: T.Vector3,
  eye: T.Vector3,
  solids: readonly Solid[],
  minY: number,
  radius = 0.28,
): number {
  let ceiling = Infinity;
  const maxY = Math.max(target.y, eye.y) + radius;
  for (const s of solids) {
    if (s.y < minY || s.y > maxY || s.y >= ceiling) continue;
    // Thin rails/treads are not ceilings.
    if (s.h <= 0.35 && (s.d < 1 || s.w < 1)) continue;
    if (s.w < 0.5 && s.h < 0.5) continue;
    const flat = { ...s, y: -1e6, h: 2e6 };
    const a = new T.Vector3(target.x, 0, target.z);
    const b = new T.Vector3(eye.x, 0, eye.z);
    if (!cameraSegmentClear(a, b, [flat], radius) || a.distanceTo(b) < 1e-6) {
      const dist = a.distanceTo(b);
      const fraction =
        dist < 1e-6
          ? 0
          : clamp(
              ((s.x - target.x) * (eye.x - target.x) +
                (s.z - target.z) * (eye.z - target.z)) /
                (dist * dist),
              0,
              1,
            );
      const rayY = target.y + fraction * (eye.y - target.y);
      // If the sightline passes over this solid, it is a floor beneath us, not a ceiling.
      if (rayY >= s.y + s.h - 0.05) continue;
      ceiling = s.y;
    }
  }
  return ceiling;
}

/**
 * Solids that block the camera boom. Slender posts and low props are skipped,
 * as SM64 lets poles and trees pass between Lakitu and Mario without zooming.
 */
function isBoomBlocker(s: Solid, focusY: number): boolean {
  const maxDim = Math.max(s.w, s.d);
  const minDim = Math.min(s.w, s.d);
  if (maxDim <= 1.8 && minDim >= 0.5 * maxDim) return false; // column / trunk
  if (s.h <= 0.8 && maxDim <= 2.5) return false; // bench / crate
  return s.y < focusY + 3; // ignore geometry far overhead
}

type Bounds = CameraRoom["bounds"];

/** Fraction of focus→eye that stays inside an authored room's view bounds. */
function boundsFraction(focus: T.Vector3, eye: T.Vector3, b: Bounds): number {
  const m = 0.55;
  const lo = [
    b.minX + m,
    b.minY !== undefined ? b.minY + 0.25 : -Infinity,
    b.minZ + m,
  ];
  const hi = [
    b.maxX - m,
    b.maxY !== undefined ? b.maxY - 0.28 : Infinity,
    b.maxZ - m,
  ];
  const o = [focus.x, focus.y, focus.z];
  const d = [eye.x - focus.x, eye.y - focus.y, eye.z - focus.z];
  let t = 1;
  for (let axis = 0; axis < 3; axis++) {
    // Only constrain axes where the focus itself is inside the box.
    if (o[axis] < lo[axis] || o[axis] > hi[axis]) continue;
    if (d[axis] > 1e-9) t = Math.min(t, (hi[axis] - o[axis]) / d[axis]);
    if (d[axis] < -1e-9) t = Math.min(t, (lo[axis] - o[axis]) / d[axis]);
  }
  return clamp(t, 0, 1);
}

// ---------------------------------------------------------------------------
// Follow camera
// ---------------------------------------------------------------------------

export class FollowCamera {
  /** Direction the camera looks (from eye toward player), radians. */
  yaw = 0;
  pitch = MODES.hub.elevation;
  /** 0 = clear view of the player, 1 = fully hidden (used by UI only). */
  obstructionAmount = 0;
  get obstructed(): boolean {
    return this.obstructionAmount > 0.001;
  }
  get roomId(): string | undefined {
    return this.room?.id;
  }

  private room: CameraRoom | undefined;
  private focus = new T.Vector3();
  private lead = new T.Vector3();
  /** Boom length the camera wants (before collision). */
  private idealDistance = MODES.hub.distance;
  /** Boom length after the spring arm (≤ ideal). */
  private boomDistance = MODES.hub.distance;
  private speedPullback = 0;
  private zoomLevel = 1;
  /** Target yaw for snappy C-button 45° steps. */
  private orbitTarget: number | null = null;
  /** Player positioned the camera by hand; suspend centering until they move. */
  private manualIdleView = false;
  private recenterTime = 0;
  private lastEye = new T.Vector3();
  private initialized = false;
  private firstUpdate = true;

  constructor(readonly camera: T.PerspectiveCamera) {}

  reset(
    player: CameraPlayer,
    yawOverride = player.yaw,
    mode: CameraMode = "hub",
  ): void {
    const preset = MODES[mode];
    this.room = undefined;
    this.yaw = yawOverride;
    this.pitch = preset.elevation;
    this.zoomLevel = 1;
    this.orbitTarget = null;
    this.manualIdleView = false;
    this.recenterTime = this.speedPullback = 0;
    this.obstructionAmount = 0;
    this.idealDistance = this.boomDistance =
      preset.distance * ZOOM_DISTANCES[this.zoomLevel];
    this.focus.set(player.x, player.y + focusHeight(player, preset), player.z);
    this.lead.set(0, 0, 0);
    this.place(this.eyeAt(this.boomDistance));
    this.initialized = true;
    this.firstUpdate = true;
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
    const preset: Preset = room ?? MODES[mode];

    // An authored/story camera moved us: adopt its view and continue from it.
    if (this.camera.position.distanceToSquared(this.lastEye) > 0.0025) {
      this.focus.set(
        player.x,
        player.y + focusHeight(player, preset),
        player.z,
      );
      this.lastEye.copy(this.camera.position);
      this.adoptEye(this.camera.position);
    }

    // Room changes may cut to an authored doorway eye (SM64 castle doors).
    if (room?.id !== this.room?.id)
      this.enterRoom(room, player, preset, solids);

    if (this.firstUpdate) {
      this.firstUpdate = false;
      if (!cameraSegmentClear(this.lastEye, this.lastEye, solids, EYE_RADIUS)) {
        const initialLimit = this.springArmLimit(solids, room);
        if (initialLimit < this.boomDistance) {
          this.boomDistance = initialLimit;
          this.place(this.eyeAt(this.boomDistance));
        }
      }
    }

    // 1. Focus -------------------------------------------------------------
    const idealEyeBefore = this.eyeAt(this.idealDistance);
    const moved = Math.hypot(player.x - this.focus.x, player.z - this.focus.z);
    this.focus.x = player.x;
    this.focus.z = player.z;
    const wantY = player.y + focusHeight(player, preset);
    const rising = player.grounded === false && wantY > this.focus.y;
    // Hang back during jumps (SM64 keeps the horizon steady), keep up otherwise.
    this.focus.y += (wantY - this.focus.y) * ease(rising ? 3 : 10, dt);
    if (Math.abs(wantY - this.focus.y) > 2.5) this.focus.y = wantY;

    // 2. Yaw ---------------------------------------------------------------
    // Trailing: keep the previous ideal eye where it was and re-aim at the
    // player. Forward input pulls the camera along; sideways input arcs.
    const dx = this.focus.x - idealEyeBefore.x;
    const dz = this.focus.z - idealEyeBefore.z;
    if (Math.hypot(dx, dz) > 0.1) this.yaw = Math.atan2(dx, dz);

    const speed = player.runSpeed ?? 0;
    if (speed > 0.2) this.manualIdleView = false;
    this.applyControls(orbit, dt, player, preset);

    const automatic =
      !this.manualIdleView &&
      this.orbitTarget === null &&
      this.recenterTime === 0;
    if (automatic && player.grounded !== false) {
      const dps =
        speed >= 0.05
          ? RUN_CENTER_DPS * clamp(speed / RUN_SPEED, 0.35, 1)
          : orbit.movementIntent
            ? IDLE_PUSHING_DPS
            : IDLE_CENTER_DPS;
      const step = ((dps * Math.PI) / 180) * dt;
      this.yaw += clamp(angleDiff(player.yaw, this.yaw), -step, step);
    }
    if (automatic && (moved > 0.0001 || speed > 0.1))
      this.avoidWalls(solids, dt);

    // 3. Pitch -------------------------------------------------------------
    this.speedPullback +=
      (Math.min(1, speed / RUN_SPEED) * 0.7 - this.speedPullback) * ease(2, dt);
    this.idealDistance +=
      ((preset.distance + this.speedPullback) * ZOOM_DISTANCES[this.zoomLevel] -
        this.idealDistance) *
      ease(11, dt);
    const maxPitch = this.ceilingPitch(player, preset, solids);
    if (this.pitch > maxPitch) {
      this.pitch += (maxPitch - this.pitch) * ease(12, dt);
      this.pitch = Math.min(this.pitch, maxPitch + 0.01);
    } else if (
      automatic &&
      this.pitch < Math.min(maxPitch, preset.elevation) - 0.005
    ) {
      this.pitch +=
        (Math.min(maxPitch, preset.elevation) - this.pitch) * ease(4, dt);
    }

    // 4–5. Distance and spring arm ----------------------------------------
    const blockers = solids.filter((s) => isBoomBlocker(s, this.focus.y));
    const limit = this.springArmLimit(solids, room);
    const moving = moved > 0.0001 || speed >= 0.05;
    const orbiting =
      Math.abs(orbit.orbitX) + Math.abs(orbit.orbitY) > 0.0001 ||
      this.orbitTarget !== null ||
      this.recenterTime > 0 ||
      orbit.zoom !== undefined;
    const eyeClear = cameraSegmentClear(
      this.lastEye,
      this.lastEye,
      solids,
      EYE_RADIUS,
    );
    const expanding = limit >= this.boomDistance - 0.01;

    // Expanding outward is always allowed up to the obstacle limit.
    // Shortening inward occurs when moving, orbiting, or when the eye is trapped.
    // A stationary sightline obstruction does not collapse chosen zoom.
    if (expanding || moving || orbiting || !eyeClear) {
      if (limit < this.boomDistance) this.boomDistance = limit;
      else this.boomDistance += (limit - this.boomDistance) * ease(8, dt);
    }

    const eye = this.eyeAt(this.boomDistance);
    eye.y = Math.max(eye.y, player.y + 0.22);

    const sightlineObstructed =
      (blockers.length > 0 || room !== undefined) &&
      !cameraSegmentClear(this.focus, eye, blockers, 0.05);

    this.obstructionAmount = sightlineObstructed
      ? clamp(
          (this.idealDistance - this.boomDistance) /
            Math.max(0.1, this.idealDistance),
          0,
          1,
        )
      : 0;

    const safeEye = moveCameraEye(this.lastEye, eye, solids, 0.22);
    if (room) {
      const b = room.viewBounds ?? room.bounds;
      safeEye.x = clamp(safeEye.x, b.minX + 0.55, b.maxX - 0.55);
      safeEye.z = clamp(safeEye.z, b.minZ + 0.55, b.maxZ - 0.55);
      if (b.minY !== undefined && b.maxY !== undefined) {
        safeEye.y = clamp(safeEye.y, b.minY + 0.25, b.maxY - 0.28);
      }
    }
    safeEye.y = Math.max(safeEye.y, player.y + 0.22);

    // When dropping down a stairwell or off a balcony, an overhead floor slab
    // separates the previous eye from the lower-floor player. Transition directly
    // to the clear lower-floor view rather than leaving the camera trapped upstairs.
    const verticalSeparation = this.lastEye.y - player.y;
    if (
      verticalSeparation > 3.0 &&
      safeEye.y - player.y > 2.0 &&
      cameraSegmentClear(eye, eye, solids, 0.22) &&
      cameraSegmentClear(this.focus, eye, solids, 0.05)
    ) {
      safeEye.copy(eye);
    }

    const leadLength = Math.min(1, speed / RUN_SPEED) * 0.29;
    this.lead.lerp(
      new T.Vector3(
        Math.sin(player.yaw) * leadLength,
        0,
        Math.cos(player.yaw) * leadLength,
      ),
      ease(5, dt),
    );
    this.place(safeEye);
  }

  // -------------------------------------------------------------------------

  /** C-buttons, analog orbit, zoom and recenter. */
  private applyControls(
    orbit: CameraOrbit,
    dt: number,
    player: CameraPlayer,
    preset: Preset,
  ): void {
    if (orbit.zoom)
      this.zoomLevel = clamp(this.zoomLevel + Math.sign(orbit.zoom), 0, 2);
    if (Math.abs(orbit.orbitX) + Math.abs(orbit.orbitY) > 0.0001) {
      this.manualIdleView = true;
      this.recenterTime = 0;
      if (Math.abs(orbit.orbitX) > 0.45)
        this.orbitTarget = (this.orbitTarget ?? this.yaw) + orbit.orbitX;
      else {
        this.orbitTarget = null;
        this.yaw += orbit.orbitX;
      }
      this.pitch = clamp(this.pitch + orbit.orbitY, MIN_PITCH, MAX_PITCH);
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
      this.orbitTarget = null;
      this.recenterTime = 0.8;
    }
    if (this.recenterTime > 0) {
      this.yaw += angleDiff(player.yaw, this.yaw) * ease(7, dt);
      this.pitch += (preset.elevation - this.pitch) * ease(5, dt);
      this.recenterTime = Math.max(0, this.recenterTime - dt);
    }
  }

  /**
   * SM64 `rotate_camera_around_walls`: probe the boom slightly left and right.
   * If one side is more blocked than the other, turn smoothly toward the open
   * side. This swings the camera around building corners *before* the main
   * boom has to tuck in, which is what keeps corner turns smooth.
   */
  private avoidWalls(solids: readonly Solid[], dt: number): void {
    const blockers = solids.filter((s) => isBoomBlocker(s, this.focus.y));
    const reach = (yaw: number) =>
      boomFraction(
        this.focus,
        this.eyeAt(this.idealDistance, yaw),
        blockers,
        EYE_RADIUS,
      );
    const left = reach(this.yaw - WHISKER_ANGLE);
    const right = reach(this.yaw + WHISKER_ANGLE);
    const imbalance = right - left; // >0: right side is more open
    if (Math.abs(imbalance) < 0.05) return;
    this.yaw += imbalance * WALL_AVOID_RATE * dt;
  }

  /** Highest pitch that keeps the eye under any low ceiling on the boom. */
  private ceilingPitch(
    player: CameraPlayer,
    preset: Preset,
    solids: readonly Solid[],
  ): number {
    const natural = this.eyeAt(this.idealDistance, this.yaw, preset.elevation);
    const headY =
      player.y + (player.crouching || player.role === "child" ? 0.9 : 1.75);
    const ceiling = ceilingAbovePath(this.focus, natural, solids, headY);
    if (ceiling === Infinity) return MAX_PITCH;
    return Math.asin(
      clamp(
        (ceiling - 0.28 - this.focus.y) / Math.max(0.1, this.idealDistance),
        0.02,
        Math.max(0.02, preset.elevation),
      ),
    );
  }

  /** The single spring-arm raycast: how far out the eye may sit this frame. */
  private springArmLimit(
    solids: readonly Solid[],
    room: CameraRoom | undefined,
  ): number {
    const ideal = this.eyeAt(this.idealDistance);
    const blockers = solids.filter((s) => isBoomBlocker(s, this.focus.y));
    let fraction = boomFraction(this.focus, ideal, blockers, 0.08);
    const bounds = room?.viewBounds ?? room?.bounds;
    if (bounds)
      fraction = Math.min(fraction, boundsFraction(this.focus, ideal, bounds));
    let distance =
      fraction < 1 ? this.idealDistance * fraction - 0.05 : this.idealDistance;
    // A skipped post/prop may still sit exactly where the eye lands: keep the
    // lens physically outside it.
    const eye = this.eyeAt(Math.max(distance, 0));
    if (!cameraSegmentClear(eye, eye, solids, EYE_RADIUS)) {
      const solidFraction = boomFraction(this.focus, ideal, solids, EYE_RADIUS);
      if (solidFraction < 1) {
        distance = Math.min(
          distance,
          this.idealDistance * solidFraction - 0.05,
        );
      }
      return Math.max(distance, 0.3);
    }
    const floor = Math.min(MIN_DISTANCE, this.idealDistance * fraction);
    return Math.max(distance, floor, 0.3);
  }

  /** Cut to an authored doorway eye when a room is entered or exited. */
  private enterRoom(
    room: CameraRoom | undefined,
    player: CameraPlayer,
    preset: Preset,
    solids: readonly Solid[],
  ): void {
    const anchors = room?.entryEyes ?? this.room?.exitEyes ?? [];
    const hadPriorRoom = this.room !== undefined;
    this.room = room;
    this.orbitTarget = null;
    this.lead.set(0, 0, 0);
    const focus = new T.Vector3(
      player.x,
      player.y + focusHeight(player, preset),
      player.z,
    );
    const current = this.camera.position;
    const forward = new T.Vector3(focus.x - current.x, 0, focus.z - current.z);
    if (forward.lengthSq() > 1e-6) forward.normalize();

    const safeAnchors = anchors
      .map((p) => new T.Vector3(p.x, p.y, p.z))
      .filter(
        (eye) =>
          cameraSegmentClear(eye, eye, solids, EYE_RADIUS) &&
          cameraSegmentClear(focus, eye, solids, 0.05),
      );

    if (safeAnchors.length > 0) {
      safeAnchors.sort((a, b) => {
        const dotA = new T.Vector3(focus.x - a.x, 0, focus.z - a.z)
          .normalize()
          .dot(forward);
        const dotB = new T.Vector3(focus.x - b.x, 0, focus.z - b.z)
          .normalize()
          .dot(forward);
        return dotB - dotA;
      });
      const best = safeAnchors[0];
      this.focus.copy(focus);
      this.adoptEye(best);
      this.place(best);
      return;
    }

    if (room) {
      const roomClamp = room.viewBounds ?? room.bounds;
      const currentClear =
        boundsFraction(focus, current, roomClamp) >= 0.999 &&
        cameraSegmentClear(current, current, solids, EYE_RADIUS) &&
        cameraSegmentClear(focus, current, solids, 0.05);

      if (!currentClear) {
        for (const dist of [preset.distance, 2.0, 1.5]) {
          for (let i = 0; i < 8; i++) {
            const angleOffset =
              i === 0
                ? 0
                : (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 4);
            const yaw = player.yaw + angleOffset;
            const eye = new T.Vector3(
              clamp(
                focus.x - Math.sin(yaw) * dist,
                roomClamp.minX + 0.55,
                roomClamp.maxX - 0.55,
              ),
              focus.y + 1.2,
              clamp(
                focus.z - Math.cos(yaw) * dist,
                roomClamp.minZ + 0.55,
                roomClamp.maxZ - 0.55,
              ),
            );
            if (
              cameraSegmentClear(eye, eye, solids, EYE_RADIUS) &&
              cameraSegmentClear(focus, eye, solids, 0.05)
            ) {
              this.focus.copy(focus);
              this.adoptEye(eye);
              this.place(eye);
              return;
            }
          }
        }
      }
    }

    if (!hadPriorRoom && room) {
      this.pitch = preset.elevation;
      this.idealDistance = this.boomDistance =
        preset.distance * ZOOM_DISTANCES[this.zoomLevel];
    }
  }

  /** Derive yaw/pitch/distance from an eye position (cuts and story cameras). */
  private adoptEye(eye: T.Vector3): void {
    const dx = this.focus.x - eye.x,
      dz = this.focus.z - eye.z;
    const planar = Math.hypot(dx, dz);
    if (planar > 0.1) this.yaw = Math.atan2(dx, dz);
    this.pitch = clamp(
      Math.atan2(eye.y - this.focus.y, planar),
      MIN_PITCH,
      MAX_PITCH,
    );
    this.idealDistance = this.boomDistance = Math.max(
      0.3,
      eye.distanceTo(this.focus),
    );
    this.orbitTarget = null;
    this.lead.set(0, 0, 0);
  }

  private eyeAt(
    distance: number,
    yaw = this.yaw,
    pitch = this.pitch,
  ): T.Vector3 {
    const planar = Math.cos(pitch) * distance;
    return new T.Vector3(
      this.focus.x - Math.sin(yaw) * planar,
      this.focus.y + Math.sin(pitch) * distance,
      this.focus.z - Math.cos(yaw) * planar,
    );
  }

  private place(eye: T.Vector3): void {
    this.camera.position.copy(eye);
    this.camera.lookAt(this.focus.clone().add(this.lead));
    this.lastEye.copy(eye);
  }
}

function focusHeight(player: CameraPlayer, preset: Preset): number {
  if (player.crouching) return 0.58;
  return player.role === "child" ? 0.65 : preset.targetHeight;
}
