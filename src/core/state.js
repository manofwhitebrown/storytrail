// state.js - ONE place for everything the game remembers (and saves).
// Other files import `state` and read/write it directly.

import { CONFIG } from "./config.js";

export function createDefaultState() {
  return {
    version: CONFIG.SAVE_VERSION,

    // progress
    steps: 0,
    tokens: 0,

    // onboarding (Part 11)
    onboarded: false,
    onboardStep: "welcome", // welcome -> walk -> journal -> done

    // traveler (Parts 11, 14)
    player: { name: "Traveler", coat: "teal", hat: "cap", lantern: "brass" },
    settings: {
      timeMode: "real",                          // "real" | "game"
      sound: true,
      volume: { music: 0.6, ambience: 1, sfx: 0.8 }, // Part 23
      textSize: "normal",                        // normal | large | xlarge     (Part 27)
      contrast: "normal",                        // normal | high
      motion: "system",                          // system | reduce
      haptics: true,
      lang: "en",
    },
    time: { game: 0.3 },                         // in-game clock, 0..1 of a day

    // story (Parts 18-19)
    story: { unlocked: 0, ended: null },
    flags: {},                                   // things that happened, e.g. { fox_friend: true }
    tags: { kind: 0, curious: 0, restful: 0 },   // how you tend to act; picks the ending
    memories: [],                                // { id, text, step }
    eventsSeen: [],                              // ids of one-time events already shown

    // people (Parts 15, 17)
    companion: null,                             // { species, name, bond, gifts }
    npcs: {},                                    // id -> { met, lastEvent }
    letters: [],                                 // { id, from, subject, text, step, read }
    letterQueue: [],                             // { npc, id, at }

    // things (Part 16)
    inventory: {},                               // itemId -> count
    camp: { slots: {}, visits: 0 },              // slotId -> itemId
    unlocks: [],                                 // feature ids already announced

    // discovery (Parts 21-22)
    discovered: { biomes: [], landmarks: [], secrets: [], segments: [] },
    collections: { birds: [], flowers: [], songs: [] },
    achievements: [],

    stats: { tokensEarned: 0, nightSteps: 0, eventsDone: 0 },

    // wellbeing (Part 24)
    wellbeing: {
      quiet: false,                              // quiet mode
      restReminders: true,
      restEveryMin: CONFIG.REST_REMINDER_MINUTES, // 0 = never
      lastSeen: 0,                               // epoch ms; 0 = never (new player)
      lastSession: null,                         // { minutes, steps, tokens, found: [...] }
      sessions: 0,
      returns: 0,                                // times welcomed back
    },

    // social (Part 25): all of it stays on this device unless the player shares a link
    social: { postcards: 0, visited: [], campId: "" }, // visited: ids of camps you've sat by; campId: a random id for YOUR camp (made on first share)

    // goals (Part 25b)
    goals: {
      active: [],                                // errand ids taken on (max CONFIG.MAX_ACTIVE_ERRANDS)
      done: [],
      progress: {},                              // errand id -> count
      daily: { date: "", id: "", n: 0, done: false },
      seasonal: { key: "", done: [], progress: {} },
    },

    // privacy (Part 27)
    privacy: { analytics: "unset" },             // unset | yes | no
  };
}

export const state = createDefaultState();

// Swap in a loaded save without breaking other files' references to `state`
export function replaceState(next) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
}

export function resetState() {
  replaceState(createDefaultState());
}
