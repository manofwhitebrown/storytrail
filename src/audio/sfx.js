// sfx.js - Part 23. Small, soft sounds for the things that happen.
//
// The rules: nothing is louder than the ambience, nothing has a hard edge, nothing repeats so fast it
// becomes noise, and every sound can be switched off (Menu -> Sound -> Effects, or Quiet mode).
// All of it is made from filtered noise and soft sine notes, so no audio files are needed.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { rand } from "../core/util.js";
import { biomeAt } from "../world/biomes/index.js";
import { Sound } from "./sound.js";
import { midiToFreq, note, puff } from "./synth.js";

// C major pentatonic, the notes every effect picks from (they never clash with the music)
const C5 = 72, D5 = 74, E5 = 76, G5 = 79, A5 = 81, C6 = 84;

const NOTE_MAKEUP = 1.8; // effect notes sit just under the music, not far below it (see Sound.meter())
const lastPlayed = {};
let foot = 0; // alternates the footstep between left and right ears

// What the ground sounds like in each place: [filter, frequency, length, loudness, steps per tap]
const GROUND = {
  forest:     ["bandpass", 1800, 0.09, 0.05, 1],  // dry leaves
  meadow:     ["bandpass", 1100, 0.12, 0.04, 1],  // grass brushing boots
  mountains:  ["highpass", 2300, 0.05, 0.045, 1], // small stones
  snowfields: ["bandpass", 3200, 0.16, 0.05, 2],  // crunch, crunch
  desert:     ["highpass", 900, 0.18, 0.035, 1],  // sand, shh
  coast:      ["bandpass", 2400, 0.06, 0.04, 2],  // shingle
};

function ready(name) {
  if (!Sound.ready || !state.settings.sound) return false;
  if ((state.settings.volume?.sfx ?? 1) <= 0.01 || Sound.isQuiet()) return false;
  const t = performance.now();
  if (t - (lastPlayed[name] || 0) < CONFIG.SFX_MIN_GAP_MS) return false; // never machine-gun a sound
  lastPlayed[name] = t;
  return true;
}

// a sequence of soft notes: notes([[midi, delay], ...], opts)
function notes(list, opts = {}) {
  const ctx = Sound.context, out = Sound.bus("sfx");
  const t0 = ctx.currentTime + 0.01;
  for (const [midi, delay] of list) {
    note(ctx, out, { freq: midiToFreq(midi), start: t0 + delay, dur: 0.5, gain: 0.05 * NOTE_MAKEUP, attack: 0.012, cutoff: 3500, ...opts, ...(opts.gain ? { gain: opts.gain * NOTE_MAKEUP } : {}) });
  }
}

