// ui.js - counters, floating text on the canvas, and the toast message.

const UI = {
  stepsEl: document.getElementById("steps"),
  tokensEl: document.getElementById("tokens"),
  hintEl: document.getElementById("hint"),
  toastEl: document.getElementById("toast"),
  toastTimer: null,
  floaters: [], // active popups drawn on the canvas

  updateCounters(state) {
    this.stepsEl.textContent = state.steps;
    this.tokensEl.textContent = state.tokens;
  },

  hideHint() {
    this.hintEl.classList.add("hidden");
  },

  // Rising, fading text on the canvas. life = seconds-ish it stays visible.
  popup(text, x, y, life = 1) {
    this.floaters.push({ text, x, y, life });
  },

  // Small message at the top of the game (e.g. "Journal updated")
  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove("show"), 3000);
  },

  update(dt) {
    for (const f of this.floaters) {
      f.life -= dt * 0.8;
      f.y -= dt * 20;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  },

  draw(ctx) {
    ctx.font = "22px Georgia, serif";
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = "#f2d675";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  },
};
