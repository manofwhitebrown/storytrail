import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../src/core/config.js";
import { resetState, state } from "../src/core/state.js";
import { Camp } from "../src/progression/camp.js";
import { Panels } from "../src/ui/panels.js";
import { codeFromText, decodeCamp, encodeCamp, ownCamp, sanitizeCamp, viewFromCode, Visits } from "../src/social/visits.js";

vi.mock("../src/ui/hud.js", async () => (await import("./helpers.js")).hudMock());

const b64 = (obj) => btoa(unescape(encodeURIComponent(typeof obj === "string" ? obj : JSON.stringify(obj)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const good = { v: 1, i: "abc123xyz", n: "Mina", c: "teal", h: "cap", l: "brass", s: {}, f: { s: "fox", n: "Pip" } };

beforeEach(() => resetState());

describe("sanitizeCamp with hostile input", () => {
  it("accepts a normal camp", () => {
    const c = sanitizeCamp(good);
    expect(c.name).toBe("Mina");
    expect(c.id).toBe("abc123xyz");
  });

  it("rejects things that are not camps", () => {
    for (const bad of [null, undefined, 1, "x", [], {}, { v: 2, i: "abc123xyz" }, { v: 1 }, { v: 1, i: "ABC" }, { v: 1, i: "has space1" }, { v: 1, i: "a".repeat(40) }, { v: 1, i: ["abc123xyz"] }, { ...good, i: "../../etc" }]) {
      expect(sanitizeCamp(bad)).toBeNull();
    }
  });

  it("cleans names: markup, braces, control and direction characters, length", () => {
    const evil = "<img src=x onerror=alert(1)>{name}\u202e\u0000   \n  " + "Z".repeat(100);
    const c = sanitizeCamp({ ...good, n: evil });
    expect(c.name).not.toMatch(/[<>{}\u202e\u0000\n]/);
    expect(Array.from(c.name).length).toBeLessThanOrEqual(CONFIG.NAME_SAFE_MAX);
    expect(sanitizeCamp({ ...good, n: "   " }).name).toBeTruthy();      // falls back to a default name
    expect(sanitizeCamp({ ...good, n: { toString: () => "x" } }).name).toBeTruthy();
  });

  it("never cuts an emoji in half", () => {
    const c = sanitizeCamp({ ...good, n: "🦊".repeat(30) });
    expect(Array.from(c.name).every((ch) => ch === "🦊")).toBe(true);
  });

  it("replaces unknown looks with defaults and drops unknown companions", () => {
    const c = sanitizeCamp({ ...good, c: "__proto__", h: 5, l: { x: 1 }, f: { s: "dragon", n: "Smaug" } });
    expect(c.player.coat).toBeTruthy();
    expect(c.player.hat).toBeTruthy();
    expect(c.companion).toBeNull();
    expect(sanitizeCamp({ ...good, f: "fox" }).companion).toBeNull();
    expect(sanitizeCamp({ ...good, f: { s: "fox", n: "<>" } }).companion).toBeNull();
  });

  it("keeps only real items in the right kind of spot", () => {
    const c = sanitizeCamp({ ...good, s: { "hang-1": "wind-chime", "ground-1": "wind-chime", "shelf-1": "not-an-item", "hang-2": { a: 1 }, evil: "tin-mug", __proto__: "tin-mug" } });
    expect(c.slots).toEqual({ "hang-1": "wind-chime" });
    expect(sanitizeCamp({ ...good, s: [1, 2] }).slots).toEqual({});
  });
});

describe("reading links", () => {
  it("decodes only well-formed, small, UTF-8 codes", () => {
    expect(decodeCamp(b64(good))).toEqual(good);
    for (const bad of ["", null, 5, "***", "a b", "!!!!", "e30=" /* has = */, "A".repeat(CONFIG.CAMP_LINK_MAX + 1), b64("not json"), b64("\"just a string\"")]) {
      expect(viewFromCode(bad)).toBeNull();
    }
    expect(decodeCamp("/w")).toBeNull();     // invalid UTF-8 bytes (0xFF)
  });

  it("finds the code in a pasted link or a bare code", () => {
    const code = b64(good);
    expect(codeFromText(`https://x.github.io/storytrail/#camp=${code}`)).toBe(code);
    expect(codeFromText(`  ${code}  `)).toBe(code);
    expect(codeFromText("hello")).toBeNull();
    expect(codeFromText(null)).toBeNull();
    expect(codeFromText("camp=" + "A".repeat(CONFIG.CAMP_LINK_MAX + 1))).toBeNull();
  });

  it("round-trips your own camp", () => {
    state.player.name = "Sam";
    state.camp.slots["hang-1"] = "wind-chime";
    const view = ownCamp();
    expect(viewFromCode(encodeCamp(view))).toEqual(view);
    expect(state.social.campId).toMatch(/^[a-z0-9]{6,16}$/);
  });
});

describe("a camp pays a visitor only once", () => {
  const stage = () => { document.body.innerHTML = '<div id="stage"></div>'; Panels.init(document.getElementById("stage")); };
  const visit = (view) => { Camp.visiting = view; Visits.sit(); };
  beforeEach(() => { stage(); Visits.init(); Camp.visiting = null; });

  it("pays once for a friend's fire, then nothing", () => {
    const friend = sanitizeCamp(good);
    visit(friend);
    expect(state.tokens).toBe(CONFIG.VISIT_TOKENS);
    visit(friend); visit(friend);
    expect(state.tokens).toBe(CONFIG.VISIT_TOKENS);
    expect(state.social.visited).toEqual([friend.id]);
    visit(sanitizeCamp({ ...good, i: "other12345" }));
    expect(state.tokens).toBe(CONFIG.VISIT_TOKENS * 2);
  });

  it("pays nothing for your own camp", () => {
    visit(ownCamp());
    expect(state.tokens).toBe(0);
  });

  it("pays nothing once the remembered list is full, but the visit still works", () => {
    state.social.visited = Array.from({ length: CONFIG.VISITED_MAX }, (_, i) => `full${String(i).padStart(4, "0")}`);
    visit(sanitizeCamp(good));
    expect(state.tokens).toBe(0);
    expect(state.social.visited.length).toBe(CONFIG.VISITED_MAX);
  });
});
