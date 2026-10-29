export const GRAPHICS_MODES = {
  balanced: {
    label: "Balanced",
    fps: 60 as number | null,
    maxScale: 1.25,
    maxPixels: 2_000_000,
  },
  battery: {
    label: "Battery saver",
    fps: 30 as number | null,
    maxScale: 1,
    maxPixels: 1_000_000,
  },
  refresh: {
    label: "High refresh",
    fps: null as number | null,
    maxScale: 1.7,
    maxPixels: 3_000_000,
  },
};
export type GraphicsMode = keyof typeof GRAPHICS_MODES;
export function readGraphicsMode(value: string | null): GraphicsMode {
  return value === "battery" || value === "refresh" ? value : "balanced";
}

/** Cap total drawing-buffer area as well as per-axis device scale. */
export function renderScale(
  width: number,
  height: number,
  dpr: number,
  mode: GraphicsMode,
  factor: number,
): number {
  const preset = GRAPHICS_MODES[mode];
  return (
    Math.min(
      dpr,
      preset.maxScale,
      Math.sqrt(preset.maxPixels / Math.max(1, width * height)),
    ) * Math.max(0.65, Math.min(1, factor))
  );
}

/** Advance a deadline, rather than rounding an interval to display refreshes. */
export class FramePacer {
  private next: number | null = null;
  due(now: number, fps: number | null): boolean {
    if (fps === null) {
      this.next = null;
      return true;
    }
    const interval = 1000 / fps;
    if (this.next === null || now - this.next > 250) {
      this.next = now + interval;
      return true;
    }
    if (now + 0.1 < this.next) return false;
    this.next +=
      Math.max(1, Math.floor((now + 0.1 - this.next) / interval) + 1) *
      interval;
    return true;
  }
  reset() {
    this.next = null;
  }
}

/** Two-second averages avoid reacting to individual shader/GC stalls. */
export class RenderQuality {
  factor = 1;
  private elapsed = 0;
  private frames = 0;
  private stableMs = 0;
  sample(elapsedMs: number, fps: number | null): boolean {
    if (elapsedMs <= 0 || elapsedMs > 250) return false;
    this.elapsed += elapsedMs;
    this.frames++;
    if (this.elapsed < 2000) return false;
    const average = this.elapsed / this.frames;
    const target = 1000 / (fps ?? 60);
    const before = this.factor;
    if (average > target * 1.2) {
      this.factor = Math.max(0.65, Math.round((this.factor - 0.1) * 100) / 100);
      this.stableMs = 0;
    } else if (average < target * 1.08) {
      this.stableMs += this.elapsed;
      if (this.stableMs >= 10000) {
        this.factor = Math.min(1, Math.round((this.factor + 0.05) * 100) / 100);
        this.stableMs = 0;
      }
    } else this.stableMs = 0;
    this.elapsed = this.frames = 0;
    return this.factor !== before;
  }
  reset() {
    this.factor = 1;
    this.elapsed = this.frames = this.stableMs = 0;
  }
}
