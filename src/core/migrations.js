// migrations.js - upgrades OLD saves to the current format so players never lose progress.
//
// HOW TO ADD ONE: when you change the save format, raise CONFIG.SAVE_VERSION by 1 and add
// an entry below keyed by the OLD version number. It receives the old save and returns the new one.
// Anything you forget is filled in from the defaults afterwards (fillDefaults), so most
// "just added a new field" changes need no migration at all.

import { CONFIG } from "./config.js";
import { createDefaultState } from "./state.js";

const UPGRADES = {
  // v1 (Part 10: steps, tokens, journalUnlocked) -> v2 (Part 11: onboarding)
  1(s) {
    const hasProgress = (s.steps || 0) > 0 || (s.tokens || 0) > 0;
    s.onboarded = hasProgress;              // people who already play skip the tutorial
    s.onboardStep = hasProgress ? "done" : "welcome";
    s.player = { ...(s.player || {}), name: s.player?.name || "Traveler" };
    return s;
  },

  // v2 -> v3 (Parts 12-14: time, settings, customization)
  2(s) {
    s.settings = { timeMode: "real", sound: true, ...(s.settings || {}) };
    s.time = { game: 0.3, ...(s.time || {}) };
    s.player = { coat: "teal", hat: "cap", lantern: "brass", ...(s.player || {}) };
    return s;
  },

  // v3 -> v4 (Parts 15-17: companions, camp, NPCs, letters)
  3(s) {
    s.companion ??= null;
    s.camp ??= { slots: {}, visits: 0 };
    s.inventory ??= {};
    s.npcs ??= {};
    s.letters ??= [];
    s.letterQueue ??= [];
    s.unlocks ??= [];
    return s;
  },

  // v4 -> v5 (Parts 18-22: chapters, memories, discovery)
  4(s) {
    // The journal used to be "how many pages are unlocked". Pages now belong to chapters,
    // so we start at 0 and let Story.check() re-unlock everything the token total has earned.
    s.story = { unlocked: 0, ended: null };
    delete s.journalUnlocked;
    s.flags ??= {};
    s.memories ??= [];
    s.discovered ??= { biomes: [], landmarks: [], secrets: [], segments: [] };
    s.collections ??= { birds: [], flowers: [], songs: [] };
    s.achievements ??= [];
    return s;
  },
};

export function migrate(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return createDefaultState();

  let s = JSON.parse(JSON.stringify(raw)); // never touch the caller's object
  let v = Number.isInteger(s.version) && s.version >= 1 ? s.version : 1;

  while (v < CONFIG.SAVE_VERSION) {
    if (UPGRADES[v]) s = UPGRADES[v](s);
    v += 1;
    s.version = v;
  }
  return fillDefaults(createDefaultState(), s);
}

// Keep what the save has; fill in anything missing; ignore values of the wrong type.
function fillDefaults(def, saved) {
  if (saved === undefined) return def;
  if (def === null) return saved;
  if (Array.isArray(def)) return Array.isArray(saved) ? saved : def;

  if (typeof def === "object") {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return def;
    if (Object.keys(def).length === 0) return saved; // free-form map (flags, inventory...)
    const out = {};
    for (const k of Object.keys(def)) out[k] = fillDefaults(def[k], saved[k]);
    return out;
  }

  if (typeof def === "number") return Number.isFinite(saved) ? saved : def;
  return typeof saved === typeof def ? saved : def;
}
