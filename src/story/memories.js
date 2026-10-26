// memories.js - Part 18. Small moments the world holds onto. They show up in the journal
// and are the raw material for letters and endings.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { fillVars } from "../events/consequences.js";

export const Memories = {
  add(id, text) {
    if (state.memories.some((m) => m.id === id)) return;
    state.memories.push({ id, text, step: state.steps });
    bus.emit("memory:added", { id, text });
  },
  has(id) { return state.memories.some((m) => m.id === id); },
  list() { return state.memories.map((m) => ({ ...m, text: fillVars(m.text) })); },
};
