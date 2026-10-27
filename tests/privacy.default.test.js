import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../src/core/config.js";
import { resetState, state } from "../src/core/state.js";
import { Analytics, isConfigured, isEnabled } from "../src/privacy/analytics.js";
import { Consent } from "../src/privacy/consent.js";

vi.mock("../src/ui/hud.js", async () => (await import("./helpers.js")).hudMock());
beforeEach(() => resetState());

describe("privacy as shipped", () => {
  it("has no analytics address, so nothing is ever sent or asked, even after a yes", () => {
    expect(CONFIG.ANALYTICS_ENDPOINT).toBe("");
    expect(isConfigured()).toBe(false);
    state.privacy.analytics = "yes";
    expect(isEnabled()).toBe(false);
    expect(Analytics.track("session_start")).toBe(false);
    expect(Consent.shouldAsk()).toBe(false);
    state.privacy.analytics = "unset";
    expect(Consent.shouldAsk()).toBe(false);
  });

  it("the game starts undecided", () => {
    expect(state.privacy.analytics).toBe("unset");
  });
});
