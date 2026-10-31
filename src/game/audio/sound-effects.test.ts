import test from "node:test";
import assert from "node:assert/strict";
import { playSoundEffect, type SoundKind } from "./sound-effects";

type AudioCall = [string, ...unknown[]];

function recordingAudio(failAt?: string) {
  const calls: AudioCall[] = [];
  const record = (name: string, ...args: unknown[]) => {
    calls.push([name, ...args]);
    if (name === failAt) throw new Error(name);
  };
  const parameter = (name: string) => ({
    setValueAtTime: (value: number, time: number) =>
      record(`${name}.set`, value, time),
    exponentialRampToValueAtTime: (value: number, time: number) =>
      record(`${name}.ramp`, value, time),
  });
  const gain = {
    gain: parameter("gain"),
    connect: (node: unknown) => record("gain.connect", node),
  };
  const oscillator = {
    frequency: parameter("frequency"),
    set type(value: string) {
      record("oscillator.type", value);
    },
    connect: (node: unknown) => record("oscillator.connect", node),
    start: (time: number) => record("oscillator.start", time),
    stop: (time: number) => record("oscillator.stop", time),
  };
  const destination = { name: "destination" };
  const context = {
    resume() {
      record("resume");
      return Promise.resolve();
    },
    createOscillator() {
      record("createOscillator");
      return oscillator;
    },
    createGain() {
      record("createGain");
      return gain;
    },
    get currentTime() {
      record("currentTime");
      return 12.5;
    },
    destination,
  } as unknown as AudioContext;
  return { context, calls, gain, destination };
}

const schedules: [SoundKind, string, number, number][] = [
  ["jump", "triangle", 250, 430],
  ["collect", "sine", 740, 1100],
  ["caught", "triangle", 190, 90],
  ["portal", "triangle", 220, 1100],
  ["win", "triangle", 520, 1100],
  ["pound", "triangle", 100, 40],
];

for (const [kind, waveform, frequency, ramp] of schedules) {
  test(`${kind} schedules its waveform, pitch envelope, volume and connected node lifetime`, () => {
    const { context, calls, gain, destination } = recordingAudio();
    playSoundEffect(context, kind);
    assert.deepEqual(calls, [
      ["resume"],
      ["createOscillator"],
      ["createGain"],
      ["currentTime"],
      ["oscillator.connect", gain],
      ["gain.connect", destination],
      ["oscillator.type", waveform],
      ["frequency.set", frequency, 12.5],
      ["frequency.ramp", ramp, 12.68],
      ["gain.set", 0.045, 12.5],
      ["gain.ramp", 0.001, 12.82],
      ["oscillator.start", 12.5],
      ["oscillator.stop", 12.83],
    ]);
    assert.equal(calls[4][1], gain);
    assert.equal(calls[5][1], destination);
  });
}

for (const failAt of [
  "resume",
  "createOscillator",
  "createGain",
  "currentTime",
  "oscillator.connect",
  "gain.connect",
  "oscillator.type",
  "frequency.set",
  "frequency.ramp",
  "gain.set",
  "gain.ramp",
  "oscillator.start",
  "oscillator.stop",
]) {
  test(`a synchronous ${failAt} failure propagates to the caller's optional-audio boundary`, () => {
    const { context, calls } = recordingAudio(failAt);
    assert.throws(() => playSoundEffect(context, "jump"), { message: failAt });
    assert.equal(calls.at(-1)?.[0], failAt);
  });
}
