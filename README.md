# Harmonics

A browser app to explore additive sound synthesis and waveform shape.
You set the amplitude and phase of each harmonic. The app shows the sum
waveform and plays it on a piano keyboard.

Try it online: https://jgoizueta.github.io/harmonics/

I made this app to examine one fact about sound: the phase of each
harmonic changes the shape of the waveform, but for a steady tone the
ear hears almost no difference. Two waves with the same harmonic
amplitudes and different phases can look very different and sound
nearly the same.

To make sure of this yourself:

1. Load the square preset and play a note.
2. Move some phase sliders. The waveform changes shape.
3. Play the same note again. The timbre stays nearly the same.
4. Turn on **Randomize phases per note** and play notes. Each note gets a new shape, but nearly the same sound.

## Run the app

You need Node.js 18 or later.

1. Run `npm install`.
2. Run `npm run dev`.
3. Open the URL that Vite prints (usually `http://localhost:5173`).

Use Chrome or Edge if you want MIDI input. Other browsers play sound but
do not support Web MIDI.

To make a production build, run `npm run build`. The output goes to `dist/`.

## What it does

The sound is a sum of sine waves. Harmonic `k` has the frequency `k × f`,
where `f` is the pitch of the note:

    x(t) = Σ a_k · sin(2π·k·f·t + φ_k)

- **Amplitude `a_k`**: the vertical slider (top) in each column.
- **Phase `φ_k`**: the vertical slider (bottom) in each column, from 0 to 360 degrees. Double-click it to reset to 0.

The canvas above the sliders shows two periods of the result. It updates
when you move a slider. Phase changes the shape of the wave, but it does
not change the pitch. Phase changes also sound nearly the same for a
steady tone.

### Controls

| Control | Effect |
| --- | --- |
| Max harmonics | Number of harmonic columns, 1 to 128 (default 32). |
| Preset | Load a standard waveform (see below). |
| Harmonics used | How many harmonics a preset uses to approximate its shape. |
| Duty | Duty cycle of the pulse preset. |
| Clear | Set all amplitudes and phases to 0. |
| Randomize phases per note | Give each new note random phases. The phase sliders and the waveform change at each note. Notes that already sound keep their phases. Use it to hear if phase changes the timbre. |
| Volume, Attack, Release | Output level and note envelope. |

### Presets

Sine, square, pulse (with duty cycle), sawtooth, reverse sawtooth,
triangle, and full-wave rectified sine. A preset sets the amplitudes and
phases from the Fourier series of the ideal shape. Use fewer harmonics to
see the Gibbs ripple and a softer sound. Edit the sliders after you load
a preset to change it.

### Play notes

- **On-screen keyboard**: click or drag across the keys (C3 to C6).
- **Computer keyboard**: `a w s e d f t g y h u j k o l p ;` play the notes from C4. Press `z` or `x` to move down or up one octave.
- **MIDI keyboard**: connect it before you load the page. The app plays any note-on message with its velocity. The footer shows the detected devices.

Notes are polyphonic. If you change the harmonics while a note sounds,
the sound changes at once. The output is normalized, so all waveforms
have the same peak level.

## Code layout

| File | Content |
| --- | --- |
| `src/presets.ts` | Fourier coefficients for each preset. |
| `src/synth.ts` | Web Audio synth. Uses `PeriodicWave` for the harmonics, and one oscillator for each note. |
| `src/main.ts` | Interface: sliders, waveform canvas, keyboard, MIDI. |
| `src/style.css` | Styles, with light and dark themes. |

The app uses the Web Audio `PeriodicWave` and not Tone.js. `PeriodicWave`
accepts an amplitude and a phase for each harmonic. Tone.js oscillators
accept only amplitudes.

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the app
and publishes it to GitHub Pages at each push to `main`. To enable it, set
**Settings → Pages → Source** to **GitHub Actions** in the repository.

## License

MIT. See [LICENSE](LICENSE).
