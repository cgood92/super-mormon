import { Box3, Vector3 } from "three";
import type { Solid } from "./physics";

export const ARROW_GRAVITY = 9.81;
export const ARROW_MAX_AGE = 5;
export type ArrowState = {
  position: Vector3;
  previous: Vector3;
  velocity: Vector3;
  age: number;
  active: boolean;
};
export type HuntingTarget = {
  id: string;
  previous: Vector3;
  position: Vector3;
  radius: number;
};
export type ArrowHit = {
  kind: "world" | "animal";
  targetId?: string;
  point: Vector3;
};
export function arrowSpeed(charge: number): number {
  return 12 + 30 * Math.max(0, Math.min(1, charge));
}
/** Yaw zero aims along +Z; positive pitch aims upward. */
export function aimDirection(yaw: number, pitch: number): Vector3 {
  return new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  );
}
export function createArrowState(
  origin: Vector3,
  yaw: number,
  pitch: number,
  charge: number,
): ArrowState {
  return {
    position: origin.clone(),
    previous: origin.clone(),
    velocity: aimDirection(yaw, pitch).multiplyScalar(arrowSpeed(charge)),
    age: 0,
    active: true,
  };
}
function boxFraction(a: Vector3, b: Vector3, box: Box3): number {
  let low = 0,
    high = 1;
  for (const k of ["x", "y", "z"] as const) {
    const d = b[k] - a[k];
    if (Math.abs(d) < 1e-10) {
      if (a[k] < box.min[k] || a[k] > box.max[k]) return Infinity;
    } else {
      const p = (box.min[k] - a[k]) / d,
        q = (box.max[k] - a[k]) / d;
      low = Math.max(low, Math.min(p, q));
      high = Math.min(high, Math.max(p, q));
      if (low > high) return Infinity;
    }
  }
  return low;
}
function sphereFraction(a: Vector3, b: Vector3, radius: number): number {
  const d = b.clone().sub(a),
    c = a.lengthSq() - radius * radius;
  if (c <= 0) return 0;
  const aa = d.lengthSq(),
    bb = 2 * a.dot(d),
    disc = bb * bb - 4 * aa * c;
  if (aa < 1e-12 || disc < 0) return Infinity;
  const t = (-bb - Math.sqrt(disc)) / (2 * aa);
  return t >= 0 && t <= 1 ? t : Infinity;
}
export function solidArrowBox(s: Solid): Box3 {
  return new Box3(
    new Vector3(s.x - s.w / 2, s.y, s.z - s.d / 2),
    new Vector3(s.x + s.w / 2, s.y + s.h, s.z + s.d / 2),
  );
}
/** Sweep small ballistic segments against both scenery and linearly moving animal volumes. */
export function stepArrow(
  state: ArrowState,
  dt: number,
  blockers: readonly Box3[],
  targets: readonly HuntingTarget[],
): ArrowHit | null {
  if (!state.active || dt <= 0) return null;
  state.previous.copy(state.position);
  const duration = Math.min(dt, ARROW_MAX_AGE - state.age),
    steps = Math.max(1, Math.ceil(duration / (1 / 120))),
    h = duration / steps;
  for (let i = 0; i < steps; i++) {
    const a = state.position.clone(),
      b = a.clone().addScaledVector(state.velocity, h);
    b.y -= 0.5 * ARROW_GRAVITY * h * h;
    let fraction = Infinity,
      hit: ArrowHit | null = null;
    for (const box of blockers) {
      const t = boxFraction(a, b, box);
      if (t < fraction) {
        fraction = t;
        hit = { kind: "world", point: a.clone().lerp(b, t) };
      }
    }
    for (const target of targets) {
      const start = target.previous.clone().lerp(target.position, i / steps),
        end = target.previous.clone().lerp(target.position, (i + 1) / steps);
      const t = sphereFraction(
        a.clone().sub(start),
        b.clone().sub(end),
        target.radius,
      );
      if (t < fraction - 1e-8) {
        fraction = t;
        hit = {
          kind: "animal",
          targetId: target.id,
          point: a.clone().lerp(b, t),
        };
      }
    }
    if (hit) {
      state.position.copy(hit.point);
      state.age += h * fraction;
      state.active = false;
      return hit;
    }
    state.position.copy(b);
    state.velocity.y -= ARROW_GRAVITY * h;
    state.age += h;
  }
  if (state.age >= ARROW_MAX_AGE - 1e-8) state.active = false;
  return null;
}
