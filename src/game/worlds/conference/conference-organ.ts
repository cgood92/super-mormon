import * as T from "three";
import { sceneryBox, markScenery } from "../shared/scenery";
import type { Solid } from "../../physics/physics";

/** Norton/Fowler, Relief Society Song Book (1919), no. 41, public domain.
 * Exact soprano and bass pitches/rhythms transcribed from the historical score:
 * https://www.hymnwiki.org/wiki/images/4/4c/041_We_Thank_Thee%2C_O_God%2C_for_a_Prophet.ly
 * Official hymn identity/composer: https://www.churchofjesuschrist.org/media/music/songs/we-thank-thee-o-god-for-a-prophet?lang=eng
 * Original synthesized registration; no recording or modern arrangement copied.
 * Tuples are MIDI pitch and quarter-note beats, including the pickup.
 */
export const ORGAN_MELODY: readonly (readonly [number, number])[] = [
  [63, 0.75],
  [65, 0.25],
  [67, 1.0],
  [67, 0.75],
  [65, 0.25],
  [63, 0.75],
  [65, 0.25],
  [67, 0.75],
  [68, 0.25],
  [70, 2.0],
  [67, 1.0],
  [63, 0.75],
  [65, 0.25],
  [67, 1.0],
  [67, 0.75],
  [65, 0.25],
  [67, 1.0],
  [70, 0.75],
  [67, 0.25],
  [65, 3.0],
  [63, 0.75],
  [65, 0.25],
  [67, 1.0],
  [67, 0.75],
  [65, 0.25],
  [63, 0.75],
  [65, 0.25],
  [67, 0.75],
  [68, 0.25],
  [70, 2.0],
  [72, 1.0],
  [72, 1.0],
  [70, 1.0],
  [70, 0.75],
  [70, 0.25],
  [70, 1.0],
  [70, 0.75],
  [68, 0.25],
  [67, 3.0],
  [70, 1.0],
  [75, 1.0],
  [75, 0.75],
  [75, 0.25],
  [74, 1.0],
  [72, 0.75],
  [72, 0.25],
  [70, 2.0],
  [67, 1.0],
  [63, 0.75],
  [65, 0.25],
  [67, 1.0],
  [67, 0.75],
  [65, 0.25],
  [67, 1.0],
  [70, 0.75],
  [67, 0.25],
  [65, 3.0],
  [67, 0.75],
  [70, 0.25],
  [75, 1.0],
  [75, 0.75],
  [75, 0.25],
  [74, 1.0],
  [72, 0.75],
  [72, 0.25],
  [70, 2.0],
  [67, 1.0],
  [63, 0.75],
  [65, 0.25],
  [67, 1.0],
  [70, 0.75],
  [67, 0.25],
  [65, 1.0],
  [67, 0.75],
  [65, 0.25],
  [63, 3.0],
];
export const ORGAN_BASS: readonly (readonly [number, number])[] = [
  [51, 1.0],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [51, 2.0],
  [51, 1.0],
  [51, 1.0],
  [51, 1.0],
  [51, 0.75],
  [46, 0.25],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [46, 3.0],
  [51, 1.0],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [51, 2.0],
  [56, 1.0],
  [56, 1.0],
  [58, 1.0],
  [58, 0.75],
  [58, 0.25],
  [58, 1.0],
  [46, 0.75],
  [46, 0.25],
  [51, 3.0],
  [51, 1.0],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [51, 2.0],
  [51, 1.0],
  [51, 1.0],
  [51, 1.0],
  [51, 0.75],
  [46, 0.25],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [46, 3.0],
  [51, 1.0],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [51, 2.0],
  [51, 1.0],
  [51, 1.0],
  [51, 1.0],
  [51, 0.75],
  [51, 0.25],
  [46, 1.0],
  [46, 0.75],
  [46, 0.25],
  [51, 3.0],
];

