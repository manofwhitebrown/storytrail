// main.js - starts the game, handles input, runs the loop.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ---- Game state ----
const STEPS_PER_TOKEN = 10; // change this to make tokens easier or harder
const state = {
  steps: 0,
  tokens: 0,
};

// While an event or the journal is open, walking is paused
function paused() {
  return Events.active || Story.open;
}

// ---- Tokens (used by steps and by events) ----
function addTokens(n) {
  state.tokens += n;
  UI.popup(`+${n} token${n > 1 ? "s" : ""}`, Player.x, canvas.height * 0.72 - 20);
  Story.check(state); // may unlock a journal page
  UI.updateCounters(state);
}

// ---- Place names (Part 6) ----
let shownBiome = -1;
function announceBiome() {
  const i = Math.floor(state.steps / BIOME_LENGTH) % BIOMES.length;
  if (i !== shownBiome) {
    shownBiome = i;
    UI.popup(BIOMES[i].name, canvas.width / 2, 90, 3);
  }
}

// ---- Taking a step ----
function takeStep() {
  if (paused()) return;

  state.steps += 1;
  World.step();
  Player.step();
  UI.hideHint();

  if (state.steps % STEPS_PER_TOKEN === 0) addTokens(1);
  UI.updateCounters(state);
  announceBiome();

  // Every N steps, pause for a small event
  if (state.steps % EVENT_EVERY_STEPS === 0) Events.start();
}

// ---- Input: tap, click, or keyboard ----
canvas.addEventListener("pointerdown", takeStep);

window.addEventListener("keydown", (e) => {
  if (e.repeat) return; // holding a key shouldn't spam steps
  if (e.target.closest("button")) return; // Space on a focused button should click it, not walk
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
announceBiome();
requestAnimationFrame(loop);
