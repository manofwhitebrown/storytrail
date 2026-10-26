// map.js - Part 21. A hand-drawn map that fills in as you travel.
// The road is drawn as one wobbly line. Only the parts you've walked appear,
// plus the faint star Grandmother drew near the sea.

import landmarkData from "../../assets/data/landmarks.json";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { hash, rgba } from "../core/util.js";
import { BIOMES, LOOP_STEPS } from "./biomes/index.js";

const SEG = CONFIG.MAP_SEGMENT_STEPS;
const SEGMENTS = LOOP_STEPS / SEG;
export const MAP_W = 640;
export const MAP_H = 360;

// A point on the winding road, for a position 0..LOOP_STEPS
function pointAt(pos) {
  const f = pos / LOOP_STEPS;
  return {
    x: 46 + f * (MAP_W - 92),
    y: MAP_H * 0.56 + Math.sin(f * Math.PI * 3) * MAP_H * 0.17 + Math.sin(f * Math.PI * 9) * 6,
  };
}

// Pencil-wobbly offset so lines look drawn by hand, not ruled
const wob = (i, amt = 1.6) => (hash(i) - 0.5) * amt * 2;

export const MapData = {
  init() {
    bus.on("step", (steps) => this.reveal(steps));
    this.reveal(state.steps); // also covers old saves
  },

  // Uncover the part of the road you're standing on, plus a little either side
  reveal(steps) {
    const seg = Math.floor((steps % LOOP_STEPS) / SEG);
    for (const s of [seg - 1, seg, seg + 1]) {
      const n = (s + SEGMENTS) % SEGMENTS;
      if (!state.discovered.segments.includes(n)) state.discovered.segments.push(n);
    }
    const biome = BIOMES[Math.floor((steps % LOOP_STEPS) / CONFIG.BIOME_LENGTH)];
    if (!state.discovered.biomes.includes(biome.id)) state.discovered.biomes.push(biome.id);
  },

  isRevealed: (seg) => state.discovered.segments.includes(seg),

  progress() { return Math.round((state.discovered.segments.length / SEGMENTS) * 100); },

  // Plain-text version for screen readers
  describe() {
    const places = BIOMES.filter((b) => state.discovered.biomes.includes(b.id)).map((b) => b.name);
    const lms = landmarkData.landmarks.filter((l) => state.discovered.landmarks.includes(l.id)).map((l) => l.name);
    const secrets = landmarkData.secrets.filter((s) => state.discovered.secrets.includes(s.id)).map((s) => s.name);
    return { places, lms, secrets };
  },

  draw(ctx) {
    // parchment
    ctx.fillStyle = "#e6d8b8";
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    for (let i = 0; i < 220; i++) { // paper flecks
      ctx.fillStyle = `rgba(120,90,50,${0.04 + hash(i + 900) * 0.06})`;
      ctx.fillRect(hash(i) * MAP_W, hash(i + 300) * MAP_H, 1 + hash(i + 600) * 2, 1 + hash(i + 700) * 2);
    }
    const vignette = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_H * 0.3, MAP_W / 2, MAP_H / 2, MAP_W * 0.62);
    vignette.addColorStop(0, "rgba(120,80,30,0)");
    vignette.addColorStop(1, "rgba(120,80,30,0.38)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // color washes where you've been
    for (let s = 0; s < SEGMENTS; s++) {
      if (!this.isRevealed(s)) continue;
      const p = pointAt(s * SEG + SEG / 2);
      const biome = BIOMES[Math.floor((s * SEG) / CONFIG.BIOME_LENGTH)];
      const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 46);
      g.addColorStop(0, rgba(biome.hillNear, 0.5));
      g.addColorStop(1, rgba(biome.hillNear, 0));
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 46, p.y - 46, 92, 92);
    }

    // the road, in short wobbly strokes
    ctx.lineCap = "round";
    ctx.strokeStyle = "#5a3d22";
    ctx.lineWidth = 2.4;
    for (let s = 0; s < SEGMENTS; s++) {
      const revealed = this.isRevealed(s);
      if (!revealed) continue;
      ctx.beginPath();
      for (let i = 0; i <= SEG; i += 2) {
        const p = pointAt(s * SEG + i);
        const x = p.x + wob(s * 31 + i), y = p.y + wob(s * 57 + i + 5);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // unexplored road: faint pencil dots, so you know it continues
    ctx.fillStyle = "rgba(90,61,34,0.28)";
    for (let s = 0; s < SEGMENTS; s++) {
      if (this.isRevealed(s)) continue;
      const p = pointAt(s * SEG + SEG / 2);
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill();
    }

    // place names
    ctx.font = "italic 15px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#4a3320";
    BIOMES.forEach((b, i) => {
      if (!state.discovered.biomes.includes(b.id)) return;
      const p = pointAt(i * CONFIG.BIOME_LENGTH + CONFIG.BIOME_LENGTH / 2);
      ctx.fillText(b.name, p.x, p.y + (i % 2 ? -34 : 44));
    });

    // Grandmother's star near the sea (always visible once you have her map)
    const star = pointAt(LOOP_STEPS - 10);
    this.drawStar(ctx, star.x + 4, star.y - 38, 10, "rgba(180,120,40,0.85)");
    ctx.font = "italic 12px Georgia, serif";
    ctx.fillStyle = "rgba(74,51,32,0.8)";
    ctx.fillText("her star", star.x + 4, star.y - 54);

    // landmarks and secrets you've found
    ctx.font = "18px serif";
    for (const l of landmarkData.landmarks) {
      if (!state.discovered.landmarks.includes(l.id)) continue;
      const p = pointAt(l.at);
      ctx.fillText(l.icon, p.x, p.y - 12);
    }
    for (const s of landmarkData.secrets) {
      if (!state.discovered.secrets.includes(s.id)) continue;
      const p = pointAt(s.at);
      this.drawStar(ctx, p.x, p.y + 18, 6, "rgba(160,90,20,0.95)");
    }

    // you are here
    const me = pointAt(state.steps % LOOP_STEPS);
    ctx.fillStyle = "#b4503c";
    ctx.beginPath(); ctx.arc(me.x, me.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f6dc8a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(me.x, me.y, 9, 0, Math.PI * 2); ctx.stroke();

    // compass rose
    ctx.strokeStyle = "rgba(74,51,32,0.7)"; ctx.lineWidth = 1.4;
    const cx = MAP_W - 44, cy = 46;
    ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy); ctx.stroke();
    ctx.font = "italic 13px Georgia, serif"; ctx.fillStyle = "rgba(74,51,32,0.8)";
    ctx.fillText("N", cx, cy - 25);

    // rough border
    ctx.strokeStyle = "rgba(74,51,32,0.7)"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 6; x <= MAP_W - 6; x += 8) ctx.lineTo(x, 6 + wob(x));
    for (let y = 6; y <= MAP_H - 6; y += 8) ctx.lineTo(MAP_W - 6 + wob(y + 99), y);
    for (let x = MAP_W - 6; x >= 6; x -= 8) ctx.lineTo(x, MAP_H - 6 + wob(x + 199));
    for (let y = MAP_H - 6; y >= 6; y -= 8) ctx.lineTo(6 + wob(y + 299), y);
    ctx.closePath(); ctx.stroke();
  },

  drawStar(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.45 : r;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill();
  },
};
