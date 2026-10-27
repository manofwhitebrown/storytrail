// quiet-mode.js - Part 24. One switch for "I want this to be calm right now".
//
// What it changes (and nothing else):
//   sound        no effects, softer music and ambience           (audio/sound.js)
//   notices      ambient toasts and floating text are skipped    (ui/hud.js). Everything is still in the journal.
//   motion       fewer falling leaves, raindrops and snowflakes  (core/util.js calmMotion)
//   events       road events come half as often                  (events/events.js)
//   haptics      no vibration                                    (ui/haptics.js)
// Place names still appear, and so does anything that answers something you just did.

import { Sound } from "../audio/sound.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { HUD } from "../ui/hud.js";
import { Settings, button } from "../ui/settings.js";
import { RestReminders } from "./rest-reminders.js";
import { SessionSummary } from "./session-summary.js";

function apply() {
  const on = !!state.wellbeing.quiet;
  document.body.dataset.quiet = on ? "true" : "false";
  Sound.setQuiet(on);
  bus.emit("calm:change");
}

export const QuietMode = {
  get on() { return !!state.wellbeing.quiet; },

  set(on) {
    state.wellbeing.quiet = !!on;
    apply();
    HUD.toast(t(on ? "quiet.on" : "quiet.off"), { feedback: true });
  },

  init() {
    apply();
    bus.on("state:load", apply);

    Settings.section("wellbeing", 40, (box, rerender) => {
      box.append(makeEl("p", t("quiet.explain"), "menu-sub"));
      const row = makeEl("div", null, "options");
      row.append(button(t(this.on ? "quiet.buttonOn" : "quiet.buttonOff"), () => { this.set(!this.on); rerender(); }, this.on));
      box.append(row);

      RestReminders.controls(box, rerender);

      const rest = makeEl("div", null, "options");
      rest.append(button(t("wellbeing.restNow"), () => SessionSummary.rest()));
      box.append(rest);
    });
  },
};
