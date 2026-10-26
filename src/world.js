// world.js - the sky, hills, trees and path that scroll past as you walk.
// Part 6: the scenery changes (forest -> mountains -> coast) as you travel.

const STEP_DISTANCE = 60;  // pixels the world moves per step
const BIOME_LENGTH = 120;  // steps spent in each biome
const BLEND_STEPS = 20;    // steps over which one biome fades into the next

// To add a new place, add another entry here.
const BIOMES = [
  { name: "The Pine Forest",
    skyTop: "#1f2a4d", skyBottom: "#8fb3c2", hillFar: "#3b5a73", hillNear: "#2b4a52",
    tree: "#24493f", ground: "#1d3330", path: "#c9b88a", pebble: "#a89868", seaColor: "#2b4a52",
    treeDensity: 0.75, hillAmp: 70, jagged: 0, sea: 0 },
  { name: "The High Mountains",
    skyTop: "#2a2f4f", skyBottom: "#b9b4c9", hillFar: "#5d6684", hillNear: "#454d68",
    tree: "#2f4a4a", ground: "#2c3440", path: "#a9a7a8", pebble: "#8a898c", seaColor: "#2b4a52",
    treeDensity: 0.25, hillAmp: 150, jagged: 1, sea: 0 },
  { name: "The Quiet Coast",
    skyTop: "#27406b", skyBottom: "#f0c9a0", hillFar: "#6b88a6", hillNear: "#5a7f86",
    tree: "#3f6b5a", ground: "#4a6a5c", path: "#e0cd9c", pebble: "#c4b07e", seaColor: "#4f86a8",
    treeDensity: 0.1, hillAmp: 30, jagged: 0, sea: 1 },
];

const COLOR_KEYS = ["skyTop", "skyBottom", "hillFar", "hillNear", "tree", "ground", "path", "pebble", "seaColor"];
const NUMBER_KEYS = ["treeDensity", "hillAmp", "jagged", "sea"];

const World = {
  scroll: 0,  // how far the world has actually scrolled
  target: 0,  // how far it should scroll (grows by one step each tap)
  look: BIOMES[0], // the current (possibly blended) scenery

  step() {
    this.target += STEP_DISTANCE;
  },

  // Slide smoothly toward the target instead of jumping
  update(dt) {
    this.scroll += (this.target - this.scroll) * Math.min(1, dt * 6);
    this.look = blendBiomes(this.scroll / STEP_DISTANCE);
  },

  draw(ctx, w, h) {
    const b = this.look;
    const groundY = h * 0.72;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, b.skyTop);
    sky.addColorStop(1, b.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Moon (fixed in the sky)
    ctx.fillStyle = "#f4efd8";
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.18, 26, 0, Math.PI * 2);
    ctx.fill();

    // Far hills move slowly, near hills move faster (parallax = depth)
    this.drawHills(ctx, w, groundY, 0.15, b.hillFar, b.hillAmp, 260, groundY - 40 - b.hillAmp * 0.7, b.jagged);
    this.drawHills(ctx, w, groundY, 0.35, b.hillNear, b.hillAmp * 0.7, 170, groundY - 20 - b.hillAmp * 0.3, b.jagged);

    // Sea (only visible on the coast)
    if (b.sea > 0.01) this.drawSea(ctx, w, groundY, b);

    // Trees
    this.drawTrees(ctx, w, groundY, 0.7, 150, b);

    // Ground
    ctx.fillStyle = b.ground;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Path
    const pathTop = groundY + 28;
    ctx.fillStyle = b.path;
    ctx.fillRect(0, pathTop, w, h - pathTop - 24);

    // Pebbles on the path move at full speed
    ctx.fillStyle = b.pebble;
    const spacing = 90;
    const first = Math.floor(this.scroll / spacing);
    for (let i = first; i < first + w / spacing + 2; i++) {
      const x = i * spacing - this.scroll;
      const y = pathTop + 14 + (hash(i) * (h - pathTop - 56));
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + hash(i + 7) * 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // jagged: 0 = soft rolling hills, 1 = sharp mountain peaks
  drawHills(ctx, w, baseY, speed, color, amp, period, topY, jagged) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= w; x += 8) {
      const phase = (x + this.scroll * speed) / period;
      const soft = Math.sin(phase * Math.PI * 2);
      const frac = phase - Math.floor(phase);
      const sharp = Math.abs(frac * 2 - 1) * 2 - 1;
      const wave = soft * (1 - jagged) + sharp * jagged;
      ctx.lineTo(x, topY + wave * amp * 0.5);
    }
    ctx.lineTo(w, baseY);
    ctx.closePath();
    ctx.fill();
  },

  drawSea(ctx, w, groundY, b) {
    ctx.globalAlpha = b.sea;
    ctx.fillStyle = b.seaColor;
    ctx.fillRect(0, groundY - 24, w, 24);

    // Little glints on the water
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    for (let i = 0; i < 14; i++) {
      const x = ((i * 70 - this.scroll * 0.5) % (w + 70) + w + 70) % (w + 70) - 35;
      const y = groundY - 20 + hash(i + 50) * 16;
      ctx.fillRect(x, y, 12, 2);
    }
    ctx.globalAlpha = 1;
  },

  drawTrees(ctx, w, groundY, speed, spacing, b) {
    const offset = this.scroll * speed;
    const first = Math.floor(offset / spacing);
    for (let i = first; i < first + w / spacing + 2; i++) {
      if (hash(i + 31) > b.treeDensity) continue; // fewer trees in some places
      const x = i * spacing - offset + hash(i) * 40;
      const size = 40 + hash(i + 3) * 30;

      ctx.fillStyle = "#3a2e2a";
      ctx.fillRect(x - 3, groundY - size * 0.4, 6, size * 0.4 + 6);

      ctx.fillStyle = b.tree;
      ctx.beginPath();
      ctx.moveTo(x, groundY - size * 1.4);
      ctx.lineTo(x + size * 0.45, groundY - size * 0.3);
      ctx.lineTo(x - size * 0.45, groundY - size * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  },
};

// Which biome are we in, and how far into the fade to the next one?
function blendBiomes(pos) {
  const idx = Math.floor(pos / BIOME_LENGTH);
  const a = BIOMES[idx % BIOMES.length];
  const next = BIOMES[(idx + 1) % BIOMES.length];
  const into = pos - idx * BIOME_LENGTH;
  let t = Math.min(1, Math.max(0, (into - (BIOME_LENGTH - BLEND_STEPS)) / BLEND_STEPS));
  t = t * t * (3 - 2 * t); // smooth start and end

  const out = {};
  for (const k of COLOR_KEYS) out[k] = lerpColor(a[k], next[k], t);
  for (const k of NUMBER_KEYS) out[k] = a[k] + (next[k] - a[k]) * t;
  return out;
}

function lerpColor(c1, c2, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(c1);
  const [r2, g2, b2] = p(c2);
  const m = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}

// Gives the same "random" number (0 to 1) for the same input every time,
// so trees and pebbles stay put instead of flickering as you scroll.
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
