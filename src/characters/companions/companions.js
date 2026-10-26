// companions.js - Part 15. A small friend who walks beside you, has moods and quirks,
// grows closer over time, and sometimes brings gifts.

import { CONFIG } from "../../core/config.js";
import { bus } from "../../core/event-bus.js";
import { state } from "../../core/state.js";
import { Panels } from "../../ui/panels.js";
import { HUD } from "../../ui/hud.js";
import { biomeAt } from "../../world/biomes/index.js";
import { TimeOfDay } from "../../world/time-of-day.js";
import { Weather } from "../../world/weather.js";
import { addBond, levelLabel } from "./bonding.js";
import { maybeGift } from "./gifts.js";
import { Naming } from "./naming.js";
import { mood, quirk, SPECIES, speciesById } from "./personalities.js";

// How each species is drawn. (x, y) = feet on the ground, s = scale, rest = curled up asleep.
const DRAW = {
  fox(ctx, x, y, s, sp, rest) {
    ctx.fillStyle = sp.color;
    ctx.beginPath(); ctx.ellipse(x - 17 * s, y - (rest ? 8 : 18) * s, 12 * s, 5 * s, -0.4, 0, Math.PI * 2); ctx.fill(); // tail
    ctx.beginPath(); ctx.ellipse(x, y - (rest ? 8 : 14) * s, 16 * s, (rest ? 7 : 9) * s, 0, 0, Math.PI * 2); ctx.fill();
    const hx = x + 13 * s, hy = y - (rest ? 10 : 24) * s;
    ctx.beginPath(); ctx.arc(hx, hy, 8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 6 * s, hy - 4 * s); ctx.lineTo(hx - 4 * s, hy - 14 * s); ctx.lineTo(hx, hy - 6 * s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 1 * s, hy - 6 * s); ctx.lineTo(hx + 5 * s, hy - 14 * s); ctx.lineTo(hx + 7 * s, hy - 3 * s); ctx.fill();
    ctx.fillStyle = sp.belly; ctx.beginPath(); ctx.ellipse(hx + 4 * s, hy + 3 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    eye(ctx, hx + 3 * s, hy - 1 * s, s, rest);
  },
  owl(ctx, x, y, s, sp, rest) {
    ctx.fillStyle = sp.color;
    ctx.beginPath(); ctx.ellipse(x, y - 15 * s, 12 * s, (rest ? 11 : 15) * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sp.belly; ctx.beginPath(); ctx.ellipse(x, y - 12 * s, 7 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sp.color;
    ctx.beginPath(); ctx.moveTo(x - 10 * s, y - 27 * s); ctx.lineTo(x - 8 * s, y - 35 * s); ctx.lineTo(x - 3 * s, y - 29 * s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 10 * s, y - 27 * s); ctx.lineTo(x + 8 * s, y - 35 * s); ctx.lineTo(x + 3 * s, y - 29 * s); ctx.fill();
    eye(ctx, x - 4 * s, y - 23 * s, s * 1.5, rest); eye(ctx, x + 4 * s, y - 23 * s, s * 1.5, rest);
    ctx.fillStyle = "#d9a441"; ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 20 * s); ctx.lineTo(x + 2 * s, y - 20 * s); ctx.lineTo(x, y - 16 * s); ctx.fill();
  },
  hare(ctx, x, y, s, sp, rest) {
    ctx.fillStyle = sp.color;
    ctx.beginPath(); ctx.ellipse(x, y - (rest ? 8 : 12) * s, 14 * s, (rest ? 7 : 10) * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sp.belly; ctx.beginPath(); ctx.arc(x - 14 * s, y - 12 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    const hx = x + 12 * s, hy = y - (rest ? 11 : 20) * s;
    ctx.fillStyle = sp.color; ctx.beginPath(); ctx.arc(hx, hy, 7 * s, 0, Math.PI * 2); ctx.fill();
    const ear = rest ? 0.9 : 0;
    ctx.beginPath(); ctx.ellipse(hx - 3 * s, hy - 13 * s + ear * 7 * s, 3 * s, 11 * s, -0.2 - ear, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 3 * s, hy - 13 * s + ear * 7 * s, 3 * s, 11 * s, 0.2 - ear, 0, Math.PI * 2); ctx.fill();
    eye(ctx, hx + 3 * s, hy - 1 * s, s, rest);
  },
};

function eye(ctx, x, y, s, closed) {
  ctx.strokeStyle = ctx.fillStyle = "#1c1822";
  ctx.lineWidth = 1.3;
  if (closed) { ctx.beginPath(); ctx.moveTo(x - 2 * s, y); ctx.lineTo(x + 2 * s, y); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(x, y, 1.5 * s, 0, Math.PI * 2); ctx.fill(); }
}

let hop = 0;

export const Companions = {
  init() {
    Naming.init();
    bus.on("step", (steps) => this.onStep(steps));
    bus.on("event:closed", () => { if (state.companion && !state.companion.name) Naming.open(); });
  },

  has: () => !!state.companion?.name,
  current: () => state.companion,
  species: () => (state.companion ? speciesById(state.companion.species) : null),
  info() {
    const c = state.companion;
    return c ? `${c.name} the ${speciesById(c.species).label}, ${levelLabel(c.bond).toLowerCase()} (${Math.floor(c.bond)} bond)` : "";
  },

  // Time for the companion to appear? (the first event after enough steps)
  shouldOffer: () => !state.companion && state.steps >= CONFIG.COMPANION_OFFER_AFTER_STEPS,

  // Builds a road event with one choice per species
  offerEvent() {
    return {
      id: "companion-offer",
      text: "Something has been following you since the trees: three small shapes at the edge of your lantern light, each pretending not to be interested.",
      choices: SPECIES.map((sp) => ({
        label: sp.choice,
        result: `It pads closer, sniffs your boot, and decides, quite firmly, to stay.`,
        tokens: 1,
        tags: ["kind"],
        onChoose: () => { state.companion = { species: sp.id, name: null, bond: 0, gifts: 0 }; },
      })),
    };
  },

  context() {
    return { biome: biomeAt(state.steps).id, time: TimeOfDay.phase, weather: Weather.type };
  },

  onStep(steps) {
    const c = state.companion;
    if (!c || !c.name) return;
    hop = 1;
    const m = mood(speciesById(c.species), this.context());
    addBond(m === "happy" ? 1 : 0.5); // happier friends grow closer faster
    maybeGift(steps);
    if (steps % CONFIG.QUIRK_EVERY_STEPS === 0) {
      HUD.popup(quirk(speciesById(c.species), c.name, this.context()), 400, 250, 1.8, { size: 15, color: "#dfe8ee" });
    }
  },

  // Resting at camp makes you closer too
  restTick(seconds) { addBond(seconds * CONFIG.BOND_PER_CAMP_SECOND); },

  update(dt) { hop = Math.max(0, hop - dt * 3); },

  // Walking beside the player (or curled up by the fire when `rest`)
  draw(ctx, x, y, rest = false) {
    const c = state.companion;
    if (!c || !c.name) return;
    const sp = speciesById(c.species);
    const bounce = rest ? 0 : Math.sin((1 - hop) * Math.PI) * 6 * hop;
    DRAW[sp.id](ctx, x, y - bounce, 1, sp, rest);
    if (rest) {
      ctx.fillStyle = "rgba(223,232,238,0.7)";
      ctx.font = "13px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("z", x + 22, y - 36 - ((Date.now() / 600) % 2) * 4);
    }
  },
};
