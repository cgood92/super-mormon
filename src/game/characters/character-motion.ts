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
  body.rotation.order = "YXZ";
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
  let previousVx = 0;
  let previousVz = 0;
  let forwardLean = 0;
  let turnBank = 0;
  let lastAirVy = 0;
  let wasLocomoting = false;
  let skidFacingYaw: number | undefined;
  const stanceAnchors: ({ x: number; z: number; yaw: number } | null)[] = [
    null,
    null,
  ];
  return {
    group,
    update(dt, state) {
      dt = Math.min(Math.max(dt, 0), 0.1);
      const vx = state.vx ?? 0;
      const vz = state.vz ?? 0;
      const vy = state.vy ?? 0;
      group.position.set(state.x, state.y, state.z);
      if (firstUpdate) {
        renderedYaw = state.yaw;
        previousVx = vx;
        previousVz = vz;
        previousX = state.x - vx * dt;
        previousZ = state.z - vz * dt;
        previousForwardSpeed =
          Math.sin(state.yaw) * vx + Math.cos(state.yaw) * vz;
        firstUpdate = false;
      }
      const previousYaw = renderedYaw;
      if (state.move === "turnSkid") {
        const speed = Math.hypot(state.vx, state.vz);
        const pivotT =
          state.moveTime !== undefined
            ? T.MathUtils.smoothstep(state.moveTime, 0.22, 0.41)
            : 0;
        if (skidFacingYaw === undefined) {
          skidFacingYaw =
            speed > 0.2 ? Math.atan2(state.vx, state.vz) : state.yaw;
        }
        if (pivotT > 0) {
          renderedYaw =
            skidFacingYaw + angleDiff(state.yaw, skidFacingYaw) * pivotT;
        } else {
          renderedYaw = skidFacingYaw;
        }
      } else {
        skidFacingYaw = undefined;
        renderedYaw += angleDiff(state.yaw, renderedYaw) * damp(23, dt);
      }
      // Keep the existing tilt in world space while the actor turns beneath it.
      const yawStep = renderedYaw - previousYaw;
      const oldLean = forwardLean;
      forwardLean = oldLean * Math.cos(yawStep) - turnBank * Math.sin(yawStep);
      turnBank = oldLean * Math.sin(yawStep) + turnBank * Math.cos(yawStep);
      // Heading belongs to the parent; body rotations are local pose only.
      // This keeps crawl pitch, flips, limbs, and offsets aligned to travel.
      group.rotation.y = renderedYaw;
      body.rotation.y = 0;
      const speed = Math.min(1, state.runSpeed / 6.5);
      gaitBlend += ((state.grounded ? speed : 0) - gaitBlend) * damp(10, dt);
      const localForward =
        Math.sin(renderedYaw) * vx + Math.cos(renderedYaw) * vz;
      const localLateral =
        Math.cos(renderedYaw) * vx - Math.sin(renderedYaw) * vz;
      const headingError = angleDiff(state.yaw, renderedYaw);
      let bankTarget = Math.max(
        -0.16,
        Math.min(0.16, -localLateral * 0.022 - headingError * 0.08),
      );
      const forwardAcceleration =
        dt > 0
          ? Math.max(
              -35,
              Math.min(35, (localForward - previousForwardSpeed) / dt),
            )
          : 0;
      previousForwardSpeed = localForward;
      let leanTarget = Math.max(
        -0.075,
        Math.min(0.13, localForward * 0.016 + forwardAcceleration * 0.003),
      );
      if (state.grounded) {
        // Acceleration is measured in world space before projecting it into
        // the rendered heading: turning alone must not invent braking.
        const ax = dt > 0 ? (vx - previousVx) / dt : 0;
        const az = dt > 0 ? (vz - previousVz) / dt : 0;
        const moving = Math.min(1, state.runSpeed / 1.5);
        const anticipation = (acceleration: number) =>
          Math.max(-0.055, Math.min(0.055, acceleration * 0.002)) * moving;
        leanTarget =
          localForward * 0.045 +
          anticipation(Math.sin(renderedYaw) * ax + Math.cos(renderedYaw) * az);
        bankTarget =
          -localLateral * 0.045 -
          anticipation(Math.cos(renderedYaw) * ax - Math.sin(renderedYaw) * az);
        const limit = Math.min(
          1,
          0.35 / Math.max(Math.hypot(leanTarget, bankTarget), 0.0001),
        );
        leanTarget *= limit;
        bankTarget *= limit;
      }
      previousVx = vx;
      previousVz = vz;
      turnBank += (bankTarget - turnBank) * damp(14, dt);
      forwardLean += (leanTarget - forwardLean) * damp(12, dt);
      const fullStrideAngle = 0.23 + speed * 0.18;
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
          knees[i].rotation.x =
            0.025 * gaitBlend + swing * 0.52 * gaitBlend + landing * 0.35;
          feet[i].rotation.x = -legs[i].rotation.x - knees[i].rotation.x * 0.9;
        } else {
          legs[i].rotation.x =
            i === 0
              ? -0.28 + Math.min(0.25, airTime * 0.6)
              : 0.33 - Math.min(0.22, airTime * 0.5);
          knees[i].rotation.x = 0.42;
          feet[i].rotation.x =
            -legs[i].rotation.x -
            knees[i].rotation.x * 0.9 +
            0.5 * Math.min(1, airTime * 12);
        }
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
      arms[0].rotation.x = state.grounded ? -stride * 1.1 - 0.13 : -0.42;
      arms[1].rotation.x = state.grounded ? stride * 1.1 - 0.13 : -0.26;
      legs[0].rotation.z = 0;
      legs[1].rotation.z = 0;
      arms[0].rotation.z = armored ? -0.2 : 0.12;
      arms[1].rotation.z = armored ? 0.2 : -0.12;
      body.position.y =
        (1 - Math.cos(phase * 2)) * 0.015 * gaitBlend +
        Math.sin(idlePhase * 0.55) * 0.009 -
        landing * 0.095;
      // The model's unscaled head reaches 1.94; physics reserves 1.65.
      body.scale.y = 0.84 * (1 - landing * 0.09);
      body.scale.x = 1 + landing * 0.045;
      body.scale.z = 1 + landing * 0.045;
      const turnDiff = angleDiff(state.yaw, renderedYaw);
      body.rotation.z = turnBank;
      body.rotation.x = (armored ? 0.055 : 0) + forwardLean;
      body.rotation.y = 0;
      cloak.rotation.x =
        -0.08 - gaitBlend * 0.18 + Math.sin(phase * 1.3) * gaitBlend * 0.035;
      head.rotation.y = Math.sin(idlePhase * 0.4) * 0.055 + turnDiff * 0.45;
      head.rotation.x = state.grounded
        ? armored
          ? 0.07
          : 0
        : Math.max(-0.12, Math.min(0.15, -state.vy * 0.018));
      head.rotation.z = 0;

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
        forwardLean = 0;
        turnBank = 0;
        // Rotate a full-size body onto hands and knees, rather than shrinking
        // an upright walk. Diagonal supports alternate with distance traveled.
        body.scale.set(1, 0.84, 1);
        body.position.y = 0.53;
        body.rotation.x = Math.PI / 2;
        body.rotation.z = 0;
        for (let i = 0; i < 2; i++) {
          const cycle = Math.sin(phase + i * Math.PI);
          arms[i].rotation.set(
            -Math.PI / 2 + cycle * 0.14,
            (i === 0 ? -1 : 1) * 0.03,
            0,
          );
          legs[i].rotation.set(-Math.PI / 2 - cycle * 0.1, 0, 0);
          knees[i].rotation.x = Math.PI / 2;
          feet[i].rotation.x = -0.22;
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
      } else if (move === "kneel") {
        // Reverent kneeling prayer / council pose:
        // Torso upright with gentle reverent bow, head tilted peacefully downward,
        // hands folded reverently in front of the chest, knees resting naturally on the ground,
        // shins and feet extending back along the floor within the garment drape.
        body.scale.set(1, 0.84, 1);
        body.position.y = -0.21;
        body.rotation.set(0.1, 0, 0);
        legs[0].rotation.set(-0.28, 0, 0);
        legs[1].rotation.set(-0.28, 0, 0);
        knees[0].rotation.set(2.2, 0, 0);
        knees[1].rotation.set(2.2, 0, 0);
        feet[0].rotation.set(0.6, 0, 0);
        feet[1].rotation.set(0.6, 0, 0);
        arms[0].rotation.set(-0.42, 0.22, 0.78);
        arms[1].rotation.set(-0.42, -0.22, -0.78);
        head.rotation.set(0.22, 0, 0);
      } else if (move === "jump") {
        // SM64 single jump: iconic fist punch into the air, opposite leg raised high
        arms[1].rotation.set(-2.25, 0, -0.15); // right fist raised high
        arms[0].rotation.set(0.38, 0, 0.2); // left arm back/down
        legs[0].rotation.set(-0.55, 0, 0); // left leg high forward
        knees[0].rotation.set(1.05, 0, 0); // left knee flexed
        legs[1].rotation.set(0.32, 0, 0); // right leg trailing back
        knees[1].rotation.set(0.38, 0, 0);
        feet[0].rotation.set(0.52, 0, 0); // toes pointed down naturally
        feet[1].rotation.set(0.55, 0, 0);
        head.rotation.set(-0.16, 0, 0);
      } else if (move === "doubleJump") {
        // SM64 double jump: hands down/back, feet together, toes pointing down, head up
        const ascending = (state.vy ?? 0) >= 0;
        if (ascending) {
          arms[0].rotation.set(0.36, 0, 0.25);
          arms[1].rotation.set(0.36, 0, -0.25);
          legs[0].rotation.set(-0.15, 0, 0);
          legs[1].rotation.set(-0.15, 0, 0);
          knees[0].rotation.set(0.26, 0, 0);
          knees[1].rotation.set(0.26, 0, 0);
          feet[0].rotation.set(0.58, 0, 0);
          feet[1].rotation.set(0.58, 0, 0);
          head.rotation.set(-0.28, 0, 0);
        } else {
          arms[0].rotation.set(-0.45, 0, 0.3);
          arms[1].rotation.set(-0.45, 0, -0.3);
          legs[0].rotation.set(-0.25, 0, 0);
          legs[1].rotation.set(0.2, 0, 0);
          knees[0].rotation.set(0.5, 0, 0);
          knees[1].rotation.set(0.35, 0, 0);
          feet[0].rotation.set(0.35, 0, 0);
          feet[1].rotation.set(0.35, 0, 0);
          head.rotation.set(0.08, 0, 0);
        }
      } else if (move === "tripleJump") {
        // SM64 triple jump: dynamic somersault flip
        // Phase 1: Launch (0 - 0.18s) - initial rotation and arm reach
        // Phase 2: Tuck & Roll (0.18 - 0.52s) - fast angular acceleration, tight tuck
        // Phase 3: Unfolding (0.52 - 0.70s) - deceleration, body extension into landing prep
        // Post-Flip: Upright falling glide until touchdown
        const flipDuration = 0.7;
        if (moveTime < flipDuration) {
          const normTime = moveTime / flipDuration;
          let normAngle = 0;
          if (normTime < 0.18) {
            const t = normTime / 0.18;
            normAngle = 0.12 * t * t;
            arms[0].rotation.set(-1.8 * t - 0.4 * (1 - t), 0, 0.1);
            arms[1].rotation.set(-1.8 * t - 0.4 * (1 - t), 0, -0.1);
            legs[0].rotation.set(-0.35 * t, 0, 0);
            legs[1].rotation.set(0.35 * t, 0, 0);
            knees[0].rotation.set(0.35 * t, 0, 0);
            knees[1].rotation.set(0.35 * t, 0, 0);
            feet[0].rotation.set(
              -legs[0].rotation.x - knees[0].rotation.x * 0.9,
              0,
              0,
            );
            feet[1].rotation.set(
              -legs[1].rotation.x - knees[1].rotation.x * 0.9,
              0,
              0,
            );
          } else if (normTime < 0.52) {
            const t = (normTime - 0.18) / 0.34;
            normAngle = 0.12 + 0.68 * (t * (2 - t));
            const tuckDepth = Math.sin(t * Math.PI);
            legs[0].rotation.set(-1.2 * tuckDepth, 0, 0);
            legs[1].rotation.set(-1.2 * tuckDepth, 0, 0);
            knees[0].rotation.set(2.15 * tuckDepth, 0, 0);
            knees[1].rotation.set(2.15 * tuckDepth, 0, 0);
            feet[0].rotation.set(-0.35 * tuckDepth, 0, 0);
            feet[1].rotation.set(-0.35 * tuckDepth, 0, 0);
            arms[0].rotation.set(-1.95 * tuckDepth, 0, 0.2 * tuckDepth);
            arms[1].rotation.set(-1.95 * tuckDepth, 0, -0.2 * tuckDepth);
            head.rotation.set(0.52 * tuckDepth, 0, 0);
          } else {
            const t = Math.min(1, Math.max(0, (normTime - 0.52) / 0.18));
            normAngle = 0.8 + 0.2 * Math.sin((t * Math.PI) / 2);
            legs[0].rotation.set(-0.45 * (1 - t) - 0.25 * t, 0, 0);
            legs[1].rotation.set(0.52 * (1 - t) + 0.18 * t, 0, 0);
            knees[0].rotation.set(0.55 * (1 - t) + 0.45 * t, 0, 0);
            knees[1].rotation.set(0.4 * (1 - t) + 0.38 * t, 0, 0);
            feet[0].rotation.set(
              -legs[0].rotation.x - knees[0].rotation.x * 0.9,
              0,
              0,
            );
            feet[1].rotation.set(
              -legs[1].rotation.x - knees[1].rotation.x * 0.9,
              0,
              0,
            );
            arms[0].rotation.set(-0.6 * (1 - t) - 0.45 * t, 0, 0.3);
            arms[1].rotation.set(-0.6 * (1 - t) - 0.45 * t, 0, -0.3);
            head.rotation.set(-0.15 * (1 - t) + 0.08 * t, 0, 0);
          }
          const angle = Math.PI * 2 * normAngle;
          body.position.y = 0.83 * (1 - Math.cos(angle));
          body.rotation.x = angle;
          body.rotation.z = 0;
        } else {
          // Flip complete: upright in mid-air awaiting landing touchdown
          body.position.y = 0;
          body.rotation.x = 0;
          body.rotation.z = 0;
          legs[0].rotation.set(-0.25, 0, 0);
          legs[1].rotation.set(0.18, 0, 0);
          knees[0].rotation.set(0.45, 0, 0);
          knees[1].rotation.set(0.38, 0, 0);
          feet[0].rotation.set(
            -legs[0].rotation.x - knees[0].rotation.x * 0.9,
            0,
            0,
          );
          feet[1].rotation.set(
            -legs[1].rotation.x - knees[1].rotation.x * 0.9,
            0,
            0,
          );
          arms[0].rotation.set(-0.45, 0, 0.3);
          arms[1].rotation.set(-0.45, 0, -0.3);
          head.rotation.set(0.08, 0, 0);
        }
      } else if (move === "sideflip") {
        // Super Mario 64 side somersault: an acrobatic mid-air cartwheel (MARIO_ANIM_SLIDEFLIP)
        const progress = Math.min(1, moveTime / 0.65);
        const angle = Math.PI * 2 * progress;
        const split = Math.sin(progress * Math.PI);
        forwardLean = 0;
        turnBank = 0;
        // Elevated pivot keeps inverted head and torso above the ground
        body.position.y = 0.85 * (1 - Math.cos(angle));
        body.rotation.order = "YXZ";
        body.rotation.y = Math.PI / 2;
        body.rotation.x = 0;
        body.rotation.z = angle;
        // Acrobatic star/split in the lateral cartwheel plane
        legs[0].rotation.set(0, 0, 0.65 * split);
        legs[1].rotation.set(0, 0, -0.65 * split);
        knees[0].rotation.set(0.12 * (1 - split), 0, 0);
        knees[1].rotation.set(0.12 * (1 - split), 0, 0);
        feet[0].rotation.set(0.45 * split, 0, 0);
        feet[1].rotation.set(0.45 * split, 0, 0);
        // Arms wheel outward in the lateral cartwheel plane
        arms[0].rotation.set(-0.1, 0, 2.15 * split);
        arms[1].rotation.set(-0.1, 0, -2.15 * split);
        head.rotation.set(-0.08 * split, 0, 0.22 * split);
      } else if (move === "backflip") {
        const progress = Math.min(1, moveTime / 0.7);
        const angle = Math.PI * 2 * progress;
        const split = Math.sin(progress * Math.PI);
        // A raised center pivot keeps the inverted head above the ground.
        body.position.y = 0.83 * (1 - Math.cos(angle));
        body.rotation.x = -angle;
        body.rotation.z = 0;
        legs[0].rotation.x = -0.45;
        legs[1].rotation.x = 0.55;
        knees[0].rotation.x = 0.42;
        knees[1].rotation.x = 0.42;
        feet[0].rotation.x = -legs[0].rotation.x - knees[0].rotation.x * 0.9;
        feet[1].rotation.x = -legs[1].rotation.x - knees[1].rotation.x * 0.9;
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
        // SM64 low aerodynamic leap pose: torso pitched forward, arms back, legs kicked back
        body.rotation.x = 0.38;
        body.scale.z = 1.2;
        body.position.y = Math.max(body.position.y, 0.1);
        head.rotation.set(-0.35, 0, 0);
        arms[0].rotation.set(0.65, 0, 0.35);
        arms[1].rotation.set(0.65, 0, -0.35);
        legs[0].rotation.set(0.55, 0, 0);
        legs[1].rotation.set(0.55, 0, 0);
        knees[0].rotation.set(0.42, 0, 0);
        knees[1].rotation.set(0.42, 0, 0);
        feet[0].rotation.set(0.65, 0, 0);
        feet[1].rotation.set(0.65, 0, 0);
      } else if (move === "slideRollout") {
        // SM64 long jump landing rollout: crouched forward slide, hands near ground
        body.position.y = -0.04;
        body.rotation.x = 0.32;
        head.rotation.set(-0.25, 0, 0);
        arms[0].rotation.set(-1.1, 0, 0.25);
        arms[1].rotation.set(-1.1, 0, -0.25);
        legs[0].rotation.set(-0.65, 0, 0);
        legs[1].rotation.set(-0.45, 0, 0);
        knees[0].rotation.set(0.95, 0, 0);
        knees[1].rotation.set(0.85, 0, 0);
        feet[0].rotation.set(0.1, 0, 0);
        feet[1].rotation.set(0.1, 0, 0);
      } else if (move === "turnSkid") {
        // Super Mario 64 turn-around skid (MARIO_ANIM_TURNING_PART1 & PART2):
        // Part 1: Hips dropped low, torso leaning heavily backward opposite sliding momentum,
        // lead leg braced forward digging heel in, trailing knee bent underneath, arms spread wide for balance.
        // Part 2: As sliding momentum halts, torso pitches forward, trailing foot pivots around to plant,
        // pushing off into the new direction.
        stanceAnchors[0] = null;
        stanceAnchors[1] = null;
        const tIn =
          state.moveTime !== undefined
            ? T.MathUtils.smoothstep(moveTime, 0, 0.08)
            : 1.0;
        const pivot =
          state.moveTime !== undefined
            ? T.MathUtils.smoothstep(moveTime, 0.22, 0.41)
            : 0;

        forwardLean = T.MathUtils.lerp(forwardLean, 0.12 * pivot, tIn);
        turnBank = T.MathUtils.lerp(turnBank, 0, tIn);

        // Hips drop during skid, then rise back up into the push-off plant
        const hipDrop = T.MathUtils.lerp(-0.04, -0.01, pivot);
        body.position.y = hipDrop * tIn;

        // Torso pitch: leans backward against slide (-0.26), then swings forward (+0.10) to drive push-off
        const bodyPitch = T.MathUtils.lerp(
          T.MathUtils.lerp(0.1, -0.26, tIn),
          0.1,
          pivot,
        );
        body.rotation.set(bodyPitch, 0, 0);

        head.rotation.set(T.MathUtils.lerp(0.12 * tIn, -0.04, pivot), 0, 0);

        // Limbs:
        // Lead leg (0) begins braced heel-dig, kept within coat bounds
        legs[0].rotation.set(
          T.MathUtils.lerp(T.MathUtils.lerp(-0.12, -0.26, tIn), 0.2, pivot),
          0,
          0,
        );
        knees[0].rotation.set(
          T.MathUtils.lerp(T.MathUtils.lerp(0.08, 0.16, tIn), 0.35, pivot),
          0,
          0,
        );
        feet[0].rotation.set(T.MathUtils.lerp(-0.35 * tIn, 0.12, pivot), 0, 0);

        // Trailing leg (1) tucked underneath, within coat bounds
        legs[1].rotation.set(
          T.MathUtils.lerp(T.MathUtils.lerp(0.12, 0.22, tIn), -0.24, pivot),
          0,
          0,
        );
        knees[1].rotation.set(
          T.MathUtils.lerp(T.MathUtils.lerp(0.1, 0.78, tIn), 0.15, pivot),
          0,
          0,
        );
        feet[1].rotation.set(T.MathUtils.lerp(0.12 * tIn, -0.08, pivot), 0, 0);

        // Arms: wide counterbalance flares inward to pump into sprint
        arms[0].rotation.set(
          T.MathUtils.lerp(T.MathUtils.lerp(-0.25, 0.35, tIn), -0.75, pivot),
          0,
          T.MathUtils.lerp(0.85 * tIn, 0.15, pivot),
        );
        arms[1].rotation.set(
          T.MathUtils.lerp(T.MathUtils.lerp(0.25, -0.55, tIn), 0.75, pivot),
          0,
          T.MathUtils.lerp(-0.85 * tIn, -0.15, pivot),
        );
      } else if (move === "dive") {
        // SM64 aerial dive: horizontal body, arms outstretched forward, legs straight back
        body.rotation.x = 1.35;
        head.rotation.set(-0.5, 0, 0);
        arms[0].rotation.set(-2.8, 0, -0.18);
        arms[1].rotation.set(-2.8, 0, 0.18);
        legs[0].rotation.set(0.15, 0, 0);
        legs[1].rotation.set(0.15, 0, 0);
        knees[0].rotation.set(0.1, 0, 0);
        knees[1].rotation.set(0.1, 0, 0);
        feet[0].rotation.set(0.55, 0, 0);
        feet[1].rotation.set(0.55, 0, 0);
      } else if (move === "bellySlide") {
        // SM64 dive slide: sliding flat on belly, head up, arms forward
        body.position.y = -0.04;
        body.rotation.x = 1.42;
        head.rotation.set(-0.55, 0, 0);
        arms[0].rotation.set(-2.6, 0, -0.2);
        arms[1].rotation.set(-2.6, 0, 0.2);
        legs[0].rotation.set(0.12, 0, 0);
        legs[1].rotation.set(0.12, 0, 0);
        knees[0].rotation.set(0.15, 0, 0);
        knees[1].rotation.set(0.15, 0, 0);
      } else if (move === "slideKick") {
        // SM64 slide kick: leaning back, one leg thrust forward, arms planted
        body.position.y = -0.04;
        body.rotation.x = -0.38;
        body.rotation.z = 0.22;
        head.rotation.set(0.2, 0, -0.15);
        legs[1].rotation.set(-1.35, 0, 0);
        knees[1].rotation.set(0.08, 0, 0);
        legs[0].rotation.set(0.22, 0, 0);
        knees[0].rotation.set(0.95, 0, 0);
        arms[0].rotation.set(-0.45, 0, 0.6);
        arms[1].rotation.set(-0.45, 0, -0.6);
      } else if (move === "wallKick") {
        body.rotation.x = -0.22;
        arms[0].rotation.x = -1.55;
        arms[1].rotation.x = -0.75;
        legs[0].rotation.x = -0.85;
        legs[1].rotation.x = 0.7;
      } else if (move === "ledgeHang") {
        // SM64 ledge hang & shimmy: hands gripping rim, pendular body sway,
        // lateral hand reach when shimmying
        const shimmying = (state.runSpeed ?? 0) > 0.1;
        const sway = Math.sin(moveTime * 3.2) * 0.08;
        body.position.y = 0;
        body.rotation.x = -0.04 + sway;
        if (shimmying) {
          const shimmyCycle = Math.sin(moveTime * 9);
          arms[0].rotation.set(-2.8 + shimmyCycle * 0.25, 0, 0.15);
          arms[1].rotation.set(-2.8 - shimmyCycle * 0.25, 0, -0.15);
          legs[0].rotation.set(0.15 + shimmyCycle * 0.2, 0, 0.1);
          legs[1].rotation.set(0.15 - shimmyCycle * 0.2, 0, -0.1);
        } else {
          arms[0].rotation.set(-2.8, 0, 0.1);
          arms[1].rotation.set(-2.8, 0, -0.1);
          legs[0].rotation.set(0.12 + sway * 1.4, 0, 0);
          legs[1].rotation.set(0.12 + sway * 1.4, 0, 0);
        }
        knees[0].rotation.set(0.25, 0, 0);
        knees[1].rotation.set(0.25, 0, 0);
      } else if (move === "climb") {
        // SM64 pole climbing: arms wrapped around trunk, knees and inner feet clasping bark,
        // alternating reach and knee-hitch when ascending/sliding
        const isClimbing =
          Math.abs(state.vy ?? 0) > 0.1 || (state.runSpeed ?? 0) > 0.1;
        if (isClimbing) {
          const cycle = Math.sin(moveTime * 10);
          arms[0].rotation.set(-2.2 + cycle * 0.45, -0.25, -0.3);
          arms[1].rotation.set(-2.2 - cycle * 0.45, 0.25, 0.3);
          legs[0].rotation.set(-0.4 - cycle * 0.35, 0, 0.2);
          legs[1].rotation.set(-0.4 + cycle * 0.35, 0, -0.2);
          knees[0].rotation.set(0.8 + cycle * 0.3, 0, 0);
          knees[1].rotation.set(0.8 - cycle * 0.3, 0, 0);
          feet[0].rotation.set(0.2, 0, 0.15);
          feet[1].rotation.set(0.2, 0, -0.15);
        } else {
          // Stationary holding pole: torso hugging trunk, arms wrapped with bent elbows,
          // knees & inner feet clasping bark
          arms[0].rotation.set(-1.95, -0.28, -0.32);
          arms[1].rotation.set(-1.95, 0.28, 0.32);
          legs[0].rotation.set(-0.45, 0, 0.22);
          legs[1].rotation.set(-0.45, 0, -0.22);
          knees[0].rotation.set(0.9, 0, -0.15);
          knees[1].rotation.set(0.9, 0, 0.15);
          feet[0].rotation.set(0.2, 0, 0.2);
          feet[1].rotation.set(0.2, 0, -0.2);
        }
      } else if (move === "handstand") {
        // SM64 top-of-pole handstand: inverted 180 deg, balancing on arms on pole rim,
        // legs extended straight up with gentle balance sway
        body.position.y = 0.52;
        body.rotation.x = Math.PI;
        body.rotation.z = Math.sin(moveTime * 2.5) * 0.04;
        arms[0].rotation.set(-2.95, 0, 0.08);
        arms[1].rotation.set(-2.95, 0, -0.08);
        legs[0].rotation.set(0.08, 0, 0.12);
        legs[1].rotation.set(0.08, 0, -0.12);
        knees[0].rotation.set(0, 0, 0);
        knees[1].rotation.set(0, 0, 0);
        feet[0].rotation.set(0.35, 0, 0);
        feet[1].rotation.set(0.35, 0, 0);
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
        !state.holdingBanner &&
        move !== "crawl" &&
        move !== "ledgeHang" &&
        move !== "climb"
      ) {
        arms[0].rotation.x = -1.1;
        arms[1].rotation.x = -1.1;
        arms[0].rotation.z = -0.28;
        arms[1].rotation.z = 0.28;
      }
      if (state.holdingBanner) {
        // Keep the shield at his side; the free right hand bears the pole.
        arms[0].rotation.set(-0.08, 0, 0.08);
        if (move !== "crawl" && move !== "ledgeHang" && move !== "climb") {
          const flourish = state.wave ? Math.sin(idlePhase * 5) * 0.1 : 0;
          arms[1].rotation.set(-1.95 + flourish, 0, -0.16);
        }
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
      if (
        state.holdingSword &&
        move !== "crawl" &&
        move !== "ledgeHang" &&
        move !== "climb"
      ) {
        if (state.swordSlash !== undefined) {
          const s = Math.max(0, Math.min(1, state.swordSlash));
          if (s < 0.35) {
            // Windup: right arm draws high and back above shoulder
            const w = s / 0.35;
            arms[1].rotation.set(-1.25 - w * 0.9, -0.2, 0.3 + w * 0.35);
            arms[0].rotation.set(-0.4, 0.15, -0.35);
            body.rotation.y = w * 0.15;
          } else if (s < 0.65) {
            // Downward cleaving slash across the body
            const p = (s - 0.35) / 0.3;
            arms[1].rotation.set(
              -2.15 + p * 1.55,
              -0.2 + p * 0.55,
              0.65 - p * 1.1,
            );
            arms[0].rotation.set(-0.4 + p * 0.75, 0.15, -0.35 - p * 0.15);
            body.rotation.y = 0.15 - p * 0.35;
          } else {
            // Heroic resolute follow-through presentation
            const f = (s - 0.65) / 0.35;
            arms[1].rotation.set(-0.6 - f * 0.3, 0.35, -0.45);
            arms[0].rotation.set(0.35 - f * 0.4, 0.15, -0.5);
            body.rotation.y = -0.2;
          }
        } else {
          // En-garde combat stance: right arm holds sword forward and angled up in guard,
          // left arm held back for combat balance.
          arms[1].rotation.set(-1.25, -0.2, 0.3);
          arms[0].rotation.set(-0.4, 0.15, -0.35);
        }
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
