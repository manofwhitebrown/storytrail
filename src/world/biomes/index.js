// index.js - the list of places, in the order you walk through them.
// To add a place: make a new file like meadow.js and add it to BIOMES.

import { CONFIG } from "../../core/config.js";
import coast from "./coast.js";
import desert from "./desert.js";
import forest from "./forest.js";
import meadow from "./meadow.js";
import mountains from "./mountains.js";
import snowfields from "./snowfields.js";

export const BIOMES = [forest, meadow, mountains, snowfields, desert, coast];
export const BIOME_BY_ID = Object.fromEntries(BIOMES.map((b) => [b.id, b]));

// After the last place the road loops back to the first.
export const LOOP_STEPS = CONFIG.BIOME_LENGTH * BIOMES.length;

export const COLOR_KEYS = ["skyTop", "skyBottom", "hillFar", "hillNear", "tree", "ground", "path", "pebble", "seaColor", "accent"];
export const NUMBER_KEYS = ["treeDensity", "hillAmp", "jagged", "sea", "seasonal"];

export const biomeIndexAt = (steps) => Math.floor(steps / CONFIG.BIOME_LENGTH) % BIOMES.length;
export const biomeAt = (steps) => BIOMES[biomeIndexAt(steps)];

// How much of each place you're "in" right now, as { forest: 1, meadow: 0, ... } (adds up to 1).
// Uses the same fade as the scenery (world.js blendBiomes), so sound changes exactly when the view does.
// pos can be fractional (World.pos()); the audio files use it to crossfade smoothly.
export function biomeWeightsAt(pos) {
  const { BIOME_LENGTH, BLEND_STEPS } = CONFIG;
  const idx = Math.floor(pos / BIOME_LENGTH);
  const into = pos - idx * BIOME_LENGTH;
  let t = Math.min(1, Math.max(0, (into - (BIOME_LENGTH - BLEND_STEPS)) / BLEND_STEPS));
  t = t * t * (3 - 2 * t);
  const out = Object.fromEntries(BIOMES.map((b) => [b.id, 0]));
  out[BIOMES[((idx % BIOMES.length) + BIOMES.length) % BIOMES.length].id] += 1 - t;
  out[BIOMES[(((idx + 1) % BIOMES.length) + BIOMES.length) % BIOMES.length].id] += t;
  return out;
}
