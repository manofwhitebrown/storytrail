// index.js - joins each chapter's words (story.json) with its hooks (chNN-*.js).

import story from "../../../assets/data/story.json";
import ch01 from "./ch01-the-road-begins.js";
import ch02 from "./ch02-grandmothers-map.js";
import ch03 from "./ch03-the-long-quiet.js";
import ch04 from "./ch04-the-lighthouse.js";

const hooks = Object.fromEntries([ch01, ch02, ch03, ch04].map((h) => [h.id, h]));

export const CHAPTERS = story.chapters.map((c) => ({ ...c, ...hooks[c.id] }));
export const ENDINGS = story.endings;

// Every page in order, remembering which chapter it belongs to
export const PAGES = CHAPTERS.flatMap((c, chapter) => c.pages.map((p) => ({ ...p, chapter })));
