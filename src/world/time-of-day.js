// time-of-day.js - Part 12. Dawn, noon, dusk and night.
// Follows your real clock, or runs on in-game time (Menu -> Time of day).

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { hash, mixColor, parseColor, rgba, smoothstep } from "../core/util.js";

const PHASE_LABELS = { dawn: "Dawn", noon: "Midday", dusk: "Dusk", night: "Night" };

// Sky wash by time of day (t = 0 is midnight, 0.5 is noon). Colors are blended between these.
const TINTS = [
  [0.00, [10, 14, 50], 0.40],
  [0.22, [60, 50, 90], 0.30],
  [0.28, [255, 160, 110], 0.26],
  [0.36, [255, 220, 170], 0.08],
  [0.50, [255, 255, 255], 0.00],
  [0.64, [255, 230, 180], 0.06],
  [0.74, [255, 120, 90], 0.28],
  [0.80, [90, 60, 120], 0.30],
  [0.88, [10, 14, 50], 0.40],
  [1.00, [10, 14, 50], 0.40],
];

export const TimeOfDay = {
  t: 0.35,          // 0..1 through the day
  phase: "noon",
  elevation: 0,     // sun height: 1 at noon, -1 at midnight
  dayAmt: 1,        // 0..1 how "day" it is
  nightAmt: 0,      // 0..1 how "night" it is
  tint: { rgb: [255, 255, 255], a: 0 },
  clock: 0,

  init() {
    this.update(0);
    this.emitPhase(true);
  },

  // In-game mode: every step moves the clock along
  onStep() {
    if (state.settings.timeMode === "game") {
      state.time.game = (state.time.game + 1 / CONFIG.GAME_DAY_STEPS) % 1;
    }
    if (this.nightAmt > 0.5) state.stats.nightSteps += 1;
  },

  update(dt) {
    this.clock += dt;
    if (state.settings.timeMode === "real") {
      const d = new Date();
      this.t = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
    } else {
      state.time.game = (state.time.game + dt / CONFIG.GAME_DAY_IDLE_SECONDS) % 1;
      this.t = state.time.game;
    }
    this.compute();
  },

  compute() {
    const t = this.t;
    this.elevation = Math.sin((t - 0.25) * Math.PI * 2);
    this.dayAmt = smoothstep(0.05, 0.75, this.elevation);
    this.nightAmt = 1 - smoothstep(-0.3, 0.1, this.elevation);

    for (let i = 1; i < TINTS.length; i++) {
      if (t <= TINTS[i][0]) {
        const [t0, c0, a0] = TINTS[i - 1];
        const [t1, c1, a1] = TINTS[i];
        const k = (t - t0) / (t1 - t0 || 1);
        this.tint = { rgb: c0.map((v, j) => Math.round(v + (c1[j] - v) * k)), a: a0 + (a1 - a0) * k };
        break;
      }
    }

    const hour = t * 24;
    const phase = hour >= 4.5 && hour < 8 ? "dawn" : hour >= 8 && hour < 17 ? "noon" : hour >= 17 && hour < 21 ? "dusk" : "night";
    if (phase !== this.phase) { this.phase = phase; this.emitPhase(); }
  },

  emitPhase() {
    document.body.dataset.phase = this.phase;
    bus.emit("time:phase", { phase: this.phase, label: PHASE_LABELS[this.phase] });
  },

  label() { return PHASE_LABELS[this.phase]; },
  clockText() {
    const mins = Math.floor(this.t * 1440);
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
  },

  // The biome's sky colors, brightened by day and darkened by night
  skyColors(look) {
    let top = mixColor(look.skyTop, "#6ea8dc", this.dayAmt * 0.7);
    let bottom = mixColor(look.skyBottom, "#dcecf4", this.dayAmt * 0.55);
    top = mixColor(top, "#070b22", this.nightAmt * 0.85);
    bottom = mixColor(bottom, "#1b2548", this.nightAmt * 0.8);
    return { top, bottom };
  },

  // Stars, sun and moon. Sun and moon travel across the sky in an arc.
  drawCelestial(ctx, w, groundY) {
    if (this.nightAmt > 0.02) {
      for (let i = 0; i < 70; i++) {
        const twinkle = 0.6 + 0.4 * Math.sin(this.clock * 2 + i * 1.7);
        ctx.fillStyle = `rgba(255,255,240,${this.nightAmt * twinkle * 0.9})`;
        ctx.beginPath();
        ctx.arc(hash(i) * w, hash(i + 100) * groundY * 0.8, 0.6 + hash(i + 200) * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const arcTop = groundY - 90;
    const sunF = (this.t - 0.25) / 0.5;
    if (sunF >= 0 && sunF <= 1) {
      const lift = Math.sin(sunF * Math.PI);
      const x = w * (0.08 + 0.84 * sunF);
      const y = groundY - 12 - lift * arcTop;
      const color = mixColor("#ff9a55", "#fff2b0", Math.min(1, lift * 1.6));
      this.disc(ctx, x, y, 24, color, 0.35);
    }

    const moonF = ((this.t - 0.75 + 1) % 1) / 0.5;
    if (moonF >= 0 && moonF <= 1) {
      const x = w * (0.08 + 0.84 * moonF);
      const y = groundY - 12 - Math.sin(moonF * Math.PI) * arcTop;
      ctx.globalAlpha = Math.max(0.25, this.nightAmt);
      this.disc(ctx, x, y, 26, "#f4efd8", 0.2);
      ctx.fillStyle = "rgba(180,175,150,0.35)"; // a few craters
      for (const [dx, dy, r] of [[-8, -6, 5], [7, 4, 4], [-2, 11, 3]]) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  },

  disc(ctx, x, y, r, color, glow) {
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3);
    g.addColorStop(0, rgba(color, glow));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  },

  // Warm or cool wash over the sky (sunrise pinks, sunset oranges)
  drawSkyTint(ctx, w, groundY) {
    if (this.tint.a < 0.01) return;
    const [r, g, b] = this.tint.rgb;
    ctx.fillStyle = `rgba(${r},${g},${b},${this.tint.a})`;
    ctx.fillRect(0, 0, w, groundY);
  },

  // Darkness over everything, with a warm pool of light around a lantern or campfire.
  // light = { x, y, radius, color }
  drawLighting(ctx, w, h, light) {
    const dark = 0.6 * this.nightAmt + 0.1 * (1 - this.dayAmt) * (1 - this.nightAmt);
    if (dark < 0.01) return;

    const g = ctx.createRadialGradient(light.x, light.y, 14, light.x, light.y, light.radius);
    g.addColorStop(0, "rgba(8,12,38,0)");
    g.addColorStop(0.4, `rgba(8,12,38,${dark * 0.3})`);
    g.addColorStop(1, `rgba(8,12,38,${dark})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // warm glow, only noticeable once it gets dark
    const warm = ctx.createRadialGradient(light.x, light.y, 2, light.x, light.y, light.radius * 0.55);
    warm.addColorStop(0, rgba(light.color, 0.34 * this.nightAmt + 0.08));
    warm.addColorStop(1, rgba(light.color, 0));
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);
  },
};
