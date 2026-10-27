import { describe, expect, it, vi } from "vitest";
import { createDefaultState } from "../src/core/state.js";

vi.mock("../src/ui/hud.js", async () => (await import("./helpers.js")).hudMock());
const { passwordOk } = await import("../src/ui/cheats.js");

describe("cheats password", () => {
  it("accepts the password (ignoring case and spaces) and nothing else", () => {
    expect(passwordOk("nayeemabd")).toBe(true);
    expect(passwordOk("  NayeemAbd ")).toBe(true);
    for (const bad of ["", "nayeemab", "password", "nayeemabd1", null, undefined]) expect(passwordOk(bad)).toBe(false);
  });
  it("starts locked in a new game", () => {
    expect(createDefaultState().dev).toEqual({ unlocked: false, used: 0 });
  });
});
