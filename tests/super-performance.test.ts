import assert from "node:assert/strict";
import test from "node:test";
import { createPerformanceDiagnostics } from "../src/super/performance.ts";

const renderer = () => ({
  info: {
    render: { calls: 4, triangles: 120 },
    memory: { geometries: 3, textures: 2 },
  },
});

test("disabled diagnostics do not collect render or scene data", () => {
  const diagnostics = createPerformanceDiagnostics(renderer(), {
    enabled: false,
  });
  diagnostics.recordScene("hub");
  diagnostics.sampleFrame(100);
  assert.equal(diagnostics.snapshot(), null);
});

test("reports frame rate, renderer workload and unavailable heap explicitly", () => {
  const diagnostics = createPerformanceDiagnostics(renderer(), {
    enabled: true,
    readHeapBytes: () => null,
  });
  diagnostics.sampleFrame(0);
  diagnostics.sampleFrame(500);
  diagnostics.sampleFrame(1000);
  const snapshot = diagnostics.snapshot()!;
  assert.equal(snapshot.fps, 2);
  assert.equal(snapshot.calls, 4);
  assert.equal(snapshot.triangles, 120);
  assert.equal(snapshot.heapBytes, null);
});

test("records scene resource trends after rendering and bounds immutable history", () => {
  const source = renderer();
  let heap = 100;
  const diagnostics = createPerformanceDiagnostics(source, {
    enabled: true,
    readHeapBytes: () => heap,
  });
  diagnostics.recordScene("hub");
  diagnostics.sampleFrame(0);
  source.info.memory.geometries = 5;
  heap = 150;
  diagnostics.recordScene("story");
  diagnostics.sampleFrame(10);
  diagnostics.recordScene("hub");
  diagnostics.sampleFrame(20);
  const visits = diagnostics.snapshot()!.scenes;
  assert.equal(visits[2].sincePreviousVisit?.geometries, 2);
  assert.equal(visits[2].sincePreviousVisit?.heapBytes, 50);
  assert.equal(visits[1].sinceBaseline.geometries, 2);
  assert.ok(Object.isFrozen(visits));
  for (let i = 0; i < 50; i++) {
    diagnostics.recordScene("hub");
    diagnostics.sampleFrame(30 + i);
  }
  assert.equal(diagnostics.snapshot()!.scenes.length, 40);
});

test("suspended rendering reports zero FPS and does not count paused time on resume", () => {
  const diagnostics = createPerformanceDiagnostics(renderer(), {
    enabled: true,
    readHeapBytes: () => null,
  });
  diagnostics.sampleFrame(0);
  diagnostics.sampleFrame(1000);
  diagnostics.suspend();
  assert.equal(diagnostics.snapshot()!.fps, 0);
  diagnostics.sampleFrame(100000);
  diagnostics.sampleFrame(100500);
  diagnostics.sampleFrame(101000);
  assert.equal(diagnostics.snapshot()!.fps, 2);
});
