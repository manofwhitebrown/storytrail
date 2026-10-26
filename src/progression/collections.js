// collections.js - Part 22. Birds seen, flowers pressed, songs heard.
// Many are spotted just by walking in the right place at the right time.

import data from "../../assets/data/collections.json";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { meets } from "../events/consequences.js";
import { HUD } from "../ui/hud.js";
import { pick } from "../core/util.js";

const KINDS = ["birds", "flowers", "songs"];
const VERBS = { birds: "You spot a", flowers: "You press a", songs: "You hear" };
const LABELS = { birds: "Birds seen", flowers: "Flowers pressed", songs: "Songs heard" };

export const Collections = {
  kinds: KINDS,
  label: (kind) => LABELS[kind],
  all: (kind) => data[kind],
  find: (kind, id) => data[kind].find((e) => e.id === id),
  has: (kind, id) => state.collections[kind].includes(id),
  count: (kind) => state.collections[kind].length,
  total: (kind) => data[kind].length,
  totalFound: () => KINDS.reduce((n, k) => n + state.collections[k].length, 0),

  init() {
    bus.on("step", (steps) => this.onStep(steps));
  },

  add(kind, id, { silent = false } = {}) {
    const entry = this.find(kind, id);
    if (!entry || this.has(kind, id)) return false;
    state.collections[kind].push(id);
    if (!silent) {
      const text = kind === "songs" ? `You hear: ${entry.name}` : `${VERBS[kind]} ${entry.name}`;
      HUD.toast(`${entry.icon} ${text}`);
    }
    bus.emit("collection:added", { kind, id, entry });
    return true;
  },

  // Every so often, look for something that fits this place, time and weather
  onStep(steps) {
    if (steps % CONFIG.SIGHTING_EVERY_STEPS !== 0) return;
    if (Math.random() > CONFIG.SIGHTING_CHANCE) return;

    const candidates = [];
    for (const kind of KINDS) {
      for (const entry of data[kind]) {
        if (entry.when && !this.has(kind, entry.id) && meets(entry.when)) candidates.push({ kind, id: entry.id });
      }
    }
    if (!candidates.length) return;
    const c = pick(candidates);
    this.add(c.kind, c.id);
  },
};
