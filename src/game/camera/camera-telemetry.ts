import * as T from "three";
import { cameraSegmentClear, type FollowCamera } from "./camera";
import type { Solid } from "../physics/physics";

export type TelemetryInput = {
  x: number;
  y: number;
  cameraX?: number;
  cameraY?: number;
  recenter?: boolean;
  cameraZoom?: number;
};

export type TelemetryPlayer = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  runSpeed?: number;
  grounded?: boolean;
  crouching?: boolean;
  role?: string;
};

export type CameraTelemetrySample = {
  frame: number;
  time: number;
  dt: number;
  input: TelemetryInput;
  player: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    runSpeed: number;
    grounded: boolean;
  };
  eye: { x: number; y: number; z: number };
  planarDistance: number;
  cameraYaw: number;
  cameraPitch: number;
  roomId?: string;
  obstructed: boolean;
};

export type CameraAnomalyKind =
  | "sudden-eye-jump"
  | "sudden-yaw-snap"
  | "sudden-zoom-snap"
  | "wall-steering-drift"
  | "reversal-flip-180"
  | "idle-camera-motion"
  | "actor-lens-clip"
  | "embedded-eye";

export type CameraAnomaly = {
  kind: CameraAnomalyKind;
  frame: number;
  time: number;
  message: string;
  sample: CameraTelemetrySample;
};

const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * Collect all character actor root groups under `root`, excluding `exclude`.
 */
export function collectCharacterActors(
  root: T.Object3D,
  exclude?: T.Object3D,
): T.Object3D[] {
  const actors: T.Object3D[] = [];
  root.traverse((obj) => {
    if (obj === exclude) return;
    if (obj.userData?.isCharacterRig) {
      actors.push(obj);
    }
  });
  return actors;
}

/**
 * Hide non-cinematic character actors whose head/torso volume overlaps the
 * gameplay camera lens, restoring visibility as soon as the lens clears them.
 */
export function updateActorCameraClearance(
  cameraEye: T.Vector3,
  actors: readonly T.Object3D[],
  cinematicActive = false,
  minClearance = 0.85,
): void {
  const worldPos = new T.Vector3();
  for (const actor of actors) {
    if (cinematicActive) {
      if (actor.userData.cameraClipHidden) {
        actor.visible = true;
        actor.userData.cameraClipHidden = false;
      }
      continue;
    }
    if (!actor.visible && !actor.userData.cameraClipHidden) continue;
    actor.getWorldPosition(worldPos);
    const planar = Math.hypot(
      cameraEye.x - worldPos.x,
      cameraEye.z - worldPos.z,
    );
    const verticalOverlap =
      cameraEye.y >= worldPos.y + 0.25 && cameraEye.y <= worldPos.y + 1.9;
    const tooClose = planar < minClearance && verticalOverlap;
    if (tooClose && actor.visible) {
      actor.visible = false;
      actor.userData.cameraClipHidden = true;
    } else if (!tooClose && actor.userData.cameraClipHidden) {
      actor.visible = true;
      actor.userData.cameraClipHidden = false;
    }
  }
}

/**
 * Rolling blackbox telemetry & invariant monitor for camera and movement feel.
 * Runs in headless Node bot tests at 0 token cost and in live browser play.
 */
export class CameraTelemetry {
  readonly samples: CameraTelemetrySample[] = [];
  readonly anomalies: CameraAnomaly[] = [];
  private frame = 0;
  private time = 0;
  private idleFrames = 0;
  private idleStartDistance = 0;
  private straightForwardYaw: number | null = null;
  private backwardWalkYaw: number | null = null;

  constructor(
    private readonly maxSamples = 600,
    private readonly maxAnomalies = 120,
  ) {}

  reset(): void {
    this.samples.length = 0;
    this.anomalies.length = 0;
    this.frame = 0;
    this.time = 0;
    this.idleFrames = 0;
    this.idleStartDistance = 0;
    this.straightForwardYaw = null;
    this.backwardWalkYaw = null;
  }

