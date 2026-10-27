// world.js - the sky, hills, trees and path that scroll past as you walk.
// The scenery changes (forest -> meadow -> mountains...) as you travel, and the sky,
// weather and season layer on top of that.

import { CONFIG } from "../core/config.js";
import { state } from "../core/state.js";
import { hash, mixColor } from "../core/util.js";
import { cube, pixel } from "../graphics/blocks.js";
import { BIOMES, COLOR_KEYS, NUMBER_KEYS } from "./biomes/index.js";
import { Landmarks } from "./landmarks.js";
import { Seasons } from "./seasons.js";
import { Secrets } from "./secrets.js";
import { TimeOfDay } from "./time-of-day.js";
import { Weather } from "./weather.js";

const { STEP_DISTANCE, BIOME_LENGTH, BLEND_STEPS, GROUND_RATIO } = CONFIG;

// Which biome are we in, and how far into the fade to the next one?
export function blendBiomes(pos) {
  const idx = Math.floor(pos / BIOME_LENGTH);
  const a = BIOMES[idx % BIOMES.length];
  const next = BIOMES[(idx + 1) % BIOMES.length];
  const into = pos - idx * BIOME_LENGTH;
  let t = Math.min(1, Math.max(0, (into - (BIOME_LENGTH - BLEND_STEPS)) / BLEND_STEPS));
  t = t * t * (3 - 2 * t); // smooth start and end

  const out = { feature: t < 0.5 ? a.feature : next.feature };
  for (const k of COLOR_KEYS) out[k] = mixColor(a[k], next[k], t);
  for (const k of NUMBER_KEYS) out[k] = a[k] + (next[k] - a[k]) * t;
  return out;
}

// How each kind of scenery is drawn, all from boxes. (x, ground) is where it stands.
const FEATURES = {
  pine(ctx, x, g, size, b, i, snow = false) {
    cube(ctx, x - 4, g - size * 0.4, 8, size * 0.4 + 6, "#3a2e2a", 3);
    const tier = size * 0.34;
    [0.95, 0.68, 0.4].forEach((k, n) => {
      const w = size * k, top = g - size * 0.3 - tier * (n + 1) + n * 4;
      cube(ctx, x - w / 2, top, w, tier, b.tree, Math.max(3, size * 0.07));
      if (snow) pixel(ctx, x - w / 2, top, w, 4, "#f4f8fc");
    });
  },
  snowpine(ctx, x, g, size, b, i) { FEATURES.pine(ctx, x, g, size, b, i, true); },
  meadow(ctx, x, g, size, b, i) {
    const w = size * 0.85, h = size * 0.38;
    cube(ctx, x - w / 2, g - h, w, h, b.tree, 5);
    for (let f = 0; f < 5; f++) {
      pixel(ctx, x - w / 2 + 3 + hash(i * 5 + f) * (w - 10), g - h - 6 + hash(i * 5 + f + 40) * 8, 5, 5, b.accent);
    }
  },
  cactus(ctx, x, g, size, b, i) {
    const h = size * 0.95;
    cube(ctx, x - 6, g - h, 12, h + 4, b.tree, 4);
    cube(ctx, x - 18, g - h * 0.65, 12, 6, b.tree, 3); cube(ctx, x - 18, g - h * 0.65 - 18, 6, 24, b.tree, 3);
    if (hash(i) > 0.35) { cube(ctx, x + 6, g - h * 0.5, 12, 6, b.tree, 3); cube(ctx, x + 12, g - h * 0.5 - 16, 6, 22, b.tree, 3); }
    pixel(ctx, x - 3, g - h - 7, 6, 6, b.accent);
  },
};

