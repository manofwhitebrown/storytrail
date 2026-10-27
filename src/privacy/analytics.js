// analytics.js - Part 27. Optional, anonymous counts. OFF unless ALL of these are true:
//   1. CONFIG.ANALYTICS_ENDPOINT is set to an https:// address (it is empty by default),
//   2. the player said yes (Menu -> Privacy), and
//   3. the device does not ask not to be tracked (Do Not Track / Global Privacy Control).
//
// What can ever be sent: an event name from EVENTS, with values that are numbers, true/false or
// short lowercase ids (like "forest"). NEVER free text, names, ids of a person or device, or a
// timestamp. No cookies are used. Nothing is stored between visits. If a send fails it is dropped.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";

export const EVENTS = new Set(["session_start", "biome_enter", "story_page", "story_end", "achievement"]);
const SAFE_ID = /^[a-z0-9_.-]{1,32}$/;
const QUEUE_MAX = 50;
let queue = [];
let timer = null;

export function doNotTrack() {
  const nav = typeof navigator === "undefined" ? {} : navigator;
  const win = typeof window === "undefined" ? {} : window;
  return nav.doNotTrack === "1" || win.doNotTrack === "1" || nav.msDoNotTrack === "1" || nav.globalPrivacyControl === true;
}

export const isConfigured = () => /^https:\/\/\S+$/.test(CONFIG.ANALYTICS_ENDPOINT || "");
export const isEnabled = () => isConfigured() && state.privacy?.analytics === "yes" && !doNotTrack();

// Keeps only numbers, booleans and short lowercase ids. Anything else is dropped, never "fixed".
export function cleanProps(props = {}) {
  const out = {};
  for (const [k, v] of Object.entries(props).slice(0, 8)) {
    if (!SAFE_ID.test(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.round(v);
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && SAFE_ID.test(v)) out[k] = v;
  }
  return out;
}

export const Analytics = {
  init() {
    bus.on("biome:enter", (b) => this.track("biome_enter", { place: b?.id }));
    bus.on("story:page", (p) => this.track("story_page", { page: p?.tokens }));
    bus.on("story:ended", (id) => this.track("story_end", { ending: id }));
    bus.on("achievement", (a) => this.track("achievement", { id: a?.id }));
    bus.on("privacy:changed", () => { if (!isEnabled()) queue = []; });
    this.track("session_start");
    if (isConfigured()) {
      timer = setInterval(() => this.flush(), CONFIG.ANALYTICS_FLUSH_MS);
      window.addEventListener("pagehide", () => this.flush());
    }
  },

  track(name, props) {
    if (!isEnabled() || !EVENTS.has(name)) return false;
    if (queue.length >= QUEUE_MAX) queue.shift();
    queue.push({ e: name, p: cleanProps(props) });
    return true;
  },

  pending: () => queue.length,
  clear() { queue = []; },

  flush() {
    if (!queue.length) return;
    if (!isEnabled()) { queue = []; return; }
    const body = JSON.stringify({ v: 1, events: queue });
    queue = [];
    try {
      const blob = new Blob([body], { type: "text/plain" });
      if (navigator.sendBeacon?.(CONFIG.ANALYTICS_ENDPOINT, blob)) return;
      fetch(CONFIG.ANALYTICS_ENDPOINT, { method: "POST", body, keepalive: true, credentials: "omit", referrerPolicy: "no-referrer" }).catch(() => {});
    } catch { /* dropped on purpose */ }
  },
};
