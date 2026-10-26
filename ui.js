// ui.js - the step/token counters and the little "+1" popups.

const UI = {
  stepsEl: document.getElementById("steps"),
  tokensEl: document.getElementById("tokens"),
  hintEl: document.getElementById("hint"),
  floaters: [], // active "+1" popups drawn on the canvas

  updateCounters(state) {
    this.stepsEl.textContent = state.steps;
    this.tokensEl.textContent = state.tokens;
  },

  hideHint() {
    this.hintEl.classList.add("hidden");
  },

  // Show a rising, fading message above the player
  popup(text, x, y) {
    this.floaters.push({ text, x, y, life: 1 });
  },

  update(dt) {
    for (const f of this.floaters) {
      f.life -= dt * 0.8;
      f.y -= dt * 30;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  },

  draw(ctx) {
    ctx.font = "22px Georgia, serif";
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = "#f2d675";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  },
};
