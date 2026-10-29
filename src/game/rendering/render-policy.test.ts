import assert from "node:assert/strict";
import test from "node:test";
import {
  FramePacer,
  RenderQuality,
  readGraphicsMode,
  renderScale,
  GRAPHICS_MODES,
} from "./render-policy.ts";

test("balanced and battery modes pace updates on 60, 120 and 144 Hz displays without drift", () => {
  for (const refresh of [60, 120, 144])
    for (const fps of [30, 60]) {
      const pacer = new FramePacer();
      let frames = 0;
      for (let i = 0; i < refresh * 10; i++)
        if (pacer.due((i * 1000) / refresh, fps)) frames++;
      assert.ok(
        Math.abs(frames - fps * 10) <= 1,
        `${refresh}Hz -> ${fps}FPS: ${frames}`,
      );
    }
});
test("high refresh follows display and recovery never catches up in a burst", () => {
  const pacer = new FramePacer();
  assert.equal(pacer.due(0, 60), true);
  assert.equal(pacer.due(5, 60), false);
  assert.equal(pacer.due(10000, 60), true);
  assert.equal(pacer.due(10001, 60), false);
  pacer.reset();
  assert.equal(pacer.due(10002, 30), true);
  for (let i = 0; i < 10; i++) assert.equal(pacer.due(10003 + i, null), true);
});
test("graphics preferences reject corrupt storage and render buffers respect a total pixel budget", () => {
  for (const value of [null, "", "ultra", "{}"])
    assert.equal(readGraphicsMode(value), "balanced");
  assert.equal(readGraphicsMode("battery"), "battery");
  assert.equal(GRAPHICS_MODES.balanced.fps, 60);
  assert.equal(GRAPHICS_MODES.battery.fps, 30);
  assert.equal(GRAPHICS_MODES.refresh.fps, null);
  for (const mode of ["balanced", "battery", "refresh"] as const) {
    const preset = GRAPHICS_MODES[mode];
    for (const [w, h, dpr] of [
      [1440, 900, 2],
      [3840, 2160, 2],
      [844, 390, 3],
      [800, 600, 1],
    ]) {
      const scale = renderScale(w, h, dpr, mode, 1);
      assert.ok(scale <= dpr && scale <= preset.maxScale);
      assert.ok(w * h * scale * scale <= preset.maxPixels + 0.01);
    }
  }
});
test("adaptive resolution requires sustained slow frames, bounds changes, and recovers gradually", () => {
  const quality = new RenderQuality();
  for (let i = 0; i < 30; i++) quality.sample(40, 60);
  assert.equal(quality.factor, 1);
  for (let i = 0; i < 180; i++) quality.sample(40, 60);
  assert.ok(quality.factor < 1);
  for (let i = 0; i < 2000; i++) quality.sample(40, 60);
  assert.ok(quality.factor >= 0.65);
  const low = quality.factor;
  for (let i = 0; i < 200; i++) quality.sample(16.7, 60);
  assert.equal(quality.factor, low);
  for (let i = 0; i < 3000; i++) quality.sample(16.7, 60);
  assert.ok(quality.factor > low && quality.factor <= 1);
  quality.reset();
  assert.equal(quality.factor, 1);
});
