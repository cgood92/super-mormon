export type SoundKind =
  "jump" | "collect" | "caught" | "portal" | "win" | "pound";

export function playSoundEffect(audio: AudioContext, kind: SoundKind) {
  void audio.resume();
  const o = audio.createOscillator(),
    g = audio.createGain(),
    t = audio.currentTime;
  o.connect(g);
  g.connect(audio.destination);
  o.type = kind === "collect" ? "sine" : "triangle";
  o.frequency.setValueAtTime(
    {
      jump: 250,
      collect: 740,
      caught: 190,
      portal: 220,
      win: 520,
      pound: 100,
    }[kind],
    t,
  );
  o.frequency.exponentialRampToValueAtTime(
    kind === "pound"
      ? 40
      : kind === "caught"
        ? 90
        : kind === "jump"
          ? 430
          : 1100,
    t + 0.18,
  );
  g.gain.setValueAtTime(0.045, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  o.start(t);
  o.stop(t + 0.33);
}
