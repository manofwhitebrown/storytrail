// settings.js - the Menu: time of day, sound, customization, saving.

import { clearSave, save } from "../core/save.js";
import { resetState, state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { Customization } from "../characters/customization.js";
import { Naming } from "../characters/companions/naming.js";
import { Companions } from "../characters/companions/companions.js";
import { Sound } from "../audio/sound.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { HUD } from "./hud.js";
import { Panels } from "./panels.js";

let el = null;
let confirmTimer = null;

function button(label, onClick, pressed) {
  const b = makeEl("button", label);
  b.type = "button";
  if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed));
  b.addEventListener("click", onClick);
  return b;
}

export const Settings = {
  init() {
    el = Panels.create("menu", { className: "centered", label: "Menu", onOpen: () => this.render() });
    document.getElementById("menuBtn").addEventListener("click", () => Panels.open("menu"));
  },

  render() {
    el.replaceChildren(makeEl("h2", "Menu"));

    // Part 12: follow the real clock, or run on in-game time
    const time = makeEl("fieldset", null, "options");
    time.append(makeEl("legend", "Time of day"));
    const setMode = (mode) => {
      if (mode === "game" && state.settings.timeMode === "real") state.time.game = TimeOfDay.t; // continue from now
      state.settings.timeMode = mode;
      TimeOfDay.update(0);
      this.render();
    };
    time.append(
      button("Follow my clock", () => setMode("real"), state.settings.timeMode === "real"),
      button("In-game time", () => setMode("game"), state.settings.timeMode === "game"),
      makeEl("p", `${TimeOfDay.clockText()}, ${TimeOfDay.label()}. ${state.settings.timeMode === "real" ? "Matches the time where you are." : "Time moves as you walk."}`, "menu-sub"),
    );
    el.append(time);

    el.append(makeEl("p", `Season (from the calendar): ${Seasons.label()}`, "menu-sub"));

    const row = makeEl("div", null, "options");
    row.append(
      button(`Sound: ${state.settings.sound ? "on" : "off"}`, () => { Sound.unlock(); Sound.setEnabled(!state.settings.sound); this.render(); }),
      button("Customize traveler", () => Customization.open()),
    );
    if (Companions.has()) row.append(button(`Rename ${state.companion.name}`, () => Naming.open({ rename: true })));
    el.append(row);

    const bottom = makeEl("div", null, "options");
    const reset = button("Start over", () => {
      if (reset.dataset.sure) { clearSave(); resetState(); location.reload(); return; }
      reset.dataset.sure = "1";
      reset.textContent = "Really start over? Press again";
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => { delete reset.dataset.sure; reset.textContent = "Start over"; }, 4000);
    });
    bottom.append(button("Save now", () => { save(); HUD.toast("Saved"); }), reset, button("Close", () => Panels.close("menu")));
    el.append(bottom);
  },
};