  record(step: {
    dt: number;
    input: TelemetryInput;
    player: TelemetryPlayer;
    follow: FollowCamera;
    solids: readonly Solid[];
    actors?: readonly T.Object3D[];
    cut?: boolean;
  }): void {
    const { dt, input, player, follow, solids, actors, cut } = step;
    this.frame++;
    this.time += dt;
    const eye = follow.camera.position;
    const planarDistance = Math.hypot(eye.x - player.x, eye.z - player.z);
    const sample: CameraTelemetrySample = {
      frame: this.frame,
      time: Number(this.time.toFixed(4)),
      dt,
      input: { ...input },
      player: {
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        runSpeed: player.runSpeed ?? 0,
        grounded: player.grounded ?? true,
      },
      eye: { x: eye.x, y: eye.y, z: eye.z },
      planarDistance,
      cameraYaw: follow.yaw,
      cameraPitch: follow.pitch,
      roomId: follow.roomId,
      obstructed: follow.obstructed,
    };

    const prev = this.samples[this.samples.length - 1];
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) this.samples.shift();

    // 1. Embedded eye check
    if (!cameraSegmentClear(eye, eye, solids, 0.16)) {
      this.flag(
        "embedded-eye",
        sample,
        `Camera eye (${eye.x.toFixed(2)}, ${eye.y.toFixed(2)}, ${eye.z.toFixed(2)}) embedded in solid`,
      );
    }

    // 2. Actor lens clipping ("servant's beard" detector)
    if (actors && !cut) {
      const worldPos = new T.Vector3();
      for (const actor of actors) {
        if (!actor.visible) continue;
        actor.getWorldPosition(worldPos);
        const d = Math.hypot(eye.x - worldPos.x, eye.z - worldPos.z);
        if (
          d < 0.65 &&
          eye.y >= worldPos.y + 0.3 &&
          eye.y <= worldPos.y + 1.85
        ) {
          this.flag(
            "actor-lens-clip",
            sample,
            `Camera eye is ${d.toFixed(2)}m from visible actor "${actor.name || "actor"}"`,
          );
        }
      }
    }

    if (!prev || cut || prev.roomId !== sample.roomId) {
      this.idleFrames = 0;
      this.straightForwardYaw = null;
      this.backwardWalkYaw = null;
      return;
    }

    const manualOrbit =
      Math.abs(input.cameraX ?? 0) + Math.abs(input.cameraY ?? 0) > 0.001 ||
      !!input.recenter ||
      !!input.cameraZoom;

    // 3. Sudden 3D position jump (unless recovering from a multi-meter floor drop)
    const recentWindow = this.samples.slice(-30);
    const playerDrop = recentWindow.reduce(
      (max, s) => Math.max(max, Math.abs(player.y - s.player.y)),
      0,
    );
    const eyeStep = Math.hypot(
      eye.x - prev.eye.x,
      eye.y - prev.eye.y,
      eye.z - prev.eye.z,
    );
    const maxEyeStep = Math.max(0.55, 16 * dt);
    if (!manualOrbit && playerDrop < 1.2 && eyeStep > maxEyeStep) {
      this.flag(
        "sudden-eye-jump",
        sample,
        `Camera eye jumped ${eyeStep.toFixed(2)}m in one frame (limit ${maxEyeStep.toFixed(2)}m)`,
      );
    }

    // 4. Sudden angular pivot / snap
    const yawStep = Math.abs(angleDiff(sample.cameraYaw, prev.cameraYaw));
    const maxYawStep = Math.max(0.2, 7.0 * dt);
    if (!manualOrbit && yawStep > maxYawStep) {
      this.flag(
        "sudden-yaw-snap",
        sample,
        `Camera yaw snapped ${((yawStep * 180) / Math.PI).toFixed(1)}° in one frame`,
      );
    }

