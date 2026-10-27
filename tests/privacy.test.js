import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetState, state } from "../src/core/state.js";

vi.mock("../src/core/config.js", async (orig) => {
  const real = await orig();
  return { CONFIG: Object.freeze({ ...real.CONFIG, ANALYTICS_ENDPOINT: "https://stats.example.test/in" }) };
});
vi.mock("../src/ui/hud.js", async () => (await import("./helpers.js")).hudMock());

const { Analytics, cleanProps, doNotTrack, isConfigured, isEnabled } = await import("../src/privacy/analytics.js");
const { Consent } = await import("../src/privacy/consent.js");

const setDnt = (v) => Object.defineProperty(navigator, "doNotTrack", { value: v, configurable: true });
beforeEach(() => { resetState(); Analytics.clear(); setDnt(null); });
afterEach(() => setDnt(null));

describe("analytics (endpoint set)", () => {
  it("is off until the player says yes", () => {
    expect(isConfigured()).toBe(true);
    expect(state.privacy.analytics).toBe("unset");
    expect(isEnabled()).toBe(false);
    expect(Analytics.track("session_start")).toBe(false);
    state.privacy.analytics = "no";
    expect(isEnabled()).toBe(false);
  });

  it("is on after yes, but not when the device says Do Not Track", () => {
    state.privacy.analytics = "yes";
    expect(isEnabled()).toBe(true);
    setDnt("1");
    expect(doNotTrack()).toBe(true);
    expect(isEnabled()).toBe(false);
    expect(Consent.shouldAsk()).toBe(false);
  });

  it("only sends known events, and drops free text", () => {
    state.privacy.analytics = "yes";
    expect(Analytics.track("my_secret_event")).toBe(false);
    expect(Analytics.track("achievement", { id: "first-friend", name: "Sam's secret text!", note: "hello world", n: 3, ok: true })).toBe(true);
    expect(Analytics.pending()).toBe(1);
  });

  it("cleanProps keeps numbers, booleans and short ids only", () => {
    expect(cleanProps({ a: 1.6, b: true, c: "forest", d: "Hello World", e: "x".repeat(40), f: NaN, g: { x: 1 }, h: [1], "bad key": 1, i: null }))
      .toEqual({ a: 2, b: true, c: "forest" });
  });

  it("changing your mind to no forgets whatever was waiting", () => {
    state.privacy.analytics = "yes";
    Analytics.track("session_start");
    Consent.set("no");
    Analytics.flush();
    expect(Analytics.pending()).toBe(0);
  });

  it("asks only while undecided", () => {
    expect(Consent.shouldAsk()).toBe(true);
    state.privacy.analytics = "no";
    expect(Consent.shouldAsk()).toBe(false);
  });
});
