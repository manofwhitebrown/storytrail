// backup.js - Part 29. Save export and import. On Android, clearing the app's data (or a phone
// change) erases the game, so the Menu can make a backup file and restore one.
// The file is plain JSON: { app: "storytrail", state: {...the save...} }. Restoring runs it through
// the same migrations as a normal load, so a backup from an older version still works.

import { migrate } from "./migrations.js";
import { save } from "./save.js";
import { replaceState, state } from "./state.js";
import { makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { Share } from "../social/share.js";
import { HUD } from "../ui/hud.js";
import { Settings, button } from "../ui/settings.js";

const MAX_BYTES = 2_000_000;

export function exportText() {
  return JSON.stringify({ app: "storytrail", state });
}

// Returns { ok: true, state } or { ok: false }. Never throws, never touches the live game.
export function parseBackup(text) {
  try {
    if (typeof text !== "string" || !text || text.length > MAX_BYTES) return { ok: false };
    const obj = JSON.parse(text);
    const raw = obj && obj.app === "storytrail" ? obj.state : obj;   // a bare save file is fine too
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
    if (!Number.isInteger(raw.version) || raw.version < 1 || typeof raw.steps !== "number" || typeof raw.tokens !== "number") return { ok: false };
    return { ok: true, state: migrate(raw) };
  } catch { return { ok: false }; }
}

export function applyBackup(parsed) {
  replaceState(parsed.state);
  save();
}

const today = () => new Date().toISOString().slice(0, 10);
let pending = null;   // a parsed backup waiting for "Yes, replace it"
let bad = false;

export const Backup = {
  init() {
    Settings.section("backup", 70, (box, rerender) => {
      box.append(makeEl("p", t("backup.note"), "menu-sub"));
      const row = makeEl("div", null, "options");
      row.append(
        button(t("backup.save"), async () => {
          const blob = new Blob([exportText()], { type: "application/json" });
          const name = t("backup.filename", { date: today() });
          const done = Share.isNative() ? (await Share.shareImage(blob, name, { title: name })) === "shared" : Share.downloadImage(blob, name);
          if (done) HUD.toast(t("backup.saved"), { feedback: true });
        }),
        button(t("backup.copy"), async () => {
          HUD.toast(t((await Share.copy(exportText())) ? "backup.copied" : "backup.copyFailed"), { feedback: true });
        }),
      );
      box.append(row);

      const pick = makeEl("input");
      pick.type = "file"; pick.accept = ".json,application/json"; pick.hidden = true;
      pick.addEventListener("change", async () => {
        const file = pick.files?.[0];
        const parsed = file && file.size <= MAX_BYTES ? parseBackup(await file.text()) : { ok: false };
        pending = parsed.ok ? parsed : null;
        bad = !parsed.ok;
        rerender();
      });
      box.append(pick, button(t("backup.restore"), () => pick.click()));

      if (bad) { const m = makeEl("p", t("backup.bad"), "menu-sub"); m.setAttribute("role", "alert"); box.append(m); }
      if (pending) {
        box.append(makeEl("p", t("backup.confirm"), "menu-sub"));
        box.append(button(t("backup.confirmYes"), () => { applyBackup(pending); pending = null; location.reload(); }));
      }
    });
  },
};
