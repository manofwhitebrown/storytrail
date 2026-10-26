// personalities.js - Part 15. Each companion has likes, dislikes and little quirks.
// Data lives in assets/data/companions.json so you can add species without code.

import data from "../../../assets/data/companions.json";
import { pick } from "../../core/util.js";

export const SPECIES = data.species;
export const speciesById = (id) => SPECIES.find((s) => s.id === id) || SPECIES[0];

// ctx = { biome, time, weather }.  +1 for each thing they like, -1 for each they dislike.
export function moodScore(species, ctx) {
  let score = 0;
  for (const key of ["biome", "time", "weather"]) {
    if (species.likes[key]?.includes(ctx[key])) score += 1;
    if (species.dislikes[key]?.includes(ctx[key])) score -= 1;
  }
  return score;
}

export function mood(species, ctx) {
  const s = moodScore(species, ctx);
  return s >= 1 ? "happy" : s < 0 ? "uneasy" : "content";
}

// A line of behaviour that fits their mood (and sometimes the night)
export function quirk(species, name, ctx) {
  const lines = ctx.time === "night" && Math.random() < 0.35 ? species.quirks.night : species.quirks[mood(species, ctx)];
  return pick(lines).replaceAll("{name}", name);
}
