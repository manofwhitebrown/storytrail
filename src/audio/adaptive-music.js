// adaptive-music.js - Part 23. Music that is never the same twice, and never in a hurry.
//
// No recordings: a slow pad of three soft voices changes chord every ~20 seconds, and now and then a single
// plucked note drifts in, followed by a quiet echo. What it plays follows where you are and what the day is doing:
//
//   PLACE    each place has its own little scale (see PLACES)
//   TIME     dawn lifts, midday is brightest, dusk slows down, night drops an octave and thins out
//   WEATHER  rain muffles it, mist lowers it, wind leaves long silences, snow turns it to bells, fireflies twinkle
//   CAMP     just the pad and a few low notes, like humming by a fire
//   PANELS   it steps back a little while an event or a menu is open
//
// Every note comes from the pentatonic scale of the place (five notes with no clashes), so any note
// can follow any other. Quiet mode (Part 24) makes it softer and sparser.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { pick, rand } from "../core/util.js";
import { Camp } from "../progression/camp.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Weather } from "../world/weather.js";
import { World } from "../world/world.js";
import { biomeWeightsAt } from "../world/biomes/index.js";
import { Sound } from "./sound.js";
import { midiToFreq, note } from "./synth.js";

// root = MIDI note of the home note. scale = semitones above it. style changes how melody notes behave.
export const PLACES = {
  forest:     { root: 50, scale: [0, 2, 4, 7, 9],  style: "drift" },  // D E F# A B      warm, rounded
  meadow:     { root: 55, scale: [0, 2, 4, 7, 9],  style: "drift", bright: 0.15 }, // G A B D E   open, sunny
  mountains:  { root: 57, scale: [0, 3, 5, 7, 10], style: "sparse" }, // A C D E G       wide, thin, lonely
  snowfields: { root: 60, scale: [0, 2, 4, 6, 7],  style: "bell" },   // C D E F# G      glassy
  desert:     { root: 52, scale: [0, 2, 3, 7, 8],  style: "sparse" }, // E F# G B C      dry, still
  coast:      { root: 53, scale: [0, 2, 4, 7, 9],  style: "arp" },    // F G A C D       rolling
};

const PROGRESSION = [0, 3, 1, 4, 2]; // chord roots, as scale degrees. Order is shuffled as it goes.

let ctx = null;
let input = null;      // everything musical goes through here (fades in at the start)
let duck = null;       // dips while panels are open
let echoIn = null;     // melody notes also feed a quiet echo
let started = false;
let chordTimer = 0, noteTimer = 3;
let degree = 0, melodyDegree = 2, placeId = "forest";

const pitch = (place, deg) => {
  const n = place.scale.length;
  const oct = Math.floor(deg / n);
  return place.root + place.scale[((deg % n) + n) % n] + 12 * oct;
};

function build() {
  ctx = Sound.context;
  input = ctx.createGain();
  input.gain.value = 0.0001;
  duck = ctx.createGain();
  duck.gain.value = 1;
  input.connect(duck);
  duck.connect(Sound.bus("music"));

  // a cheap, soft echo: delay -> low-pass -> back into the delay
  echoIn = ctx.createGain();
  echoIn.gain.value = 0.5;
  const delay = ctx.createDelay(1.5);
  delay.delayTime.value = 0.46;
  const fb = ctx.createGain(); fb.gain.value = 0.38;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
  echoIn.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
  lp.connect(input);
}

// What the world is like right now, as numbers the music can use
export function mood() {
  const w = biomeWeightsAt(World.pos());
  const id = Object.keys(w).reduce((a, b) => (w[b] > w[a] ? b : a));
  const phase = TimeOfDay.phase;
  const weather = Weather.type;
  const camp = Camp.active;
  const quiet = Sound.isQuiet();

  const timeGap = { dawn: 1, noon: 0.8, dusk: 1.25, night: 1.7 }[phase] ?? 1;
  const weatherGap = { rain: 1.3, mist: 1.4, wind: 1.9, snow: 1.2, fireflies: 0.9, clear: 1 }[weather] ?? 1;
  const gapScale = timeGap * weatherGap * (camp ? 1.5 : 1) * (quiet ? 1.5 : 1);

  const bright = Math.min(1, 0.25 + 0.7 * TimeOfDay.dayAmt + (PLACES[id].bright || 0) - (weather === "rain" ? 0.3 : 0) - (weather === "mist" ? 0.15 : 0));
  return {
    id, place: PLACES[id], phase, weather, camp, gapScale, bright,
    // melody sits one octave lower at night, at camp and in mist
    octaves: phase === "night" || camp || weather === "mist" ? 1 : 2,
    cutoff: 700 + 3600 * bright,
    padGain: (phase === "night" ? 0.7 : 1) * (weather === "wind" ? 1.2 : 1),
  };
}

