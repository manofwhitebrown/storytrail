// ambience.js - Part 23. The sound of the place you're standing in.
//
// sound.js already does weather (rain, wind) and night crickets. This adds what each PLACE sounds like,
// and crossfades between them exactly as the scenery does:
//   forest / meadow   birdsong by day (a dawn chorus at dawn), a brook (louder near the Old Bridge), owls at night
//   mountains         a little birdsong, thin air
//   desert            a dry, whistling breath of sand
//   coast             slow waves (a little louder near the lighthouse)
//   camp              a crackling fire, and the rest of the world turned down
// Rain, wind and snow quiet the birds; winter freezes the brook.

import { bus } from "../core/event-bus.js";
import { rand } from "../core/util.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Weather } from "../world/weather.js";
import { World } from "../world/world.js";
import { LOOP_STEPS, biomeWeightsAt } from "../world/biomes/index.js";
import { note, puff } from "./synth.js";
import { Sound } from "./sound.js";

const nodes = {};          // name -> GainNode
const lastLevel = {};
let atCamp = false;
let birdTimer = 2, owlTimer = 12, popTimer = 0.2;

// 1 right at a spot on the road, fading to 0 over `radius` steps either side
function nearness(at, radius) {
  let d = Math.abs((World.pos() % LOOP_STEPS) - at);
  d = Math.min(d, LOOP_STEPS - d);
  return Math.max(0, 1 - d / radius);
}

function loopNoise(ctx, buf, chain) {
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true; src.start();
  let node = src;
  for (const n of chain) { node.connect(n); node = n; }
  return node;
}

function filter(ctx, type, freq, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  return f;
}

function lfo(ctx, rate, depth, target) {
  const o = ctx.createOscillator(); o.frequency.value = rate;
  const g = ctx.createGain(); g.gain.value = depth;
  o.connect(g); g.connect(target); o.start();
}

function build() {
  const ctx = Sound.context;
  const buf = Sound.noise();
  const out = Sound.bus("ambience");
  const layer = (name) => { const g = ctx.createGain(); g.gain.value = 0; g.connect(out); nodes[name] = g; return g; };

  // waves: low noise whose loudness swells and ebbs on two slow, unrelated rhythms
  const waves = layer("waves");
  const swell = ctx.createGain(); swell.gain.value = 0.55;
  lfo(ctx, 0.09, 0.4, swell.gain); lfo(ctx, 0.137, 0.25, swell.gain);
  loopNoise(ctx, buf, [filter(ctx, "lowpass", 650), swell, waves]);

  // brook: mid noise, shaken by two quick wobbles so it burbles
  const brook = layer("brook");
  const burble = ctx.createGain(); burble.gain.value = 0.6;
  lfo(ctx, 5.1, 0.25, burble.gain); lfo(ctx, 8.3, 0.18, burble.gain);
  loopNoise(ctx, buf, [filter(ctx, "bandpass", 1500, 0.9), burble, brook]);

  // desert: a narrow band of noise whose pitch drifts, like wind over a bottle neck
  const sand = layer("sand");
  const band = filter(ctx, "bandpass", 900, 7);
  lfo(ctx, 0.07, 380, band.frequency); lfo(ctx, 0.19, 120, band.frequency);
  loopNoise(ctx, buf, [band, sand]);

  // fire: a warm low rumble (the crackles are scheduled in update)
  const fire = layer("fire");
  loopNoise(ctx, buf, [filter(ctx, "lowpass", 260), fire]);

  layer("birds");
  layer("owls");
  layer("crackle");
}

function setLevel(name, level) {
  const node = nodes[name];
  if (!node) return;
  if (Math.abs((lastLevel[name] ?? -1) - level) < 0.002) return;
  lastLevel[name] = level;
  node.gain.setTargetAtTime(level, Sound.context.currentTime, 0.8);
}

function chirp(level) {
  const ctx = Sound.context;
  const t0 = ctx.currentTime + 0.02;
  const base = rand(2300, 4200);
  const dir = Math.random() < 0.5 ? 1 : -1;
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const f = base * (1 + i * 0.04 * dir);
    note(ctx, nodes.birds, {
      freq: f, glideTo: f * (dir > 0 ? rand(1.12, 1.4) : rand(0.72, 0.9)),
      start: t0 + i * rand(0.09, 0.15), dur: rand(0.07, 0.13), gain: 0.05 * level, attack: 0.01, cutoff: 6000,
    });
  }
}

function hoot() {
  const ctx = Sound.context;
  const t0 = ctx.currentTime + 0.02;
  for (const [i, f] of [[0, 392], [1, 349]]) {
    note(ctx, nodes.owls, { freq: f, glideTo: f * 0.93, start: t0 + i * 0.5, dur: 0.42, gain: 0.07, attack: 0.08, cutoff: 700 });
  }
}

export const Ambience = {
  init() {
    Sound.onReady(build);
    bus.on("camp:enter", () => { atCamp = true; });
    bus.on("camp:leave", () => { atCamp = false; });
  },

  update(dt) {
    if (!Sound.ready || !nodes.waves) return;

    const w = biomeWeightsAt(World.pos());
    const weather = Weather.type;
    const wet = weather === "rain" ? 1 : 0;
    const calm = atCamp ? 0.5 : 1; // at camp the world steps back so the fire can be heard
    const day = TimeOfDay.dayAmt;
    const night = TimeOfDay.nightAmt;
    const frozen = Seasons.current === "winter" || w.snowfields > 0.5 ? 0.25 : 1;

    // the sea, the brook and the sand
    setLevel("waves", calm * w.coast * (0.18 + 0.14 * nearness(690, 40) + 0.05 * wet));
    setLevel("brook", calm * frozen * (0.14 * w.forest + 0.05 * w.meadow + 0.16 * nearness(70, 22)) * (1 + 0.5 * wet));
    setLevel("sand", calm * w.desert * 0.08);
    setLevel("fire", atCamp ? 0.05 : 0);

    // birds: only in daylight and only when it isn't pouring, blowing or snowing
    const birdy = w.forest * 1 + w.meadow * 1 + w.mountains * 0.4 + w.coast * 0.3;
    const weatherOk = weather === "rain" || weather === "wind" || weather === "snow" ? 0 : weather === "mist" ? 0.5 : 1;
    const dawnChorus = TimeOfDay.phase === "dawn" ? 1.7 : 1;
    const birdRate = birdy * weatherOk * Math.max(0, day - 0.2) * dawnChorus * calm;
    birdTimer -= dt;
    if (birdTimer <= 0) {
      birdTimer = rand(2.2, 6) / Math.max(0.15, birdRate);
      if (birdRate > 0.12) chirp(Math.min(1, birdRate));
    }
    setLevel("birds", 1);

    // an owl or two, very occasionally, in the dark woods and mountains
    owlTimer -= dt;
    if (owlTimer <= 0) {
      owlTimer = rand(18, 40);
      if (night > 0.6 && w.forest + w.mountains > 0.6 && weather !== "rain") hoot();
    }
    setLevel("owls", 1);

    // fire crackles
    if (atCamp) {
      popTimer -= dt;
      if (popTimer <= 0) {
        popTimer = rand(0.05, 0.45);
        puff(Sound.context, nodes.crackle, Sound.noise(), {
          dur: rand(0.015, 0.05), gain: rand(0.03, 0.1), type: "highpass", freq: rand(2000, 3800), q: 0.6, attack: 0.002,
        });
      }
    }
    setLevel("crackle", 1);
  },

  // for tests and ?debug
  levels: () => ({ ...lastLevel }),
};

