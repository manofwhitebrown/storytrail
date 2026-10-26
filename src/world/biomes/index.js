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
