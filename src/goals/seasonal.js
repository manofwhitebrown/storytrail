// seasonal.js - Part 28. Two small goals for each season of the real calendar. Finish both and
// you are given a keepsake for your camp (once, ever). The key is "2026-autumn", so a new year
// of the same season starts fresh, but a keepsake you already have is never given twice.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { t } from "../i18n/strings.js";
import { Inventory } from "../progression/inventory.js";
import { HUD } from "../ui/hud.js";
import { seasonOf } from "../world/seasons.js";
import { SEASONAL, applies, listenMetrics, pay } from "./quests.js";

export function seasonKey(date = new Date()) {
  return `${date.getFullYear()}-${seasonOf(date)}`;
}

const seasonName = (key) => key.split("-")[1];

export const Seasonal = {
  init() {
    this.ensureSeason();
    listenMetrics((m) => this.count(m));
  },

  ensureSeason(date = new Date()) {
    const key = seasonKey(date);
    if (state.goals.seasonal.key !== key) {
      state.goals.seasonal = { key, done: [], progress: {} };
      bus.emit("goals:changed");
    }
    return SEASONAL[seasonName(key)];
  },

  current() {
    const def = this.ensureSeason();
    const s = state.goals.seasonal;
    return {
      season: seasonName(s.key),
      keepsake: def.keepsake,
      goals: def.goals.map((g) => ({ ...g, n: s.progress[g.id] || 0, done: s.done.includes(g.id) })),
    };
  },

  count(m) {
    const cur = this.current();
    const s = state.goals.seasonal;
    let changed = false;
    for (const g of cur.goals) {
      if (g.done || !applies(g, m)) continue;
      s.progress[g.id] = Math.min(g.goal, (s.progress[g.id] || 0) + m.n);
      changed = true;
      if (s.progress[g.id] >= g.goal) {
        s.done.push(g.id);
        HUD.toast(t("goals.seasonal.done"), { feedback: true });
        pay({ tokens: CONFIG.SEASONAL_TOKENS });
        bus.emit("goals:done", { kind: "seasonal", id: g.id });
      }
    }
    if (changed) {
      if (cur.goals.every((g) => s.done.includes(g.id))) this.giveKeepsake(cur.keepsake);
      bus.emit("goals:changed");
    }
  },

  giveKeepsake(id) {
    const flag = `keepsake_${id}`;
    if (state.flags[flag]) return;
    state.flags[flag] = true;
    const item = Inventory.get(id);
    if (!item) return;
    pay({ item: id });
    HUD.toast(t("goals.seasonal.keepsake", { name: item.name, emoji: item.emoji }), { feedback: true });
  },
};
