// sound.js - a small WebAudio engine. Part 13 uses it for weather sounds
// (rain hiss, wind, night crickets). Everything is generated, no audio files needed.
// Browsers only allow sound after a tap, so Sound.unlock() is called on the first input.

import { state } from "../core/state.js";

let ctx = null;
let master = null;
const layers = {}; // name -> GainNode
const last = {};   // last level we set, so we only touch the audio graph when something changed

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

function build() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = state.settings.sound ? 0.5 : 0;
  master.connect(ctx.destination);
  const buf = noiseBuffer();

  // rain: bright hiss
  const rain = ctx.createGain(); rain.gain.value = 0;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1400;
  noiseSource(buf).connect(hp); hp.connect(rain); rain.connect(master);
  layers.rain = rain;

  // wind: low rumble that slowly rises and falls
  const wind = ctx.createGain(); wind.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 220;
  lfo.connect(lfoGain); lfoGain.connect(lp.frequency); lfo.start();
  noiseSource(buf).connect(lp); lp.connect(wind); wind.connect(master);
  layers.wind = wind;

  // night: soft crickets (a high tone chopped up by a fast wobble)
  const crickets = ctx.createGain(); crickets.gain.value = 0;
  const tone = ctx.createOscillator(); tone.frequency.value = 4300;
  const chop = ctx.createGain(); chop.gain.value = 0;
  const chopLfo = ctx.createOscillator(); chopLfo.frequency.value = 9;
  const chopDepth = ctx.createGain(); chopDepth.gain.value = 0.5;
  chopLfo.connect(chopDepth); chopDepth.connect(chop.gain);
  tone.connect(chop); chop.connect(crickets); crickets.connect(master);
  tone.start(); chopLfo.start();
  layers.crickets = crickets;
}

function setLayer(name, level) {
  if (!ctx || !layers[name]) return;
  if (Math.abs((last[name] ?? -1) - level) < 0.005) return;
  last[name] = level;
  layers[name].gain.setTargetAtTime(level, ctx.currentTime, 0.6);
}

export const Sound = {
  // Call from a tap or key press (browsers block sound until then)
  unlock() {
    if (!ctx) build();
    if (ctx && ctx.state === "suspended") ctx.resume();
  },

  setEnabled(on) {
    state.settings.sound = on;
    if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.2);
  },

  // Called every frame by the weather. intensity fades 0..1 as weather changes.
  setWeather(type, intensity, nightAmt = 0) {
    setLayer("rain", type === "rain" ? 0.14 * intensity : 0);
    const windLevel = { wind: 0.2, snow: 0.07, mist: 0.03, rain: 0.04 }[type] || 0.015;
    setLayer("wind", windLevel * intensity);
    setLayer("crickets", type === "rain" || type === "snow" ? 0 : 0.012 * nightAmt + (type === "fireflies" ? 0.01 * intensity : 0));
  },
};
