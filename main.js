// main.js - starts the game, handles input, runs the loop.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ---- Game state (Part 3) ----
const STEPS_PER_TOKEN = 10; // change this to make tokens easier or harder
const state = {
  steps: 0,
  tokens: 0,
};

// ---- Taking a step (Parts 2 + 3) ----
function takeStep() {
  state.steps += 1;
  World.step();
  Player.step();
  UI.hideHint();

  // Every N steps, award a token
  if (state.steps % STEPS_PER_TOKEN === 0) {
    state.tokens += 1;
    UI.popup("+1 token", Player.x, canvas.height * 0.72 - 20);
  }

  UI.updateCounters(state);
}

// ---- Input: tap, click, or keyboard ----
canvas.addEventListener("pointerdown", takeStep);

window.addEventListener("keydown", (e) => {
  if (e.repeat) return; // holding a key shouldn't spam steps
  if (e.code === "Space" || e.code === "ArrowRight") {
    e.preventDefault();
    takeStep();
  }
});

// ---- Main loop: runs ~60 times per second ----
let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // seconds since last frame
  last = now;

  World.update(dt);
  Player.update(dt);
  UI.update(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  World.draw(ctx, canvas.width, canvas.height);
  Player.draw(ctx, canvas.height);
  UI.draw(ctx);

  requestAnimationFrame(loop);
}

UI.updateCounters(state);
requestAnimationFrame(loop);
