import * as T from "three";
import type { CharacterRole, CharacterState } from "./character-types";
const damp = (speed: number, dt: number) =>
  1 - Math.exp(-speed * Math.min(Math.max(dt, 0), 0.1));
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** Existing motion solver, operating only on a lightweight transform skeleton. */
export function createMotionDriver(role: CharacterRole): {
  group: T.Group;
  update(dt: number, state: CharacterState): void;
  dispose(): void;
} {
  const armored = false;
  const group = new T.Group();
  const node = (name: string, parent: T.Object3D, x = 0, y = 0, z = 0) => {
    const object = new T.Group();
    object.name = name;
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  const body = node("body", group);
  body.scale.y = 0.84;
  const head = node("head", body, 0, 1.64, 0.025);
  const cloak = node("cloak", body, 0, 1.37, -0.11);
  const legs: T.Group[] = [],
    knees: T.Group[] = [],
    feet: T.Group[] = [],
    arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const name = side < 0 ? "left" : "right";
    const leg = node(`${name}-leg`, body, side * 0.21, 0.66);
    const knee = node(`${name}-knee`, leg, 0, -0.35);
    const foot = node(`${name}-foot`, knee, 0, -0.28);
    const arm = node(`${name}-arm`, body, side * 0.39, 1.32);
    legs.push(leg);
    knees.push(knee);
    feet.push(foot);
    arms.push(arm);
  }
  let phase = Math.PI / 2;
  let idlePhase = 0;
  let airTime = 0;
  let landing = 0;
  let wasGrounded = true;
  let renderedYaw = 0;
  let firstUpdate = true;
  let gaitBlend = 0;
  let previousX = 0;
  let previousZ = 0;
  let previousForwardSpeed = 0;
  let forwardLean = 0;
  let turnBank = 0;
  let lastAirVy = 0;
  let wasLocomoting = false;
  const stanceAnchors: ({ x: number; z: number; yaw: number } | null)[] = [
    null,
    null,
  ];
  return {
    group,
    update(dt, state) {
      dt = Math.min(Math.max(dt, 0), 0.1);
      group.position.set(state.x, state.y, state.z);
      if (firstUpdate) {
        renderedYaw = state.yaw;
        previousX = state.x - state.vx * dt;
        previousZ = state.z - state.vz * dt;
        previousForwardSpeed =
          Math.sin(state.yaw) * state.vx + Math.cos(state.yaw) * state.vz;
        firstUpdate = false;
      }
      renderedYaw += angleDiff(state.yaw, renderedYaw) * damp(14, dt);
      // Heading belongs to the parent; body rotations are local pose only.
      // This keeps crawl pitch, flips, limbs, and offsets aligned to travel.
      group.rotation.y = renderedYaw;
      body.rotation.y = 0;
      const speed = Math.min(1, state.runSpeed / 6.5);
      gaitBlend += ((state.grounded ? speed : 0) - gaitBlend) * damp(10, dt);
      const localForward =
        Math.sin(renderedYaw) * state.vx + Math.cos(renderedYaw) * state.vz;
      const localLateral =
        Math.cos(renderedYaw) * state.vx - Math.sin(renderedYaw) * state.vz;
      const headingError = angleDiff(state.yaw, renderedYaw);
      const bankTarget = Math.max(
        -0.16,
        Math.min(0.16, -localLateral * 0.022 - headingError * 0.08),
      );
      turnBank += (bankTarget - turnBank) * damp(11, dt);
      const forwardAcceleration =
        dt > 0
          ? Math.max(
              -35,
              Math.min(35, (localForward - previousForwardSpeed) / dt),
            )
          : 0;
      previousForwardSpeed = localForward;
      const leanTarget = Math.max(
        -0.075,
        Math.min(0.13, localForward * 0.016 + forwardAcceleration * 0.003),
      );
      forwardLean += (leanTarget - forwardLean) * damp(8, dt);
      const fullStrideAngle = 0.21 + speed * 0.12;
      const strideAmplitude = fullStrideAngle * Math.min(1, gaitBlend * 3);
      if (state.grounded) {
        const traveled = Math.hypot(state.x - previousX, state.z - previousZ);
        const locomoting = state.runSpeed > 0.25;
        if (locomoting && !wasLocomoting) phase = Math.PI / 2;
        wasLocomoting = locomoting;
        // A planted foot moves from front to back over the distance covered
        // during one stance. Short walking steps therefore have a faster cycle.
        const halfStep = 0.63 * Math.sin(fullStrideAngle);
        phase +=
          (Math.min(traveled, state.runSpeed * dt * 1.5) * Math.PI) /
          (2 * halfStep);
        idlePhase += dt;
        if (!wasGrounded)
          landing = Math.min(1, 0.28 + Math.abs(lastAirVy) * 0.075);
        airTime = 0;
      } else {
        airTime += dt;
        lastAirVy = state.vy;
      }
      previousX = state.x;
      previousZ = state.z;
      wasGrounded = state.grounded;
      landing = Math.max(0, landing - dt * 3.2);
      const stride = Math.sin(phase) * strideAmplitude;
      for (let i = 0; i < 2; i++) {
        const legPhase =
          (((phase + i * Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI);
        const stance = legPhase < Math.PI;
        const progress = stance
          ? legPhase / Math.PI
          : (legPhase - Math.PI) / Math.PI;
        const swing = stance ? 0 : Math.sin(progress * Math.PI);
        if (state.grounded) {
          const returnStep = progress * progress * (3 - 2 * progress);
          legs[i].rotation.x = stance
            ? strideAmplitude * (2 * progress - 1)
            : strideAmplitude * (1 - 2 * returnStep);
          knees[i].rotation.x = 0.025 * gaitBlend + swing * 0.3 * gaitBlend;
        } else {
          legs[i].rotation.x =
            i === 0
              ? -0.28 + Math.min(0.25, airTime * 0.6)
              : 0.33 - Math.min(0.22, airTime * 0.5);
          knees[i].rotation.x = 0.42;
        }
        feet[i].rotation.x = -legs[i].rotation.x - knees[i].rotation.x * 0.9;
        feet[i].position.y =
          -0.28 + (state.grounded ? gaitBlend * (0.025 + swing * 0.065) : 0);
        if (state.grounded && stance && !state.crouching) {
          const legLength = 0.35 - feet[i].position.y;
          const anchor = stanceAnchors[i];
          if (anchor && Math.abs(angleDiff(renderedYaw, anchor.yaw)) < 0.55) {
            const localZ =
              Math.sin(renderedYaw) * (anchor.x - state.x) +
              Math.cos(renderedYaw) * (anchor.z - state.z);
            if (Math.abs(localZ) <= legLength * Math.sin(strideAmplitude)) {
              legs[i].rotation.x = -Math.asin(localZ / legLength);
            } else {
              stanceAnchors[i] = null;
            }
          }
          if (!stanceAnchors[i]) {
            const localZ = -legLength * Math.sin(legs[i].rotation.x);
            stanceAnchors[i] = {
              x: state.x + Math.sin(renderedYaw) * localZ,
              z: state.z + Math.cos(renderedYaw) * localZ,
              yaw: renderedYaw,
            };
          }
          feet[i].rotation.x = -legs[i].rotation.x - knees[i].rotation.x * 0.9;
        } else {
          stanceAnchors[i] = null;
        }
      }
      arms[0].rotation.x = state.grounded ? -stride * 0.78 - 0.08 : -0.42;
      arms[1].rotation.x = state.grounded ? stride * 0.78 - 0.08 : -0.26;
      legs[0].rotation.z = 0;
      legs[1].rotation.z = 0;
      arms[0].rotation.z = armored ? -0.2 : 0.12;
      arms[1].rotation.z = armored ? 0.2 : -0.12;
      body.position.y =
        (1 - Math.cos(phase * 2)) * 0.015 * gaitBlend +
        Math.sin(idlePhase * 0.55) * 0.009 -
        landing * 0.075;
      // The model's unscaled head reaches 1.94; physics reserves 1.65.
      body.scale.y = 0.84 * (1 - landing * 0.09);
      body.scale.x = 1 + landing * 0.045;
      body.scale.z = 1 + landing * 0.045;
      body.rotation.z = turnBank;
      body.rotation.x = (armored ? 0.055 : 0) + forwardLean;
      cloak.rotation.x =
        -0.08 - gaitBlend * 0.18 + Math.sin(phase * 1.3) * gaitBlend * 0.035;
      head.rotation.y = Math.sin(idlePhase * 0.4) * 0.055;
      head.rotation.x = state.grounded
        ? armored
          ? 0.07
          : 0
        : Math.max(-0.12, Math.min(0.15, -state.vy * 0.018));

      const move =
        state.crouching && !state.grounded && state.move !== "groundPound"
          ? "crouch"
          : (state.move ??
            (state.crouching
              ? state.runSpeed > 0.25
                ? "crawl"
                : "crouch"
              : state.grounded
                ? state.runSpeed > 0.25
                  ? "run"
                  : "idle"
                : (state.jumpStage ?? 1) >= 3
                  ? "tripleJump"
                  : state.jumpStage === 2
                    ? "doubleJump"
                    : "jump"));
      const moveTime = Math.max(0, state.moveTime ?? 0);
      if (move === "swim") {
        const stroke = state.moveTime ?? idlePhase;
        body.rotation.x = 0.32;
        body.rotation.z = Math.sin(stroke * 3) * 0.045;
        head.rotation.x = -0.23;
        arms[0].rotation.set(-1.5 + Math.sin(stroke * 3) * 1.1, 0, -0.35);
        arms[1].rotation.set(-1.5 - Math.sin(stroke * 3) * 1.1, 0, 0.35);
        legs[0].rotation.x = Math.sin(stroke * 5) * 0.23;
        legs[1].rotation.x = -Math.sin(stroke * 5) * 0.23;
        knees[0].rotation.x = knees[1].rotation.x = 0.25;
      } else if (move === "crawl") {
        // Rotate a full-size body onto hands and knees, rather than shrinking
        // an upright walk. Diagonal supports alternate with distance traveled.
        body.scale.set(1, 0.84, 1);
        body.position.y = 0.53;
        body.rotation.x = Math.PI / 2;
        body.rotation.z = 0;
        for (let i = 0; i < 2; i++) {
          const cycle = Math.sin(phase + i * Math.PI);
          arms[i].rotation.set(-Math.PI / 2 + cycle * 0.12, 0, 0);
          legs[i].rotation.set(-Math.PI / 2 - cycle * 0.1, 0, 0);
          knees[i].rotation.x = Math.PI / 2;
          feet[i].rotation.x = 0;
        }
        head.rotation.set(-Math.PI / 2, 0, 0);
      } else if (move === "crouch") {
        // Stationary duck retains the take-off pose for backflips/long jumps.
        body.scale.y = 0.4599;
        body.scale.z = 1;
        body.position.y = 0;
        body.rotation.x = 0;
        legs[0].rotation.x = legs[1].rotation.x = -0.85;
        knees[0].rotation.x = knees[1].rotation.x = 1.1;
        feet[0].rotation.x = feet[1].rotation.x = -0.25;
        arms[0].rotation.x = arms[1].rotation.x = -0.55;
        head.rotation.x = -0.1;
      } else if (
        move === "backflip" ||
        move === "tripleJump" ||
        move === "sideflip"
      ) {
        const progress = Math.min(1, moveTime / 0.7);
        const angle = Math.PI * 2 * progress;
        // A raised center pivot keeps the inverted head above the ground.
        body.position.y = 0.83 * (1 - Math.cos(angle));
        body.rotation.x =
          move === "sideflip" ? 0 : move === "backflip" ? -angle : angle;
        body.rotation.z = move === "sideflip" ? angle : 0;
        legs[0].rotation.x = -0.45;
        legs[1].rotation.x = 0.55;
        arms[0].rotation.x = -1.1;
        arms[1].rotation.x = -1.1;
      } else if (move === "groundPound" || move === "poundLand") {
        const impact = move === "poundLand";
        const tuck = impact ? Math.max(0, 1 - moveTime / 0.18) : 1;
        body.scale.y = 0.84 * (1 - tuck * (impact ? 0.42 : 0.24));
        body.scale.x = body.scale.z = 1 + tuck * (impact ? 0.22 : 0.06);
        body.rotation.x = impact ? 0.08 : moveTime < 0.14 ? -0.3 : 0;
        body.rotation.z = 0;
        body.position.y = 0;
        legs[0].rotation.x = legs[1].rotation.x = -0.9 * tuck;
        knees[0].rotation.x = knees[1].rotation.x = 1.25 * tuck;
        feet[0].rotation.x = feet[1].rotation.x = -0.2;
        arms[0].rotation.x = arms[1].rotation.x = impact ? -0.5 : -1.35;
        head.rotation.x = -0.08;
      } else if (move === "longJump") {
        body.rotation.x = 0.28;
        body.scale.z = 1.2;
        body.position.y = Math.max(body.position.y, 0.1);
        arms[0].rotation.x = -1.15;
        arms[1].rotation.x = -1.15;
        legs[0].rotation.x = 0.45;
        legs[1].rotation.x = 0.45;
      } else if (move === "wallKick") {
        body.rotation.x = -0.22;
        arms[0].rotation.x = -1.55;
        arms[1].rotation.x = -0.75;
        legs[0].rotation.x = -0.85;
        legs[1].rotation.x = 0.7;
      } else if (move === "ledgeHang") {
        body.position.y = 0;
        arms[0].rotation.x = -2.7;
        arms[1].rotation.x = -2.7;
        legs[0].rotation.x = 0.2;
        legs[1].rotation.x = -0.2;
      } else if (move === "climb") {
        const cycle = Math.sin(moveTime * 11);
        arms[0].rotation.x = -2.5 + cycle * 0.35;
        arms[1].rotation.x = -2.5 - cycle * 0.35;
        legs[0].rotation.x = -0.3 - cycle * 0.4;
        legs[1].rotation.x = -0.3 + cycle * 0.4;
      } else if (move === "doubleJump") {
        arms[0].rotation.x = -1.25;
        arms[1].rotation.x = -1.25;
        legs[0].rotation.x = -0.55;
        legs[1].rotation.x = -0.55;
      }
      if (state.dancing && move === "idle") {
        const beat = (state.danceTime ?? idlePhase) * 4;
        body.rotation.z = Math.sin(beat) * 0.07;
        body.position.y += Math.abs(Math.sin(beat)) * 0.045;
        arms[0].rotation.set(-1.1, 0, -0.4 - Math.sin(beat) * 0.25);
        arms[1].rotation.set(-1.1, 0, 0.4 + Math.sin(beat) * 0.25);
        legs[0].rotation.x = Math.max(0, Math.sin(beat)) * -0.25;
        legs[1].rotation.x = Math.max(0, -Math.sin(beat)) * -0.25;
        knees[0].rotation.x = Math.max(0, Math.sin(beat)) * 0.3;
        knees[1].rotation.x = Math.max(0, -Math.sin(beat)) * 0.3;
      }
      if (
        state.carrying &&
        move !== "crawl" &&
        move !== "ledgeHang" &&
        move !== "climb"
      ) {
        arms[0].rotation.x = -1.1;
        arms[1].rotation.x = -1.1;
        arms[0].rotation.z = -0.28;
        arms[1].rotation.z = 0.28;
      }
      if (state.wave && move === "idle" && !state.carrying) {
        arms[1].rotation.z = 2.55 + Math.sin(idlePhase * 3.1) * 0.13;
        arms[1].rotation.x = -0.25 + Math.sin(idlePhase * 5.4) * 0.15;
      }
      if (state.pointing && move === "idle") {
        arms[1].rotation.x = -1.45 + Math.sin(idlePhase * 2) * 0.08;
        arms[1].rotation.z = 0.12;
        body.rotation.x = 0.1;
        head.rotation.x = 0.12;
      }
      if (state.holdingBow && move !== "crawl") {
        // Keep both hands on the equipment while the legs follow the gait.
        // Aiming below replaces this ready pose with a full draw.
        arms[0].rotation.set(-1.22, -0.18, -0.2);
        arms[1].rotation.set(-0.82, 0.16, 0.2);
      }
      if (state.aiming && move !== "crawl") {
        // Left arm presents the bow while the string hand draws back to the cheek.
        const draw = Math.max(0, Math.min(1, state.draw ?? 0));
        arms[0].rotation.set(-1.48, -0.25, -0.22);
        arms[1].rotation.set(-1.28, 0.15 + draw * 0.75, 0.25 + draw * 0.45);
        if (role === "ammon") {
          // The sling turns from a raised right hand; the free arm balances.
          arms[0].rotation.set(-0.25, 0, -0.18);
          arms[1].rotation.set(-0.95, 0.15, 0.65);
        }
        head.rotation.y = -0.06;
        body.rotation.x = 0.025;
      }
      // Sight checks and the visible head use the same world-space gaze.
      if (state.lookYaw !== undefined)
        head.rotation.y = angleDiff(state.lookYaw, renderedYaw);
      if (state.lookPitch !== undefined) head.rotation.x = -state.lookPitch;
    },
    dispose() {
      group.removeFromParent();
      group.clear();
    },
  };
}
