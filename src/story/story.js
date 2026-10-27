// story.js - Part 19. Diary pages unlock as your token total grows, grouped into chapters.
// Words: assets/data/story.json.  Chapter events: story/chapters/*.js

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { setFlag } from "../events/consequences.js";
import { t } from "../i18n/strings.js";
import { Inventory } from "../progression/inventory.js";
import { HUD } from "../ui/hud.js";
import { CHAPTERS, PAGES } from "./chapters/index.js";
import { Endings } from "./endings.js";

const api = {
  setFlag,
  giveItem: (id) => Inventory.give(id),
  toast: (t) => HUD.toast(t),
};

export const Story = {
  chapters: CHAPTERS,
  pages: PAGES,

  init() {
    bus.on("tokens", () => this.check());
    bus.on("landmark:found", () => this.check()); // some pages wait for a place
    this.check({ silent: true }); // old saves: quietly catch up
  },

  isUnlocked: (i) => i < state.story.unlocked,
  chapterIndex() {
    const last = PAGES[Math.max(0, state.story.unlocked - 1)];
    return last ? last.chapter : 0;
  },

  // Call whenever tokens change
  check({ silent = false } = {}) {
    while (state.story.unlocked < PAGES.length && state.tokens >= PAGES[state.story.unlocked].tokens) {
      const page = PAGES[state.story.unlocked];
      if (page.landmark && !state.discovered.landmarks.includes(page.landmark)) break; // wait until you get there
      const chapter = CHAPTERS[page.chapter];
      const firstOfChapter = chapter.pages[0].id === page.id;
      const lastOfChapter = chapter.pages[chapter.pages.length - 1].id === page.id;
      state.story.unlocked += 1;

      if (!silent) {
        HUD.toast(t("story.updated", { title: page.title }));
        if (firstOfChapter) HUD.popup(t("story.chapter", { num: page.chapter + 1, title: chapter.title }), 400, 90, 3.5);
      }
      if (firstOfChapter && !silent) chapter.onEnter?.(api);
      if (lastOfChapter && !silent) chapter.onComplete?.(api);
      bus.emit("story:page", page);
    }
    if (!silent) Endings.check();
  },
};
