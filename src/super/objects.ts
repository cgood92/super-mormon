import type { PlayerState, Solid } from "./physics";

export type CarryObject = {
  id: string;
  /** Object center, in world coordinates. */
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  held: boolean;
  grounded: boolean;
  spawn: { x: number; y: number; z: number };
};

export type ObjectTarget = { x: number; y: number; z: number; radius: number };

const REACH = 1.8;
const HOLD_DISTANCE = 0.8;
const HOLD_HEIGHT = 1.1;
const CROUCH_HOLD_HEIGHT = 0.6;
const GRAVITY = 22;
const EPS = 0.0001;

export function createCarryObject(
  id: string,
  x: number,
  y: number,
  z: number,
  radius = 0.28,
): CarryObject {
  return {
    id,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    radius,
    held: false,
    grounded: false,
    spawn: { x, y, z },
  };
}

type Point = { x: number; y: number; z: number };
type Hit = { time: number; normal: Point };

/** Sweep an object center against solids inflated by its radius. */
function sweep(
  from: Point,
  delta: Point,
  radius: number,
  solids: readonly Solid[],
): Hit | null {
  let first: Hit | null = null;
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
    const starts = [from.x, from.y, from.z];
    const changes = [delta.x, delta.y, delta.z];
    let enter = -Infinity;
    let leave = Infinity;
    let axis = -1;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(changes[i]) < 1e-10) {
        if (starts[i] <= mins[i] || starts[i] >= maxs[i]) {
          leave = -Infinity;
          break;
        }
        continue;
      }
      const a = (mins[i] - starts[i]) / changes[i];
      const b = (maxs[i] - starts[i]) / changes[i];
      const near = Math.min(a, b);
      if (near > enter) {
        enter = near;
        axis = i;
      }
      leave = Math.min(leave, Math.max(a, b));
    }
    if (enter > leave || leave < 0 || enter > 1 || enter < 0 || axis < 0)
      continue;
    const normal = { x: 0, y: 0, z: 0 };
    const direction = changes[axis] > 0 ? -1 : 1;
    if (axis === 0) normal.x = direction;
    else if (axis === 1) normal.y = direction;
    else normal.z = direction;
    if (!first || enter < first.time) first = { time: enter, normal };
  }
  return first;
}

function clear(
  point: Point,
  radius: number,
  solids: readonly Solid[],
): boolean {
  if (point.y < radius - EPS) return false;
  return solids.every(
    (solid) =>
      point.x <= solid.x - solid.w / 2 - radius + EPS ||
      point.x >= solid.x + solid.w / 2 + radius - EPS ||
      point.y <= solid.y - radius + EPS ||
      point.y >= solid.y + solid.h + radius - EPS ||
      point.z <= solid.z - solid.d / 2 - radius + EPS ||
      point.z >= solid.z + solid.d / 2 + radius - EPS,
  );
}

function playerOrigin(player: PlayerState): Point {
  return {
    x: player.x,
    y: player.y + (player.crouching ? CROUCH_HOLD_HEIGHT : HOLD_HEIGHT),
    z: player.z,
  };
}

function heldTarget(player: PlayerState): Point {
  return {
    x: player.x + Math.sin(player.yaw) * HOLD_DISTANCE,
    y: player.y + (player.crouching ? CROUCH_HOLD_HEIGHT : HOLD_HEIGHT),
    z: player.z + Math.cos(player.yaw) * HOLD_DISTANCE,
  };
}

/** Closest visible loose object within reach of the player's body. */
export function nearestCarryObject(
  player: PlayerState,
  objects: readonly CarryObject[],
  solids: readonly Solid[],
): CarryObject | null {
  let best: CarryObject | null = null;
  let bestDistance = REACH;
  const origin = playerOrigin(player);
  for (const object of objects) {
    if (object.held) continue;
    const distance = Math.hypot(
      object.x - player.x,
      object.y - (player.y + 0.8),
      object.z - player.z,
    );
    if (distance > bestDistance) continue;
    const delta = {
      x: object.x - origin.x,
      y: object.y - origin.y,
      z: object.z - origin.z,
    };
    if (sweep(origin, delta, 0, solids)) continue;
    bestDistance = distance;
    best = object;
  }
  return best;
}

/** Reach, sight, and the initial held position must all be clear. */
export function pickUp(
  object: CarryObject,
  player: PlayerState,
  solids: readonly Solid[],
): boolean {
  if (object.held || nearestCarryObject(player, [object], solids) !== object)
    return false;
  const target = heldTarget(player);
  if (!clear(target, object.radius, solids)) return false;
  const origin = playerOrigin(player);
  const delta = {
    x: target.x - origin.x,
    y: target.y - origin.y,
    z: target.z - origin.z,
  };
  if (sweep(origin, delta, object.radius, solids)) return false;
  Object.assign(object, target, {
    vx: 0,
    vy: 0,
    vz: 0,
    held: true,
    grounded: false,
  });
  return true;
}

