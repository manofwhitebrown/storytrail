import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../src/core/config.js";
import { migrate } from "../src/core/migrations.js";
import { clearSave, hasSave, load, save } from "../src/core/save.js";
import { createDefaultState, resetState, state } from "../src/core/state.js";

const KEY = CONFIG.SAVE_KEY;
const shape = (o) => Object.keys(o).sort();

beforeEach(() => { localStorage.clear(); resetState(); vi.spyOn(console, "warn").mockImplementation(() => {}); });

describe("save and load", () => {
  it("round-trips progress", () => {
    state.steps = 123; state.tokens = 12; state.player.name = "Sam"; state.camp.slots["hang-1"] = "tiny-bell";
    save();
    expect(hasSave()).toBe(true);
    resetState();
    expect(load()).toBe(true);
    expect(state.steps).toBe(123);
    expect(state.player.name).toBe("Sam");
    expect(state.camp.slots["hang-1"]).toBe("tiny-bell");
  });

  it("returns false when there is nothing saved, and clearSave empties it", () => {
    expect(load()).toBe(false);
    save(); clearSave();
    expect(hasSave()).toBe(false);
  });

  it("keeps a corrupt save aside and starts fresh", () => {
    localStorage.setItem(KEY, "{not json");
    expect(load()).toBe(false);
    expect(localStorage.getItem(KEY + ".corrupt")).toBe("{not json");
    expect(state.steps).toBe(0);
  });

  it("backs up a save from a newer version once, and never overwrites that backup", () => {
    const original = JSON.stringify({ ...createDefaultState(), version: CONFIG.SAVE_VERSION + 5, steps: 77, futureThing: true });
    localStorage.setItem(KEY, original);
    expect(load()).toBe(true);
    expect(state.steps).toBe(77);
    expect(localStorage.getItem(KEY + ".newer")).toBe(original);
    save();                                   // the autosave now holds a version without "futureThing"
    load();
    expect(localStorage.getItem(KEY + ".newer")).toBe(original);
  });
});

describe("migrations", () => {
  const OLD = {
    1: { version: 1, steps: 40, tokens: 6, journalUnlocked: 2 },
    2: { version: 2, steps: 40, tokens: 6, onboarded: true, onboardStep: "done", player: { name: "Sam" } },
    3: { version: 3, steps: 40, tokens: 6, onboarded: true, settings: { timeMode: "game", sound: false }, time: { game: 0.5 }, player: { name: "Sam", coat: "red", hat: "cap", lantern: "brass" } },
    4: { version: 4, steps: 40, tokens: 6, companion: null, camp: { slots: {}, visits: 2 }, inventory: { acorn: 1 }, journalUnlocked: 3 },
    5: { version: 5, steps: 40, tokens: 6, story: { unlocked: 3, ended: null }, memories: [{ id: "m", text: "x", step: 1 }] },
  };

  for (const v of Object.keys(OLD)) {
    it(`upgrades a version ${v} save to the current version without losing steps or tokens`, () => {
      const out = migrate(OLD[v]);
      expect(out.version).toBe(CONFIG.SAVE_VERSION);
      expect(out.steps).toBe(40);
      expect(out.tokens).toBe(6);
      expect(shape(out)).toEqual(shape(createDefaultState()));
      expect(shape(out.goals)).toEqual(shape(createDefaultState().goals));
      expect(shape(out.settings)).toEqual(shape(createDefaultState().settings));
    });
  }

  it("version 1: people who already play skip the tutorial; new ones do not", () => {
    expect(migrate({ version: 1, steps: 5, tokens: 1 }).onboarded).toBe(true);
    expect(migrate({ version: 1, steps: 0, tokens: 0 }).onboardStep).toBe("welcome");
  });

  it("version 4 -> 5: pages are re-earned from tokens and the old field is gone", () => {
    const out = migrate(OLD[4]);
    expect(out.story).toEqual({ unlocked: 0, ended: null });
    expect(out).not.toHaveProperty("journalUnlocked");
    expect(out.inventory).toEqual({ acorn: 1 });
  });

  it("version 5 -> 6: existing players are not welcomed back as if they had been away", () => {
    expect(migrate(OLD[5]).wellbeing.lastSeen).toBe(0);
  });

  it("keeps settings from old saves and fills in the new ones", () => {
    const out = migrate(OLD[3]);
    expect(out.settings.timeMode).toBe("game");
    expect(out.settings.sound).toBe(false);
    expect(out.settings.volume).toEqual(createDefaultState().settings.volume);
  });

  it("ignores values of the wrong type instead of crashing", () => {
    const out = migrate({ version: CONFIG.SAVE_VERSION, steps: "lots", tokens: null, settings: "no", camp: [] });
    expect(out.steps).toBe(0);
    expect(out.tokens).toBe(0);
    expect(out.settings).toEqual(createDefaultState().settings);
    expect(out.camp).toEqual({ slots: {}, visits: 0 });
  });

  it("handles junk and never changes what it was given", () => {
    for (const junk of [null, undefined, 5, "x", [], true]) expect(migrate(junk)).toEqual(createDefaultState());
    const input = JSON.parse(JSON.stringify(OLD[2]));
    const copy = JSON.parse(JSON.stringify(input));
    migrate(input);
    expect(input).toEqual(copy);
  });

  it("a current save passes through unchanged", () => {
    const s = createDefaultState(); s.steps = 9; s.flags.fox_friend = true;
    expect(migrate(s)).toEqual(s);
  });
});
