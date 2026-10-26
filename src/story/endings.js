// endings.js - Part 19. When the last page is read, the story ends - but the road stays open.
// Which ending you get depends on how you tended to act (kind / curious / restful).

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { dominantTag, resolveText, setFlag } from "../events/consequences.js";
import { Panels } from "../ui/panels.js";
import { ENDINGS, PAGES } from "./chapters/index.js";

let el = null;

export const Endings = {
  init() {
    el = Panels.create("ending", { className: "journal-like ending", label: "The ending", dismissable: false, onOpen: () => this.render() });
  },

  current: () => ENDINGS.find((e) => e.id === state.story.ended),

  check() {
    if (state.story.ended || state.story.unlocked < PAGES.length) return;
    state.story.ended = dominantTag();
    setFlag("story_ended");
    bus.emit("story:ended", state.story.ended);
    Panels.open("ending");
  },

  render() {
    const end = this.current();
    el.replaceChildren(makeEl("h2", end.title));
    for (const p of end.paragraphs) el.append(makeEl("p", resolveText(p)));
    el.append(makeEl("p", "The story is finished. The road is not.", "reward"));
    const go = makeEl("button", "Keep walking");
    go.type = "button";
    go.addEventListener("click", () => Panels.close("ending"));
    el.append(go);
  },
};
