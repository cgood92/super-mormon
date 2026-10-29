import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildConferenceOrgan,
  ORGAN_MELODY,
  ORGAN_BASS,
} from "./conference-organ";
import { buildRostrum } from "./conference-rostrum";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";

test("organ plays the historical Norton pickup and complete 64 beat voices", () => {
  assert.deepEqual(ORGAN_MELODY.slice(0, 10), [
    [63, 0.75],
    [65, 0.25],
    [67, 1],
    [67, 0.75],
    [65, 0.25],
    [63, 0.75],
    [65, 0.25],
    [67, 0.75],
    [68, 0.25],
    [70, 2],
  ]);
  for (const voice of [ORGAN_MELODY, ORGAN_BASS])
    assert.equal(
      voice.reduce((sum, note) => sum + note[1], 0),
      64,
    );
  assert.deepEqual(ORGAN_MELODY.at(-1), [63, 3]);
});

test("choir platform connects to solid organ console and clear standing space", () => {
  const root = new T.Group(),
    rostrum = buildRostrum(root),
    organ = buildConferenceOrgan(root),
    solids = [...rostrum.solids, ...organ.solids];
  assert.deepEqual(sceneryCollisionErrors(organ.group, solids), []);
  const p = createPlayer(12, 3.3, -85.1);
  for (const [x, z] of [
    [12, -92.4],
    [30, -92.4],
    [30, -93.75],
  ]) {
    for (let i = 0; i < 600; i++) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.04) break;
      stepPlayer(
        p,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        solids,
      );
    }
    assert.ok(
      Math.hypot(x - p.x, z - p.z) < 0.2,
      `blocked at ${p.x},${p.y},${p.z}`,
    );
  }
  for (let i = 0; i < 60; i++)
    stepPlayer(
      p,
      { x: 0, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      solids,
    );
  assert.ok(Math.abs(p.y - organ.point.y) < 0.03, `console feet ${p.y}`);
  organ.dispose();
  organ.dispose();
  assert.equal(
    root.getObjectByName("Playable conference organ console"),
    undefined,
  );
});

test("organ stop cancels all scheduled voices and restart replaces them", () => {
  let starts = 0,
    stops = 0;
  const audio = {
    currentTime: 0,
    destination: {},
    createGain: () => ({
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {},
      disconnect() {},
    }),
    createOscillator: () => ({
      frequency: { value: 0 },
      type: "sine",
      connect() {},
      disconnect() {},
      start() {
        starts++;
      },
      stop() {
        stops++;
      },
      onended: null,
    }),
  } as unknown as AudioContext;
  const organ = buildConferenceOrgan(new T.Group());
  organ.start(audio);
  assert.equal(organ.playing(), true);
  assert.equal(starts, 2 * (ORGAN_MELODY.length + ORGAN_BASS.length));
  const scheduled = starts;
  organ.stop();
  assert.equal(organ.playing(), false);
  assert.equal(
    stops,
    scheduled * 2,
    "initial scheduled stop plus explicit cancellation",
  );
  organ.start(audio);
  assert.equal(starts, scheduled * 2);
  organ.dispose();
  assert.equal(organ.playing(), false);
  organ.start(audio);
  assert.equal(starts, scheduled * 2, "disposed console cannot start audio");
});
