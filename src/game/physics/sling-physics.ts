import { Box3, Vector3 } from "three";
import {
  aimDirection,
  stepArrow,
  type ArrowState,
  type HuntingTarget,
} from "./hunting-physics";

/** A cord sling: speed comes from the pouch's angular velocity, not elastic draw. */
export const SLING_RADIUS = 0.8;
export const SLING_MIN_ANGULAR_SPEED = 12;
export const SLING_MAX_ANGULAR_SPEED = 38;
export type SlingSpinState = {
  phase: number;
  angularSpeed: number;
  heldSeconds: number;
  pendingRelease: boolean;
};
/** The ballistic integrator is shared with arrows; a stone has no steering. */
export type StoneState = ArrowState;
export type SlingTarget = HuntingTarget;
export type StoneHit = {
  kind: "world" | "target";
  targetId?: string;
  point: Vector3;
};
export function createSlingSpinState(): SlingSpinState {
  return {
    phase: 0,
    angularSpeed: SLING_MIN_ANGULAR_SPEED,
    heldSeconds: 0,
    pendingRelease: false,
  };
}
export function cancelSlingSpin(state: SlingSpinState): void {
  Object.assign(state, createSlingSpinState());
}
export function slingCharge(state: SlingSpinState): number {
  return Math.max(
    0,
    Math.min(
      1,
      (state.angularSpeed - SLING_MIN_ANGULAR_SPEED) /
        (SLING_MAX_ANGULAR_SPEED - SLING_MIN_ANGULAR_SPEED),
    ),
  );
}
export function requestSlingRelease(state: SlingSpinState): void {
  state.pendingRelease = true;
}
/** Release waits for the forward tangent. This timing assist never tracks a target.
 * Pending release retains angular momentum; the visible pouch finishes its turn.
 * Returns true exactly at that tangent, with phase pinned to zero for the shot.
 */
export function stepSlingSpin(
  state: SlingSpinState,
  dt: number,
  held: boolean,
): boolean {
  if (!(dt > 0) || (!held && !state.pendingRelease)) return false;
  const previousSpeed = state.angularSpeed;
  if (held && !state.pendingRelease) {
    state.heldSeconds += dt;
    state.angularSpeed = Math.min(
      SLING_MAX_ANGULAR_SPEED,
      SLING_MIN_ANGULAR_SPEED +
        (state.heldSeconds *
          (SLING_MAX_ANGULAR_SPEED - SLING_MIN_ANGULAR_SPEED)) /
          1.2,
    );
  }
  const advance = (previousSpeed + state.angularSpeed) * 0.5 * dt;
  if (state.pendingRelease && state.phase + advance >= Math.PI * 2) {
    state.phase = 0;
    state.pendingRelease = false;
    return true;
  }
  state.phase = (state.phase + advance) % (Math.PI * 2);
  return false;
}
/** Local orbit starts at -X, with +Z tangent. Positive pitch raises +Z. */
export function slingPouchOffset(
  phase: number,
  yaw: number,
  pitch: number,
): Vector3 {
  const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return right
    .multiplyScalar(-Math.cos(phase) * SLING_RADIUS)
    .addScaledVector(aimDirection(yaw, pitch), Math.sin(phase) * SLING_RADIUS);
}
export function releaseSlingStone(
  origin: Vector3,
  yaw: number,
  pitch: number,
  spin: SlingSpinState,
): StoneState {
  const position = origin.clone().add(slingPouchOffset(spin.phase, yaw, pitch));
  const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const tangent = right
    .multiplyScalar(Math.sin(spin.phase))
    .addScaledVector(aimDirection(yaw, pitch), Math.cos(spin.phase));
  return {
    position,
    previous: position.clone(),
    velocity: tangent.multiplyScalar(SLING_RADIUS * spin.angularSpeed),
    age: 0,
    active: true,
  };
}
/** Swept scenery and moving-target collision, earliest hit wins (walls win ties). */
export function stepStone(
  state: StoneState,
  dt: number,
  blockers: readonly Box3[],
  targets: readonly SlingTarget[],
): StoneHit | null {
  const hit = stepArrow(state, dt, blockers, targets);
  return hit
    ? { ...hit, kind: hit.kind === "animal" ? "target" : "world" }
    : null;
}
