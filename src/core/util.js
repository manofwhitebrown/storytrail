// util.js - small helpers shared by many files.

import { state } from "./state.js";

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// Gives the same "random" number (0 to 1) for the same input every time,
// so trees, stars and pebbles stay put instead of flickering as you scroll.
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function makeEl(tag, text, className) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const rand = (a, b) => a + Math.random() * (b - a);

// entries: [{ weight: 2, ... }, ...]  ->  one entry, chosen by weight
export function weightedPick(entries, weightOf = (e) => e.weight ?? 1) {
  const total = entries.reduce((sum, e) => sum + weightOf(e), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= weightOf(e);
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

// ---- Colors ("#rrggbb" or "rgb(r,g,b)") ----
export function parseColor(c) {
  if (c[0] === "#") return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  return c.match(/[\d.]+/g).slice(0, 3).map(Number);
}

export function mixColor(c1, c2, t) {
  const [r1, g1, b1] = parseColor(c1);
  const [r2, g2, b2] = parseColor(c2);
  const m = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}

export function rgba(c, a) {
  const [r, g, b] = parseColor(c);
  return `rgba(${r},${g},${b},${a})`;
}

// "Less movement" = the device asks for it OR the player chose it (Menu -> Accessibility)
export const prefersReducedMotion = () =>
  state.settings?.motion === "reduce" ||
  (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);

// "Calm" = less movement for any reason, including quiet mode (Part 24). Used to thin out particles.
export const calmMotion = () => prefersReducedMotion() || !!state.wellbeing?.quiet;

// Text that came from outside (a friend's link, a postcard message) is cleaned before it is shown or kept:
// control characters, invisible direction marks, { } (used by t() templates) and < > are removed,
// spaces are collapsed, and it is cut to `max` characters (whole characters, so emoji are never split).
export function cleanText(text, max, fallback = "") {
  const s = String(text ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, " ")
    .replace(/[{}<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(s).slice(0, max).join("").trim() || fallback;
}
