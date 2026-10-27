import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../src/i18n/en.json";
import { SLOTS } from "../src/progression/camp.js";
import { ACHIEVEMENTS } from "../src/progression/achievements.js";
import { t, language, languages, setLanguage } from "../src/i18n/strings.js";

const files = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith(".js") ? [p] : []; });
const source = files("src").filter((f) => !f.endsWith("strings.js")).map((f) => [f, readFileSync(f, "utf8")]);
const has = (key) => key in en || `${key}.other` in en;

describe("strings", () => {
  it("every t(\"...\") in the code has a text", () => {
    const missing = [];
    for (const [file, text] of source) for (const m of text.matchAll(/\bt\(\s*"([a-z0-9]+(?:\.[A-Za-z0-9-]+)+)"/g)) if (!has(m[1])) missing.push(`${file}: ${m[1]}`);
    expect(missing).toEqual([]);
  });

  it("keys built from a variable have a text for every possible value", () => {
    const need = [
      ...ACHIEVEMENTS.flatMap((a) => [`ach.${a.id}.name`, `ach.${a.id}.hint`]),
      ...["diary", "letters", "memories", "collection", "achievements", "goals"].map((x) => `journal.tab.${x}`),
      ...["birds", "flowers", "songs"].map((x) => `journal.kind.${x}`),
      ...["spring", "summer", "autumn", "winter"].map((x) => `goals.season.${x}`),
      ...SLOTS.map((s) => `camp.slot.${s.id}`),
      ...["hang", "ground", "shelf"].map((x) => `camp.type.${x}`),
      ...["unset", "yes", "no"].map((x) => `privacy.status.${x}`),
      "unlock.map", "unlock.camp",
    ];
    expect(need.filter((k) => !has(k))).toEqual([]);
  });

  it("fills in {names}, and falls back to English for a language it does not have", () => {
    expect(t("journal.chapter", { num: 2 })).toBe("Chapter 2");
    setLanguage("xx");
    expect(language()).toBe("en");
    expect(languages()).toContain("en");
    expect(t("no.such.key")).toBe("no.such.key");
  });
});
