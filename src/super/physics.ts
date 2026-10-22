export type Solid = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
};
export type Climbable = {
  id: string;
  x: number;
  z: number;
  y: number;
  height: number;
  radius: number;
};
export type PlayerMove =
  | "idle"
  | "run"
  | "crouch"
  | "crawl"
  | "jump"
  | "doubleJump"
  | "tripleJump"
  | "longJump"
  | "backflip"
  | "sideflip"
  | "wallKick"
  | "ledgeHang"
  | "climb";
export type MoveInput = {
  x: number;
  y: number;
  jump: boolean;
  jumpHeld: boolean;
  crouch?: boolean;
  traversal?: boolean;
};
export type PlayerState = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  grounded: boolean;
  runSpeed: number;
  coyoteTime: number;
  jumpBufferTime: number;
  jumpHoldTime: number;
  crouching: boolean;
  move: PlayerMove;
  moveTime: number;
  jumpStage: number;
  comboTime: number;
  wallKickCooldown: number;
  climbCooldown: number;
  ledge?: { x: number; z: number; top: number };
  climbId?: string;
  climbAway?: { x: number; z: number };
  airMoveLock: number;
};
export type StepEvents = { jumped: boolean; landed: boolean };

const RADIUS = 0.32;
const HEIGHT = 1.65;
const CROUCH_HEIGHT = 0.9;
const STEP_HEIGHT = 0.43;
const EPS = 0.0001;
const SPEED = 6.5;
const ACCEL = 28;
const FRICTION = 26;
const GRAVITY = 27;
const JUMP = 9.2;

export function createPlayer(x = 0, y = 0, z = 0): PlayerState {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    grounded: y <= 0,
    runSpeed: 0,
    coyoteTime: y <= 0 ? 0.11 : 0,
    jumpBufferTime: 0,
    jumpHoldTime: 0,
    crouching: false,
    move: "idle",
    moveTime: 0,
    jumpStage: 0,
    comboTime: 0,
    wallKickCooldown: 0,
    climbCooldown: 0,
    airMoveLock: 0,
  };
}

function height(player: PlayerState): number {
  return player.crouching ? CROUCH_HEIGHT : HEIGHT;
}

function horizontalOverlap(x: number, z: number, solid: Solid): boolean {
  return (
    x + RADIUS > solid.x - solid.w / 2 + EPS &&
    x - RADIUS < solid.x + solid.w / 2 - EPS &&
    z + RADIUS > solid.z - solid.d / 2 + EPS &&
    z - RADIUS < solid.z + solid.d / 2 - EPS
  );
}

function bodyOverlap(
  x: number,
  y: number,
  z: number,
  solid: Solid,
  bodyHeight: number,
): boolean {
  return (
    horizontalOverlap(x, z, solid) &&
    y < solid.y + solid.h - EPS &&
    y + bodyHeight > solid.y + EPS
  );
}

function clearAt(
  x: number,
  y: number,
  z: number,
  solids: Solid[],
  bodyHeight: number,
): boolean {
  return solids.every((solid) => !bodyOverlap(x, y, z, solid, bodyHeight));
}

function supportHeight(player: PlayerState, solids: Solid[]): number {
  let result = 0;
  for (const solid of solids) {
    const top = solid.y + solid.h;
    if (
      top <= player.y + STEP_HEIGHT + EPS &&
      horizontalOverlap(player.x, player.z, solid)
    )
      result = Math.max(result, top);
  }
  return result;
}

function moveHorizontal(
  player: PlayerState,
  axis: "x" | "z",
  amount: number,
  solids: Solid[],
): void {
  if (!amount) return;
  const targetX = player.x + (axis === "x" ? amount : 0);
  const targetZ = player.z + (axis === "z" ? amount : 0);
  if (clearAt(targetX, player.y, targetZ, solids, height(player))) {
    player[axis] += amount;
    return;
  }
  if (player.grounded) {
    let stepTop = player.y;
    for (const solid of solids) {
      if (
        horizontalOverlap(targetX, targetZ, solid) &&
        solid.y + solid.h > player.y + EPS &&
        solid.y + solid.h <= player.y + STEP_HEIGHT + EPS
      ) {
        stepTop = Math.max(stepTop, solid.y + solid.h);
      }
    }
    if (
      stepTop > player.y &&
      clearAt(targetX, stepTop, targetZ, solids, height(player))
    ) {
      player.y = stepTop;
      player[axis] += amount;
      return;
    }
  }
  // Preserve sliding along the other axis by resolving each axis independently.
  let safe = player[axis];
  for (const solid of solids) {
    const cross =
      axis === "x"
        ? player.z + RADIUS > solid.z - solid.d / 2 &&
          player.z - RADIUS < solid.z + solid.d / 2
        : player.x + RADIUS > solid.x - solid.w / 2 &&
          player.x - RADIUS < solid.x + solid.w / 2;
    if (
      !cross ||
      player.y >= solid.y + solid.h - EPS ||
      player.y + height(player) <= solid.y + EPS
    )
      continue;
    const edge =
      (axis === "x" ? solid.x : solid.z) +
      (Math.sign(amount) * -(axis === "x" ? solid.w : solid.d)) / 2 -
      Math.sign(amount) * RADIUS;
    if (
      Math.sign(amount) * (edge - safe) >= 0 &&
      Math.sign(amount) *
        (edge -
          targetX * (axis === "x" ? 1 : 0) -
          targetZ * (axis === "z" ? 1 : 0)) <=
        0
    )
      safe = edge;
  }
  player[axis] = safe;
  player[axis === "x" ? "vx" : "vz"] = 0;
}

