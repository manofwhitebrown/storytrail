// achievements.js - Part 22. Discovery-based: you earn them by finding things, not by grinding.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { t } from "../i18n/strings.js";
import { HUD } from "../ui/hud.js";
import { BIOMES } from "../world/biomes/index.js";
import { Collections } from "./collections.js";

export const ACHIEVEMENTS = [
  { id: "first-friend", check: () => !!state.companion?.name },
  { id: "pen-pal", check: () => state.letters.length >= 3 },
  { id: "all-places", check: () => BIOMES.every((b) => state.discovered.biomes.includes(b.id)) },
  { id: "first-shrine", check: () => state.discovered.secrets.includes("hidden-shrine") },
  { id: "moonlit", check: () => state.stats.nightSteps >= 30 },
  { id: "bird-watcher", check: () => Collections.count("birds") >= 5 },
  { id: "flower-press", check: () => Collections.count("flowers") >= 4 },
  { id: "listener", check: () => Collections.count("songs") >= 4 },
  { id: "cartographer", check: () => state.discovered.landmarks.length >= 6 },
  { id: "homebody", check: () => Object.keys(state.camp.slots).length >= 3 },
  { id: "remembered", check: () => state.memories.length >= 3 },
  { id: "first-postcard", check: () => state.social.postcards >= 1 },
  { id: "first-visit", check: () => state.social.visited.length >= 1 },
  { id: "lamp-reached", check: () => !!state.story.ended },
];

export const achName = (id) => t(`ach.${id}.name`);
export const achHint = (id) => t(`ach.${id}.hint`);

export const Achievements = {
  has: (id) => state.achievements.includes(id),

  init() {
    for (const evt of ["tokens", "landmark:found", "secret:found", "collection:added", "camp:changed", "companion:named", "letter:received", "memory:added", "story:ended", "time:phase", "weather:change", "postcard:made", "visit:sat"]) {
      bus.on(evt, () => this.check());
    }
    bus.on("step", (s) => { if (s % 10 === 0) this.check(); });
    this.check({ silent: true });
  },

  check({ silent = false } = {}) {
    for (const a of ACHIEVEMENTS) {
      if (this.has(a.id) || !a.check()) continue;
      state.achievements.push(a.id);
      if (!silent) HUD.toast(t("achievement.toast", { name: achName(a.id) }));
      bus.emit("achievement", a);
    }
  },
};
