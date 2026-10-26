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
    settings: { timeMode: "real", sound: true }, // timeMode: "real" | "game"
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
