// landmarks.js - Part 21. Places worth remembering: a bridge, a windmill, a lighthouse...
// They stand beside the road. Walk past one and it goes into your journal and onto your map.

import data from "../../assets/data/landmarks.json";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { addTokens } from "../progression/tokens.js";
import { HUD } from "../ui/hud.js";
import { LOOP_STEPS } from "./biomes/index.js";
import { TimeOfDay } from "./time-of-day.js";

const { STEP_DISTANCE, PLAYER_X } = CONFIG;

const STONE = "#6b7280", WOOD = "#5a4535", SAND = "#c9a06b", ICE = "#cfe8f5", WHITE = "#e9e4d6", RED = "#b4503c";

// Each kind draws itself, standing on the ground at (x, y)
const DRAW = {
  bridge(ctx, x, y) {
    ctx.fillStyle = STONE;
    ctx.fillRect(x - 90, y - 44, 180, 12);
    ctx.fillRect(x - 90, y - 32, 180, 32);
    ctx.fillStyle = "#1d2f3a";
    for (const dx of [-38, 38]) { ctx.beginPath(); ctx.arc(x + dx, y, 24, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = STONE;
    for (let i = -80; i <= 80; i += 32) ctx.fillRect(x + i - 3, y - 60, 6, 16);
  },
  windmill(ctx, x, y, t) {
    ctx.fillStyle = "#d8cdb4";
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 12, y - 110); ctx.lineTo(x + 12, y - 110); ctx.lineTo(x + 22, y); ctx.fill();
    ctx.fillStyle = WOOD;
    ctx.beginPath(); ctx.moveTo(x - 16, y - 108); ctx.lineTo(x, y - 134); ctx.lineTo(x + 16, y - 108); ctx.fill();
    ctx.save(); ctx.translate(x, y - 100); ctx.rotate(t * 0.5);
    ctx.strokeStyle = WOOD; ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -62); ctx.stroke();
      ctx.fillStyle = "#e9d9b8"; ctx.fillRect(2, -60, 14, 34); // sail cloth
      ctx.fillStyle = "#d46a6a"; ctx.fillRect(2, -62, 14, 4);  // ribbon
    }
    ctx.restore();
  },
  cairn(ctx, x, y) {
    ctx.fillStyle = "#7d8290";
    [[0, 0, 44, 16], [-3, -15, 34, 14], [2, -28, 26, 12], [-1, -39, 18, 10], [1, -48, 11, 8]].forEach(([dx, dy, w, h]) => {
      ctx.beginPath(); ctx.ellipse(x + dx, y + dy - h / 2, w, h, 0, 0, Math.PI * 2); ctx.fill();
    });
  },
  falls(ctx, x, y) {
    ctx.fillStyle = "#9db3c8";
    ctx.fillRect(x - 56, y - 130, 112, 130);
    ctx.fillStyle = ICE;
    ctx.fillRect(x - 24, y - 126, 48, 126);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = -18; i <= 18; i += 9) ctx.fillRect(x + i, y - 120, 3, 110);
    ctx.fillStyle = "#f4f8fc"; // icicles
    for (let i = -50; i <= 50; i += 14) { ctx.beginPath(); ctx.moveTo(x + i, y - 130); ctx.lineTo(x + i + 5, y - 130); ctx.lineTo(x + i + 2, y - 114); ctx.fill(); }
  },
  arch(ctx, x, y) {
    ctx.strokeStyle = SAND; ctx.lineWidth = 28; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(x, y - 78, 62, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 62, y - 78); ctx.lineTo(x - 62, y); ctx.moveTo(x + 62, y - 78); ctx.lineTo(x + 62, y); ctx.stroke();
    ctx.lineCap = "round";
  },
  lighthouse(ctx, x, y) {
    ctx.fillStyle = WHITE;
    ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x - 17, y - 150); ctx.lineTo(x + 17, y - 150); ctx.lineTo(x + 30, y); ctx.fill();
    ctx.fillStyle = RED;
    for (const [a, b] of [[28, 56], [88, 116]]) {
      const half = (dy) => 30 - (13 * dy) / 150;
      ctx.beginPath(); ctx.moveTo(x - half(a), y - a); ctx.lineTo(x + half(a), y - a); ctx.lineTo(x + half(b), y - b); ctx.lineTo(x - half(b), y - b); ctx.fill();
    }
    ctx.fillStyle = "#3a3f4a"; ctx.fillRect(x - 24, y - 156, 48, 8);
    ctx.fillStyle = "#f6dc8a"; ctx.fillRect(x - 12, y - 184, 24, 28);
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.moveTo(x - 18, y - 184); ctx.lineTo(x, y - 206); ctx.lineTo(x + 18, y - 184); ctx.fill();
  },
};

let clock = 0;

export const Landmarks = {
  list: data.landmarks,
  byId: (id) => data.landmarks.find((l) => l.id === id),
  found: (id) => state.discovered.landmarks.includes(id),

  init() {
    bus.on("step", (steps) => this.onStep(steps));
  },

  // Walking onto a landmark's spot discovers it
  onStep(steps) {
    const at = steps % LOOP_STEPS;
    for (const lm of this.list) {
      if (lm.at !== at) continue;
      HUD.popup(lm.name, 400, 130, 3);
      if (!this.found(lm.id)) {
        state.discovered.landmarks.push(lm.id);
        HUD.toast(`${lm.icon} You've reached ${lm.name}`);
        addTokens(CONFIG.LANDMARK_TOKENS, "landmark");
        bus.emit("landmark:found", lm);
      }
    }
  },

  update(dt) { clock += dt; },

  // Drawn at "path speed", so each one slides past exactly when you reach it
  draw(ctx, w, groundY, scroll) {
    const pos = scroll / STEP_DISTANCE;
    const loop = Math.floor(pos / LOOP_STEPS);
    for (const lm of this.list) {
      for (const k of [loop - 1, loop, loop + 1]) {
        const x = PLAYER_X + (lm.at + k * LOOP_STEPS - pos) * STEP_DISTANCE;
        if (x < -200 || x > w + 200) continue;
        DRAW[lm.kind]?.(ctx, x, groundY + 22, clock);
      }
    }
  },

  // The lighthouse lamp is drawn after the night darkness so it shines
  drawGlow(ctx, w, groundY, scroll) {
    if (TimeOfDay.nightAmt < 0.1) return;
    const pos = scroll / STEP_DISTANCE;
    const lh = this.byId("lighthouse");
    const loop = Math.floor(pos / LOOP_STEPS);
    for (const k of [loop - 1, loop, loop + 1]) {
      const x = PLAYER_X + (lh.at + k * LOOP_STEPS - pos) * STEP_DISTANCE;
      if (x < -300 || x > w + 300) continue;
      const y = groundY + 22 - 170;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 90);
      g.addColorStop(0, `rgba(255,236,160,${0.8 * TimeOfDay.nightAmt})`);
      g.addColorStop(1, "rgba(255,236,160,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 90, y - 90, 180, 180);
      const dir = Math.sin(clock * 0.5) > 0 ? 1 : -1;      // a slow sweeping beam
      const beam = ctx.createLinearGradient(x, y, x + dir * 260, y);
      beam.addColorStop(0, `rgba(255,236,160,${0.28 * TimeOfDay.nightAmt})`);
      beam.addColorStop(1, "rgba(255,236,160,0)");
      ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + dir * 260, y - 36); ctx.lineTo(x + dir * 260, y + 30); ctx.fill();
    }
  },
};