function setMove(player: PlayerState, move: PlayerMove): void {
  if (player.move !== move) {
    player.move = move;
    player.moveTime = 0;
  }
}

function nearbyWall(
  player: PlayerState,
  solids: Solid[],
  towardX: number,
  towardZ: number,
): { x: number; z: number } | undefined {
  for (const solid of solids) {
    if (player.y >= solid.y + solid.h || player.y + height(player) <= solid.y)
      continue;
    const dx =
      Math.max(
        solid.x - solid.w / 2,
        Math.min(player.x, solid.x + solid.w / 2),
      ) - player.x;
    const dz =
      Math.max(
        solid.z - solid.d / 2,
        Math.min(player.z, solid.z + solid.d / 2),
      ) - player.z;
    const d = Math.hypot(dx, dz);
    if (d > EPS && d < RADIUS + 0.22 && dx * towardX + dz * towardZ > 0.05)
      return { x: -dx / d, z: -dz / d };
  }
}

function possibleLedge(
  player: PlayerState,
  solids: Solid[],
  towardX: number,
  towardZ: number,
): PlayerState["ledge"] {
  for (const solid of solids) {
    const top = solid.y + solid.h;
    if (top < player.y + STEP_HEIGHT + 0.05 || top > player.y + HEIGHT + 0.08)
      continue;
    const nearestX = Math.max(
      solid.x - solid.w / 2,
      Math.min(player.x, solid.x + solid.w / 2),
    );
    const nearestZ = Math.max(
      solid.z - solid.d / 2,
      Math.min(player.z, solid.z + solid.d / 2),
    );
    const dx = nearestX - player.x,
      dz = nearestZ - player.z;
    const d = Math.hypot(dx, dz);
    if (d < EPS || d > RADIUS + 0.18 || dx * towardX + dz * towardZ <= 0.05)
      continue;
    const intoX = player.x + (dx / d) * (d + RADIUS + 0.08);
    const intoZ = player.z + (dz / d) * (d + RADIUS + 0.08);
    if (clearAt(intoX, top, intoZ, solids, HEIGHT))
      return { x: intoX, z: intoZ, top };
  }
}

function clearLedgePull(
  player: PlayerState,
  ledge: NonNullable<PlayerState["ledge"]>,
  solids: Solid[],
): boolean {
  const rise = ledge.top - player.y;
  const verticalSteps = Math.ceil(Math.abs(rise) / 0.05);
  for (let i = 1; i <= verticalSteps; i++) {
    if (
      !clearAt(
        player.x,
        player.y + (rise * i) / verticalSteps,
        player.z,
        solids,
        HEIGHT,
      )
    )
      return false;
  }
  const dx = ledge.x - player.x;
  const dz = ledge.z - player.z;
  const horizontalSteps = Math.ceil(Math.hypot(dx, dz) / 0.05);
  for (let i = 1; i <= horizontalSteps; i++) {
    if (
      !clearAt(
        player.x + (dx * i) / horizontalSteps,
        ledge.top,
        player.z + (dz * i) / horizontalSteps,
        solids,
        HEIGHT,
      )
    )
      return false;
  }
  return true;
}

