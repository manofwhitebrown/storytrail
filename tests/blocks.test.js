import { describe, expect, it } from "vitest";
import data from "../assets/data/items.json";
import { PALETTE } from "../src/graphics/blocks.js";
import { ItemSprites } from "../src/graphics/item-sprites.js";
import { Assets } from "../src/core/assets.js";

describe("box graphics", () => {
  it("every item has a sprite (or falls back to the gift box)", () => {
    for (const it of data.items) expect(ItemSprites.rows(it.id).length).toBe(8);
  });
  it("sprites are 8x8 and only use known colors", () => {
    for (const id of [...ItemSprites.ids(), "unknown-thing"]) {
      for (const row of ItemSprites.rows(id)) {
        expect(row.length).toBe(8);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch], `${id}: ${ch}`).toBeTruthy();
      }
    }
  });
  it("optional files: nothing loaded means nothing breaks", async () => {
    await Assets.init();                       // no manifest in the test environment
    expect(Assets.has("player")).toBe(false);
    expect(Assets.draw({}, "player", 0, 0, 10)).toBe(false);
    expect(Assets.playSample("step")).toBe(false);
  });
});
