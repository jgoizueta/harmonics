import './style.css';
import { PRESETS, applyPreset, type Harmonics } from './presets';
import { Synth } from './synth';

const TAU = Math.PI * 2;
const synth = new Synth();

let maxN = 32;
let h: Harmonics = { amps: [], phases: [] };

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header>
    <h1>Harmonics</h1>
    <label>Max harmonics <input id="maxN" type="number" min="1" max="128" value="${maxN}"></label>
    <label>Preset <select id="preset">${PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}</select></label>
    <label>Harmonics used <input id="count" type="range" min="1" max="${maxN}" value="${maxN}"><output id="countOut"></output></label>
    <label id="dutyWrap">Duty <input id="duty" type="range" min="0.01" max="0.99" step="0.01" value="0.25"><output id="dutyOut"></output></label>
    <button id="clear">Clear</button>
    <label title="New random phases for every new note, to hear the effect of phase on timbre"><input id="rndPhase" type="checkbox"> Randomize phases per note</label>
    <label>Volume <input id="vol" type="range" min="0" max="1" step="0.01" value="0.4"></label>
    <label>Attack <input id="atk" type="range" min="0.002" max="1" step="0.001" value="0.01"></label>
    <label>Release <input id="rel" type="range" min="0.01" max="3" step="0.01" value="0.25"></label>
  </header>
  <canvas id="wave" width="1200" height="240"></canvas>
  <section id="harm"></section>
  <section id="kb"></section>
  <footer id="midi">MIDI: checking…</footer>
