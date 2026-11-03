import type { InputState } from "../controls/input";

type CameraRelativeAxes = Pick<InputState, "x" | "y"> &
  Partial<Pick<InputState, "cameraX" | "cameraY" | "recenter">>;

/** Keep a held movement gesture in its world frame across authored view cuts. */
export class CameraRelativeInput {
  private held: { yaw: number; direction: number } | undefined;

  reset(): void {
    this.held = undefined;
  }

  yaw(input: CameraRelativeAxes, visibleYaw: number): number {
    if (this.held) {
      const difference = Math.atan2(input.x, input.y) - this.held.direction;
      const turn = Math.abs(
        Math.atan2(Math.sin(difference), Math.cos(difference)),
      );
      if (!this.canHold(input) || turn > 0.22) this.reset();
    }
    return this.held?.yaw ?? visibleYaw;
  }

  hold(input: CameraRelativeAxes, previousMovementYaw: number): void {
    this.reset();
    if (this.canHold(input))
      this.held = {
        yaw: previousMovementYaw,
        direction: Math.atan2(input.x, input.y),
      };
  }

  private canHold(input: CameraRelativeAxes): boolean {
    return (
      Math.hypot(input.x, input.y) > 0.05 &&
      Math.abs(input.cameraX ?? 0) + Math.abs(input.cameraY ?? 0) < 0.0001 &&
      !input.recenter
    );
  }
}
