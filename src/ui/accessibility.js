// accessibility.js - Part 27. Text size, contrast, motion and vibration, in Menu -> Accessibility.
//
// The settings are saved with the game and applied as attributes on <html>:
//   data-text="normal | large | xlarge"    data-contrast="normal | high"    data-motion="system | reduce"
// styles/accessibility.css does the rest. "Reduce motion" is also read by the code (prefersReducedMotion()),
// so falling leaves, rain, fades and vibration all follow it.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { Haptics } from "./haptics.js";
import { Settings, button } from "./settings.js";

export const TEXT_SIZES = ["normal", "large", "xlarge"];
export const CONTRASTS = ["normal", "high"];
export const MOTIONS = ["system", "reduce"];

// Anything the save file holds that we don't recognise falls back to the default
const pickOr = (list, value) => (list.includes(value) ? value : list[0]);

export function applyAccessibility(root = document.documentElement) {
  const s = state.settings;
  root.dataset.text = pickOr(TEXT_SIZES, s.textSize);
  root.dataset.contrast = pickOr(CONTRASTS, s.contrast);
  root.dataset.motion = pickOr(MOTIONS, s.motion);
}

function group(label, options, current, onPick) {
  const row = makeEl("div", null, "options");
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", label);
  row.append(makeEl("span", label, "menu-sub"));
  for (const [value, text] of options) row.append(button(text, () => onPick(value), current === value));
  return row;
}

export const Accessibility = {
  init() {
    applyAccessibility();
    bus.on("state:load", () => { applyAccessibility(); bus.emit("calm:change"); });

    Settings.section("accessibility", 50, (box, rerender) => {
      const s = state.settings;
      const set = (key, value) => { s[key] = value; applyAccessibility(); bus.emit("calm:change"); rerender(); };

      box.append(
        group(t("a11y.text"), [["normal", t("a11y.text.normal")], ["large", t("a11y.text.large")], ["xlarge", t("a11y.text.xlarge")]], pickOr(TEXT_SIZES, s.textSize), (v) => set("textSize", v)),
        group(t("a11y.contrast"), [["normal", t("a11y.contrast.normal")], ["high", t("a11y.contrast.high")]], pickOr(CONTRASTS, s.contrast), (v) => set("contrast", v)),
        group(t("a11y.motion"), [["system", t("a11y.motion.system")], ["reduce", t("a11y.motion.reduce")]], pickOr(MOTIONS, s.motion), (v) => set("motion", v)),
      );

      if (Haptics.supported()) {
        const row = makeEl("div", null, "options");
        row.append(button(t(s.haptics ? "a11y.haptics.on" : "a11y.haptics.off"), () => { set("haptics", !s.haptics); }, !!s.haptics));
        box.append(row);
      }
      box.append(makeEl("p", t("a11y.note"), "menu-sub"));
    });
  },
};
