// daily.js - Part 28. One small thing a day. No streaks: missing a day costs nothing,
// and there is no counter of "days in a row" anywhere. A new day just offers a new thing.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { t } from "../i18n/strings.js";
import { HUD } from "../ui/hud.js";
import { DAILY_POOL, applies, listenMetrics, pay } from "./quests.js";

// "2026-10-27" in the player's own timezone
export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// The same date always picks the same thing (so reloading does not reroll it)
export function pickFor(key) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DAILY_POOL[h % DAILY_POOL.length];
}

export const Daily = {
  init() {
    this.ensureToday();
    listenMetrics((m) => this.count(m));
    document.addEventListener?.("visibilitychange", () => { if (!document.hidden) this.ensureToday(); });
  },

  ensureToday(date = new Date()) {
    const key = dateKey(date);
    const d = state.goals.daily;
    if (d.date === key && DAILY_POOL.some((x) => x.id === d.id)) return d;
    state.goals.daily = { date: key, id: pickFor(key).id, n: 0, done: false };
    bus.emit("goals:changed");
    return state.goals.daily;
  },

  current() {
    const d = this.ensureToday();
    const def = DAILY_POOL.find((x) => x.id === d.id);
    return def ? { ...def, n: d.n, done: d.done } : null;
  },

  count(m) {
    const cur = this.current();
    if (!cur || cur.done || !applies(cur, m)) return;
    const d = state.goals.daily;
    d.n = Math.min(cur.goal, d.n + m.n);
    if (d.n >= cur.goal) {
      d.done = true;
      HUD.toast(t("goals.daily.done"), { feedback: true });
      pay({ tokens: CONFIG.DAILY_TOKENS });
      bus.emit("goals:done", { kind: "daily", id: cur.id });
    }
    bus.emit("goals:changed");
  },
};
