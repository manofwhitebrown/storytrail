// player.js - the little traveler. Stays in place while the world scrolls.
// Looks come from customization.js; the lantern lights the dark (see time-of-day.js).

import { CONFIG } from "../core/config.js";
import { mixColor, rgba, roundRect } from "../core/util.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Customization } from "./customization.js";

export const Player = {
  x: CONFIG.PLAYER_X,
  stepAnim: 0,          // 1 right after a step, fades to 0
  lantern: { x: 0, y: 0 }, // where the lantern was drawn (used for lighting)

  step() { this.stepAnim = 1; },

  update(dt) { this.stepAnim = Math.max(0, this.stepAnim - dt * 2.5); },

  groundY(h) { return h * CONFIG.GROUND_RATIO + 70; },

  // opts.x lets the camp draw the traveler somewhere else; opts.still stops the walking bounce;
  // opts.look draws someone else (a friend's camp) instead of the player
  draw(ctx, h, opts = {}) {
    const x = opts.x ?? this.x;
    const anim = opts.still ? 0 : this.stepAnim;
    const look = opts.look ?? Customization.look();
    const groundY = this.groundY(h);
    const t = 1 - anim;                            // 0 -> 1 during a step
    const hop = Math.sin(t * Math.PI) * 12 * anim;
    const swing = Math.sin(t * Math.PI * 2) * 8 * anim;
    const y = groundY - hop;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, groundY + 4, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = "#2a2233";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 14); ctx.lineTo(x - 6 + swing, y);
    ctx.moveTo(x + 6, y - 14); ctx.lineTo(x + 6 - swing, y);
    ctx.stroke();

    // Hood goes behind the head
    const hatColor = mixColor(look.coat, "#101820", 0.45);
    if (look.hat === "hood") {
      ctx.fillStyle = look.coat;
      ctx.beginPath(); ctx.arc(x, y - 60, 15, 0, Math.PI * 2); ctx.fill();
    }

    // Body (a coat)
    ctx.fillStyle = look.coat;
    roundRect(ctx, x - 14, y - 46, 28, 36, 8);

    // Scarf
    ctx.fillStyle = "#f2d675";
    roundRect(ctx, x - 14, y - 48, 28, 7, 3);

    // Head
    ctx.fillStyle = "#f1d5b5";
    ctx.beginPath(); ctx.arc(x, y - 60, 11, 0, Math.PI * 2); ctx.fill();

    // Hat
    ctx.fillStyle = hatColor;
    if (look.hat === "cap") {
      roundRect(ctx, x - 13, y - 74, 26, 8, 4);
    } else if (look.hat === "brim") {
      ctx.beginPath(); ctx.ellipse(x, y - 67, 20, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      roundRect(ctx, x - 10, y - 80, 20, 14, 5);
    } else if (look.hat === "beanie") {
      ctx.beginPath(); ctx.arc(x, y - 63, 12, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#f2d675";
      ctx.beginPath(); ctx.arc(x, y - 76, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (look.hat === "hood") {
      ctx.fillStyle = look.coat;
      ctx.beginPath(); ctx.arc(x, y - 63, 13, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    }

    this.drawLantern(ctx, x, y, look, anim);
  },

  drawLantern(ctx, x, y, look, anim) {
    const sway = Math.sin((1 - anim) * Math.PI * 2) * 3 * anim;
    const lx = x + 26 + sway;
    const ly = y - 22;
    this.lantern = { x: lx, y: ly };

    // arm and cord
    ctx.strokeStyle = "#2a2233"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 12, y - 36); ctx.lineTo(x + 22, y - 31); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x + 22, y - 31); ctx.lineTo(lx, ly - 8); ctx.stroke();

    // soft halo (stronger in the dark)
    const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, 34);
    halo.addColorStop(0, rgba(look.glow, 0.28 + 0.4 * TimeOfDay.nightAmt));
    halo.addColorStop(1, rgba(look.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(lx - 34, ly - 34, 68, 68);

    if (look.lantern === "brass") {
      ctx.fillStyle = "#b88a3c"; roundRect(ctx, lx - 6, ly - 9, 12, 16, 3);
      ctx.fillStyle = look.glow; roundRect(ctx, lx - 3.5, ly - 6, 7, 10, 2);
    } else if (look.lantern === "paper") {
      ctx.fillStyle = look.glow;
      ctx.beginPath(); ctx.ellipse(lx, ly, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(120,60,30,0.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(lx, ly, 3, 9, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = look.glow;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 9;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(lx + Math.cos(a) * r, ly + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    }
  },
};
