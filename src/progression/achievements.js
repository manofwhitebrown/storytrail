// achievements.js - Part 22. Discovery-based: you earn them by finding things, not by grinding.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { HUD } from "../ui/hud.js";
import { BIOMES } from "../world/biomes/index.js";
import { Collections } from "./collections.js";

export const ACHIEVEMENTS = [
  { id: "first-friend",  name: "A Friend on the Road", hint: "Let something follow you.", check: () => !!state.companion?.name },
  { id: "pen-pal",       name: "Pen Pal", hint: "Receive three letters.", check: () => state.letters.length >= 3 },
  { id: "all-places",    name: "Every Kind of Weather", hint: "Visit every place on the road.", check: () => BIOMES.every((b) => state.discovered.biomes.includes(b.id)) },
  { id: "first-shrine",  name: "Found the Hidden Shrine", hint: "Some places only show themselves at the edges of the day.", check: () => state.discovered.secrets.includes("hidden-shrine") },
  { id: "moonlit",       name: "Moonlit Walker", hint: "Walk 30 steps in the dark.", check: () => state.stats.nightSteps >= 30 },
  { id: "bird-watcher",  name: "Bird Watcher", hint: "See five kinds of bird.", check: () => Collections.count("birds") >= 5 },
  { id: "flower-press",  name: "Flower Press", hint: "Press four flowers.", check: () => Collections.count("flowers") >= 4 },
  { id: "listener",      name: "A Good Listener", hint: "Hear four songs.", check: () => Collections.count("songs") >= 4 },
  { id: "cartographer",  name: "Cartographer", hint: "Reach all six landmarks.", check: () => state.discovered.landmarks.length >= 6 },
  { id: "homebody",      name: "Home by the Fire", hint: "Decorate your camp with three things.", check: () => Object.keys(state.camp.slots).length >= 3 },
  { id: "remembered",    name: "The Road Remembers", hint: "Make three memories.", check: () => state.memories.length >= 3 },
  { id: "lamp-reached",  name: "The Lamp Is Lit", hint: "Reach the end of the story.", check: () => !!state.story.ended },
];

export const Achievements = {
  has: (id) => state.achievements.includes(id),

  init() {
    for (const evt of ["tokens", "landmark:found", "secret:found", "collection:added", "camp:changed", "companion:named", "letter:received", "memory:added", "story:ended", "time:phase", "weather:change"]) {
      bus.on(evt, () => this.check());
    }
    bus.on("step", (s) => { if (s % 10 === 0) this.check(); });
    this.check({ silent: true });
  },

  check({ silent = false } = {}) {
    for (const a of ACHIEVEMENTS) {
      if (this.has(a.id) || !a.check()) continue;
      state.achievements.push(a.id);
      if (!silent) HUD.toast(`🏅 ${a.name}`);
      bus.emit("achievement", a);
    }
  },
};
