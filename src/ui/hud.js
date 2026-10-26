// hud.js - counters, floating text on the canvas, and the toast message.

import { state } from "../core/state.js";

let stepsEl, tokensEl, hintEl, toastEl, phaseEl, journalBtn;
let toastTimer = null;
let floaters = []; // active popups drawn on the canvas

export const HUD = {
  init() {
    stepsEl = document.getElementById("steps");
    tokensEl = document.getElementById("tokens");
    hintEl = document.getElementById("hint");
    toastEl = document.getElementById("toast");
    phaseEl = document.getElementById("phase");
    journalBtn = document.getElementById("journalBtn");
    this.updateCounters();
  },

  updateCounters() {
    stepsEl.textContent = state.steps;
    tokensEl.textContent = state.tokens;
  },

  hideHint() { hintEl.classList.add("hidden"); },

  setPhase(text) { phaseEl.textContent = text; },

  // Little dot on the Journal button when there is a letter you haven't read
  setUnread(on) { journalBtn.dataset.unread = on ? "true" : "false"; },

  reveal(buttonId) { document.getElementById(buttonId)?.classList.remove("hidden"); },

  // Rising, fading text on the canvas. life = seconds-ish it stays visible.
  popup(text, x, y, life = 1, opts = {}) {
    floaters.push({ text, x, y, life, size: opts.size || 22, color: opts.color || "#f2d675" });
  },

  // Small message at the top of the game (e.g. "Journal updated")
  toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
  },

  update(dt) {
    for (const f of floaters) {
      f.life -= dt * 0.8;
      f.y -= dt * 20;
    }
    floaters = floaters.filter((f) => f.life > 0);
  },

  draw(ctx) {
    ctx.textAlign = "center";
    for (const f of floaters) {
      ctx.font = `${f.size}px Georgia, serif`;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = "rgba(10,14,30,0.55)";      // soft shadow keeps text readable on bright skies
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  },
};