`;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- waveform view ----------
const canvas = $<HTMLCanvasElement>('wave');
const g = canvas.getContext('2d')!;
function css(v: string) { return getComputedStyle(document.documentElement).getPropertyValue(v); }

function drawWave() {
  const { width: W, height: H } = canvas;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = css('--grid'); g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2);
  for (let i = 1; i < 4; i++) { g.moveTo((W * i) / 4, 0); g.lineTo((W * i) / 4, H); }
  g.stroke();

  const N = 800, periods = 2;
  const ys = new Float32Array(N);
  let peak = 1e-9;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * periods * TAU;
    let y = 0;
    for (let k = 0; k < h.amps.length; k++) y += h.amps[k] * Math.sin((k + 1) * th + h.phases[k]);
    ys[i] = y;
    peak = Math.max(peak, Math.abs(y));
  }
  g.strokeStyle = css('--accent'); g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * W, y = H / 2 - (ys[i] / peak) * (H / 2 - 12);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
}

function update() {
  synth.setHarmonics(h);
  drawWave();
}

// ---------- harmonic sliders ----------
const harmEl = $('harm');
const ampInputs: HTMLInputElement[] = [];
const phaseInputs: HTMLInputElement[] = [];

function buildHarmonics() {
  harmEl.innerHTML = '';
  ampInputs.length = phaseInputs.length = 0;
  for (let k = 0; k < maxN; k++) {
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `<input class="amp" type="range" min="0" max="1" step="0.001" title="amplitude" orient="vertical">
      <input class="phase" type="range" min="0" max="360" step="1" title="phase (deg)" orient="vertical">
      <span>${k + 1}</span>`;
    const [a, p] = col.querySelectorAll('input');
    a.addEventListener('input', () => { h.amps[k] = +a.value; update(); });
    p.addEventListener('input', () => { h.phases[k] = (+p.value * Math.PI) / 180; update(); });
    p.addEventListener('dblclick', () => { p.value = '0'; h.phases[k] = 0; update(); });
    ampInputs.push(a); phaseInputs.push(p);
    harmEl.appendChild(col);
  }
}

function syncSliders() {
  for (let k = 0; k < maxN; k++) {
    ampInputs[k].value = String(h.amps[k]);
    phaseInputs[k].value = String(Math.round((h.phases[k] * 180) / Math.PI) % 360);
  }
}

/** New random phases for the next note only; notes already sounding keep their wave. */
function randomizePhases() {
  h.phases = h.phases.map(() => Math.random() * TAU);
  syncSliders();
  drawWave();
  synth.setHarmonics(h, false);
}

function setHarmonics(next: Harmonics) { h = next; syncSliders(); update(); }

// ---------- header controls ----------
const presetSel = $<HTMLSelectElement>('preset');
const countIn = $<HTMLInputElement>('count');
const dutyIn = $<HTMLInputElement>('duty');

function loadPreset() {
  const preset = PRESETS[+presetSel.value];
  $('dutyWrap').style.visibility = preset.usesDuty ? 'visible' : 'hidden';
  $('countOut').textContent = countIn.value;
  $('dutyOut').textContent = dutyIn.value;
  setHarmonics(applyPreset(preset, maxN, { count: +countIn.value, duty: +dutyIn.value }));
}
presetSel.addEventListener('change', loadPreset);
countIn.addEventListener('input', loadPreset);
dutyIn.addEventListener('input', loadPreset);

$('maxN').addEventListener('change', e => {
  maxN = Math.min(128, Math.max(1, Math.round(+(e.target as HTMLInputElement).value) || 1));
  (e.target as HTMLInputElement).value = String(maxN);
  const old = h;
  countIn.max = String(maxN);
  countIn.value = String(Math.min(+countIn.value, maxN));
  buildHarmonics();
  h = {
    amps: Array.from({ length: maxN }, (_, i) => old.amps[i] ?? 0),
    phases: Array.from({ length: maxN }, (_, i) => old.phases[i] ?? 0),
  };
  $('countOut').textContent = countIn.value;
  syncSliders(); update();
});
$('clear').addEventListener('click', () =>
  setHarmonics({ amps: new Array(maxN).fill(0), phases: new Array(maxN).fill(0) }));
$('vol').addEventListener('input', e => (synth.volume = +(e.target as HTMLInputElement).value));
$('atk').addEventListener('input', e => (synth.attack = +(e.target as HTMLInputElement).value));
$('rel').addEventListener('input', e => (synth.release = +(e.target as HTMLInputElement).value));

// ---------- on-screen keyboard ----------
const FIRST = 48, LAST = 84; // C3..C6
const BLACK = new Set([1, 3, 6, 8, 10]);
const kbEl = $('kb');
const keyEls = new Map<number, HTMLElement>();
const held = new Map<number, Set<string>>(); // note -> sources holding it

function press(note: number, src: string, vel = 1) {
  let s = held.get(note);
  if (!s) held.set(note, (s = new Set()));
  if (s.has(src)) return;
  s.add(src);
  if (s.size === 1) {
    if ($<HTMLInputElement>('rndPhase').checked) randomizePhases();
    synth.noteOn(note, vel); keyEls.get(note)?.classList.add('down');
  }
}
function release(note: number, src: string) {
  const s = held.get(note);
  if (!s || !s.delete(src)) return;
  if (s.size === 0) { held.delete(note); synth.noteOff(note); keyEls.get(note)?.classList.remove('down'); }
}

const whites = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i).filter(n => !BLACK.has(n % 12));
kbEl.style.setProperty('--whites', String(whites.length));
for (let n = FIRST; n <= LAST; n++) {
  const el = document.createElement('div');
  const black = BLACK.has(n % 12);
  el.className = 'key ' + (black ? 'black' : 'white');
  const wi = whites.filter(w => w < n).length;
  el.style.left = black ? `calc(${wi} * 100% / var(--whites) - 0.3 * 100% / var(--whites))` : `calc(${wi} * 100% / var(--whites))`;
  if (n % 12 === 0) el.textContent = `C${n / 12 - 1}`;
  el.addEventListener('pointerdown', e => { e.preventDefault(); (el as HTMLElement).releasePointerCapture(e.pointerId); press(n, 'mouse'); });
  el.addEventListener('pointerenter', e => { if (e.buttons & 1) press(n, 'mouse'); });
  el.addEventListener('pointerup', () => release(n, 'mouse'));
  el.addEventListener('pointerleave', () => release(n, 'mouse'));
  keyEls.set(n, el);
  kbEl.appendChild(el);
}
window.addEventListener('pointerup', () => { for (const n of [...held.keys()]) release(n, 'mouse'); });

// computer keyboard: a w s e d f t g y h u j k o l p ; → semitones from C4
const KEYMAP = 'awsedftgyhujkolp;';
let octave = 0;
const down = new Map<string, number>();
window.addEventListener('keydown', e => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
  if (e.key === 'z') { octave = Math.max(-2, octave - 1); return; }
  if (e.key === 'x') { octave = Math.min(2, octave + 1); return; }
  const i = KEYMAP.indexOf(e.key);
  if (i < 0) return;
  const note = 60 + octave * 12 + i;
  down.set(e.key, note);
  press(note, 'key:' + e.key);
});
window.addEventListener('keyup', e => {
  const note = down.get(e.key);
  if (note === undefined) return;
  down.delete(e.key);
  release(note, 'key:' + e.key);
});

// ---------- MIDI ----------
const midiEl = $('midi');
async function initMidi() {
  if (!navigator.requestMIDIAccess) { midiEl.textContent = 'MIDI: Web MIDI not supported in this browser (try Chrome or Edge)'; return; }
  try {
    const access = await navigator.requestMIDIAccess();
    const wire = () => {
      const names: string[] = [];
      access.inputs.forEach(inp => {
        names.push(inp.name ?? inp.id);
        inp.onmidimessage = m => {
          const [st, n, v] = m.data!;
          const cmd = st & 0xf0;
          if (cmd === 0x90 && v > 0) press(n, 'midi', v / 127);
          else if (cmd === 0x80 || cmd === 0x90) release(n, 'midi');
          else if (cmd === 0xb0 && n === 123) { synth.allOff(); }
        };
      });
      midiEl.textContent = 'MIDI: ' + (names.length ? names.join(', ') : 'no input devices');
    };
    access.onstatechange = wire;
    wire();
  } catch {
    midiEl.textContent = 'MIDI: access denied';
  }
}

// ---------- start ----------
buildHarmonics();
presetSel.value = '1'; // square
loadPreset();
void initMidi();