function playChord(m, { swell = false } = {}) {
  const p = m.place;
  const root = PROGRESSION[Math.floor(Math.random() * PROGRESSION.length)];
  degree = root === degree ? (root + 2) % 5 : root;
  const seconds = CONFIG.MUSIC_CHORD_SECONDS;
  const dur = (swell ? 7 : seconds + 7);
  const attack = swell ? 1.2 : 6;
  const t0 = ctx.currentTime + 0.05;

  // three voices a "third" apart (every other note of the scale), plus a low root
  for (const [i, d] of [degree, degree + 2, degree + 4].entries()) {
    note(ctx, input, { freq: midiToFreq(pitch(p, d + 5)), start: t0, dur, attack, type: "triangle", gain: 0.048 * m.padGain, cutoff: m.cutoff * 0.7, detune: (i - 1) * 4 });
  }
  note(ctx, input, { freq: midiToFreq(pitch(p, degree)), start: t0, dur, attack, type: "sine", gain: 0.07 * m.padGain, cutoff: 500 });
}

function playMelody(m) {
  const p = m.place;
  // wander: mostly small steps, sometimes a leap, never leave the register
  melodyDegree += pick([-2, -1, -1, 0, 1, 1, 2]);
  melodyDegree = Math.max(0, Math.min(6, melodyDegree));
  const base = 12 * m.octaves;
  const t0 = ctx.currentTime + 0.05;
  const gain = 0.085 * (m.camp ? 0.75 : 1);

  const sing = (deg, delay, long = 1) => {
    const f = midiToFreq(pitch(p, deg) + base);
    const dur = rand(2.4, 4) * long;
    note(ctx, input, { freq: f, start: t0 + delay, dur, gain, attack: p.style === "bell" ? 0.006 : 0.04, cutoff: m.cutoff, type: "sine", extra: [echoIn] });
    if (p.style === "bell") note(ctx, input, { freq: f * 2.76, start: t0 + delay, dur: dur * 0.4, gain: gain * 0.22, attack: 0.004, cutoff: 6000 }); // a glassy overtone
  };

  if (p.style === "arp") {
    // a slow rolling figure, like a wave coming in
    const start = melodyDegree;
    [0, 1, 2].forEach((k, i) => sing(start + k, i * 0.55, 0.8));
  } else {
    sing(melodyDegree, 0);
    if (m.weather === "fireflies" && Math.random() < 0.6) sing(melodyDegree + pick([1, 2]), rand(0.25, 0.6), 0.5); // a twinkle
  }
}

export const AdaptiveMusic = {
  init() {
    Sound.onReady(() => build());

    // Step back while a menu or an event is open; come forward again after
    bus.on("panel:open", () => { if (duck) duck.gain.setTargetAtTime(0.6, ctx.currentTime, 0.6); });
    bus.on("panel:close", () => { if (duck) duck.gain.setTargetAtTime(1, ctx.currentTime, 0.8); });
    bus.on("biome:enter", () => { chordTimer = Math.min(chordTimer, 0.5); }); // new place, new chord

    // the story ends on a warm chord
    bus.on("story:ended", () => { if (ctx && this.enabled()) playChord(mood(), { swell: true }); });
  },

  enabled: () => Sound.ready && state.settings.sound && (state.settings.volume?.music ?? 1) > 0.01,

  update(dt) {
    if (!ctx || !this.enabled()) return;
    if (!started) { // fade in over a few seconds so the music arrives, rather than starts
      started = true;
      input.gain.setTargetAtTime(1, ctx.currentTime, 2.5);
    }
    const m = mood();
    placeId = m.id;

    chordTimer -= dt;
    if (chordTimer <= 0) {
      chordTimer = CONFIG.MUSIC_CHORD_SECONDS * rand(0.85, 1.15);
      playChord(m);
    }

    noteTimer -= dt;
    if (noteTimer <= 0) {
      const [lo, hi] = CONFIG.MUSIC_NOTE_GAP;
      const style = m.place.style === "sparse" ? 1.5 : 1;
      noteTimer = rand(lo, hi) * m.gapScale * style;
      playMelody(m);
    }
  },

  // for tests and ?debug
  current: () => ({ place: placeId, ...(ctx ? { degree, melodyDegree } : {}) }),
};

