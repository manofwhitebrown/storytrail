// player.js - the little traveler. Stays in place while the world scrolls.
// Looks come from customization.js; the lantern lights the dark (see time-of-day.js).

import { CONFIG } from "../core/config.js";
import { Assets } from "../core/assets.js";
import { mixColor, rgba } from "../core/util.js";
import { cube, pixel } from "../graphics/blocks.js";
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
  // opts.look draws someone else (a friend's camp) instead of the player.
  // The traveler is a stack of boxes: two legs, a coat, a scarf, a head, a hat and an arm.
  draw(ctx, h, opts = {}) {
    const x = opts.x ?? this.x;
    const anim = opts.still ? 0 : this.stepAnim;
    const look = opts.look ?? Customization.look();
    const groundY = this.groundY(h);
    const t = 1 - anim;                            // 0 -> 1 during a step
    const hop = Math.sin(t * Math.PI) * 12 * anim;
    const swing = Math.sin(t * Math.PI * 2) * 5 * anim;
    const y = groundY - hop;

    // Shadow (a flat slab)
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x - 16, groundY + 2, 36, 5);

    if (Assets.draw(ctx, "player", x, y + 2, 96)) { this.drawLantern(ctx, x, y, look, anim); return; }

    const skin = "#f1d5b5", dark = "#2a2233";
    const hatColor = mixColor(look.coat, "#101820", 0.45);
    const coatDark = mixColor(look.coat, "#101820", 0.25);

    // Legs (each swings forward and back)
    cube(ctx, x - 10 + swing, y - 14, 7, 14, dark, 3);
    cube(ctx, x + 3 - swing, y - 14, 7, 14, dark, 3);

    // Hood goes behind the head
    if (look.hat === "hood") cube(ctx, x - 13, y - 68, 26, 24, look.coat, 4);

    // Coat, scarf, head
    cube(ctx, x - 12, y - 44, 24, 30, look.coat, 5);
    cube(ctx, x - 13, y - 47, 26, 7, "#f2d675", 4);
    cube(ctx, x - 10, y - 65, 20, 18, skin, 4);
    pixel(ctx, x - 5, y - 58, 3, 4, dark);   // eyes
    pixel(ctx, x + 3, y - 58, 3, 4, dark);

    // Hat
    if (look.hat === "cap") {
      cube(ctx, x - 11, y - 71, 22, 7, hatColor, 4);
      cube(ctx, x + 6, y - 66, 10, 3, hatColor, 2);
    } else if (look.hat === "brim") {
      cube(ctx, x - 18, y - 68, 36, 4, hatColor, 3);
      cube(ctx, x - 9, y - 80, 18, 12, hatColor, 4);
    } else if (look.hat === "beanie") {
      cube(ctx, x - 11, y - 73, 22, 9, hatColor, 4);
      cube(ctx, x - 3, y - 79, 6, 6, "#f2d675", 2);
    } else if (look.hat === "hood") {
      cube(ctx, x - 13, y - 72, 26, 7, look.coat, 4);
    }

    // Arm reaching out to the lantern
    cube(ctx, x + 12, y - 40, 14, 5, coatDark, 3);

    this.drawLantern(ctx, x, y, look, anim);
  },

  drawLantern(ctx, x, y, look, anim) {
    const sway = Math.sin((1 - anim) * Math.PI * 2) * 3 * anim;
    const lx = x + 34 + sway;
    const ly = y - 22;
    this.lantern = { x: lx, y: ly };

    // cord (a thin box)
    ctx.fillStyle = "#2a2233";
    ctx.fillRect(x + 26, y - 38, 2, 8);
    ctx.fillRect(Math.min(x + 26, lx), y - 32, Math.abs(lx - x - 26) + 2, 2);

    // soft halo (stronger in the dark)
    const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, 34);
    halo.addColorStop(0, rgba(look.glow, 0.28 + 0.4 * TimeOfDay.nightAmt));
    halo.addColorStop(1, rgba(look.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(lx - 34, ly - 34, 68, 68);

    if (look.lantern === "brass") {
      cube(ctx, lx - 7, ly - 10, 14, 18, "#b88a3c", 3);
      pixel(ctx, lx - 4, ly - 7, 8, 12, look.glow);
    } else if (look.lantern === "paper") {
      cube(ctx, lx - 8, ly - 10, 16, 20, look.glow, 3);
      pixel(ctx, lx - 1, ly - 10, 2, 20, "rgba(120,60,30,0.5)");
    } else {
      cube(ctx, lx - 3, ly - 10, 6, 20, look.glow, 2);   // a plus-shaped star
      cube(ctx, lx - 10, ly - 3, 20, 6, look.glow, 2);
    }
  },
};
