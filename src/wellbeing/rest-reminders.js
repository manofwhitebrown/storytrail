// rest-reminders.js - Part 24. A gentle nudge to look up from the screen, now and then.
//
// Rules this file keeps:
//   - It only counts time you are actually playing (not idle, not a hidden tab).
//   - It never interrupts an event, a menu, a secret or the camp: it waits until the road is quiet.
//   - It is always dismissible, and "Keep walking" is exactly as easy to press as "Rest for now".
//   - The player chooses how often (or never) in Menu -> Wellbeing. The default is every 30 minutes.
//   - After one reminder it stays quiet for a whole interval. There is no escalation.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { Camp } from "../progression/camp.js";
import { Panels } from "../ui/panels.js";
import { button } from "../ui/settings.js";
import { SessionSummary, Session } from "./session-summary.js";

export const INTERVALS = [0, 20, 30, 45, 60]; // minutes; 0 = never
let panel = null;
let silencedToday = false; // "not today": lasts until the page is reloaded

// Is it a reasonable moment to speak up?
export const quietRoad = () => state.onboarded && !Panels.isOpen() && !Camp.active;

export function isLate(date = new Date()) {
  const h = date.getHours();
  return h >= 23 || h < 4;
}

export const RestReminders = {
  init() {
    panel = Panels.create("rest", { className: "centered", label: t("rest.title"), onOpen: () => this.render() });
    bus.on("session:tick", ({ sinceBreak }) => {
      const every = state.wellbeing.restEveryMin;
      if (silencedToday || !state.wellbeing.restReminders || !every) return;
      if (sinceBreak >= every * 60 && quietRoad()) this.remind();
    });
  },

  remind() {
    Session.markBreak(); // however it ends, the next reminder is a full interval away
    Panels.open("rest");
  },

  render() {
    const minutes = Math.max(1, Math.round(Session.activeSeconds / 60));
    panel.replaceChildren(makeEl("h2", t("rest.title")));
    panel.append(makeEl("p", t("rest.body", { minutes })));
    if (isLate()) panel.append(makeEl("p", t("rest.late"), "menu-sub"));

    const row = makeEl("div", null, "options");
    const keep = makeEl("button", t("rest.keepWalking")); keep.type = "button"; keep.dataset.autofocus = "";
    keep.addEventListener("click", () => Panels.close("rest"));
    row.append(
      keep,
      button(t("rest.restNow"), () => { Panels.close("rest"); SessionSummary.rest(); }),
      button(t("rest.notToday"), () => { silencedToday = true; Panels.close("rest"); }),
    );
    panel.append(row);
  },

  // Menu: pick how often. "Off" is a real choice, never hidden.
  controls(box, rerender) {
    const row = makeEl("div", null, "options");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", t("wellbeing.remindEvery"));
    row.append(makeEl("span", t("wellbeing.remindEvery"), "menu-sub"));
    for (const m of INTERVALS) {
      const on = m === 0 ? !state.wellbeing.restReminders || !state.wellbeing.restEveryMin : state.wellbeing.restReminders && state.wellbeing.restEveryMin === m;
      row.append(button(t(m === 0 ? "wellbeing.never" : "wellbeing.minutes", { n: m }), () => {
        state.wellbeing.restReminders = m !== 0;
        if (m) state.wellbeing.restEveryMin = m;
        rerender();
      }, on));
    }
    box.append(row);
  },
};
