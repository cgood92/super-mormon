/**
 * Procedural Web Audio synthesizer for Mario Kart sound effects and upbeat race music.
 * Completely self-contained: zero external audio files, works anywhere instantly.
 */
export class KartAudio {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private driftNoiseNode: AudioNode | null = null;
  private driftGain: GainNode | null = null;
  private bgmPlaying = false;
  private bgmSpeed = 1.0;
  private bgmStep = 0;
  private bgmTimer: number | null = null;
  private muted = false;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private initContext(): AudioContext | null {
    if (typeof window === "undefined" || typeof AudioContext === "undefined")
      return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && this.ctx) {
      this.stopEngine();
      this.stopDrift();
      this.stopBGM();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // --- ENGINE SYNTHESIS ---
  public startEngine() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || this.engineOsc) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      sub.type = "triangle";
      osc.frequency.setValueAtTime(65, now);
      sub.frequency.setValueAtTime(32.5, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(380, now);

      gain.gain.setValueAtTime(0.08, now);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      sub.start(now);

      this.engineOsc = osc;
      this.engineSubOsc = sub;
      this.engineGain = gain;
    } catch {
      // Audio optional
    }
  }

  public updateEngine(speedRatio: number, isDrifting = false) {
    if (!this.engineOsc || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    const targetFreq = 55 + clamped * 135 + (isDrifting ? 20 : 0);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.05);
    }
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineSubOsc?.stop();
        this.engineOsc.disconnect();
        this.engineSubOsc?.disconnect();
      } catch {
        // ignore
      }
      this.engineOsc = null;
      this.engineSubOsc = null;
      this.engineGain = null;
    }
  }

  // --- DRIFT TIRE SCREECH ---
  public startDrift() {
    if (this.muted || this.driftGain) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.Q.setValueAtTime(4.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      this.driftNoiseNode = noise;
      this.driftGain = gain;
    } catch {
      // ignore
    }
  }

  public stopDrift() {
    if (this.driftGain && this.driftNoiseNode) {
      try {
        (this.driftNoiseNode as AudioBufferSourceNode).stop();
        this.driftNoiseNode.disconnect();
        this.driftGain.disconnect();
      } catch {
        // ignore
      }
      this.driftNoiseNode = null;
      this.driftGain = null;
    }
  }

  // --- SOUND EFFECTS ---
  public playCountdown(isFinal: boolean) {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isFinal ? "sawtooth" : "sine";
    const freq = isFinal ? 987.77 : 440; // High B5 for GO!, A4 for count
    osc.frequency.setValueAtTime(freq, now);

    const duration = isFinal ? 0.7 : 0.28;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  public playHop() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playMiniTurbo(tier: 1 | 2 | 3) {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = tier === 1 ? 320 : tier === 2 ? 460 : 640;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playItemBoxHit() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.05); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playItemGet() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + i * 0.06);

      gain.gain.setValueAtTime(0.18, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  public playThrow() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playTrumpetFanfare() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Glorious Angel Moroni trumpet fanfare motif (C4 - E4 - G4 - C5!)
    const notes = [
      { f: 523.25, t: 0.0, d: 0.15 },
      { f: 659.25, t: 0.15, d: 0.15 },
      { f: 783.99, t: 0.3, d: 0.2 },
      { f: 1046.5, t: 0.5, d: 0.6 },
    ];

    const now = ctx.currentTime;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.28, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }

  public playSpinOut() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.6);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  public playExplosion() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  public playBoost() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playKonamiUnlock() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Classic retro 8-bit secret chime (G4, C5, E5, G5, C6)
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(f, now + i * 0.08);

      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  public playLapChime(isFinal: boolean) {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = isFinal
      ? [880, 1174.66, 1760] // Final Lap high energy
      : [659.25, 880];

    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + i * 0.1);

      gain.gain.setValueAtTime(0.28, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });
  }

  // --- BACKGROUND MUSIC ENGINE (Chiptune / Kart Funk) ---
  public startBGM(speed = 1.0) {
    if (this.muted || this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmSpeed = speed;
    this.bgmStep = 0;
    this.scheduleNextBgmStep();
  }

  public speedUpBGM() {
    this.bgmSpeed = 1.25; // Final Lap excitement!
  }

  public stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleNextBgmStep() {
    if (!this.bgmPlaying || this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Upbeat 16-step bassline & lead synth
    // Melodic notes inspired by "High on the Mountain Top" & Mario Kart Circuit
    const bassline = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 110];
    const melody = [
      440, 0, 523.25, 659.25, 587.33, 440, 523.25, 0, 659.25, 659.25, 783.99,
      659.25, 587.33, 523.25, 440, 0,
    ];

    const stepDuration = 120 / this.bgmSpeed; // ms per step (~125 BPM)
    const now = ctx.currentTime;

    // Play Bass Note
    const bassFreq = bassline[this.bgmStep % bassline.length];
    if (bassFreq > 0) {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = "sawtooth";
      bOsc.frequency.setValueAtTime(bassFreq, now);

      bGain.gain.setValueAtTime(0.12, now);
      bGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + stepDuration * 0.001 * 0.85,
      );

      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + stepDuration * 0.001 * 0.85);
    }

    // Play Melody Lead Note
    const leadFreq = melody[this.bgmStep % melody.length];
    if (leadFreq > 0) {
      const lOsc = ctx.createOscillator();
      const lGain = ctx.createGain();
      lOsc.type = "square";
      lOsc.frequency.setValueAtTime(leadFreq, now);

      lGain.gain.setValueAtTime(0.08, now);
      lGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + stepDuration * 0.001 * 0.7,
      );

      lOsc.connect(lGain);
      lGain.connect(ctx.destination);
      lOsc.start(now);
      lOsc.stop(now + stepDuration * 0.001 * 0.7);
    }

    this.bgmStep++;
    this.bgmTimer = window.setTimeout(() => {
      this.scheduleNextBgmStep();
    }, stepDuration);
  }

  public dispose() {
    this.stopEngine();
    this.stopDrift();
    this.stopBGM();
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close();
    }
    this.ctx = null;
  }
}
