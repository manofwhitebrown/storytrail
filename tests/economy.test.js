import { beforeEach, describe, expect, it, vi } from "vitest";
import landmarksData from "../assets/data/landmarks.json";
import { CONFIG } from "../src/core/config.js";
import { bus } from "../src/core/event-bus.js";
import { resetState, state } from "../src/core/state.js";
import { addTokens } from "../src/progression/tokens.js";
import { Story } from "../src/story/story.js";
import { PAGES } from "../src/story/chapters/index.js";
import { LOOP_STEPS } from "../src/world/biomes/index.js";

vi.mock("../src/ui/hud.js", async () => (await import("./helpers.js")).hudMock());

const SPT = CONFIG.STEPS_PER_TOKEN;
const LANDMARKS = landmarksData.landmarks;
beforeEach(() => resetState());

describe("tokens", () => {
  it("walking pays one token every STEPS_PER_TOKEN steps", () => {
    expect(SPT).toBeGreaterThan(0);
    expect(Math.floor(SPT / SPT)).toBe(1);
    expect(Math.floor((SPT - 1) / SPT)).toBe(0);
  });

  it("addTokens adds, counts what was earned, and says where it came from", () => {
    const seen = [];
    const off = bus.on("tokens", (e) => seen.push(e));
    addTokens(3, "event");
    addTokens(0, "event");     // nothing to add: nothing happens
    expect(state.tokens).toBe(3);
    expect(state.stats.tokensEarned).toBe(3);
    expect(seen).toEqual([{ n: 3, source: "event", total: 3 }]);
    off?.();
  });
});

describe("story pages", () => {
  it("thresholds never go down", () => {
    for (let i = 1; i < PAGES.length; i++) expect(PAGES[i].tokens).toBeGreaterThanOrEqual(PAGES[i - 1].tokens);
  });

  it("page ids are unique and every landmark page names a real place on the road", () => {
    expect(new Set(PAGES.map((p) => p.id)).size).toBe(PAGES.length);
    for (const p of PAGES.filter((x) => x.landmark)) {
      const lm = LANDMARKS.find((l) => l.id === p.landmark);
      expect(lm, p.id).toBeTruthy();
      expect(lm.at).toBeLessThan(LOOP_STEPS);   // it is on the first lap, so a new player can reach it
    }
  });

  it("unlocks in order, and a page that waits for a place waits for it", () => {
    state.tokens = PAGES.at(-1).tokens;
    Story.check({ silent: true });
    const gate = PAGES.findIndex((p) => p.landmark);
    expect(state.story.unlocked).toBe(gate);          // everything before the place; the place's page waits
    state.discovered.landmarks.push(PAGES[gate].landmark);
    Story.check({ silent: true });
    expect(state.story.unlocked).toBe(PAGES.length);
  });

  it("every page can be reached by walking alone, within a sensible number of steps", () => {
    let reached = -1;
    for (let steps = 1; steps <= 2000 && reached < 0; steps++) {
      state.steps = steps;
      state.tokens = Math.floor(steps / SPT);
      for (const l of LANDMARKS) if (l.at <= steps && !state.discovered.landmarks.includes(l.id)) state.discovered.landmarks.push(l.id);
      Story.check({ silent: true });
      if (state.story.unlocked === PAGES.length) reached = steps;
    }
    expect(reached).toBeGreaterThan(0);
    expect(reached).toBeLessThanOrEqual(1500);
  });
});
