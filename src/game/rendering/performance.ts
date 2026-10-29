/** Lightweight opt-in diagnostics. Enable only in development at the call site. */
type Resources = Readonly<{
  geometries: number;
  textures: number;
  heapBytes: number | null;
}>;
type SceneSample = Readonly<
  Resources & {
    scene: string;
    timeMs: number;
    sinceBaseline: Resources;
    sincePreviousVisit: Resources | null;
  }
>;
type RendererStats = {
  info: {
    render: { calls: number; triangles: number };
    memory: { geometries: number; textures: number };
  };
};

function browserHeapBytes(): number | null {
  const memory = (
    globalThis.performance as Performance & {
      memory?: { usedJSHeapSize?: number };
    }
  ).memory;
  return typeof memory?.usedJSHeapSize === "number"
    ? memory.usedJSHeapSize
    : null;
}

function delta(current: Resources, previous: Resources): Resources {
  return Object.freeze({
    geometries: current.geometries - previous.geometries,
    textures: current.textures - previous.textures,
    heapBytes:
      current.heapBytes === null || previous.heapBytes === null
        ? null
        : current.heapBytes - previous.heapBytes,
  });
}

export function createPerformanceDiagnostics(
  renderer: RendererStats,
  options: { enabled: boolean; readHeapBytes?: () => number | null },
) {
  const readHeap = options.readHeapBytes ?? browserHeapBytes;
  let start: number | null = null;
  let frames = 0;
  let fps: number | null = null;
  let pendingScene: string | null = null;
  let baseline: Resources | null = null;
  let latest: Resources = Object.freeze({
    geometries: 0,
    textures: 0,
    heapBytes: null,
  });
  let calls = 0;
  let triangles = 0;
  const scenes: SceneSample[] = [];
  // Bounded to the same history as snapshots: arbitrary scene labels cannot grow memory.
  return {
    recordScene(scene: string) {
      if (options.enabled) pendingScene = scene;
    },
    sampleFrame(nowMs: number) {
      if (!options.enabled) return;
      if (start === null || nowMs < start) {
        start = nowMs;
        frames = 0;
      } else {
        frames++;
        if (nowMs - start >= 1000) {
          fps = (frames * 1000) / (nowMs - start);
          start = nowMs;
          frames = 0;
        }
      }
      calls = renderer.info.render.calls;
      triangles = renderer.info.render.triangles;
      // Heap and resource counts need only be read when publishing a scene sample.
      if (pendingScene !== null) {
        latest = Object.freeze({
          ...renderer.info.memory,
          heapBytes: readHeap(),
        });
        baseline ??= latest;
        const previous = [...scenes]
          .reverse()
          .find((sample) => sample.scene === pendingScene);
        scenes.push(
          Object.freeze({
            ...latest,
            scene: pendingScene,
            timeMs: nowMs,
            sinceBaseline: delta(latest, baseline),
            sincePreviousVisit: previous ? delta(latest, previous) : null,
          }),
        );
        if (scenes.length > 40) scenes.shift();
        pendingScene = null;
      }
    },
    snapshot() {
      if (!options.enabled) return null;
      return Object.freeze({
        fps,
        calls,
        triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        heapBytes: readHeap(),
        scenes: Object.freeze([...scenes]),
      });
    },
    suspend() {
      start = null;
      frames = 0;
      fps = 0;
    },
    dispose() {
      scenes.length = 0;
      pendingScene = null;
      baseline = null;
    },
  };
}
