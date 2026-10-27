// welcome-back.js - Part 24. When you've been away, the road is glad to see you.
//
// Away for WELCOME_BACK_HOURS or more: a warm panel that says what has changed (the season,
// the time of day, who is waiting) and leaves a small, FLAT gift. The gift never grows with the
// time away, so staying away is never "rewarded" and coming back is never "punished".
// There are no streaks anywhere in StoryTrail, and nothing is lost by not showing up.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { fillVars } from "../events/consequences.js";
import { t } from "../i18n/strings.js";
import { Letters } from "../story/letters.js";
import { addTokens } from "../progression/tokens.js";
import { HUD } from "../ui/hud.js";
import { Panels } from "../ui/panels.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";

let panel = null;
let report = null; // what the panel is showing

// How the time away is put into words
export function awayPhrase(hours) {
  if (hours < 36) return t("welcome.away.day");
  const days = Math.round(hours / 24);
  if (days < 14) return t("welcome.away.days", { n: days });
  const weeks = Math.round(days / 7);
  return t("welcome.away.weeks", { n: weeks });
}

export const WelcomeBack = {
  init() {
    panel = Panels.create("welcome-back", { className: "centered", label: t("welcome.aria"), onOpen: () => this.render() });
    // Also if the tab was left open (or the laptop asleep) and you come back to it
    document.addEventListener("visibilitychange", () => { if (!document.hidden) this.check(); });
  },

  // Call once the game has started, and whenever the tab becomes visible again
  check(now = Date.now()) {
    const w = state.wellbeing;
    const last = w.lastSeen;
    if (!state.onboarded || !last || Panels.current() === "welcome") return false;

    const hours = (now - last) / 3.6e6;
    w.lastSeen = now; // from here on we're "here"
    if (hours < CONFIG.WELCOME_BACK_HOURS) return false;

    const was = w.lastSession?.season;
    report = {
      hours,
      seasonChanged: !!was && was !== Seasons.current,
      unread: Letters.unread(),
      tokens: CONFIG.WELCOME_BACK_TOKENS,
    };
    w.returns += 1;
    Panels.open("welcome-back");
    return true;
  },

  render() {
    const r = report;
    panel.replaceChildren(makeEl("h2", t("welcome.title", { name: state.player.name })));
    panel.append(makeEl("p", t("welcome.lead", { away: awayPhrase(r.hours) })));

    const lines = [];
    lines.push(t(r.seasonChanged ? "welcome.season" : "welcome.phase", { season: Seasons.label().toLowerCase(), phase: TimeOfDay.label().toLowerCase() }));
    if (state.companion?.name) lines.push(fillVars(t("welcome.companion")));
    if (r.unread > 0) lines.push(t("welcome.letters", { n: r.unread }));
    for (const l of lines) panel.append(makeEl("p", l));

    panel.append(makeEl("p", t("welcome.gift", { n: r.tokens }), "reward"));
    panel.append(makeEl("p", t("welcome.nothing"), "menu-sub"));

    const go = makeEl("button", t("welcome.thanks"));
    go.type = "button"; go.dataset.autofocus = "";
    go.addEventListener("click", () => this.accept());
    panel.append(go);
  },

  // The gift is handed over once, when the player says thank you (or closes with Escape)
  accept() {
    Panels.close("welcome-back");
  },
};

// The gift and the flourish happen when the panel opens, exactly once per return
bus.on("panel:open", (id) => {
  if (id !== "welcome-back" || !report || report.given) return;
  report.given = true;
  addTokens(report.tokens, "welcome-back");
  HUD.popup(t("welcome.popup"), 400, 120, 3, { always: true });
  bus.emit("welcome:back", report);
});
