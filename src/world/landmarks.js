// landmarks.js - Part 21. Places worth remembering: a bridge, a windmill, a lighthouse...
// They stand beside the road. Walk past one and it goes into your journal and onto your map.

import data from "../../assets/data/landmarks.json";
import { Assets } from "../core/assets.js";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { cube, pixel } from "../graphics/blocks.js";
import { addTokens } from "../progression/tokens.js";
import { HUD } from "../ui/hud.js";
import { LOOP_STEPS } from "./biomes/index.js";
import { TimeOfDay } from "./time-of-day.js";

const { STEP_DISTANCE, PLAYER_X } = CONFIG;

const STONE = "#6b7280", WOOD = "#5a4535", SAND = "#c9a06b", ICE = "#cfe8f5", WHITE = "#e9e4d6", RED = "#b4503c";

// Each kind draws itself from boxes, standing on the ground at (x, y)
const DRAW = {
  bridge(ctx, x, y) {
    for (const dx of [-88, -11, 66]) cube(ctx, x + dx, y - 30, 22, 30, STONE, 5);   // three piers
    cube(ctx, x - 92, y - 44, 184, 14, STONE, 7);                                    // deck
    for (let i = -84; i <= 84; i += 28) cube(ctx, x + i, y - 62, 8, 18, STONE, 3);   // posts
    cube(ctx, x - 92, y - 66, 184, 5, WOOD, 3);                                      // rail
  },
  windmill(ctx, x, y, t) {
    cube(ctx, x - 20, y - 38, 40, 38, "#d8cdb4", 5);
    cube(ctx, x - 17, y - 76, 34, 38, "#cfc3a8", 5);
    cube(ctx, x - 14, y - 112, 28, 36, "#d8cdb4", 5);
    pixel(ctx, x - 5, y - 20, 10, 20, "#2a1f1a");
    cube(ctx, x - 17, y - 124, 34, 12, WOOD, 4);
    cube(ctx, x - 9, y - 136, 18, 12, WOOD, 4);
    ctx.save(); ctx.translate(x, y - 100); ctx.rotate(t * 0.5);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      pixel(ctx, -2, -64, 4, 64, WOOD);                // spar
      cube(ctx, 2, -62, 14, 34, "#e9d9b8", 2);         // sail cloth
      pixel(ctx, 2, -64, 14, 4, "#d46a6a");            // ribbon
    }
    cube(ctx, -6, -6, 12, 12, WOOD, 3);                 // hub
    ctx.restore();
  },
  cairn(ctx, x, y) {
    [[-22, -16, 44, 16, "#7d8290"], [-17, -30, 34, 14, "#8d92a0"], [-13, -42, 26, 12, "#767b88"], [-9, -52, 18, 10, "#8d92a0"], [-5, -60, 10, 8, "#7d8290"]]
      .forEach(([dx, dy, w, h, c]) => cube(ctx, x + dx, y + dy, w, h, c, 4));
  },
  falls(ctx, x, y) {
    cube(ctx, x - 56, y - 130, 112, 130, "#9db3c8", 7);
    cube(ctx, x - 24, y - 126, 48, 126, ICE, 3);
    for (let i = -18; i <= 18; i += 9) pixel(ctx, x + i, y - 120, 3, 110, "rgba(255,255,255,0.7)");
    for (let i = -50; i <= 50; i += 14) pixel(ctx, x + i, y - 130, 6, 14 + (i % 3) * 3, "#f4f8fc"); // icicles
  },
  arch(ctx, x, y) {
    cube(ctx, x - 76, y - 78, 28, 78, SAND, 6);
    cube(ctx, x + 48, y - 78, 28, 78, SAND, 6);
    cube(ctx, x - 48, y - 94, 12, 16, SAND, 5);         // stepped inside corners
    cube(ctx, x + 36, y - 94, 12, 16, SAND, 5);
    cube(ctx, x - 76, y - 108, 152, 16, SAND, 7);       // lintel
  },
  lighthouse(ctx, x, y) {
    for (let i = 0; i < 5; i++) {
      const w = 60 - i * 6;
      cube(ctx, x - w / 2, y - 30 * (i + 1), w, 30, i % 2 ? RED : WHITE, 5);
    }
    cube(ctx, x - 24, y - 158, 48, 8, "#3a3f4a", 4);
    cube(ctx, x - 12, y - 186, 24, 28, "#f6dc8a", 4);
    cube(ctx, x - 18, y - 196, 36, 10, RED, 4);
    cube(ctx, x - 9, y - 206, 18, 10, RED, 4);
  },
};

// how tall a real picture is drawn, if one is provided (media/images: landmark-<kind>)
const PICTURE_HEIGHT = { bridge: 70, windmill: 140, cairn: 62, falls: 130, arch: 110, lighthouse: 210 };

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
        if (!Assets.draw(ctx, `landmark-${lm.kind}`, x, groundY + 22, PICTURE_HEIGHT[lm.kind] || 120)) DRAW[lm.kind]?.(ctx, x, groundY + 22, clock);
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
