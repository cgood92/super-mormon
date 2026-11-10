import * as THREE from "three";
import type { ApostleRacer } from "./roster";

export type KartInput = {
  steer: number; // -1 (left) to +1 (right)
  throttle: number; // 0 to 1 (accelerate)
  brake: boolean; // true for reverse/brake
  drift: boolean; // true for hop & power slide
  useItem: boolean; // true to fire/use held item
};

export type MiniTurboTier = 0 | 1 | 2 | 3; // 0 = none, 1 = blue, 2 = orange, 3 = purple

export class KartPhysics {
  // World Pose
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public forward = new THREE.Vector3(0, 0, 1);
  public yaw = 0; // heading angle in radians
  public pitch = 0;
  public roll = 0;
  public speed = 0; // current scalar forward speed (m/s)

  // Vertical dynamics
  public y = 0;
  public vy = 0;
  public grounded = true;
  public hopTimer = 0;

  // Drift / Power Slide State
  public isDrifting = false;
  public driftDirection: -1 | 1 = 1; // -1 for left drift, +1 for right drift
  public driftCharge = 0; // accumulates while drifting
  public miniTurboTier: MiniTurboTier = 0;
  public driftAngle = 0; // visual yaw offset during drift

  // Boost Dynamics
  public boostTime = 0; // remaining duration of active speed boost
  public boostMultiplier = 1.0;
  public isInvincible = false;
  public invincibleTimer = 0;
  public isShrunk = false;
  public shrunkTimer = 0;

  // Spinout & Tumble States
  public spinoutTimer = 0;
  public spinoutAngle = 0;
  public tumbleTimer = 0;
  public hitInvulnerableTimer = 0;

  // Track Surface & Race Stats
  public isOffroad = false;
  public currentLap = 1;
  public lapProgress = 0; // 0 to 1 along circuit
  public checkpointIndex = 0;
  public totalDistanceTraveled = 0;

  // Configuration from Apostle stats
  public readonly racer: ApostleRacer;
  private readonly baseTopSpeed = 26.0; // m/s (~94 km/h)
  private readonly baseAccel = 18.0; // m/s^2
  private readonly baseHandling = 2.4; // rad/s
  private readonly baseWeight: number;

  constructor(racer: ApostleRacer, spawnPos: THREE.Vector3, spawnYaw: number) {
    this.racer = racer;
    this.position.copy(spawnPos);
    this.y = spawnPos.y;
    this.yaw = spawnYaw;
    this.forward.set(Math.sin(spawnYaw), 0, Math.cos(spawnYaw));
    this.baseWeight = racer.stats.weight;
  }

