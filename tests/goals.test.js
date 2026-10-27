import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../src/core/config.js";
import { bus } from "../src/core/event-bus.js";
import { resetState, state } from "../src/core/state.js";
import { dateKey, Daily, pickFor } from "../src/goals/daily.js";
import { DAILY_POOL, ERRANDS, Quests, SEASONAL } from "../src/goals/quests.js";
import { seasonKey, Seasonal } from "../src/goals/seasonal.js";
import { Inventory } from "../src/progression/inventory.js";

vi.mock("../src/ui/hud.js", async () => (await import("./helpers.js")).hudMock());

const walk = (n) => { for (let i = 0; i < n; i++) bus.emit("step", i); };

beforeAll(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 0, 15, 10)); Quests.init(); Daily.init(); Seasonal.init(); });
afterAll(() => vi.useRealTimers());
beforeEach(() => { vi.setSystemTime(new Date(2026, 0, 15, 10)); resetState(); });

describe("data", () => {
  it("has unique ids and sensible numbers", () => {
    const ids = [...ERRANDS, ...DAILY_POOL, ...Object.values(SEASONAL).flatMap((s) => s.goals)].map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of [...ERRANDS, ...DAILY_POOL, ...Object.values(SEASONAL).flatMap((s) => s.goals)]) { expect(g.goal).toBeGreaterThan(0); expect(g.text, g.id).toBeTruthy(); }
    for (const e of ERRANDS) { expect(e.title).toBeTruthy(); expect(e.reward.tokens).toBeGreaterThan(0); }
  });

  it("every season has a keepsake that exists as an item for the camp", () => {
    expect(Object.keys(SEASONAL).sort()).toEqual(["autumn", "spring", "summer", "winter"]);
    for (const s of Object.values(SEASONAL)) { expect(Inventory.get(s.keepsake), s.keepsake).toBeTruthy(); expect(s.goals.length).toBe(2); }
  });
});

// Keeps the daily and seasonal goals out of the way, so these tests count only errand rewards
const quiet = () => {
  state.goals.daily = { date: dateKey(), id: DAILY_POOL[0].id, n: 0, done: true };
  state.goals.seasonal = { key: seasonKey(), done: SEASONAL.winter.goals.map((g) => g.id), progress: {} };
  state.flags[`keepsake_${SEASONAL.winter.keepsake}`] = true;
};

describe("errands", () => {
  beforeEach(quiet);
  it("holds at most MAX_ACTIVE_ERRANDS", () => {
    const ids = ERRANDS.slice(0, CONFIG.MAX_ACTIVE_ERRANDS + 1).map((e) => e.id);
    ids.slice(0, -1).forEach((id) => expect(Quests.accept(id)).toBe(true));
    expect(Quests.accept(ids.at(-1))).toBe(false);
    expect(state.goals.active.length).toBe(CONFIG.MAX_ACTIVE_ERRANDS);
    expect(Quests.accept("not-an-errand")).toBe(false);
  });

  it("counts progress, pays once, and moves to done", () => {
    Quests.accept("stretch-legs");
    walk(39);
    expect(Quests.progress("stretch-legs")).toBe(39);
    expect(state.tokens).toBe(0);
    walk(1);
    const reward = Quests.byId("stretch-legs").reward.tokens;
    expect(state.tokens).toBe(reward);
    expect(state.goals.done).toContain("stretch-legs");
    expect(state.goals.active).not.toContain("stretch-legs");
    walk(100);
    expect(state.tokens).toBe(reward);
    expect(Quests.accept("stretch-legs")).toBe(false);   // finished errands are not offered again
  });

  it("only counts the right kind of thing", () => {
    Quests.accept("good-listener");
    bus.emit("collection:added", { kind: "birds", id: "x" });
    expect(Quests.progress("good-listener")).toBe(0);
    bus.emit("collection:added", { kind: "songs", id: "x" });
    expect(Quests.progress("good-listener")).toBe(1);
  });

  it("does not count progress made before it was taken on, and putting one down loses only its count", () => {
    walk(50);
    Quests.accept("stretch-legs");
    expect(Quests.progress("stretch-legs")).toBe(0);
    walk(10);
    expect(Quests.abandon("stretch-legs")).toBe(true);
    expect(state.goals.progress["stretch-legs"]).toBeUndefined();
    expect(Quests.available().some((e) => e.id === "stretch-legs")).toBe(true);
  });

  it("a reward does not count as progress for something else", () => {
    Quests.accept("pocket-finds");        // counts items found
    Quests.accept("stretch-legs");
    walk(40);                             // pays tokens
    expect(Quests.progress("pocket-finds")).toBe(0);
  });
});

describe("the daily thing", () => {
  it("is the same all day and offers no streaks", () => {
    const a = Daily.current();
    const b = Daily.current();
    expect(a.id).toBe(b.id);
    expect(pickFor(dateKey(new Date(2026, 0, 15)))).toEqual(pickFor("2026-01-15"));
    expect(Object.keys(state.goals.daily).sort()).toEqual(["date", "done", "id", "n"]);
  });

  it("pays DAILY_TOKENS once, then waits for tomorrow", () => {
    const d = Daily.current();
    for (let i = 0; i < d.goal * 2; i++) bus.emit("step", i), bus.emit("tokens", { n: 1, source: "walk" }), bus.emit("event:closed"), bus.emit("collection:added", { kind: "birds" });
    expect(state.goals.daily.done).toBe(true);
    const paid = state.tokens;
    expect(paid).toBeGreaterThanOrEqual(CONFIG.DAILY_TOKENS);
    vi.setSystemTime(new Date(2026, 0, 16, 9));
    expect(Daily.current().done).toBe(false);
  });

  it("missing days costs nothing: a week later it is simply a new day", () => {
    Daily.current();
    vi.setSystemTime(new Date(2026, 0, 22, 9));
    const d = Daily.current();
    expect(d.date ?? state.goals.daily.date).toBe("2026-01-22");
    expect(d.done).toBe(false);
    expect(state.tokens).toBe(0);
  });

  it("repairs a save that names a daily thing that no longer exists", () => {
    state.goals.daily = { date: "2026-01-15", id: "gone", n: 3, done: false };
    expect(Daily.current()).toBeTruthy();
  });
});

describe("seasonal goals", () => {
  it("uses a year-and-season key", () => {
    expect(seasonKey(new Date(2026, 0, 15))).toBe("2026-winter");
    expect(seasonKey(new Date(2026, 3, 15))).toBe("2026-spring");
    expect(seasonKey(new Date(2026, 9, 15))).toBe("2026-autumn");
  });

  it("pays per goal and gives the keepsake once, even a year later", () => {
    const cur = Seasonal.current();
    expect(cur.season).toBe("winter");
    walk(120);
    expect(state.tokens).toBeGreaterThanOrEqual(CONFIG.SEASONAL_TOKENS);
    expect(Inventory.count("frost-lantern")).toBe(0);      // one goal is not enough
    bus.emit("letter:received", {});
    expect(Inventory.count("frost-lantern")).toBe(1);
    walk(500);
    expect(Inventory.count("frost-lantern")).toBe(1);
    vi.setSystemTime(new Date(2027, 0, 15));               // next winter: goals come back, the keepsake does not
    expect(Seasonal.current().goals.every((g) => !g.done)).toBe(true);
    walk(120); bus.emit("letter:received", {});
    expect(Inventory.count("frost-lantern")).toBe(1);
  });
});