export function stepPlayer(
  player: PlayerState,
  input: MoveInput,
  dt: number,
  cameraYaw: number,
  solids: Solid[],
  climbables: Climbable[] = [],
): StepEvents {
  const events = { jumped: false, landed: false };
  if (!Number.isFinite(dt) || dt <= 0) return events;
  const count = Math.ceil(Math.min(dt, 0.1) / (1 / 120));
  const subdt = Math.min(dt, 0.1) / count;
  const magnitude = Math.hypot(input.x, input.y);
  const length = Math.min(1, magnitude);
  const ux = magnitude ? (input.x / magnitude) * length : 0;
  const uy = magnitude ? (input.y / magnitude) * length : 0;
  const worldX = -Math.cos(cameraYaw) * ux + Math.sin(cameraYaw) * uy;
  const worldZ = Math.sin(cameraYaw) * ux + Math.cos(cameraYaw) * uy;
  if (input.jump) player.jumpBufferTime = 0.13;
  for (let i = 0; i < count; i++) {
    player.moveTime += subdt;
    player.comboTime = Math.max(0, player.comboTime - subdt);
    player.wallKickCooldown = Math.max(0, player.wallKickCooldown - subdt);
    player.climbCooldown = Math.max(0, player.climbCooldown - subdt);
    player.airMoveLock = Math.max(0, player.airMoveLock - subdt);
    player.jumpBufferTime = Math.max(0, player.jumpBufferTime - subdt);
    player.coyoteTime = Math.max(0, player.coyoteTime - subdt);

    if (player.ledge) {
      player.vx = player.vy = player.vz = 0;
      player.runSpeed = 0;
      if (input.crouch) {
        player.ledge = undefined;
        player.climbCooldown = 0.25;
        setMove(player, "jump");
      } else if (
        (input.jump || (input.y > 0.4 && player.moveTime >= 0.16)) &&
        clearLedgePull(player, player.ledge, solids)
      ) {
        player.x = player.ledge.x;
        player.z = player.ledge.z;
        player.y = player.ledge.top;
        player.ledge = undefined;
        player.grounded = true;
        player.crouching = false;
        player.jumpBufferTime = 0;
        setMove(player, "idle");
      } else continue;
    }

    if (player.climbId) {
      const climb = climbables.find((item) => item.id === player.climbId);
      if (!climb) {
        player.climbId = undefined;
      } else if (input.crouch || input.jump) {
        player.climbId = undefined;
        player.climbCooldown = 0.35;
        if (input.jump) {
          player.vx = (player.climbAway?.x ?? 0) * 4.5;
          player.vz = (player.climbAway?.z ?? 1) * 4.5;
          player.vy = JUMP * 0.85;
          player.airMoveLock = 0.18;
          events.jumped = true;
          setMove(player, "jump");
          player.jumpBufferTime = 0;
        } else {
          player.vy = -1;
          setMove(player, "jump");
        }
      } else {
        const targetY = Math.max(
          climb.y + 0.25,
          Math.min(
            climb.y + climb.height - 0.6,
            player.y + input.y * 3.2 * subdt,
          ),
        );
        const bodyHeight = clearAt(player.x, player.y, player.z, solids, HEIGHT)
          ? HEIGHT
          : CROUCH_HEIGHT;
        player.crouching = bodyHeight === CROUCH_HEIGHT;
        const startY = player.y;
        const steps = Math.ceil(Math.abs(targetY - startY) / 0.05);
        for (let step = 1; step <= steps; step++) {
          const candidate = startY + ((targetY - startY) * step) / steps;
          if (!clearAt(player.x, candidate, player.z, solids, bodyHeight))
            break;
          player.y = candidate;
        }
        player.vx = player.vy = player.vz = 0;
        player.runSpeed = 0;
        player.grounded = false;
        continue;
      }
    }

    if (
      !player.grounded &&
      !player.ledge &&
      !player.climbId &&
      input.traversal !== false &&
      player.climbCooldown <= 0 &&
      climbables.length &&
      length > 0.1
    ) {
      for (const climb of climbables) {
        const dx = climb.x - player.x,
          dz = climb.z - player.z;
        const d = Math.hypot(dx, dz);
        if (
          d < climb.radius + 0.58 &&
          d > EPS &&
          dx * worldX + dz * worldZ > 0.08 &&
          player.y >= climb.y &&
          player.y < climb.y + climb.height - 0.5
        ) {
          player.climbId = climb.id;
          player.climbAway = { x: -dx / d, z: -dz / d };
          player.vx = player.vy = player.vz = 0;
          player.runSpeed = 0;
          setMove(player, "climb");
          break;
        }
      }
      if (player.climbId) continue;
    }

    const standingBlocked = !clearAt(
      player.x,
      player.y,
      player.z,
      solids,
      HEIGHT,
    );
    player.crouching = standingBlocked || (player.grounded && !!input.crouch);
    const targetSpeed = player.crouching ? SPEED * 0.43 : SPEED;
    const targetVx = worldX * targetSpeed,
      targetVz = worldZ * targetSpeed;
    if (player.airMoveLock <= 0) {
      const maxDelta = (length > 0.01 ? ACCEL : FRICTION) * subdt;
      player.vx += Math.max(
        -maxDelta,
        Math.min(maxDelta, targetVx - player.vx),
      );
      player.vz += Math.max(
        -maxDelta,
        Math.min(maxDelta, targetVz - player.vz),
      );
    }
    player.runSpeed = Math.hypot(player.vx, player.vz);
    if (player.runSpeed > 0.12) player.yaw = Math.atan2(player.vx, player.vz);
    if (player.grounded) player.coyoteTime = 0.11;

    if (
      player.jumpBufferTime > 0 &&
      (player.grounded || player.coyoteTime > 0)
    ) {
      const wasMoving = player.runSpeed > 2.6;
      const reverse = worldX * player.vx + worldZ * player.vz < -2.8;
      const combo = player.comboTime > 0 && wasMoving && !input.crouch;
      let move: PlayerMove = "jump";
      if (input.crouch && wasMoving) move = "longJump";
      else if (input.crouch && !wasMoving) move = "backflip";
      else if (reverse) move = "sideflip";
      else if (combo && player.jumpStage === 1) move = "doubleJump";
      else if (combo && player.jumpStage === 2 && player.runSpeed > 4.5)
        move = "tripleJump";
      player.jumpStage =
        move === "doubleJump" ? 2 : move === "tripleJump" ? 3 : 1;
      player.vy =
        move === "tripleJump"
          ? 12.5
          : move === "backflip"
            ? 11
            : move === "doubleJump"
              ? 10.5
              : move === "longJump"
                ? 8
                : JUMP;
      if (move === "longJump") {
        const launchSpeed = Math.min(10, Math.max(8.5, player.runSpeed * 1.45));
        player.vx = (player.vx / player.runSpeed) * launchSpeed;
        player.vz = (player.vz / player.runSpeed) * launchSpeed;
        player.airMoveLock = 0.65;
      }
      if (move === "backflip") {
        player.vx = -Math.sin(player.yaw) * 4;
        player.vz = -Math.cos(player.yaw) * 4;
        player.airMoveLock = 0.2;
      }
      if (move === "sideflip") {
        player.vx = -player.vx * 1.1;
        player.vz = -player.vz * 1.1;
        player.airMoveLock = 0.25;
      }
      player.grounded = false;
      player.crouching = standingBlocked;
      player.coyoteTime = 0;
      player.jumpBufferTime = 0;
      player.jumpHoldTime = 0;
      setMove(player, move);
      events.jumped = true;
    } else if (
      player.jumpBufferTime > 0 &&
      !player.grounded &&
      player.coyoteTime <= 0 &&
      player.wallKickCooldown <= 0
    ) {
      const wall = nearbyWall(player, solids, worldX, worldZ);
      if (wall) {
        player.vx = wall.x * 6;
        player.vz = wall.z * 6;
        player.vy = JUMP;
        player.jumpBufferTime = 0;
        player.jumpHoldTime = 0;
        player.wallKickCooldown = 0.3;
        player.airMoveLock = 0.2;
        setMove(player, "wallKick");
        events.jumped = true;
      }
    }
    if (
      !player.grounded &&
      player.vy < -0.4 &&
      !player.ledge &&
      input.traversal !== false &&
      length > 0.1 &&
      player.climbCooldown <= 0
    ) {
      const ledge = possibleLedge(player, solids, worldX, worldZ);
      if (ledge) {
        player.ledge = ledge;
        player.vx = player.vy = player.vz = 0;
        player.runSpeed = 0;
        setMove(player, "ledgeHang");
        continue;
      }
    }

    moveHorizontal(player, "x", player.vx * subdt, solids);
    moveHorizontal(player, "z", player.vz * subdt, solids);
    if (player.vy > 0 && !input.jumpHeld) player.vy = Math.min(player.vy, 4.1);
    const gravity =
      player.vy > 0 && input.jumpHeld && player.jumpHoldTime < 0.22
        ? GRAVITY * 0.48
        : GRAVITY;
    player.vy -= gravity * subdt;
    if (input.jumpHeld) player.jumpHoldTime += subdt;
    const oldY = player.y;
    let nextY = oldY + player.vy * subdt;
    if (player.vy > 0) {
      for (const solid of solids) {
        if (
          horizontalOverlap(player.x, player.z, solid) &&
          oldY + height(player) <= solid.y + EPS &&
          nextY + height(player) >= solid.y
        ) {
          nextY = Math.min(nextY, solid.y - height(player));
          player.vy = 0;
        }
      }
      player.grounded = false;
    } else {
      const floor = supportHeight(player, solids);
      if (oldY >= floor - EPS && nextY <= floor + EPS) {
        nextY = floor;
        player.vy = 0;
        if (!player.grounded) {
          events.landed = true;
          player.comboTime = 0.22;
        }
        player.grounded = true;
      } else player.grounded = false;
    }
    player.y = nextY;
    if (player.grounded) {
      if (player.comboTime <= 0) player.jumpStage = 0;
      setMove(
        player,
        player.crouching
          ? player.runSpeed > 0.3
            ? "crawl"
            : "crouch"
          : player.runSpeed > 0.3
            ? "run"
            : "idle",
      );
    }
  }
  return events;
}
