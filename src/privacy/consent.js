// consent.js - Part 27. Asks ONCE, politely, and only when it matters:
// the question appears only if an analytics address is set (CONFIG.ANALYTICS_ENDPOINT), the player
// has not answered, and the device has not asked not to be tracked. Otherwise the game never asks
// and the Menu simply says that nothing is sent. The answer can be changed any time in Menu -> Privacy.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { save } from "../core/save.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { Camp } from "../progression/camp.js";
import { Panels } from "../ui/panels.js";
import { Settings, button } from "../ui/settings.js";
import { doNotTrack, isConfigured } from "./analytics.js";

let panel = null;
let askedThisSession = false;

export const Consent = {
  shouldAsk: () => isConfigured() && !doNotTrack() && state.privacy.analytics === "unset",

  set(answer) {
    if (answer !== "yes" && answer !== "no") return;
    state.privacy.analytics = answer;
    save();
    bus.emit("privacy:changed", answer);
  },

  init() {
    panel = Panels.create("consent", { className: "centered", label: t("privacy.ask.title"), onOpen: () => this.render() });

    // not before the tutorial is over, never over camp, never twice in one visit
    bus.on("step", (steps) => {
      if (askedThisSession || steps < CONFIG.WELCOME_TOKEN_AT_STEP + 30 || !state.onboarded) return;
      if (!this.shouldAsk() || Panels.isOpen() || Camp.active || Camp.visiting) return;
      askedThisSession = true;
      Panels.open("consent");
    });

    Settings.section("privacy", 60, (box, rerender) => {
      if (!isConfigured()) { box.append(makeEl("p", t("privacy.none"), "menu-sub")); return; }
      if (doNotTrack()) { box.append(makeEl("p", t("privacy.dnt"), "menu-sub")); return; }
      const on = state.privacy.analytics === "yes";
      box.append(makeEl("p", t(`privacy.status.${state.privacy.analytics}`), "menu-sub"), makeEl("p", t("privacy.detail"), "menu-sub"));
      const row = makeEl("div", null, "options");
      row.append(button(t(on ? "privacy.turnOff" : "privacy.turnOn"), () => { this.set(on ? "no" : "yes"); rerender(); }));
      box.append(row);
    });
  },

  render() {
    panel.replaceChildren(makeEl("h2", t("privacy.ask.title")), makeEl("p", t("privacy.ask.body")));
    const row = makeEl("div", null, "row");
    const yes = button(t("privacy.yes"), () => { this.set("yes"); Panels.close("consent"); });
    const no = button(t("privacy.no"), () => { this.set("no"); Panels.close("consent"); });
    no.dataset.autofocus = "";   // the quiet choice is the one under the cursor
    row.append(no, yes);
    panel.append(row);
  },
};