/** Hidden optional console; the owning auditorium supplies the choir floor. */
export function buildConferenceOrgan(parent: T.Group) {
  const group = new T.Group();
  group.name = "Playable conference organ console";
  parent.add(group);
  const solids: Solid[] = [];
  const walnut = new T.MeshStandardMaterial({
    color: 0x764529,
    roughness: 0.7,
  });
  const ivory = new T.MeshStandardMaterial({
    color: 0xf5ecd4,
    roughness: 0.45,
  });
  const black = new T.MeshStandardMaterial({ color: 0x211d19, roughness: 0.5 });
  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    name: string,
  ) => sceneryBox(group, solids, mat, { x, y, z, w, h, d }, name);
  add(30, 5.1, -94.5, 3.4, 1.4, 0.65, walnut, "Solid organ console cabinet");
  add(28.35, 5.1, -94, 0.24, 1.25, 1.4, walnut, "Organ left cheek");
  add(31.65, 5.1, -94, 0.24, 1.25, 1.4, walnut, "Organ right cheek");
  add(30, 4.8, -93.1, 2.5, 0.4, 0.5, walnut, "Organ bench");
  const keys = new T.Group();
  keys.name = "Three organ keyboard manuals";
  group.add(keys);
  for (let row = 0; row < 3; row++) {
    for (let key = 0; key < 21; key++) {
      const mesh = new T.Mesh(new T.BoxGeometry(0.125, 0.045, 0.35), ivory);
      mesh.position.set(
        28.65 + key * 0.135,
        6.05 + row * 0.15,
        -94.05 - row * 0.13,
      );
      keys.add(mesh);
      if (![2, 6].includes(key % 7)) {
        const sharp = new T.Mesh(new T.BoxGeometry(0.065, 0.06, 0.2), black);
        sharp.position
          .copy(mesh.position)
          .add(new T.Vector3(0.067, 0.04, -0.07));
        keys.add(sharp);
      }
    }
  }
  markScenery(keys, {
    kind: "decoration",
    reason:
      "Keyboard details are carried by the solid organ cabinet and cheeks.",
  });
  let context: AudioContext | undefined,
    end = 0,
    disposed = false;
  const voices = new Set<OscillatorNode>();
  const stop = () => {
    end = 0;
    for (const voice of voices) {
      try {
        voice.stop();
      } catch {
        /* already ended */
      }
      voice.disconnect();
    }
    voices.clear();
  };
  const start = (audio: AudioContext) => {
    if (disposed) return;
    stop();
    context = audio;
    const begin = audio.currentTime + 0.03,
      beat = 60 / 85;
    const schedule = (
      notes: readonly (readonly [number, number])[],
      bass: boolean,
    ) => {
      let at = begin;
      for (const [pitch, beats] of notes) {
        const duration = beats * beat;
        // Fundamental plus a quiet octave flute stop make a mellow pipe organ.
        for (const [octave, level] of [
          [bass ? -12 : 0, bass ? 0.045 : 0.075],
          [bass ? 0 : 12, bass ? 0.015 : 0.018],
        ]) {
          const oscillator = audio.createOscillator(),
            envelope = audio.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value =
            440 * Math.pow(2, (pitch + octave - 69) / 12);
          envelope.gain.setValueAtTime(0, at);
          envelope.gain.linearRampToValueAtTime(level, at + 0.025);
          envelope.gain.setValueAtTime(
            level,
            at + Math.max(0.03, duration - 0.06),
          );
          envelope.gain.linearRampToValueAtTime(0, at + duration);
          oscillator.connect(envelope);
          envelope.connect(audio.destination);
          voices.add(oscillator);
          oscillator.onended = () => {
            voices.delete(oscillator);
            oscillator.disconnect();
            envelope.disconnect();
          };
          oscillator.start(at);
          oscillator.stop(at + duration + 0.01);
        }
        at += duration;
      }
      end = Math.max(end, at);
    };
    schedule(ORGAN_MELODY, false);
    schedule(ORGAN_BASS, true);
  };
  return {
    group,
    solids,
    point: { x: 30, y: 5.1, z: -93.75 },
    seat: { x: 30, y: 5.2, z: -93.1 },
    start,
    stop,
    playing: () => !!context && context.currentTime < end,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      group.traverse((object) => {
        if (object instanceof T.Mesh) {
          geometries.add(object.geometry);
          for (const mat of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(mat);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      parent.remove(group);
    },
  };
}
