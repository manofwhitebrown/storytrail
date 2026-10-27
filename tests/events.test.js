import { describe, expect, it } from "vitest";
import collections from "../assets/data/collections.json";
import events from "../assets/data/events.json";
import items from "../assets/data/items.json";
import { NPCS } from "../src/characters/npcs/index.js";
import { SPECIES } from "../src/characters/companions/personalities.js";

const itemIds = new Set(items.items.map((i) => i.id));
const all = Object.values(events.pools).flat();
const TAGS = ["kind", "curious", "restful"];

const choicesOf = (ev) => ev.choices ?? [];
const npcEvents = NPCS.flatMap((n) => [1, 2, 3, 4].map((meet) => ({ npc: n.id, meet, ev: n.encounter(meet) })));

describe("road events", () => {
  it("have unique ids", () => {
    const ids = all.map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("have text and at least one choice", () => {
    for (const e of all) { expect(e.text, e.id).toBeTruthy(); expect(choicesOf(e).length, e.id).toBeGreaterThan(0); }
  });

  it("pay tokens for every choice (there is no wrong answer)", () => {
    for (const e of all) for (const c of e.choices) { expect(c.label, e.id).toBeTruthy(); expect(c.result, e.id).toBeTruthy(); expect(Number.isInteger(c.tokens) && c.tokens >= 1, `${e.id}: ${c.label}`).toBe(true); }
  });

  it("only give items, collectables and tags that exist", () => {
    for (const e of all) for (const c of e.choices) {
      if (c.item) expect(itemIds.has(c.item), `${e.id}: item ${c.item}`).toBe(true);
      if (c.collect) expect(collections[c.collect.kind]?.some((x) => x.id === c.collect.id), `${e.id}: ${c.collect.id}`).toBe(true);
      for (const tag of c.tags || []) expect(TAGS).toContain(tag);
    }
  });

  it("have callbacks that wait for something a choice can really set", () => {
    const setByChoices = new Set([...all, ...npcEvents.map((x) => x.ev)].flatMap((e) => choicesOf(e).flatMap((c) => c.set || [])));
    for (const e of events.pools.callbacks) expect(setByChoices.has(e.requires.flag), `${e.id} waits for ${e.requires.flag}`).toBe(true);
  });
});

describe("people", () => {
  it("have unique ids", () => {
    expect(new Set(NPCS.map((n) => n.id)).size).toBe(NPCS.length);
  });

  it("every meeting has text and choices that pay tokens", () => {
    for (const { npc, meet, ev } of npcEvents) {
      expect(ev.text, `${npc} #${meet}`).toBeTruthy();
      expect(ev.choices.length).toBeGreaterThan(0);
      for (const c of ev.choices) expect(c.tokens, `${npc} #${meet}: ${c.label}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("letter ids are unique across everyone, and each says when it arrives", () => {
    const letters = NPCS.flatMap((n) => n.letters.map((l) => ({ npc: n.id, ...l })));
    expect(new Set(letters.map((l) => l.id)).size).toBe(letters.length);
    for (const l of letters) {
      expect(l.afterMeet !== undefined || l.afterFlag !== undefined, l.id).toBe(true);
      expect(l.subject || l.text, l.id).toBeTruthy();
    }
  });

  it("companion gifts and species are consistent", () => {
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
  });
});
