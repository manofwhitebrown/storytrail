// seasons.js - Part 13. The world changes a little with the real calendar:
// blossom in spring, deep green in summer, orange leaves in autumn, frost in winter.

import { CONFIG } from "../core/config.js";
import { hash, mixColor, prefersReducedMotion, rand } from "../core/util.js";

const SEASON_LABELS = { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" };

// amt = how strongly the season tints the scenery (0..1)
const LOOKS = {
  spring: { tree: "#7fb069", ground: "#6a9a5a", hills: "#7fa86f", amt: 0.22, bits: ["#f6b8cf", "#ffffff"] },
  summer: { tree: "#2f6b3a", ground: "#3d7a45", hills: "#4a8a50", amt: 0.18, bits: [] },
  autumn: { tree: "#c8742e", ground: "#8a6a3a", hills: "#a8703a", amt: 0.45, bits: ["#d9822b", "#b5502a", "#e0b040"] },
  winter: { tree: "#cfe0ea", ground: "#e4eef5", hills: "#dbe5ee", amt: 0.4, bits: [] },
};

// Spring and summer are on the opposite dates in the southern hemisphere
export function seasonOf(date = new Date(), hemisphere = CONFIG.HEMISPHERE) {
  let m = date.getMonth(); // 0 = January
  if (hemisphere === "south") m = (m + 6) % 12;
  if (m === 11 || m <= 1) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}

// How likely each weather is in each season (multiplies the place's own weights)
const WEATHER_BIAS = {
  spring: { rain: 1.6, mist: 1.2 },
  summer: { fireflies: 2, rain: 0.8, snow: 0 },
  autumn: { wind: 1.8, mist: 1.5 },
  winter: { snow: 3, rain: 0.3, fireflies: 0 },
};

let bits = [];
let clock = 0;

export const Seasons = {
  current: "autumn",

  init() {
    this.current = seasonOf();
    document.body.dataset.season = this.current;
    const count = LOOKS[this.current].bits.length ? (prefersReducedMotion() ? 5 : 16) : 0;
    bits = Array.from({ length: count }, (_, i) => ({
      x: rand(0, 800), y: rand(0, 450), v: rand(18, 40), ph: rand(0, 6.28), size: 3 + hash(i) * 3,
      color: LOOKS[this.current].bits[i % LOOKS[this.current].bits.length],
    }));
  },

  label() { return SEASON_LABELS[this.current]; },
  weatherBias(type) { return WEATHER_BIAS[this.current][type] ?? 1; },

  // Returns a copy of the scenery with the season's color mixed in
  tint(look) {
    const s = LOOKS[this.current];
    const k = s.amt * (look.seasonal ?? 1);
    return {
      ...look,
      tree: mixColor(look.tree, s.tree, k),
      ground: mixColor(look.ground, s.ground, k * 0.8),
      hillNear: mixColor(look.hillNear, s.hills, k * 0.5),
      hillFar: mixColor(look.hillFar, s.hills, k * 0.3),
    };
  },

  // Falling petals (spring) or leaves (autumn)
  update(dt, seasonalAmount = 1) {
    clock += dt;
    for (const b of bits) {
      b.y += b.v * dt;
      b.x += Math.sin(clock * 1.3 + b.ph) * 24 * dt - 6 * dt;
      if (b.y > 460) { b.y = -10; b.x = rand(0, 800); }
    }
    this.amount = seasonalAmount;
  },

  draw(ctx) {
    if (!bits.length || (this.amount ?? 1) < 0.35) return;
    for (const b of bits) {
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.size, b.size * 0.55, b.ph + clock, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};
