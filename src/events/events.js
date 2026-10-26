// events.js - Part 4, grown up. Every so often the walk pauses for a small choice.
// There are no wrong answers: every choice gives tokens.
//
// What can show up (in this order of priority):
//   1. a companion asking to join you          (once)
//   2. something the world remembers you doing  (callbacks)
//   3. someone you've met before                (NPCs)
//   4. a rare event for this exact moment
//   5. a normal event for this place (or any place)

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl, pick, weightedPick } from "../core/util.js";
import { eligibleNpcs, meetNpc, npcById } from "../characters/npcs/index.js";
import { Companions } from "../characters/companions/companions.js";
import { biomeAt } from "../world/biomes/index.js";
import { Panels } from "../ui/panels.js";
import { applyChoice } from "./choices.js";
import { meets, resolveText } from "./consequences.js";
import { BY_BIOME, callbacks, common, rare } from "./pools/index.js";

let panel = null;
let pending = null;   // the event waiting to be shown
let lastId = null;

const available = (ev) => meets(ev.requires) && !(ev.once && state.eventsSeen.includes(ev.id)) && ev.id !== lastId;

export const Events = {
  init() {
    panel = Panels.create("event", { className: "event", label: "Something on the road", dismissable: false, onOpen: () => this.render() });
    bus.on("step", (steps) => { if (steps % CONFIG.EVENT_EVERY_STEPS === 0) this.start(); });
    bus.on("landmark:found", (lm) => { if (lm.npc) this.startNpc(npcById(lm.npc)); });
  },

  get active() { return Panels.current() === "event"; },

  start() {
    const ev = this.pick();
    if (ev) this.show(ev);
  },

  pick() {
    const biome = biomeAt(state.steps).id;

    if (Companions.shouldOffer()) return Companions.offerEvent();

    const ready = callbacks.filter(available);
    if (ready.length && Math.random() < CONFIG.CALLBACK_CHANCE) return pick(ready);

    const npcs = eligibleNpcs(biome);
    if (npcs.length && Math.random() < CONFIG.NPC_CHANCE) return this.npcEvent(pick(npcs));

    const rares = rare.filter(available);
    if (rares.length && Math.random() < CONFIG.RARE_CHANCE) return pick(rares);

    const pool = [...(BY_BIOME[biome] || []), ...common].filter(available);
    return weightedPick(pool) || pick(common);
  },

  npcEvent(npc) {
    const { npcId, meet, event } = meetNpc(npc);
    event.afterShow = () => bus.emit("npc:met", { npcId, meet });
    return event;
  },

  startNpc(npc) { if (npc) this.show(this.npcEvent(npc)); },

  show(ev) {
    pending = ev;
    lastId = ev.id;
    if (ev.once) state.eventsSeen.push(ev.id);
    Panels.open("event");
  },

  render() {
    const ev = pending;
    panel.replaceChildren();
    const text = makeEl("p", resolveText(ev.text));
    text.id = "eventText";
    panel.setAttribute("aria-labelledby", "eventText");
    const row = makeEl("div", null, "choices");

    ev.choices.forEach((choice, i) => {
      const btn = makeEl("button", choice.label);
      btn.type = "button";
      btn.addEventListener("click", () => this.choose(ev, choice, i));
      row.append(btn);
    });
    panel.append(text, row);
    row.firstChild.dataset.autofocus = "";
    ev.afterShow?.();
  },

  choose(ev, choice, index) {
    const { text, tokens } = applyChoice(ev, choice, index);
    state.stats.eventsDone += 1;

    panel.replaceChildren();
    const result = makeEl("p", text);
    result.id = "eventText";
    const next = makeEl("button", "Keep walking");
    next.type = "button";
    next.addEventListener("click", () => this.close(ev));
    panel.append(result, ...(tokens ? [makeEl("p", `+${tokens} token${tokens > 1 ? "s" : ""}`, "reward")] : []), next);
    next.focus();
  },

  close(ev) {
    Panels.close("event");
    bus.emit("event:closed", ev);
  },
};
