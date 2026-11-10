import * as THREE from "three";
import { KartPhysics, type KartInput } from "./physics";
import type { KartItemSystem, KartItemType } from "./items";
import type { KartTrack } from "./track";

export class KartAIController {
  public readonly physics: KartPhysics;
  private readonly track: KartTrack;
  private readonly itemSystem: KartItemSystem;
  public heldItem: KartItemType | null = null;
  public itemRouletteTimer = 0;
  private readonly laneOffset: number; // side offset from centerline [-4, 4]
  private itemCooldown = 2.0;

  constructor(
    physics: KartPhysics,
    track: KartTrack,
    itemSystem: KartItemSystem,
    racerIndex: number,
  ) {
    this.physics = physics;
    this.track = track;
    this.itemSystem = itemSystem;
    // Disperse AI into staggered lanes
    this.laneOffset = ((racerIndex % 5) - 2) * 2.2;
  }

  public update(
    dt: number,
    allRacers: KartPhysics[],
    playerDist: number,
  ): KartInput {
    // 1. Look-ahead waypoint target
    const currentCp = this.track.checkpoints[this.physics.checkpointIndex];
    const lookAheadSteps = 4; // ~20 meters ahead
    const targetIdx =
      (this.physics.checkpointIndex + lookAheadSteps) %
      this.track.waypoints.length;
    const targetCp = this.track.checkpoints[targetIdx];

    // Offset target into assigned lane
    const targetPos = targetCp.position
      .clone()
      .addScaledVector(targetCp.normal, this.laneOffset);

    // 2. Steer towards target
    const toTarget = targetPos.clone().sub(this.physics.position).setY(0);
    const targetAngle = Math.atan2(toTarget.x, toTarget.z);
    let angleDiff = targetAngle - this.physics.yaw;

    // Normalize to [-pi, pi]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steer = THREE.MathUtils.clamp(angleDiff * 1.8, -1.0, 1.0);

    // 3. Throttle & Drift logic
    let throttle = 1.0;
    let drift = false;

    // If corner is sharp, drift or ease off throttle
    if (Math.abs(angleDiff) > 0.45 && this.physics.speed > 16.0) {
      drift = true;
      throttle = 0.85;
    }

    // 4. Rubberbanding catch-up logic
    const distToPlayer = this.physics.totalDistanceTraveled - playerDist;
    if (distToPlayer < -35.0) {
      // AI is falling far behind player -> Give gentle rubberband boost!
      throttle = 1.15;
    } else if (distToPlayer > 45.0) {
      // AI is too far ahead of player -> Ease slightly so player has a fighting chance
      throttle = 0.9;
    }

    // 5. Item collection & usage
    if (this.itemRouletteTimer > 0) {
      this.itemRouletteTimer -= dt;
      if (this.itemRouletteTimer <= 0) {
        // Roll random item based on ranking
        this.heldItem = this.itemSystem.getRandomItemForRank(
          this.physics.checkpointIndex,
          allRacers.length,
        );
      }
    }

    let useItem = false;
    this.itemCooldown -= dt;
    if (this.heldItem && this.itemCooldown <= 0) {
      useItem = true;
      this.itemSystem.useItem(
        this.heldItem,
        this.physics,
        allRacers,
        this.track.waypoints,
      );
      this.heldItem = null;
      this.itemCooldown = 4.0 + Math.random() * 4.0;
    }

    return {
      steer,
      throttle,
      brake: false,
      drift,
      useItem,
    };
  }

  public giveItemBox(totalRacers: number, rank: number) {
    if (this.heldItem || this.itemRouletteTimer > 0) return;
    this.itemRouletteTimer = 1.2;
  }
}
