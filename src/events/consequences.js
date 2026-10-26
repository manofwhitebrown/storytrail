// consequences.js - Part 18. How the world remembers you.
// Choices set FLAGS ("fox_friend") and TAGS (kind / curious / restful).
// Later events, dialogue and letters check them with `meets(...)`.
//
// Conditions (all optional, all must be true):
//   { flag: "fox_friend" }  or  { flag: ["a", "b"] }   these flags are set
//   { notFlag: "tea_declined" }                        none of these flags are set
//   { biome: ["forest"], time: ["night"], weather: ["rain"], season: ["autumn"] }
//   { minTokens: 20, minSteps: 100, companion: true }

import { state } from "../core/state.js";
import { biomeAt } from "../world/biomes/index.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Weather } from "../world/weather.js";

const list = (v) => (Array.isArray(v) ? v : [v]);

export function hasFlag(name) { return !!state.flags[name]; }
export function setFlag(name, value = true) { state.flags[name] = value; }

// What the world is like right now (used for conditions)
export function now() {
  return { biome: biomeAt(state.steps).id, time: TimeOfDay.phase, weather: Weather.type, season: Seasons.current };
}

export function meets(cond) {
  if (!cond) return true;
  const n = now();
  if (cond.biome && !cond.biome.includes(n.biome)) return false;
  if (cond.time && !cond.time.includes(n.time)) return false;
  if (cond.weather && !cond.weather.includes(n.weather)) return false;
  if (cond.season && !cond.season.includes(n.season)) return false;
  if (cond.flag && !list(cond.flag).every(hasFlag)) return false;
  if (cond.notFlag && list(cond.notFlag).some(hasFlag)) return false;
  if (cond.minTokens != null && state.tokens < cond.minTokens) return false;
  if (cond.minSteps != null && state.steps < cond.minSteps) return false;
  if (cond.companion != null && !!state.companion?.name !== cond.companion) return false;
  return true;
}

// {name} and {companion} in any text
export function fillVars(text) {
  return String(text)
    .replaceAll("{name}", state.player.name)
    .replaceAll("{companion}", state.companion?.name || "your friend");
}

// Text can be a plain string or a list of parts, where a part can be { if: {...}, text } and
// only appears when the condition is met.   ["Always shown.", { "if": {"flag":"x"}, "text": "Only if x." }]
export function resolveText(parts) {
  if (typeof parts === "string") return fillVars(parts);
  return parts
    .filter((p) => typeof p === "string" || meets(p.if))
    .map((p) => fillVars(typeof p === "string" ? p : p.text))
    .join(" ");
}

export function addTag(tag) {
  if (tag in state.tags) state.tags[tag] += 1;
}

// The tag you lean on most. Ties go kind -> curious -> restful.
export function dominantTag() {
  const order = ["kind", "curious", "restful"];
  return order.reduce((best, t) => (state.tags[t] > state.tags[best] ? t : best), order[0]);
}
