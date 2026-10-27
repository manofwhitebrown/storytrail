// session-summary.js - Part 24. A warm recap of the time you just spent on the road.
//
// It does two jobs:
//   1. It keeps track of "this visit": when it started, how long you were really playing (not idle,
//      not in a hidden tab), and what you did and found since. Other files listen for "session:tick".
//   2. When you choose to rest (Menu -> Wellbeing -> Rest for now, or from a rest reminder) it shows
//      what the visit held, in kind words, and saves.
//
// It never nags and never judges: a visit with nothing to report gets a kind line, too.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { save } from "../core/save.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { fillVars } from "../events/consequences.js";
import { t } from "../i18n/strings.js";
import { Collections } from "../progression/collections.js";
import { Panels } from "../ui/panels.js";
import { Landmarks } from "../world/landmarks.js";
import { Seasons } from "../world/seasons.js";
import { Secrets } from "../world/secrets.js";
import { TimeOfDay } from "../world/time-of-day.js";

let start = null;       // what the world looked like when this visit began
let lastInput = 0;      // epoch ms of the last tap or key press
let panel = null;
let resting = false;    // true when the panel was opened by "Rest for now" (adds a goodbye line)

export const Session = {
  activeSeconds: 0,     // time actually playing this visit
  sinceBreak: 0,        // active seconds since the last rest (or since the start)
  markBreak() { this.sinceBreak = 0; },
  // Anything that should count as "the player is here" calls this (taps, key presses)
  touch(now = Date.now()) { lastInput = now; },
  isActive(now = Date.now()) { return !document.hidden && now - lastInput < CONFIG.REST_IDLE_SECONDS * 1000; },
};

const snapshot = () => ({
  at: Date.now(),
  steps: state.steps,
  tokens: state.tokens,
  landmarks: [...state.discovered.landmarks],
  secrets: [...state.discovered.secrets],
  birds: [...state.collections.birds], flowers: [...state.collections.flowers], songs: [...state.collections.songs],
  letters: state.letters.length,
  achievements: state.achievements.length,
  memories: state.memories.length,
  ended: !!state.story.ended,
});

const added = (now, before) => now.filter((x) => !before.includes(x));

// What this visit held. Pure function of the two snapshots (also used by tests).
export function summarize(from, to, activeSeconds) {
  const found = [];
  for (const id of added(to.landmarks, from.landmarks)) found.push(t("summary.found.landmark", { name: Landmarks.byId(id)?.name ?? id }));
  for (const id of added(to.secrets, from.secrets)) found.push(t("summary.found.secret", { name: Secrets.byId(id)?.name ?? id }));
  for (const [kind, key] of [["birds", "summary.found.bird"], ["flowers", "summary.found.flower"], ["songs", "summary.found.song"]]) {
    for (const id of added(to[kind], from[kind])) found.push(t(key, { name: Collections.find(kind, id)?.name ?? id }));
  }
  if (to.letters > from.letters) found.push(t("summary.found.letters", { n: to.letters - from.letters }));
  if (to.achievements > from.achievements) found.push(t("summary.found.achievements", { n: to.achievements - from.achievements }));
  if (to.memories > from.memories) found.push(t("summary.found.memories", { n: to.memories - from.memories }));
  if (to.ended && !from.ended) found.unshift(t("summary.found.ended"));

  return {
    minutes: Math.max(1, Math.round(activeSeconds / 60)),
    steps: to.steps - from.steps,
    tokens: to.tokens - from.tokens,
    found,
  };
}

// One kind closing line. Order matters: the first one that fits wins.
export function closingLine(sum, ctx) {
  if (ctx.justEnded) return "summary.close.ended";
  if (sum.steps === 0) return "summary.close.still";
  if (ctx.night) return "summary.close.night";
  if (sum.found.length >= 4) return "summary.close.many";
  if (sum.found.length === 0) return "summary.close.none";
  if (ctx.companion) return "summary.close.companion";
  return "summary.close.default";
}

export const SessionSummary = {
  init() {
    start = snapshot();
    state.wellbeing.sessions += 1;
    lastInput = Date.now();

    panel = Panels.create("summary", { className: "centered", label: t("summary.title"), onOpen: () => this.render() });

    // "Is the player here?" is any tap or key press in the last couple of minutes
    window.addEventListener("pointerdown", () => Session.touch(), { passive: true });
    window.addEventListener("keydown", () => Session.touch());

    setInterval(() => {
      if (!Session.isActive()) return;
      Session.activeSeconds += 1;
      Session.sinceBreak += 1;
      bus.emit("session:tick", { active: Session.activeSeconds, sinceBreak: Session.sinceBreak });
      if (Session.activeSeconds % 30 === 0) this.persist(); // so "lastSeen" is right even if the tab is killed
    }, 1000);

    // These listeners are registered BEFORE save.js's, so they run first and the save includes them.
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.persist(); });
    window.addEventListener("pagehide", () => this.persist());
  },

  current() {
    return summarize(start, snapshot(), Session.activeSeconds);
  },

  // Remember when we were last here (for the welcome back) and a short recap of this visit
  persist() {
    const sum = this.current();
    state.wellbeing.lastSeen = Date.now();
    state.wellbeing.lastSession = { minutes: sum.minutes, steps: sum.steps, tokens: sum.tokens, found: sum.found.length, season: Seasons.current };
  },

  // Menu -> Rest for now
  rest() {
    resting = true;
    Session.markBreak();
    this.persist();
    save();
    Panels.open("summary", { replace: Panels.current() === "menu" });
  },

  render() {
    const sum = this.current();
    const key = closingLine(sum, {
      night: TimeOfDay.nightAmt > 0.5,
      companion: !!state.companion?.name,
      justEnded: state.story.ended && !start.ended,
    });

    panel.replaceChildren(makeEl("h2", t("summary.title")));
    panel.append(makeEl("p", t("summary.lead", { name: state.player.name, duration: t("time.minutes", { n: sum.minutes }) }), "menu-sub"));

    const facts = makeEl("ul", null, "plain");
    facts.append(makeEl("li", t("summary.steps", { n: sum.steps })));
    if (sum.tokens > 0) facts.append(makeEl("li", t("summary.tokens", { n: sum.tokens })));
    for (const line of sum.found) facts.append(makeEl("li", line));
    panel.append(facts);

    panel.append(makeEl("p", fillVars(t(key)), "reward"));
    if (resting) panel.append(makeEl("p", t("summary.saved"), "menu-sub"));

    const row = makeEl("div", null, "options");
    const done = makeEl("button", t(resting ? "summary.close" : "summary.keepWalking"));
    done.type = "button"; done.dataset.autofocus = "";
    done.addEventListener("click", () => Panels.close("summary"));
    row.append(done);
    panel.append(row);
    resting = false;
  },
};
