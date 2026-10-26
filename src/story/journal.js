// journal.js - Part 22. What the journal contains: diary pages, letters, memories,
// and the sketches, stamps and pressed flowers you've collected.

import landmarkData from "../../assets/data/landmarks.json";
import { state } from "../core/state.js";
import { Collections } from "../progression/collections.js";
import { Story } from "./story.js";
import { Memories } from "./memories.js";

export const Journal = {
  diary: () => Story.chapters.map((c, ci) => ({
    title: c.title,
    pages: c.pages.map((p) => ({ ...p, unlocked: Story.pages.findIndex((x) => x.id === p.id) < state.story.unlocked })),
    reached: Story.pages.some((p) => p.chapter === ci && p.tokens <= state.tokens),
  })),

  letters: () => [...state.letters].reverse(),
  memories: () => Memories.list(),

  // Stamps: one for each landmark and secret you've found
  stamps: () => [
    ...landmarkData.landmarks.map((l) => ({ ...l, got: state.discovered.landmarks.includes(l.id), secret: false })),
    ...landmarkData.secrets.map((s) => ({ ...s, got: state.discovered.secrets.includes(s.id), secret: true })),
  ],

  // Sketches / pressed flowers / songs for one kind
  entries: (kind) => Collections.all(kind).map((e) => ({ ...e, got: Collections.has(kind, e.id) })),
};