export const World = {
  scroll: 0,       // how far the world has actually scrolled
  target: 0,       // how far it should scroll (grows by one step each tap)
  look: BIOMES[0], // the current (possibly blended, season-tinted) scenery
  clock: 0,

  init() {
    this.target = state.steps * STEP_DISTANCE;
    this.scroll = this.target; // no sliding when a save loads
    this.look = this.computeLook();
  },

  step() { this.target += STEP_DISTANCE; },
  pos() { return this.scroll / STEP_DISTANCE; },
  groundY(h) { return h * GROUND_RATIO; },
  computeLook() { return Seasons.tint(blendBiomes(this.pos())); },

  // Slide smoothly toward the target instead of jumping
  update(dt) {
    this.clock += dt;
    this.scroll += (this.target - this.scroll) * Math.min(1, dt * 6);
    this.look = this.computeLook();
    Landmarks.update(dt);
    Secrets.update(dt);
  },

  // Sky, sun, moon, stars and hills. Camp uses this too (with a fixed scroll).
  drawBackdrop(ctx, w, h, scroll = this.scroll) {
    const b = this.look;
    const groundY = this.groundY(h);

    const sky = TimeOfDay.skyColors(b);
    const grad = ctx.createLinearGradient(0, 0, 0, groundY);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    TimeOfDay.drawCelestial(ctx, w, groundY);
    TimeOfDay.drawSkyTint(ctx, w, groundY);

    // Far hills move slowly, near hills move faster (parallax = depth)
    this.drawHills(ctx, w, groundY, 0.15, b.hillFar, b.hillAmp, 260, groundY - 40 - b.hillAmp * 0.7, b.jagged, scroll);
    this.drawHills(ctx, w, groundY, 0.35, b.hillNear, b.hillAmp * 0.7, 170, groundY - 20 - b.hillAmp * 0.3, b.jagged, scroll);
    if (b.sea > 0.01) this.drawSea(ctx, w, groundY, b, scroll);
  },

  draw(ctx, w, h) {
    const b = this.look;
    const groundY = this.groundY(h);

    this.drawBackdrop(ctx, w, h);
    this.drawFeatures(ctx, w, groundY, 0.7, 150, b);

    // Ground
    ctx.fillStyle = b.ground;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Landmarks and secrets stand just beside the path
    Landmarks.draw(ctx, w, groundY, this.scroll);
    Secrets.draw(ctx, w, groundY, this.scroll);

    // Path
    const pathTop = groundY + 28;
    ctx.fillStyle = b.path;
    ctx.fillRect(0, pathTop, w, h - pathTop - 24);

    // Pebbles on the path move at full speed
    const spacing = 90;
    const first = Math.floor(this.scroll / spacing);
    for (let i = first; i < first + w / spacing + 2; i++) {
      const x = i * spacing - this.scroll;
      const y = pathTop + 14 + hash(i) * (h - pathTop - 56);
      cube(ctx, x, y, 8 + hash(i + 7) * 8, 5, b.pebble, 2);
    }
  },

  // jagged: 0 = soft rolling hills, 1 = sharp mountain peaks
  drawHills(ctx, w, baseY, speed, color, amp, period, topY, jagged, scroll) {
    ctx.fillStyle = color;
    const col = 16;                                   // hills are rows of columns, snapped to 8px steps
    for (let x = 0; x <= w; x += col) {
      const phase = (x + col / 2 + scroll * speed) / period;
      const soft = Math.sin(phase * Math.PI * 2);
      const frac = phase - Math.floor(phase);
      const sharp = Math.abs(frac * 2 - 1) * 2 - 1;
      const wave = soft * (1 - jagged) + sharp * jagged;
      const y = Math.round((topY + wave * amp * 0.5) / 8) * 8;
      ctx.fillRect(x, y, col + 1, baseY - y);
    }
  },

  drawSea(ctx, w, groundY, b, scroll) {
    ctx.globalAlpha = b.sea;
    ctx.fillStyle = b.seaColor;
    ctx.fillRect(0, groundY - 24, w, 24);

    // Little glints on the water
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    for (let i = 0; i < 14; i++) {
      const x = ((i * 70 - scroll * 0.5) % (w + 70) + w + 70) % (w + 70) - 35;
      const y = groundY - 20 + hash(i + 50) * 16;
      ctx.fillRect(x, y, 12, 2);
    }
    ctx.globalAlpha = 1;
  },

  drawFeatures(ctx, w, groundY, speed, spacing, b) {
    const offset = this.scroll * speed;
    const first = Math.floor(offset / spacing);
    const draw = FEATURES[b.feature] || FEATURES.pine;
    for (let i = first; i < first + w / spacing + 2; i++) {
      if (hash(i + 31) > b.treeDensity) continue; // fewer trees in some places
      const sway = Math.sin(this.clock * 1.6 + i) * Weather.wind * 5; // wind makes them lean
      const x = i * spacing - offset + hash(i) * 40 + sway;
      const size = 40 + hash(i + 3) * 30;
      draw(ctx, x, groundY, size, b, i);
    }
  },
};
