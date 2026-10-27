import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyBackup, exportText, parseBackup } from "../src/core/backup.js";
import { CONFIG } from "../src/core/config.js";
import { resetState, state } from "../src/core/state.js";

vi.mock("../src/ui/hud.js", async () => (await import("./helpers.js")).hudMock());

beforeEach(() => { localStorage.clear(); resetState(); });

describe("backup", () => {
  it("exports and restores a game", () => {
    state.steps = 321; state.tokens = 30; state.player.name = "Ro";
    const text = exportText();
    resetState();
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    applyBackup(parsed);
    expect(state.steps).toBe(321);
    expect(state.player.name).toBe("Ro");
    expect(JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)).steps).toBe(321);
  });

  it("accepts a bare save file and upgrades an old backup", () => {
    const old = JSON.stringify({ version: 3, steps: 10, tokens: 2 });
    const parsed = parseBackup(old);
    expect(parsed.ok).toBe(true);
    expect(parsed.state.version).toBe(CONFIG.SAVE_VERSION);
  });

  it("refuses things that are not backups, without touching the game", () => {
    state.steps = 5;
    for (const bad of ["", "nope", "[]", "null", '{"app":"storytrail"}', '{"version":"x","steps":1,"tokens":1}', '{"version":1,"steps":"a","tokens":1}', "x".repeat(2_000_001), 42, null]) {
      expect(parseBackup(bad).ok).toBe(false);
    }
    expect(state.steps).toBe(5);
  });
});