  public update(
    dt: number,
    input: KartInput,
    getTrackElevation: (
      x: number,
      z: number,
    ) => { y: number; normal: THREE.Vector3; isOffroad: boolean },
  ): void {
    if (dt <= 0) return;

    // Handle spinout & tumble timers
    if (this.spinoutTimer > 0) {
      this.spinoutTimer -= dt;
      this.spinoutAngle += dt * Math.PI * 4.5;
      this.speed = Math.max(0, this.speed - dt * 25.0);
      this.position.x += Math.sin(this.yaw) * this.speed * dt;
      this.position.z += Math.cos(this.yaw) * this.speed * dt;
      if (this.spinoutTimer <= 0) {
        this.spinoutAngle = 0;
      }
      return;
    }

    if (this.tumbleTimer > 0) {
      this.tumbleTimer -= dt;
      this.pitch += dt * Math.PI * 5.0;
      this.speed = Math.max(0, this.speed - dt * 30.0);
      this.position.x += Math.sin(this.yaw) * this.speed * dt;
      this.position.z += Math.cos(this.yaw) * this.speed * dt;
      if (this.tumbleTimer <= 0) {
        this.pitch = 0;
        this.hitInvulnerableTimer = 1.5;
      }
      return;
    }

    if (this.hitInvulnerableTimer > 0) {
      this.hitInvulnerableTimer -= dt;
    }

    // Boost timer decay
    if (this.boostTime > 0) {
      this.boostTime -= dt;
      if (this.boostTime <= 0) {
        this.boostMultiplier = 1.0;
      }
    }

    // Invincibility (Iron Rod / Star)
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
      }
    }

    // Shrunk state (Lightning / Chimes)
    if (this.shrunkTimer > 0) {
      this.shrunkTimer -= dt;
      if (this.shrunkTimer <= 0) {
        this.isShrunk = false;
      }
    }

    // Sample track elevation & surface
    const surface = getTrackElevation(this.position.x, this.position.z);
    this.isOffroad =
      surface.isOffroad && !this.isInvincible && this.boostTime <= 0;

    // Hop & initiate drift logic (only when not already drifting)
    if (
      input.drift &&
      !this.isDrifting &&
      this.grounded &&
      this.hopTimer <= 0
    ) {
      this.vy = 4.8;
      this.grounded = false;
      this.hopTimer = 0.35;

      // Initiate drift if steering significantly while hopping
      if (Math.abs(input.steer) > 0.18) {
        this.isDrifting = true;
        this.driftDirection = input.steer < 0 ? -1 : 1;
        this.driftCharge = 0;
      }
    }

    if (this.hopTimer > 0) {
      this.hopTimer -= dt;
    }

    // Vertical gravity & ground contact
    if (!this.grounded) {
      this.vy -= 22.0 * dt; // gravity
      this.y += this.vy * dt;
      if (this.y <= surface.y) {
        this.y = surface.y;
        this.vy = 0;
        this.grounded = true;
      }
    } else {
      // Smoothly stick to road surface
      this.y = THREE.MathUtils.lerp(this.y, surface.y, 0.45);
    }
    this.position.y = this.y;

    // Max speed calculation
    let maxSpeed = this.baseTopSpeed * this.racer.stats.topSpeed;
    if (this.isShrunk) maxSpeed *= 0.65;
    if (this.isOffroad) maxSpeed *= 0.38;
    maxSpeed *= this.boostMultiplier;

    // Acceleration & Braking
    const accelRate =
      this.baseAccel *
      this.racer.stats.acceleration *
      (this.isShrunk ? 0.7 : 1.0);
    if (input.throttle > 0.05) {
      if (this.speed < maxSpeed) {
        // Non-linear acceleration curve
        const headroom = Math.max(0.1, 1.0 - this.speed / maxSpeed);
        this.speed +=
          accelRate * input.throttle * Math.pow(headroom, 0.65) * dt;
      } else {
        // Coast down gradually if above maxSpeed (post boost or entering off-road)
        const decelRate = this.isOffroad ? 26.0 : 9.0;
        this.speed = Math.max(maxSpeed, this.speed - dt * decelRate);
      }
    } else if (input.brake) {
      // Braking / Reversing
      if (this.speed > 0.5) {
        this.speed -= dt * 28.0; // hard brake
      } else {
        this.speed = Math.max(-8.0, this.speed - dt * 9.0); // reverse
      }
    } else {
      // Coasting friction
      const friction = this.isOffroad ? 22.0 : 6.5;
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - dt * friction);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + dt * friction);
      }
    }

    // Drift / Steering Kinematics
    const steerFactor = this.baseHandling * this.racer.stats.handling;
    const speedRatio = Math.min(1.0, Math.abs(this.speed) / this.baseTopSpeed);

    if (this.isDrifting && input.drift && this.speed > 5.0) {
      // In Drift / Power Slide
      // Steering: inward steering tightens turn; outward counter-steering widens turn
      const steerInfluence = input.steer * this.driftDirection;
      const turnRate =
        (0.75 + steerInfluence * 0.45) * steerFactor * (0.6 + speedRatio * 0.4);
      this.yaw += -this.driftDirection * turnRate * dt;

      // Visual drift slip angle
      const targetDriftAngle = this.driftDirection * 0.48;
      this.driftAngle = THREE.MathUtils.lerp(
        this.driftAngle,
        targetDriftAngle,
        0.22,
      );

      // Accumulate Mini-Turbo Charge (faster when counter-steering / holding tight line)
      const chargeRate =
        (1.0 + Math.max(0, steerInfluence) * 0.6) *
        35.0 *
        this.racer.stats.miniTurbo;
      this.driftCharge += chargeRate * dt;

      if (this.driftCharge > 130) {
        this.miniTurboTier = 3; // Purple (Ultra Mini-Turbo)
      } else if (this.driftCharge > 70) {
        this.miniTurboTier = 2; // Orange (Super Mini-Turbo)
      } else if (this.driftCharge > 30) {
        this.miniTurboTier = 1; // Blue (Mini-Turbo)
      } else {
        this.miniTurboTier = 0;
      }
    } else {
      // Standard Steering
      if (this.isDrifting) {
        // Release drift -> Trigger Mini-Turbo Boost!
        this.releaseMiniTurbo();
        this.isDrifting = false;
      }
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, 0, 0.25);

      if (Math.abs(input.steer) > 0.05 && Math.abs(this.speed) > 0.5) {
        // Steering sensitivity eases at maximum speed for stability
        const highSpeedDamp = 1.0 - 0.25 * speedRatio;
        const turnDirection = this.speed >= 0 ? -1 : 1;
        this.yaw +=
          turnDirection * input.steer * steerFactor * highSpeedDamp * dt;
      }
    }

    // Update forward vector and position
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const moveX = this.forward.x * this.speed * dt;
    const moveZ = this.forward.z * this.speed * dt;
    this.position.x += moveX;
    this.position.z += moveZ;
    this.totalDistanceTraveled += Math.abs(this.speed) * dt;

    // Body roll into corners
    const targetRoll =
      input.steer * -0.18 + (this.isDrifting ? -this.driftDirection * 0.12 : 0);
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, 0.2);

    // Body pitch on acceleration / braking
    const targetPitch = input.throttle > 0 ? -0.05 : input.brake ? 0.08 : 0;
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, 0.18);
  }

  public applyBoost(multiplier: number, duration: number) {
    this.boostMultiplier = Math.max(this.boostMultiplier, multiplier);
    this.boostTime = Math.max(this.boostTime, duration);
    this.speed = Math.max(this.speed, this.baseTopSpeed * multiplier * 0.9);
  }

  private releaseMiniTurbo() {
    if (this.miniTurboTier === 1) {
      this.applyBoost(1.25, 0.85);
    } else if (this.miniTurboTier === 2) {
      this.applyBoost(1.5, 1.4);
    } else if (this.miniTurboTier === 3) {
      this.applyBoost(1.85, 2.2);
    }
    this.driftCharge = 0;
    this.miniTurboTier = 0;
  }

  public triggerSpinout() {
    if (this.isInvincible || this.hitInvulnerableTimer > 0) return;
    this.spinoutTimer = 0.85;
    this.spinoutAngle = 0;
  }

  public triggerTumble() {
    if (this.isInvincible || this.hitInvulnerableTimer > 0) return;
    this.tumbleTimer = 0.95;
    this.vy = 4.2;
    this.grounded = false;
  }

  public triggerShrink() {
    if (this.isInvincible) return;
    this.isShrunk = true;
    this.shrunkTimer = 6.0;
  }

  public triggerInvincible(duration = 7.5) {
    this.isInvincible = true;
    this.invincibleTimer = duration;
    this.applyBoost(1.3, duration);
  }
}