const SOUNDS = {
  step() {
    const ctx = Sound.context;
    const [type, freq, dur, gain, count] = GROUND[biomeAt(state.steps).id];
    const pan = ctx.createStereoPanner();
    pan.pan.value = (foot++ % 2 ? 1 : -1) * 0.15;
    pan.connect(Sound.bus("sfx"));
    for (let i = 0; i < count; i++) {
      puff(ctx, pan, Sound.noise(), { start: ctx.currentTime + i * 0.05, dur, gain: gain * rand(0.8, 1.1), type, freq: freq * rand(0.85, 1.15), q: 0.9 });
    }
  },

  // every 10 steps: the faintest tick. Other sources (events, landmarks) get a proper chime.
  token({ n, source }) {
    if (source === "walk") return notes([[C6, 0]], { gain: 0.022, dur: 0.3 });
    notes(n >= 3 ? [[C5, 0], [E5, 0.1], [G5, 0.2]] : [[E5, 0], [G5, 0.1]]);
  },

  item() {
    const ctx = Sound.context;
    note(ctx, Sound.bus("sfx"), { freq: 420, glideTo: 760, dur: 0.14, gain: 0.06 * NOTE_MAKEUP, attack: 0.008 });
  },

  page() { // a page turning, then three rising notes
    const ctx = Sound.context;
    puff(ctx, Sound.bus("sfx"), Sound.noise(), { dur: 0.22, gain: 0.05, type: "bandpass", freq: 4200, q: 0.5, attack: 0.04 });
    notes([[C5, 0.1], [E5, 0.22], [G5, 0.34]], { gain: 0.04 });
  },

  letter() {
    const ctx = Sound.context;
    puff(ctx, Sound.bus("sfx"), Sound.noise(), { dur: 0.3, gain: 0.04, type: "bandpass", freq: 3000, q: 0.4, attack: 0.08 });
    notes([[A5, 0.15], [E5, 0.3]], { gain: 0.04 });
  },

  landmark() { notes([[C5 - 12, 0], [E5 - 12, 0.18], [G5 - 12, 0.36], [C5, 0.54]], { type: "triangle", dur: 1.3, gain: 0.055, attack: 0.03 }); },

  secret() { // sparkles
    const picks = [C6, C6 + 4, C6 + 7, C6 + 12, G5, E5 + 12];
    notes(picks.map((m, i) => [m, i * 0.07 + rand(0, 0.03)]), { dur: 0.7, gain: 0.025, attack: 0.006 });
  },

  achievement() { notes([[C6, 0], [E5 + 12, 0.14]], { dur: 1.8, gain: 0.04, attack: 0.01 }); },

  collection() { notes([[G5, 0], [D5 + 12, 0.09]], { dur: 0.5, gain: 0.03 }); },

  memory() { notes([[G5 - 12, 0]], { dur: 0.9, gain: 0.03, attack: 0.05 }); },

  panelOpen() { notes([[D5 - 12, 0]], { dur: 0.15, gain: 0.02, attack: 0.01, cutoff: 1500 }); },
  panelClose() { notes([[A5 - 24, 0]], { dur: 0.15, gain: 0.018, attack: 0.01, cutoff: 1200 }); },

  campEnter() { // a match, then a low whoosh of flame
    const ctx = Sound.context, out = Sound.bus("sfx");
    puff(ctx, out, Sound.noise(), { dur: 0.12, gain: 0.025, type: "highpass", freq: 3000, attack: 0.003 });
    puff(ctx, out, Sound.noise(), { start: ctx.currentTime + 0.18, dur: 0.7, gain: 0.02, type: "lowpass", freq: 500, attack: 0.25 });
  },
  campLeave() { notes([[G5 - 12, 0], [D5 - 12, 0.2]], { dur: 0.7, gain: 0.03, attack: 0.05, cutoff: 1200 }); },

  bond() { notes([[E5 - 12, 0], [G5 - 12, 0.18], [C5, 0.36]], { type: "triangle", dur: 0.9, gain: 0.045, attack: 0.04 }); },

  ending() { notes([[C5 - 12, 0], [G5 - 12, 0.4], [C5, 0.8], [E5, 1.2], [G5, 1.6]], { dur: 5, gain: 0.04, attack: 0.6, cutoff: 2500 }); },

  welcome() { notes([[G5 - 12, 0], [C5, 0.25], [E5, 0.5], [G5, 0.75]], { type: "triangle", dur: 1.6, gain: 0.045, attack: 0.04 }); },
};

export const SFX = {
  play(name, data) {
    if (!SOUNDS[name] || !ready(name)) return;
    try { SOUNDS[name](data); } catch (err) { console.warn("[sfx]", name, err); }
  },

  init() {
    const on = (evt, name, wrap) => bus.on(evt, (d) => this.play(name, wrap ? wrap(d) : d));
    on("step", "step");
    on("tokens", "token");
    on("item:gained", "item");
    on("story:page", "page");
    on("letter:received", "letter");
    on("landmark:found", "landmark");
    on("secret:found", "secret");
    on("achievement", "achievement");
    on("collection:added", "collection");
    on("memory:added", "memory");
    on("panel:open", "panelOpen");
    on("panel:close", "panelClose");
    on("camp:enter", "campEnter");
    on("camp:leave", "campLeave");
    on("companion:level", "bond");
    on("story:ended", "ending");
    on("welcome:back", "welcome");
  },

  names: () => Object.keys(SOUNDS), // for tests
};
