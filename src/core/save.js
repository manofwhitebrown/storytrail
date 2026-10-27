// save.js - saves to localStorage and loads it back (through migrations).

import { CONFIG } from "./config.js";
import { bus } from "./event-bus.js";
import { migrate } from "./migrations.js";
import { replaceState, state } from "./state.js";

const KEY = CONFIG.SAVE_KEY;

function storage() {
  try { return window.localStorage; } catch { return null; } // blocked in some private modes
}

export function hasSave() {
  return !!storage()?.getItem(KEY);
}

// Returns true if a save was loaded
export function load() {
  const store = storage();
  const text = store?.getItem(KEY);
  if (!text) return false;

  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    store.setItem(KEY + ".corrupt", text); // keep it, just in case
    console.warn("[save] could not read the save; starting fresh");
    return false;
  }

  if (raw && raw.version > CONFIG.SAVE_VERSION) {
    // saved by a newer version of the game: keep a copy so an older build can't destroy it
    // Only the FIRST copy is the real one: after an autosave the main key holds a lossy version
    if (store.getItem(KEY + ".newer") === null) store.setItem(KEY + ".newer", text);
    console.warn("[save] this save is from a newer version; a backup copy was kept");
  }

  replaceState(migrate(raw));
  bus.emit("state:load");
  return true;
}

export function save() {
  try {
    storage()?.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[save] could not save", err);
  }
}

export function clearSave() {
  const store = storage();
  store?.removeItem(KEY);
}

export function startAutosave() {
  setInterval(save, CONFIG.AUTOSAVE_MS);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  bus.on("panel:close", save);
}
