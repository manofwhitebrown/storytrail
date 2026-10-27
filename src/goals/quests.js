// quests.js - Part 28. Gentle errands: take on up to CONFIG.MAX_ACTIVE_ERRANDS at a time.
// No timers, no streaks, nothing expires. Words and numbers: assets/data/quests.json.
//
// This file also holds the shared "what counts as progress" mapping (METRICS / metricsFor)
// that daily.js and seasonal.js use, so all three agree on what a "step" or a "song" means.

import data from "../../assets/data/quests.json";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { t } from "../i18n/strings.js";
import { Inventory } from "../progression/inventory.js";
import { addTokens } from "../progression/tokens.js";
import { HUD } from "../ui/hud.js";

export const ERRANDS = data.errands;
export const DAILY_POOL = data.daily;
export const SEASONAL = data.seasonal;

// bus event -> list of { metric, n, kind? }
const SOURCES = {
  step: () => [{ metric: "steps", n: 1 }],
  tokens: (p) => (p?.source === "goal" ? [] : [{ metric: "tokens", n: p?.n || 0 }]),
  "landmark:found": () => [{ metric: "landmarks", n: 1 }],
  "collection:added": (p) => [{ metric: "collections", n: 1, kind: p?.kind }],
  "item:gained": () => [{ metric: "items", n: 1 }],
  "letter:received": () => [{ metric: "letters", n: 1 }],
  "memory:added": () => [{ metric: "memories", n: 1 }],
  "camp:changed": () => [{ metric: "camp", n: 1 }],
  "postcard:made": () => [{ metric: "postcards", n: 1 }],
  "visit:sat": (p) => (p?.first ? [{ metric: "visits", n: 1 }] : []),
  "event:closed": () => [{ metric: "events", n: 1 }],
};
export const METRICS = ["steps", "tokens", "landmarks", "collections", "items", "letters", "memories", "camp", "postcards", "visits", "events"];

let paying = false; // rewards must not count as progress (a rewarded item is not "a find")

export function metricsFor(evt, payload) {
  if (paying) return [];
  return SOURCES[evt]?.(payload) ?? [];
}

// Does one counted thing apply to a goal definition?
export const applies = (def, m) => def.metric === m.metric && (!def.kind || def.kind === m.kind);

// Subscribe to everything that can count. handler(m) gets { metric, n, kind }.
export function listenMetrics(handler) {
  for (const evt of Object.keys(SOURCES)) {
    bus.on(evt, (payload) => { for (const m of metricsFor(evt, payload)) if (m.n > 0) handler(m); });
  }
}

export function pay(reward = {}) {
  paying = true;
  try {
    if (reward.tokens) addTokens(reward.tokens, "goal");
    if (reward.item) Inventory.give(reward.item, 1, { silent: true });
  } finally { paying = false; }
}

export const Quests = {
  init() {
    listenMetrics((m) => this.count(m));
  },

  byId: (id) => ERRANDS.find((e) => e.id === id),
  active: () => state.goals.active.map((id) => Quests.byId(id)).filter(Boolean),
  available: () => ERRANDS.filter((e) => !state.goals.active.includes(e.id) && !state.goals.done.includes(e.id)),
  progress: (id) => state.goals.progress[id] || 0,
  canTakeMore: () => state.goals.active.length < CONFIG.MAX_ACTIVE_ERRANDS,

  accept(id) {
    const e = this.byId(id);
    if (!e || !this.canTakeMore() || state.goals.active.includes(id) || state.goals.done.includes(id)) return false;
    state.goals.active.push(id);
    state.goals.progress[id] = 0;
    bus.emit("goals:changed");
    return true;
  },

  // Putting one down is always fine: nothing is lost but the count
  abandon(id) {
    const i = state.goals.active.indexOf(id);
    if (i < 0) return false;
    state.goals.active.splice(i, 1);
    delete state.goals.progress[id];
    bus.emit("goals:changed");
    return true;
  },

  count(m) {
    let changed = false;
    for (const e of this.active()) {
      if (!applies(e, m)) continue;
      state.goals.progress[e.id] = Math.min(e.goal, this.progress(e.id) + m.n);
      changed = true;
      if (state.goals.progress[e.id] >= e.goal) this.finish(e);
    }
    if (changed) bus.emit("goals:changed");
  },

  finish(e) {
    state.goals.active = state.goals.active.filter((id) => id !== e.id);
    delete state.goals.progress[e.id];
    if (!state.goals.done.includes(e.id)) state.goals.done.push(e.id);
    HUD.toast(t("goals.errand.done", { title: e.title }), { feedback: true });
    pay(e.reward);
    bus.emit("goals:done", { kind: "errand", id: e.id });
  },
};
