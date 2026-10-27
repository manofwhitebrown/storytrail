// naming.js - Part 15. "What will you call them?"

import { CONFIG } from "../../core/config.js";
import { bus } from "../../core/event-bus.js";
import { state } from "../../core/state.js";
import { makeEl, pick } from "../../core/util.js";
import { Panels } from "../../ui/panels.js";
import { HUD } from "../../ui/hud.js";
import { speciesById } from "./personalities.js";

let el = null;
let renaming = false;

export const Naming = {
  init() {
    el = Panels.create("naming", { className: "centered", label: "Name your companion", dismissable: false, onOpen: () => this.render() });
  },

  open({ rename = false } = {}) {
    renaming = rename;
    Panels.open("naming", { replace: rename });
  },

  render() {
    const c = state.companion;
    const species = speciesById(c.species);
    el.replaceChildren();

    const label = makeEl("label", renaming ? `A new name for ${c.name}` : `What will you call your ${species.label}?`);
    label.htmlFor = "companionName";
    const input = makeEl("input");
    input.type = "text"; input.id = "companionName"; input.maxLength = CONFIG.NAME_MAX;
    input.value = c.name || pick(species.names);
    input.dataset.autofocus = "";

    const another = makeEl("button", "Suggest another");
    another.type = "button";
    another.addEventListener("click", () => { input.value = pick(species.names); input.focus(); });

    const ok = makeEl("button", renaming ? "Save" : "That's the one");
    ok.type = "button";
    const finish = () => {
      const name = (input.value || "").replace(/\s+/g, " ").trim().slice(0, CONFIG.NAME_MAX) || pick(species.names);
      const first = !c.name;
      c.name = name;
      Panels.close("naming");
      if (first) { HUD.toast(`${name} is walking with you now`); bus.emit("companion:named", c); }
      else if (renaming) Panels.open("menu");
    };
    ok.addEventListener("click", finish);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") finish(); });

    const cancel = makeEl("button", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => { Panels.close("naming"); Panels.open("menu"); });

    el.append(makeEl("h2", `A ${species.label}`), makeEl("p", `Personality: ${species.traits.join(", ")}.`), label, input, makeEl("div", null, "row"));
    el.lastChild.append(another, ...(renaming ? [cancel] : []), ok);
  },
};
