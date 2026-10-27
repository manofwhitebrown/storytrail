// sound.js - the WebAudio engine. Everything is generated in code, no audio files needed.
//
// Part 13 built this for weather sounds (rain hiss, wind, night crickets). Part 23 grew it into
// a small mixer that the other audio files share:
//
//     music.js ----> [music bus]    --\
//     ambience.js -> [ambience bus] ---+--> [master] -> [limiter] -> speakers
//     sfx.js ------> [sfx bus]      --/
//
// Browsers only allow sound after the first tap or key press, so Sound.unlock() is called then.
// Other files use Sound.onReady(fn): fn runs once the engine exists (right away if it already does).

import { state } from "../core/state.js";

let ctx = null;
let master = null;
let meterNode = null;
let noise = null;
let quiet = false;
const buses = {};      // "music" | "ambience" | "sfx" -> GainNode
const layers = {};     // weather layer name -> GainNode
const last = {};       // last level we set, so we only touch the audio graph when something changed
const readyFns = [];

// Quiet mode (Part 24) turns effects off and softens the rest. These are the multipliers.
const QUIET = { music: 0.55, ambience: 0.7, sfx: 0 };
const MASTER = 0.5;

function noiseBuffer(seconds = 2) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function noiseSource(buf) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

function busLevel(name) {
  if (!state.settings.sound) return 0;
  const v = state.settings.volume?.[name] ?? 1;
  return v * (quiet ? QUIET[name] : 1);
}

function build() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();

  // master -> limiter. The limiter is a safety net: however many sounds stack up, nothing clips.
  master = ctx.createGain();
  master.gain.value = MASTER;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 12;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  // A tiny level meter, used by tests and ?debug to check loudness without ears
  meterNode = ctx.createAnalyser();
  meterNode.fftSize = 1024;
  limiter.connect(meterNode);

  for (const name of ["music", "ambience", "sfx"]) {
    buses[name] = ctx.createGain();
    buses[name].gain.value = busLevel(name);
    buses[name].connect(master);
  }

  const buf = noiseBuffer();
  noise = buf;
  const ambience = buses.ambience;

  // rain: bright hiss
  const rain = ctx.createGain(); rain.gain.value = 0;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1400;
  noiseSource(buf).connect(hp); hp.connect(rain); rain.connect(ambience);
  layers.rain = rain;

  // wind: low rumble that slowly rises and falls
  const wind = ctx.createGain(); wind.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 220;
  lfo.connect(lfoGain); lfoGain.connect(lp.frequency); lfo.start();
  noiseSource(buf).connect(lp); lp.connect(wind); wind.connect(ambience);
  layers.wind = wind;

  // night: soft crickets (a high tone chopped up by a fast wobble)
  const crickets = ctx.createGain(); crickets.gain.value = 0;
  const tone = ctx.createOscillator(); tone.frequency.value = 4300;
  const chop = ctx.createGain(); chop.gain.value = 0;
  const chopLfo = ctx.createOscillator(); chopLfo.frequency.value = 9;
  const chopDepth = ctx.createGain(); chopDepth.gain.value = 0.5;
  chopLfo.connect(chopDepth); chopDepth.connect(chop.gain);
  tone.connect(chop); chop.connect(crickets); crickets.connect(ambience);
  tone.start(); chopLfo.start();
  layers.crickets = crickets;

  // Nobody should hear rain from a tab they aren't looking at
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  for (const fn of readyFns.splice(0)) {
    try { fn(); } catch (err) { console.error("[sound] onReady listener failed", err); }
  }
}

function setLayer(name, level) {
  if (!ctx || !layers[name]) return;
  if (Math.abs((last[name] ?? -1) - level) < 0.005) return;
  last[name] = level;
  layers[name].gain.setTargetAtTime(level, ctx.currentTime, 0.6);
}

function applyLevels(fast = false) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const k = fast ? 0.05 : 0.35;
  for (const name of Object.keys(buses)) buses[name].gain.setTargetAtTime(busLevel(name), t, k);
}

export const Sound = {
  // Call from a tap or key press (browsers block sound until then)
  unlock() {
    if (!ctx) build();
    if (ctx && ctx.state === "suspended") ctx.resume();
  },

  // Run fn once the engine exists. Safe to call before the first tap.
  onReady(fn) {
    if (ctx) fn(); else readyFns.push(fn);
  },

  get ready() { return !!ctx; },
  get context() { return ctx; },
  bus: (name) => buses[name],
  noise: () => noise,
  now: () => (ctx ? ctx.currentTime : 0),

  setEnabled(on) {
    state.settings.sound = on;
    applyLevels();
  },

  // name: "music" | "ambience" | "sfx", v: 0..1
  setVolume(name, v) {
    state.settings.volume[name] = Math.max(0, Math.min(1, v));
    applyLevels();
  },

  // Quiet mode: no effects, softer music and ambience
  setQuiet(on) {
    quiet = !!on;
    applyLevels();
  },
  isQuiet: () => quiet,

  // 0..1 loudness right now (RMS) and the highest sample, for tests and ?debug
  meter() {
    if (!meterNode) return { rms: 0, peak: 0 };
    const data = new Float32Array(meterNode.fftSize);
    meterNode.getFloatTimeDomainData(data);
    let sum = 0, peak = 0;
    for (const v of data) { sum += v * v; peak = Math.max(peak, Math.abs(v)); }
    return { rms: Math.sqrt(sum / data.length), peak };
  },

  // Called every frame by the weather. intensity fades 0..1 as weather changes.
  setWeather(type, intensity, nightAmt = 0) {
    setLayer("rain", type === "rain" ? 0.14 * intensity : 0);
    const windLevel = { wind: 0.2, snow: 0.07, mist: 0.03, rain: 0.04 }[type] || 0.015;
    setLayer("wind", windLevel * intensity);
    setLayer("crickets", type === "rain" || type === "snow" ? 0 : 0.012 * nightAmt + (type === "fireflies" ? 0.01 * intensity : 0));
  },
};
