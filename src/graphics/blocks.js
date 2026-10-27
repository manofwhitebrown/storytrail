// blocks.js - everything in the game is built from boxes. A "cube" is a front face plus a lighter top
// and a darker side, which is enough to make a flat rectangle read as a chunky little block.

import { mixColor } from "../core/util.js";

const cache = new Map();
function shades(color) {
  let s = cache.get(color);
  if (!s) {
    if (cache.size > 400) cache.clear();   // blended biome colors change every frame, so don't hoard them
    s = { light: mixColor(color, "#ffffff", 0.22), dark: mixColor(color, "#000000", 0.32) };
    cache.set(color, s);
  }
  return s;
}

// (x, y) is the top-left of the front face; d is how deep the block looks.
export function cube(ctx, x, y, w, h, color, d = 4) {
  const { light, dark } = shades(color);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  if (d <= 0) return;
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w, y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w + d, y + h - d); ctx.lineTo(x + w, y + h);
  ctx.closePath(); ctx.fill();
}

// A flat square of color (eyes, flowers, pebbles, sparks).
export const pixel = (ctx, x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

// Colors for pixel sprites: one letter per color, "." is empty.
export const PALETTE = {
  k: "#2a2233", w: "#f4f1e6", r: "#c8503c", o: "#e8903a", y: "#f2d675", g: "#6f9f4e", d: "#3f6b3a",
  b: "#4a78b8", l: "#a9d4ee", n: "#7a5232", t: "#d8b98a", p: "#e89ab4", v: "#8a64b0", s: "#8a909c", m: "#c9ccd4",
};

// rows: array of strings (all the same width). (x, y) is the top-left; unit is the size of one box.
export function sprite(ctx, rows, x, y, unit = 4) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const color = PALETTE[rows[r][c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c * unit, y + r * unit, unit, unit);
      if (unit >= 3) { ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(x + c * unit, y + (r + 1) * unit - 1, unit, 1); }
    }
  }
}