/** Keep a carried object at the nearest clear point in front of its owner. */
function stepHeld(
  object: CarryObject,
  player: PlayerState,
  solids: readonly Solid[],
) {
  const origin = playerOrigin(player);
  const target = heldTarget(player);
  const delta = {
    x: target.x - origin.x,
    y: target.y - origin.y,
    z: target.z - origin.z,
  };
  if (!clear(origin, object.radius, solids)) {
    // A moving platform or teleport may put the owner's hand inside a solid.
    // Retain the last known clear object position until there is room again.
    return;
  }
  const hit = sweep(origin, delta, object.radius, solids);
  const t = hit ? Math.max(0, hit.time - EPS) : 1;
  const next = {
    x: origin.x + delta.x * t,
    y: origin.y + delta.y * t,
    z: origin.z + delta.z * t,
  };
  if (clear(next, object.radius, solids)) Object.assign(object, next);
}

/** Release in place, preserving a small amount of player motion. */
export function dropObject(object: CarryObject, player?: PlayerState): boolean {
  if (!object.held) return false;
  object.held = false;
  object.grounded = false;
  object.vx = player?.vx ?? 0;
  object.vy = Math.max(0, player?.vy ?? 0);
  object.vz = player?.vz ?? 0;
  return true;
}

/** Reset a loose or carried object to its original spawn point. */
export function resetCarryObject(object: CarryObject): void {
  Object.assign(object, object.spawn, {
    vx: 0,
    vy: 0,
    vz: 0,
    held: false,
    grounded: false,
  });
}

/** Throw forward only if the first part of the path is unobstructed. */
export function throwObject(
  object: CarryObject,
  player: PlayerState,
  solids: readonly Solid[],
): boolean {
  if (!object.held) return false;
  const direction = { x: Math.sin(player.yaw), y: 0, z: Math.cos(player.yaw) };
  const start = { x: object.x, y: object.y, z: object.z };
  if (
    !clear(start, object.radius, solids) ||
    sweep(
      start,
      { x: direction.x * 0.3, y: 0, z: direction.z * 0.3 },
      object.radius,
      solids,
    )
  )
    return false;
  object.held = false;
  object.grounded = false;
  object.vx = direction.x * 9 + player.vx * 0.35;
  object.vy = 4.8 + Math.max(0, player.vy) * 0.25;
  object.vz = direction.z * 9 + player.vz * 0.35;
  return true;
}

function stepLoose(
  object: CarryObject,
  dt: number,
  solids: readonly Solid[],
): void {
  object.grounded = false;
  object.vy -= GRAVITY * dt;
  let remaining = dt;
  for (let iteration = 0; iteration < 4 && remaining > 1e-7; iteration++) {
    const from = { x: object.x, y: object.y, z: object.z };
    const delta = {
      x: object.vx * remaining,
      y: object.vy * remaining,
      z: object.vz * remaining,
    };
    const wall = sweep(from, delta, object.radius, solids);
    const groundTime =
      delta.y < 0 && from.y + delta.y < object.radius
        ? (object.radius - from.y) / delta.y
        : Infinity;
    const hit: Hit | null =
      groundTime >= 0 && groundTime <= 1 && (!wall || groundTime < wall.time)
        ? { time: groundTime, normal: { x: 0, y: 1, z: 0 } }
        : wall;
    const time = hit ? Math.max(0, hit.time - EPS) : 1;
    object.x += delta.x * time;
    object.y += delta.y * time;
    object.z += delta.z * time;
    if (!hit) break;
    if (hit.normal.x) object.vx = 0;
    if (hit.normal.z) object.vz = 0;
    if (hit.normal.y) {
      object.vy = 0;
      object.grounded = hit.normal.y > 0;
      if (object.grounded) {
        object.vx *= Math.max(0, 1 - 9 * remaining);
        object.vz *= Math.max(0, 1 - 9 * remaining);
      }
    }
    remaining *= 1 - hit.time;
    // A floor contact at time zero cancels downward motion but must still
    // allow the remaining horizontal motion in this step.
    if (hit.time < EPS && hit.normal.y <= 0) break;
  }
  if (object.y <= object.radius + 0.001 && object.vy <= 0) {
    object.y = object.radius;
    object.vy = 0;
    object.grounded = true;
    object.vx *= Math.max(0, 1 - 9 * dt);
    object.vz *= Math.max(0, 1 - 9 * dt);
  }
  if (Math.hypot(object.vx, object.vz) < 0.03 && object.grounded) {
    object.vx = 0;
    object.vz = 0;
  }
}

/** Advance carried and loose objects. Sweeps each small step to prevent tunneling. */
export function stepCarryObjects(
  objects: CarryObject[],
  player: PlayerState,
  dt: number,
  solids: readonly Solid[],
): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  for (const object of objects) {
    if (object.held) {
      stepHeld(object, player, solids);
      continue;
    }
    const steps = Math.ceil(dt / (1 / 120));
    const subdt = dt / steps;
    for (let i = 0; i < steps; i++) stepLoose(object, subdt, solids);
  }
}

/** An objective is satisfied once a loose object rests on its target floor. */
export function objectInTarget(
  object: CarryObject,
  target: ObjectTarget,
): boolean {
  return (
    !object.held &&
    object.grounded &&
    Math.hypot(object.vx, object.vy, object.vz) < 0.55 &&
    Math.hypot(object.x - target.x, object.z - target.z) <= target.radius &&
    Math.abs(object.y - object.radius - target.y) <= 0.3
  );
}
