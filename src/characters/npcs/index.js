// index.js - everyone you can meet again. To add a character, copy old-traveler.js and list it here.

import { CONFIG } from "../../core/config.js";
import { state } from "../../core/state.js";
import lighthouseKeeper from "./lighthouse-keeper.js";
import oldTraveler from "./old-traveler.js";

export const NPCS = [oldTraveler, lighthouseKeeper];
export const npcById = (id) => NPCS.find((n) => n.id === id);

export const metCount = (id) => state.npcs[id]?.met || 0;

// Who could turn up on the road right now?
export function eligibleNpcs(biomeId) {
  return NPCS.filter((n) => {
    if (!n.biomes.includes(biomeId)) return false;
    const rec = state.npcs[n.id];
    return !rec || state.stats.eventsDone - rec.lastEvent >= CONFIG.NPC_COOLDOWN_EVENTS;
  });
}

// Record a meeting and return the event for it
export function meetNpc(npc) {
  const rec = (state.npcs[npc.id] ||= { met: 0, lastEvent: 0 });
  rec.met += 1;
  rec.lastEvent = state.stats.eventsDone;
  return { npcId: npc.id, meet: rec.met, event: { id: `npc:${npc.id}:${rec.met}`, npc: npc.id, ...npc.encounter(rec.met) } };
}
