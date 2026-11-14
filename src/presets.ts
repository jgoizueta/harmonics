export interface Harmonics {
  amps: number[];   // amplitude of harmonic k+1, 0..1
  phases: number[]; // phase in radians, [0, 2π)
}

export type PresetParams = { count: number; duty: number };

export interface Preset {
  name: string;
  usesDuty?: boolean;
  /** Fourier coefficient of harmonic k (1-based) as a signed sine amplitude plus extra phase. */
  coef(k: number, p: PresetParams): { a: number; phase: number };
}

const TAU = Math.PI * 2;
const HALF = Math.PI / 2;

export const PRESETS: Preset[] = [
  { name: 'Sine', coef: k => ({ a: k === 1 ? 1 : 0, phase: 0 }) },
  { name: 'Square', coef: k => ({ a: k % 2 ? 4 / (Math.PI * k) : 0, phase: 0 }) },
  {
    name: 'Pulse (duty)',
    usesDuty: true,
    // centered pulse: (2 sin(πkd)/(πk)) cos(kθ)
    coef: (k, { duty }) => ({ a: (2 * Math.sin(Math.PI * k * duty)) / (Math.PI * k), phase: HALF }),
  },
  { name: 'Sawtooth', coef: k => ({ a: 2 / (Math.PI * k), phase: k % 2 ? 0 : Math.PI }) },
  { name: 'Reverse sawtooth', coef: k => ({ a: 2 / (Math.PI * k), phase: k % 2 ? Math.PI : 0 }) },
  {
    name: 'Triangle',
    coef: k => ({
      a: k % 2 ? 8 / (Math.PI * Math.PI * k * k) : 0,
      phase: ((k - 1) / 2) % 2 === 0 ? 0 : Math.PI,
    }),
  },
  {
    name: 'Full-wave rectified',
    coef: k => ({ a: k % 2 === 0 ? -4 / (Math.PI * (k * k - 1)) : 0, phase: HALF }),
  },
];

/** Build amplitudes (normalised so the biggest is 1) and phases for a preset. */
export function applyPreset(preset: Preset, n: number, p: PresetParams): Harmonics {
  const amps = new Array<number>(n).fill(0);
  const phases = new Array<number>(n).fill(0);
  let max = 0;
  const raw: { a: number; phase: number }[] = [];
  for (let k = 1; k <= n; k++) {
    if (k > p.count) { raw.push({ a: 0, phase: 0 }); continue; }
    let { a, phase } = preset.coef(k, p);
    if (a < 0) { a = -a; phase += Math.PI; }
    raw.push({ a, phase });
    max = Math.max(max, a);
  }
  raw.forEach(({ a, phase }, i) => {
    amps[i] = max > 0 ? a / max : 0;
    phases[i] = ((phase % TAU) + TAU) % TAU;
  });
  return { amps, phases };
}
