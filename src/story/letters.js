// letters.js - Part 17. People you've met write to you, and their letters remember what you did.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { npcById, NPCS } from "../characters/npcs/index.js";
import { hasFlag, resolveText } from "../events/consequences.js";
import { HUD } from "../ui/hud.js";

export const Letters = {
  init() {
    bus.on("step", (steps) => this.onStep(steps));
    bus.on("npc:met", ({ npcId, meet }) => this.afterMeeting(npcId, meet));
  },

  afterMeeting(npcId, meet) {
    const npc = npcById(npcId);
    for (const l of npc.letters.filter((x) => x.afterMeet === meet)) this.schedule(npcId, l);
  },

  schedule(npcId, letter) {
    if (state.letters.some((x) => x.id === letter.id) || state.letterQueue.some((x) => x.id === letter.id)) return;
    state.letterQueue.push({ npc: npcId, id: letter.id, at: state.steps + letter.delay });
  },

  onStep(steps) {
    // letters that wait for something to happen ("afterFlag") get queued once it has
    if (steps % 10 === 0) {
      for (const npc of NPCS) {
        for (const l of npc.letters) if (l.afterFlag && hasFlag(l.afterFlag) && npcMet(npc.id)) this.schedule(npc.id, l);
      }
    }
    const due = state.letterQueue.filter((q) => q.at <= steps);
    if (!due.length) return;
    state.letterQueue = state.letterQueue.filter((q) => q.at > steps);
    for (const q of due) this.deliver(q.npc, q.id);
  },

  deliver(npcId, letterId) {
    const npc = npcById(npcId);
    const def = npc.letters.find((l) => l.id === letterId);
    if (!def || state.letters.some((l) => l.id === letterId)) return;
    state.letters.push({ id: def.id, from: npc.name, subject: def.subject, text: resolveText(def.parts), step: state.steps, read: false });
    HUD.toast(`✉ A letter from ${npc.name}`);
    HUD.setUnread(true);
    bus.emit("letter:received", def);
  },

  unread: () => state.letters.filter((l) => !l.read).length,

  markRead(id) {
    const l = state.letters.find((x) => x.id === id);
    if (l) l.read = true;
    HUD.setUnread(this.unread() > 0);
  },
};

const npcMet = (id) => (state.npcs[id]?.met || 0) > 0;
