// settings.js - the Menu: time of day, sound, the traveler, and a few more sections that
// other files add themselves (Wellbeing, Accessibility, Share & visit, Privacy).
//
// HOW TO ADD A SECTION to the menu from any file:
//     Settings.section("wellbeing", 40, (el, rerender) => { el.append(...) });
// `order` decides where it appears (lower = higher up). The callback is given the section's
// element and a function that redraws the whole menu (call it after changing something).

import { Sound } from "../audio/sound.js";
import { Companions } from "../characters/companions/companions.js";
import { Naming } from "../characters/companions/naming.js";
import { Customization } from "../characters/customization.js";
import { clearSave, save } from "../core/save.js";
import { resetState, state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { applyStatic, language, languages, setLanguage, t } from "../i18n/strings.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { HUD } from "./hud.js";
import { Panels } from "./panels.js";

let el = null;
let confirmTimer = null;
const sections = []; // { id, order, fn }
const open = new Set(["sound"]); // which sections are expanded (remembered while the page is open)

export function button(label, onClick, pressed) {
  const b = makeEl("button", label);
  b.type = "button";
  if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed));
  b.addEventListener("click", onClick);
  return b;
}

// A labelled 0-100 slider
export function slider(label, value, onInput) {
  const wrap = makeEl("label", null, "slider");
  const text = makeEl("span", label);
  const input = makeEl("input");
  input.type = "range"; input.min = "0"; input.max = "100"; input.step = "5";
  input.value = String(Math.round(value * 100));
  input.addEventListener("input", () => onInput(Number(input.value) / 100));
  wrap.append(text, input);
  return wrap;
}

export const Settings = {
  init() {
    el = Panels.create("menu", { className: "centered menu", label: t("menu.title"), onOpen: () => this.render() });
    document.getElementById("menuBtn").addEventListener("click", () => Panels.open("menu"));

    this.section("language", 5, (box, rerender) => this.languageSection(box, rerender));
    this.section("time", 10, (box, rerender) => this.timeSection(box, rerender));
    this.section("sound", 20, (box, rerender) => this.soundSection(box, rerender));
    this.section("traveler", 30, (box) => this.travelerSection(box));
  },

  section(id, order, fn) {
    sections.push({ id, order, fn });
    sections.sort((a, b) => a.order - b.order);
  },

  render() {
    const focused = document.activeElement?.closest?.("summary")?.parentElement?.dataset?.section;
    el.replaceChildren(makeEl("h2", t("menu.title")));

    for (const s of sections) {
      const d = makeEl("details", null, "menu-section");
      d.dataset.section = s.id;
      d.open = open.has(s.id);
      d.addEventListener("toggle", () => { if (d.open) open.add(s.id); else open.delete(s.id); });
      d.append(makeEl("summary", t(`menu.section.${s.id}`)));
      const body = makeEl("div", null, "menu-body");
      s.fn(body, () => this.render());
      d.append(body);
      el.append(d);
    }

    const bottom = makeEl("div", null, "options menu-bottom");
    const reset = button(t("menu.startOver"), () => {
      if (reset.dataset.sure) { clearSave(); resetState(); location.reload(); return; }
      reset.dataset.sure = "1";
      reset.textContent = t("menu.startOverSure");
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => { delete reset.dataset.sure; reset.textContent = t("menu.startOver"); }, 4000);
    });
    bottom.append(button(t("menu.save"), () => { save(); HUD.toast(t("menu.saved"), { feedback: true }); }), reset, button(t("menu.close"), () => Panels.close("menu")));
    el.append(bottom);

    if (focused) el.querySelector(`[data-section="${focused}"] summary`)?.focus();
  },

  // Part 27: pick the language of the interface (add one by following strings.js)
  languageSection(box, rerender) {
    const row = makeEl("div", null, "options");
    for (const code of languages()) {
      let name = code;
      try { name = new Intl.DisplayNames([code], { type: "language" }).of(code) || code; } catch { /* keep the code */ }
      row.append(button(name, () => {
        state.settings.lang = code;
        setLanguage(code);
        applyStatic();
        rerender();
      }, language() === code));
    }
    box.append(makeEl("p", t("menu.language.label"), "menu-sub"), row);
  },

  // Part 12: follow the real clock, or run on in-game time
  timeSection(box, rerender) {
    const time = makeEl("div", null, "options");
    const setMode = (mode) => {
      if (mode === "game" && state.settings.timeMode === "real") state.time.game = TimeOfDay.t; // continue from now
      state.settings.timeMode = mode;
      TimeOfDay.update(0);
      rerender();
    };
    time.append(
      button(t("menu.time.real"), () => setMode("real"), state.settings.timeMode === "real"),
      button(t("menu.time.game"), () => setMode("game"), state.settings.timeMode === "game"),
      makeEl("p", t("menu.time.now", { clock: TimeOfDay.clockText(), phase: TimeOfDay.label(), how: t(state.settings.timeMode === "real" ? "menu.time.howReal" : "menu.time.howGame") }), "menu-sub"),
    );
    box.append(time, makeEl("p", t("menu.season", { season: Seasons.label() }), "menu-sub"));
  },

  // Part 23: master switch and three mixer sliders
  soundSection(box, rerender) {
    const vol = state.settings.volume;
    const row = makeEl("div", null, "options");
    row.append(button(t(state.settings.sound ? "menu.sound.on" : "menu.sound.off"), () => { Sound.unlock(); Sound.setEnabled(!state.settings.sound); rerender(); }, state.settings.sound));
    box.append(row);
    if (!state.settings.sound) return;
    box.append(
      slider(t("menu.sound.music"), vol.music, (v) => Sound.setVolume("music", v)),
      slider(t("menu.sound.ambience"), vol.ambience, (v) => Sound.setVolume("ambience", v)),
      slider(t("menu.sound.sfx"), vol.sfx, (v) => Sound.setVolume("sfx", v)),
    );
  },

  travelerSection(box) {
    const row = makeEl("div", null, "options");
    row.append(button(t("menu.customize"), () => Customization.open()));
    if (Companions.has()) row.append(button(t("menu.rename", { name: state.companion.name }), () => Naming.open({ rename: true })));
    box.append(row);
  },
};
