// companions.js - Part 15. A small friend who walks beside you, has moods and quirks,
// grows closer over time, and sometimes brings gifts.

import { CONFIG } from "../../core/config.js";
import { bus } from "../../core/event-bus.js";
import { state } from "../../core/state.js";
import { Assets } from "../../core/assets.js";
import { cube, pixel } from "../../graphics/blocks.js";
import { Panels } from "../../ui/panels.js";
import { HUD } from "../../ui/hud.js";
import { biomeAt } from "../../world/biomes/index.js";
import { TimeOfDay } from "../../world/time-of-day.js";
import { Weather } from "../../world/weather.js";
import { addBond, levelLabel } from "./bonding.js";
import { maybeGift } from "./gifts.js";
import { Naming } from "./naming.js";
import { mood, quirk, SPECIES, speciesById } from "./personalities.js";

// How each species is drawn: a few boxes each. (x, y) = feet on the ground, s = scale, rest = curled up asleep.
const DRAW = {
  fox(ctx, x, y, s, sp, rest) {
    cube(ctx, x - 32 * s, y - (rest ? 18 : 26) * s, 16 * s, 9 * s, sp.color, 3 * s);           // tail
    pixel(ctx, x - 32 * s, y - (rest ? 18 : 26) * s, 5 * s, 9 * s, sp.belly);                  // white tip
    if (!rest) { cube(ctx, x - 14 * s, y - 9 * s, 6 * s, 9 * s, "#3a2e2a", 2 * s); cube(ctx, x + 6 * s, y - 9 * s, 6 * s, 9 * s, "#3a2e2a", 2 * s); }
    cube(ctx, x - 17 * s, y - (rest ? 14 : 23) * s, 30 * s, (rest ? 12 : 14) * s, sp.color, 4 * s); // body
    const hx = x + 9 * s, hy = y - (rest ? 24 : 38) * s;
    cube(ctx, hx, hy, 17 * s, 14 * s, sp.color, 3 * s);                                         // head
    cube(ctx, hx + 1 * s, hy - 7 * s, 5 * s, 7 * s, sp.color, 2 * s);                          // ears
    cube(ctx, hx + 11 * s, hy - 7 * s, 5 * s, 7 * s, sp.color, 2 * s);
    pixel(ctx, hx + 9 * s, hy + 7 * s, 8 * s, 7 * s, sp.belly);                                // muzzle
    pixel(ctx, hx + 14 * s, hy + 7 * s, 3 * s, 3 * s, "#1c1822");                              // nose
    eye(ctx, hx + 8 * s, hy + 4 * s, s, rest);
  },
  owl(ctx, x, y, s, sp, rest) {
    const bh = (rest ? 24 : 30) * s;
    cube(ctx, x - 7 * s, y - 4 * s, 4 * s, 4 * s, "#d9a441", 1 * s);                          // feet
    cube(ctx, x + 3 * s, y - 4 * s, 4 * s, 4 * s, "#d9a441", 1 * s);
    cube(ctx, x - 13 * s, y - bh - 4 * s, 26 * s, bh, sp.color, 4 * s);                       // body
    pixel(ctx, x - 7 * s, y - bh * 0.6 - 4 * s, 14 * s, bh * 0.5, sp.belly);                  // belly
    cube(ctx, x - 13 * s, y - bh - 10 * s, 7 * s, 8 * s, sp.color, 2 * s);                    // ear tufts
    cube(ctx, x + 6 * s, y - bh - 10 * s, 7 * s, 8 * s, sp.color, 2 * s);
    for (const dx of [-9, 2]) {
      pixel(ctx, x + dx * s, y - bh + 2 * s, 7 * s, 7 * s, rest ? sp.color : "#f4f1e6");
      eye(ctx, x + (dx + 3.5) * s, y - bh + 5.5 * s, s * 1.4, rest);
    }
    pixel(ctx, x - 2 * s, y - bh + 10 * s, 4 * s, 4 * s, "#d9a441");                          // beak
  },
  hare(ctx, x, y, s, sp, rest) {
    cube(ctx, x - 21 * s, y - (rest ? 14 : 20) * s, 7 * s, 7 * s, sp.belly, 2 * s);           // tail
    cube(ctx, x - 16 * s, y - (rest ? 12 : 20) * s, 30 * s, (rest ? 12 : 18) * s, sp.color, 4 * s);
    if (!rest) { cube(ctx, x - 12 * s, y - 4 * s, 7 * s, 4 * s, sp.color, 2 * s); cube(ctx, x + 6 * s, y - 4 * s, 7 * s, 4 * s, sp.color, 2 * s); }
    const hx = x + 9 * s, hy = y - (rest ? 24 : 36) * s;
    cube(ctx, hx, hy, 14 * s, 14 * s, sp.color, 3 * s);                                        // head
    if (rest) {                                                                                  // ears folded back
      cube(ctx, hx - 8 * s, hy + 1 * s, 12 * s, 4 * s, sp.color, 2 * s);
      cube(ctx, hx - 8 * s, hy + 6 * s, 12 * s, 4 * s, sp.color, 2 * s);
    } else {                                                                                     // ears stand up
      cube(ctx, hx + 1 * s, hy - 16 * s, 4 * s, 16 * s, sp.color, 2 * s);
      cube(ctx, hx + 8 * s, hy - 16 * s, 4 * s, 16 * s, sp.color, 2 * s);
      pixel(ctx, hx + 2 * s, hy - 12 * s, 2 * s, 9 * s, sp.belly);
    }
    pixel(ctx, hx + 11 * s, hy + 8 * s, 3 * s, 3 * s, "#d98a8a");
    eye(ctx, hx + 8 * s, hy + 4 * s, s, rest);
  },
};

function eye(ctx, x, y, s, closed) {
  ctx.fillStyle = "#1c1822";
  if (closed) ctx.fillRect(x - 2 * s, y, 4 * s, 1.5 * s);
  else ctx.fillRect(x - 1.5 * s, y - 1.5 * s, 3 * s, 3 * s);
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

  // Walking beside the player (or curled up by the fire when `rest`).
  // `companion` can be a friend's ({ species, name }, or null for none); left out, it is yours.
  draw(ctx, x, y, rest = false, companion = state.companion) {
    const c = companion;
    if (!c || !c.name) return;
    const sp = speciesById(c.species);
    const bounce = rest ? 0 : Math.sin((1 - hop) * Math.PI) * 6 * hop;
    if (!Assets.draw(ctx, sp.id, x, y - bounce, 44)) DRAW[sp.id](ctx, x, y - bounce, 1, sp, rest);
    if (rest) {
      ctx.fillStyle = "rgba(223,232,238,0.7)";
      ctx.font = "13px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("z", x + 22, y - 36 - ((Date.now() / 600) % 2) * 4);
    }
  },
};
