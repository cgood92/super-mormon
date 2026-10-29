const DEADZONE = 0.5;
const FIRST_REPEAT = 0.35;
const NEXT_REPEAT = 0.16;
const MAX_FRAME_TIME = 0.05;

/** Converts a vertical movement axis into discrete, wrapping menu selections. */
export class MenuNavigation {
  index = 0;
  private count = 0;
  private armed = false;
  private direction = 0;
  private elapsed = 0;
  private repeatAfter = FIRST_REPEAT;

  reset(count: number): void {
    this.count = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    this.index = 0;
    this.armed = false;
    this.direction = 0;
    this.elapsed = 0;
    this.repeatAfter = FIRST_REPEAT;
  }

  update(y: number, dt: number): number | null {
    if (!Number.isFinite(y) || Math.abs(y) < DEADZONE) {
      this.armed = true;
      this.direction = 0;
      this.elapsed = 0;
      this.repeatAfter = FIRST_REPEAT;
      return null;
    }
    if (!this.armed) return null;

    const direction = y > 0 ? -1 : 1;
    if (direction !== this.direction) {
      this.direction = direction;
      this.elapsed = 0;
      this.repeatAfter = FIRST_REPEAT;
      return this.step(direction);
    }

    const frameTime = Number.isFinite(dt)
      ? Math.max(0, Math.min(dt, MAX_FRAME_TIME))
      : 0;
    this.elapsed += frameTime;
    if (this.elapsed + 1e-9 < this.repeatAfter) return null;
    this.elapsed = Math.max(0, this.elapsed - this.repeatAfter);
    this.repeatAfter = NEXT_REPEAT;
    return this.step(direction);
  }

  private step(direction: number): number | null {
    if (this.count <= 1) return null;
    this.index = (this.index + direction + this.count) % this.count;
    return this.index;
  }
}
