import type { Harmonics } from './presets';

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

export class Synth {
  readonly ctx = new AudioContext();
  private master = this.ctx.createGain();
  private voices = new Map<number, Voice>();
  private wave: PeriodicWave | null = null;
  attack = 0.01;
  release = 0.25;

  constructor() {
    const comp = this.ctx.createDynamicsCompressor();
    this.master.gain.value = 0.4;
    this.master.connect(comp).connect(this.ctx.destination);
  }

  set volume(v: number) { this.master.gain.value = v; }

  /** sin(kθ+φ) = sinφ·cos(kθ) + cosφ·sin(kθ) → real = a·sinφ, imag = a·cosφ */
  setHarmonics(h: Harmonics, updateActive = true) {
    const n = h.amps.length;
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    for (let i = 0; i < n; i++) {
      real[i + 1] = h.amps[i] * Math.sin(h.phases[i]);
      imag[i + 1] = h.amps[i] * Math.cos(h.phases[i]);
    }
    this.wave = this.ctx.createPeriodicWave(real, imag); // normalised to peak 1
    if (updateActive) for (const v of this.voices.values()) v.osc.setPeriodicWave(this.wave);
  }

  noteOn(note: number, velocity = 1) {
    if (this.ctx.state !== 'running') void this.ctx.resume();
    this.noteOff(note, true);
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (this.wave) osc.setPeriodicWave(this.wave);
    osc.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(velocity * 0.5, t + Math.max(this.attack, 0.002));
    osc.connect(gain).connect(this.master);
    osc.start(t);
    this.voices.set(note, { osc, gain });
  }

  noteOff(note: number, immediate = false) {
    const v = this.voices.get(note);
    if (!v) return;
    this.voices.delete(note);
    const t = this.ctx.currentTime;
    const rel = immediate ? 0.01 : Math.max(this.release, 0.01);
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(v.gain.gain.value, t);
    v.gain.gain.linearRampToValueAtTime(0, t + rel);
    v.osc.stop(t + rel + 0.02);
    v.osc.onended = () => { v.osc.disconnect(); v.gain.disconnect(); };
  }

  allOff() { for (const n of [...this.voices.keys()]) this.noteOff(n); }
}
