// customization.js - Part 14. Name the traveler and pick a coat, hat and lantern.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { Panels } from "../ui/panels.js";

export const COATS = [
  { id: "teal", name: "Teal", color: "#5f8f8b" },
  { id: "rust", name: "Rust", color: "#b5654a" },
  { id: "moss", name: "Moss", color: "#6f8f4e" },
  { id: "plum", name: "Plum", color: "#7a5a8c" },
  { id: "ochre", name: "Ochre", color: "#c79a3b" },
  { id: "slate", name: "Slate", color: "#5b6b8a" },
];
export const HATS = [
  { id: "cap", name: "Flat cap" },
  { id: "brim", name: "Wide brim" },
  { id: "hood", name: "Hood" },
  { id: "beanie", name: "Beanie" },
  { id: "none", name: "No hat" },
];
export const LANTERNS = [
  { id: "brass", name: "Brass", glow: "#ffd98a" },
  { id: "paper", name: "Paper", glow: "#ffb07a" },
  { id: "star", name: "Star", glow: "#cfe8ff" },
];

const find = (list, id) => list.find((o) => o.id === id) || list[0];

export const Customization = {
  // The look the player is drawn with right now
  // (a friend's traveler can be passed in: { coat, hat, lantern } ids)
  look(p = state.player) {
    return {
      coat: find(COATS, p.coat).color,
      hat: find(HATS, p.hat).id,
      lantern: find(LANTERNS, p.lantern).id,
      glow: find(LANTERNS, p.lantern).glow,
    };
  },

  cleanName(text) {
    return (text || "").replace(/\s+/g, " ").trim().slice(0, CONFIG.NAME_MAX) || "Traveler";
  },

  setName(name) {
    state.player.name = this.cleanName(name);
    bus.emit("player:renamed", state.player.name);
  },

  setOption(kind, id) {
    state.player[kind] = id;
    bus.emit("player:changed", kind);
  },

  init() {
    this.el = Panels.create("customize", { className: "centered", label: "Customize your traveler", onOpen: () => this.render() });
  },

  open() { Panels.open("customize", { replace: true }); },

  render() {
    const el = this.el;
    el.replaceChildren();

    const nameLabel = makeEl("label", "Name");
    nameLabel.htmlFor = "nameInput";
    const input = makeEl("input");
    input.type = "text"; input.id = "nameInput"; input.maxLength = CONFIG.NAME_MAX; input.value = state.player.name;
    input.addEventListener("input", () => { state.player.name = this.cleanName(input.value); });

    el.append(makeEl("h2", "Your traveler"), nameLabel, input);
    el.append(this.group("Coat", COATS, "coat"), this.group("Hat", HATS, "hat"), this.group("Lantern", LANTERNS, "lantern"));

    const done = makeEl("button", "Done");
    done.type = "button";
    done.addEventListener("click", () => { this.setName(input.value); Panels.open("menu", { replace: true }); });
    el.append(done);
  },

  group(title, options, kind) {
    const set = makeEl("fieldset", null, "options");
    set.append(makeEl("legend", title));
    for (const o of options) {
      const b = makeEl("button", o.name);
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.player[kind] === o.id));
      if (o.color) b.style.borderLeft = `10px solid ${o.color}`;
      b.addEventListener("click", () => {
        this.setOption(kind, o.id);
        set.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
      });
      set.append(b);
    }
    return set;
  },
};
