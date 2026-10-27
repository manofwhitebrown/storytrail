// weather.js - Part 13. Rain, mist, snow, wind and fireflies.
// What comes next depends on where you are, the season and the time of day.
// Weather also changes the sound (see audio/sound.js).

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { Sound } from "../audio/sound.js";
import { calmMotion, clamp, rand, weightedPick } from "../core/util.js";
import { biomeAt } from "./biomes/index.js";
import { Seasons } from "./seasons.js";
import { TimeOfDay } from "./time-of-day.js";

const TYPES = ["clear", "rain", "mist", "snow", "wind", "fireflies"];
const W = 800;
const H = 450;

export const Weather = {
  type: "clear",
  next: null,       // weather we're fading toward
  intensity: 0,     // 0..1, fades in and out between changes
  wind: 0,          // 0..1, makes trees sway
  stepsLeft: 50,
  parts: [],
  clock: 0,

  init() {
    this.type = this.choose();
    this.intensity = 1;
    this.stepsLeft = Math.round(rand(CONFIG.WEATHER_MIN_STEPS, CONFIG.WEATHER_MAX_STEPS));
    this.populate();
    bus.on("calm:change", () => this.populate()); // quiet mode / reduced motion thins the rain and snow right away
  },

  choose() {
    const biome = biomeAt(state.steps);
    const entries = TYPES.map((type) => {
      let weight = biome.weather[type] ?? 0;
      // winter brings snow almost anywhere cold enough
      if (type === "snow" && Seasons.current === "winter" && biome.id !== "desert" && biome.id !== "coast") {
        weight = Math.max(weight, 1);
      }
      if (type === "fireflies" && TimeOfDay.nightAmt < 0.3) weight = 0; // only after dark
      return { type, weight: weight * Seasons.weatherBias(type) };
    });
    return (weightedPick(entries) || { type: "clear" }).type;
  },

  onStep() {
    this.stepsLeft -= 1;
    if (this.stepsLeft > 0) return;
    this.stepsLeft = Math.round(rand(CONFIG.WEATHER_MIN_STEPS, CONFIG.WEATHER_MAX_STEPS));
    const n = this.choose();
    if (n !== this.type) this.next = n;
  },

  populate() {
    const lite = calmMotion() ? 0.3 : 1;
    const make = (n, fn) => Array.from({ length: Math.round(n * lite) }, fn);
    if (this.type === "rain") this.parts = make(110, () => ({ x: rand(0, W), y: rand(0, H), v: rand(600, 900), len: rand(10, 20) }));
    else if (this.type === "snow") this.parts = make(90, () => ({ x: rand(0, W), y: rand(0, H), v: rand(30, 70), r: rand(1, 3), ph: rand(0, 6) }));
    else if (this.type === "wind") this.parts = make(14, () => ({ x: rand(0, W), y: rand(60, 330), v: rand(300, 520), len: rand(40, 90) }));
    else if (this.type === "fireflies") this.parts = make(24, () => ({ x: rand(0, W), y: rand(200, 360), ph: rand(0, 6), sp: rand(0.4, 1) }));
    else this.parts = [];
  },

  update(dt) {
    this.clock += dt;

    if (this.next) {
      this.intensity -= dt * 0.6;                 // fade the old weather out...
      if (this.intensity <= 0) {
        this.type = this.next;                    // ...then bring the new one in
        this.next = null;
        this.populate();
        bus.emit("weather:change", this.type);
      }
    } else if (this.intensity < 1) {
      this.intensity = Math.min(1, this.intensity + dt * 0.6);
    }

    const target = { wind: 1, rain: 0.35, snow: 0.25 }[this.type] ?? 0.05;
    this.wind += (target * this.intensity - this.wind) * Math.min(1, dt);

    for (const p of this.parts) {
      if (this.type === "rain") { p.y += p.v * dt; p.x -= (30 + this.wind * 60) * dt; if (p.y > H) { p.y = -20; p.x = rand(0, W + 60); } }
      else if (this.type === "snow") { p.y += p.v * dt; p.x += Math.sin(this.clock + p.ph) * 20 * dt - 8 * dt; if (p.y > H) { p.y = -5; p.x = rand(0, W); } }
      else if (this.type === "wind") { p.x -= p.v * dt; if (p.x < -p.len) { p.x = W + 10; p.y = rand(60, 330); } }
      else if (this.type === "fireflies") { p.ph += dt * p.sp; p.x += Math.sin(p.ph * 1.3) * 14 * dt; p.y += Math.cos(p.ph) * 10 * dt; }
    }

    Sound.setWeather(this.type, this.intensity, TimeOfDay.nightAmt);
  },

  // Gloom or mist over the scene, then the falling things
  draw(ctx, w, h) {
    const I = this.intensity;
    const wash = { rain: [70, 85, 105, 0.28], mist: [220, 230, 236, 0.26], snow: [230, 238, 250, 0.14] }[this.type];
    if (wash) {
      ctx.fillStyle = `rgba(${wash[0]},${wash[1]},${wash[2]},${wash[3] * I})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.type === "mist") {
      ctx.fillStyle = `rgba(235,242,246,${0.1 * I})`;
      for (let i = 0; i < 6; i++) {
        const x = ((i * 190 + this.clock * 12 * (1 + (i % 3) * 0.4)) % (w + 400)) - 200;
        ctx.beginPath();
        ctx.ellipse(x, h * 0.55 + (i % 3) * 24, 220, 36, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.type === "rain") {
      ctx.strokeStyle = `rgba(205,222,240,${0.45 * I})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const p of this.parts) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 3, p.y + p.len); }
      ctx.stroke();
    } else if (this.type === "snow") {
      ctx.fillStyle = `rgba(255,255,255,${0.9 * I})`;
      for (const p of this.parts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    } else if (this.type === "wind") {
      ctx.strokeStyle = `rgba(235,240,245,${0.28 * I})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const p of this.parts) { ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + p.len * 0.5, p.y - 5, p.x + p.len, p.y); }
      ctx.stroke();
    }
  },

  // Fireflies are drawn AFTER the night darkness so they glow
  drawGlow(ctx) {
    if (this.type !== "fireflies") return;
    const visible = this.intensity * clamp(1 - TimeOfDay.dayAmt * 1.4, 0, 1);
    if (visible < 0.02) return;
    for (const p of this.parts) {
      const pulse = 0.5 + 0.5 * Math.sin(p.ph * 3);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
      g.addColorStop(0, `rgba(230,255,150,${0.9 * pulse * visible})`);
      g.addColorStop(1, "rgba(230,255,150,0)");
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 9, p.y - 9, 18, 18);
    }
  },
};
