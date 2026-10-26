// unlocks.js - features that appear as you play, so the first minutes stay simple.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { HUD } from "../ui/hud.js";

const RULES = [
  { id: "map", tokens: CONFIG.UNLOCK_MAP_TOKENS, button: "mapBtn", message: "Grandmother's map is yours: open the Map" },
  { id: "camp", tokens: CONFIG.UNLOCK_CAMP_TOKENS, button: "campBtn", message: "You can make camp now: open Camp" },
];

export const Unlocks = {
  has: (id) => state.unlocks.includes(id),

  init() {
    bus.on("tokens", () => this.check());
    bus.on("state:load", () => this.check({ silent: true }));
    this.check({ silent: true });
  },

  check({ silent = false } = {}) {
    for (const r of RULES) {
      if (state.tokens < r.tokens) continue;
      HUD.reveal(r.button);
      if (!this.has(r.id)) {
        state.unlocks.push(r.id);
        if (!silent) HUD.toast(r.message);
        bus.emit("unlocked", r.id);
      }
    }
  },
};