    // 5. Sudden inward zoom snap
    const zoomCollapse = prev.planarDistance - sample.planarDistance;
    const maxZoomCollapse = Math.max(0.4, 13 * dt);
    if (!manualOrbit && playerDrop < 1.2 && zoomCollapse > maxZoomCollapse) {
      this.flag(
        "sudden-zoom-snap",
        sample,
        `Camera boom collapsed inward by ${zoomCollapse.toFixed(2)}m in one frame`,
      );
    }

    // 6. Stop-and-go idle zoom/spin check
    const stickMag = Math.hypot(input.x, input.y);
    if (stickMag < 0.01 && sample.player.runSpeed < 0.03 && !manualOrbit) {
      this.idleFrames++;
      if (this.idleFrames === 3) {
        this.idleStartDistance = sample.planarDistance;
      } else if (this.idleFrames > 3) {
        const idleShrink = this.idleStartDistance - sample.planarDistance;
        if (idleShrink > 0.25) {
          this.flag(
            "idle-camera-motion",
            sample,
            `Camera zoomed inward by ${idleShrink.toFixed(2)}m while player was completely stopped`,
          );
          this.idleStartDistance = sample.planarDistance;
        }
      }
    } else {
      this.idleFrames = 0;
    }

    // 7. Straight-forward wall-steering drift check
    const moveDx = sample.player.x - prev.player.x;
    const moveDz = sample.player.z - prev.player.z;
    const moved = Math.hypot(moveDx, moveDz);
    const moveYaw =
      moved > 1e-4 ? Math.atan2(moveDx, moveDz) : sample.player.yaw;
    if (
      Math.abs(input.x) < 0.02 &&
      input.y > 0.75 &&
      !manualOrbit &&
      sample.player.runSpeed > 1.0 &&
      moved > 1e-3 &&
      Math.abs(angleDiff(sample.player.yaw, sample.cameraYaw)) < 0.03 &&
      Math.abs(angleDiff(moveYaw, sample.cameraYaw)) < 0.04
    ) {
      if (this.straightForwardYaw === null) {
        this.straightForwardYaw = sample.cameraYaw;
      } else {
        const drift = Math.abs(
          angleDiff(sample.cameraYaw, this.straightForwardYaw),
        );
        if (drift > 0.05) {
          this.flag(
            "wall-steering-drift",
            sample,
            `Camera yaw drifted ${((drift * 180) / Math.PI).toFixed(1)}° while player held straight forward`,
          );
          this.straightForwardYaw = sample.cameraYaw;
        }
      }
    } else {
      this.straightForwardYaw = null;
    }

    // 8. Backing-out / walking-toward-camera 180° reversal flip check
    if (
      Math.abs(input.x) < 0.18 &&
      input.y < -0.7 &&
      !manualOrbit &&
      sample.player.runSpeed > 0.5
    ) {
      if (this.backwardWalkYaw === null) {
        this.backwardWalkYaw = sample.cameraYaw;
      } else {
        const flip = Math.abs(
          angleDiff(sample.cameraYaw, this.backwardWalkYaw),
        );
        if (flip > 0.35) {
          this.flag(
            "reversal-flip-180",
            sample,
            `Camera rotated ${((flip * 180) / Math.PI).toFixed(1)}° while player held backward to walk toward camera`,
          );
          this.backwardWalkYaw = sample.cameraYaw;
        }
      }
    } else {
      this.backwardWalkYaw = null;
    }
  }

  private flag(
    kind: CameraAnomalyKind,
    sample: CameraTelemetrySample,
    message: string,
  ): void {
    const prev = this.anomalies[this.anomalies.length - 1];
    if (prev && prev.kind === kind && sample.frame - prev.frame <= 3) return;
    if (this.anomalies.length >= this.maxAnomalies) this.anomalies.shift();
    this.anomalies.push({
      kind,
      frame: sample.frame,
      time: sample.time,
      message,
      sample,
    });
  }
}
