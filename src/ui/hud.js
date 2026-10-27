// hud.js - counters, floating text on the canvas, and the toast message.
// In quiet mode (Part 24) ambient toasts and popups are skipped. Pass { feedback: true } (toast) or
// { always: true } (popup) for the few that must always show.

import { state } from "../core/state.js";

let stepsEl, tokensEl, hintEl, toastEl, phaseEl, journalBtn;
let toastTimer = null;
const quietOn = () => !!state.wellbeing?.quiet;
// Which slice of the 800px-wide scene is on screen (a tall phone crops the sides). main.js keeps this up to date.
const view = { left: 0, width: 800 };
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
    if (!opts.always && quietOn()) return;
    floaters.push({ text, x, y, life, size: opts.size || 22, color: opts.color || "#f2d675" });
  },

  // Small message at the top of the game (e.g. "Journal updated")
  // opts.feedback: true = a direct answer to something the player just did ("Saved"), so it's always shown
  toast(text, opts = {}) {
    if (!opts.feedback && quietOn()) return; // quiet mode keeps ambient notices out of the way (everything is still in the journal)
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

  setView(left, width) { view.left = left; view.width = width; },

  draw(ctx) {
    ctx.textAlign = "center";
    for (const f of floaters) {
      ctx.font = `${f.size}px Georgia, serif`;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      const x = view.width < 800 ? view.left + (f.x / 800) * view.width : f.x;   // keep popups inside a cropped view
      const max = view.width < 800 ? view.width - 24 : undefined;               // and squeeze long ones to fit
      ctx.fillStyle = "rgba(10,14,30,0.55)";      // soft shadow keeps text readable on bright skies
      ctx.fillText(f.text, x + 1, f.y + 1, max);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, f.y, max);
    }
    ctx.globalAlpha = 1;
  },
};
