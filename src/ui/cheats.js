// cheats.js - a private testing panel. It is hidden: tap the "StoryTrail" title 7 times, then type the password.
// After the first correct password it stays unlocked on this device (Lock cheats, at the bottom, puts it back).
//
// HONEST NOTE ABOUT THE PASSWORD: this is a single-player game that runs on the phone, so anyone who
// takes the app apart could find or skip the check. It keeps curious friends out, nothing more.
// The password itself is not written anywhere in the code; only a scrambled number (a hash) of it is.
//
// Everything here uses the game's own functions (addTokens, Story.check, Collections.add...), so what
// you see is what real play would produce. Nothing here is saved separately; only state.dev.used counts uses.

import places from "../../assets/data/landmarks.json";
import { Companions } from "../characters/companions/companions.js";
import { LEVELS } from "../characters/companions/bonding.js";
import { SPECIES } from "../characters/companions/personalities.js";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { migrate } from "../core/migrations.js";
import { save } from "../core/save.js";
import { replaceState, state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { Events } from "../events/events.js";
import { Collections } from "../progression/collections.js";
import { Inventory } from "../progression/inventory.js";
import { addTokens } from "../progression/tokens.js";
import { Share } from "../social/share.js";
import { Endings } from "../story/endings.js";
import { Story } from "../story/story.js";
import { HUD } from "./hud.js";
import { Panels } from "./panels.js";
import { button } from "./settings.js";
import { SessionSummary } from "../wellbeing/session-summary.js";
import { WelcomeBack } from "../wellbeing/welcome-back.js";
import { BIOMES } from "../world/biomes/index.js";
import { Landmarks } from "../world/landmarks.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Weather } from "../world/weather.js";
import { World } from "../world/world.js";

// Scrambles text into a number (cyrb53). Same text in = same number out; you cannot read the text back from it.
export function scramble(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
const PASSWORD_HASH = 1776859196279260;
export const passwordOk = (text) => scramble("storytrail-cheats:" + String(text).trim().toLowerCase()) === PASSWORD_HASH;

const SECRET_TAPS = 7;          // taps on the title
const TAP_WINDOW_MS = 1800;     // max gap between those taps

let el = null;
let hooks = null;               // { takeStep, paused, announce } handed over by main.js
let note = "";                  // answer under the password box
let walkJob = 0;                // lets a new "walk" replace an old one
const openGroups = new Set(["travel"]);

const say = (text) => HUD.toast(text, { feedback: true });

// Wraps every cheat: counts the use, runs it, says what happened
function act(message, fn) {
  return () => {
    state.dev.used += 1;
    fn();
    if (message) say(message);
  };
}

export const Cheats = {
  init(h) {
    hooks = h;
    el = Panels.create("cheats", { className: "journal-like cheats", label: "Cheats", onOpen: () => this.render() });

    // the hidden door: tap the title 7 times
    const title = document.querySelector(".hud h1");
    let taps = 0, last = 0;
    title?.addEventListener("click", () => {
      const now = performance.now();
      taps = now - last < TAP_WINDOW_MS ? taps + 1 : 1;
      last = now;
      if (taps >= SECRET_TAPS) { taps = 0; Panels.open("cheats"); }
    });
  },

  // ---- the panel ----
  render() {
    el.replaceChildren();
    const head = makeEl("div", null, "panel-head");
    head.append(makeEl("h2", "Cheats"), button("Close", () => Panels.close("cheats")));
    el.append(head);

    if (!state.dev.unlocked) { this.renderLogin(); return; }

    el.append(makeEl("p", `Private testing tools. Used ${state.dev.used} time${state.dev.used === 1 ? "" : "s"}.`, "menu-sub"));
    this.group("travel", "Travel", (box) => this.travel(box));
    this.group("tokens", "Tokens and story", (box) => this.tokensAndStory(box));
    this.group("sky", "Time, weather, season", (box) => this.sky(box));
    this.group("friends", "Friends, camp and collections", (box) => this.friends(box));
    this.group("tests", "Test the gentle parts", (box) => this.tests(box));
    this.group("saves", "Save tools", (box) => this.saves(box));

    const lock = makeEl("div", null, "options menu-bottom");
    lock.append(button("Lock cheats", () => { state.dev.unlocked = false; note = ""; this.render(); }));
    el.append(lock);
  },

  renderLogin() {
    const label = makeEl("label", "Password");
    const input = makeEl("input");
    input.type = "password";
    input.autocomplete = "off";
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocorrect", "off");
    input.spellcheck = false;
    input.dataset.autofocus = "";
    const go = () => {
      if (passwordOk(input.value)) { state.dev.unlocked = true; note = ""; this.render(); return; }
      note = "That is not it.";
      this.render();
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    label.append(input);
    el.append(label, this.row(button("Unlock", go)));
    if (note) { const m = makeEl("p", note, "menu-sub"); m.setAttribute("role", "alert"); el.append(m); }
  },

  group(id, title, build) {
    const d = makeEl("details", null, "menu-section");
    d.open = openGroups.has(id);
    d.addEventListener("toggle", () => { if (d.open) openGroups.add(id); else openGroups.delete(id); });
    d.append(makeEl("summary", title));
    const body = makeEl("div", null, "menu-body");
    build(body);
    d.append(body);
    el.append(d);
  },

  row(...buttons) {
    const r = makeEl("div", null, "options");
    r.append(...buttons);
    return r;
  },

  heading(box, text) { box.append(makeEl("p", text, "menu-sub")); },

  // ---- Travel ----
  travel(box) {
    this.heading(box, "Walk (uses the real step code, so events and landmarks happen as normal):");
    box.append(this.row(
      button("Walk 10", () => this.walk(10)),
      button("Walk 50", () => this.walk(50)),
      button("Walk 120", () => this.walk(120)),
    ));
    this.heading(box, "Jump to the start of a place (skips events on the way):");
    box.append(this.row(...BIOMES.map((b, i) => button(b.name.replace(/^The /, ""), act(`Now in ${b.name}`, () => this.teleport(i * CONFIG.BIOME_LENGTH))))));
    this.heading(box, "Jump to just before a landmark (two steps from it):");
    box.append(this.row(...Landmarks.list.map((lm) => button(`${lm.icon} ${lm.name.replace(/^The /, "")}`, act(`Near ${lm.name}`, () => this.teleport(Math.max(0, lm.at - 2)))))));
  },

  walk(n) {
    const job = ++walkJob;
    state.dev.used += 1;
    Panels.close("cheats");
    let left = n;
    const tick = () => {
      if (job !== walkJob || left <= 0) return;
      if (!hooks.paused()) { hooks.takeStep(); left -= 1; }   // waits while an event or panel is open
      setTimeout(tick, 45);
    };
    setTimeout(tick, 150);
  },

  teleport(step) {
    walkJob += 1;                    // stop any walk in progress
    state.steps = step;
    World.init();                    // moves the scenery to the new spot without sliding
    HUD.updateCounters();
    hooks.announce();
  },

  // ---- Tokens and story ----
  tokensAndStory(box) {
    this.heading(box, `Tokens now: ${state.tokens}`);
    box.append(this.row(
      button("+10", act("+10 tokens", () => addTokens(10, "cheat"))),
      button("+100", act("+100 tokens", () => addTokens(100, "cheat"))),
      button("+1000", act("+1000 tokens", () => addTokens(1000, "cheat"))),
    ));
    this.heading(box, "Journal:");
    box.append(this.row(
      button("Unlock every journal page", act("", () => this.unlockPages())),
      button("Show the ending", act("", () => this.showEnding())),
    ));
    this.heading(box, "Places:");
    box.append(this.row(button("Discover every landmark and secret", act("All landmarks and secrets found", () => this.discoverAll()))));
  },

  discoverAll() {
    for (const lm of Landmarks.list) if (!state.discovered.landmarks.includes(lm.id)) state.discovered.landmarks.push(lm.id);
    for (const s of places.secrets) if (!state.discovered.secrets.includes(s.id)) state.discovered.secrets.push(s.id);
    Story.check({ silent: true });
  },

  // Quiet catch-up: no toasts and no ending popup (Show the ending does that on purpose)
  unlockPages() {
    this.discoverAll();
    const need = Math.max(...Story.pages.map((p) => p.tokens));
    if (state.tokens < need) { state.tokens = need; HUD.updateCounters(); }
    Story.check({ silent: true });
    say(`Journal: ${state.story.unlocked} of ${Story.pages.length} pages`);
  },

  showEnding() {
    this.unlockPages();
    if (state.story.ended) { say("The ending was already reached"); return; }
    Panels.close("cheats");
    setTimeout(() => Endings.check(), 200);
  },

  // ---- Time, weather, season ----
  sky(box) {
    this.heading(box, `Time: ${TimeOfDay.label()} (${TimeOfDay.clockText()}). Picking one switches to in-game time.`);
    const setTime = (t, name) => act(`Time: ${name}`, () => { state.settings.timeMode = "game"; state.time.game = t; TimeOfDay.update(0); });
    box.append(this.row(
      button("Dawn", setTime(0.26, "dawn")),
      button("Day", setTime(0.5, "day")),
      button("Dusk", setTime(0.79, "dusk")),
      button("Night", setTime(0.96, "night")),
      button("Real clock", act("Following your clock", () => { state.settings.timeMode = "real"; TimeOfDay.update(0); })),
    ));
    this.heading(box, `Weather: ${Weather.type}. Fades in over a moment and stays for a long while.`);
    box.append(this.row(...["clear", "rain", "mist", "snow", "wind", "fireflies"].map((type) =>
      button(type, act(`Weather: ${type}`, () => {
        if (Weather.type !== type) Weather.next = type;
        Weather.stepsLeft = 9999;
      })))));
    this.heading(box, `Season: ${Seasons.label()}. Lasts until you reload (it is read from the calendar at start).`);
    box.append(this.row(...["spring", "summer", "autumn", "winter"].map((s) =>
      button(s, act(`Season: ${s}`, () => { Seasons.current = s; document.body.dataset.season = s; Seasons.makeBits(); })))));
  },

  // ---- Friends, camp, collections ----
  friends(box) {
    this.heading(box, state.companion?.name ? `Companion: ${state.companion.name}, bond ${Math.floor(state.companion.bond)}` : "No companion yet. Pick one:");
    box.append(this.row(...SPECIES.map((sp) => button(sp.id[0].toUpperCase() + sp.id.slice(1), act(`${sp.names[0]} the ${sp.id} joins you`, () => {
      state.companion = { species: sp.id, name: sp.names[0], bond: 0, gifts: 0 };
      this.render();
    })))));
    if (Companions.has()) {
      box.append(this.row(
        button("Bond: Friendly", act("Bond raised", () => this.setBond(LEVELS[1].min))),
        button("Bond: Close", act("Bond raised", () => this.setBond(LEVELS[2].min))),
        button("Bond: Inseparable", act("Bond raised", () => this.setBond(LEVELS[3].min))),
      ));
    }
    this.heading(box, "Things:");
    box.append(this.row(
      button("One of every camp item", act("Pack filled", () => { for (const i of Inventory.catalog) Inventory.give(i.id, 1, { silent: true }); })),
      button("Fill the journal collections", act("Collections filled", () => this.fillCollections())),
    ));
  },

  setBond(min) {
    const c = state.companion;
    if (c && c.bond < min) c.bond = min;
    bus.emit("companion:level", 0);
  },

  fillCollections() {
    for (const kind of ["birds", "flowers", "songs"]) for (const e of Collections.all(kind)) Collections.add(kind, e.id, { silent: true });
  },

  // ---- The gentle parts ----
  tests(box) {
    box.append(this.row(
      button("Road event now", act("", () => { Events.start(); say("An event will appear when you close this panel"); })),
      button("Pretend I was away two days", act("", () => { state.wellbeing.lastSeen = Date.now() - 48 * 3.6e6; WelcomeBack.check(); say("Welcome-back will appear when you close this panel"); })),
      button("Show the rest summary", act("", () => SessionSummary.rest())),
    ));
  },

  // ---- Save tools ----
  saves(box) {
    this.heading(box, "Copy your whole save as text (a backup), or paste one to load it. Loading replaces your current game and restarts it.");
    const area = makeEl("textarea");
    area.rows = 4;
    area.placeholder = "Paste a save here";
    area.setAttribute("aria-label", "Save text");
    area.style.cssText = "width:100%;font:inherit;color:inherit;background:rgba(0,0,0,.25);border:1px solid rgba(223,232,238,.35);border-radius:6px;padding:6px 10px;margin-bottom:8px;";
    box.append(area, this.row(
      button("Copy my save", async () => { save(); say((await Share.copy(JSON.stringify(state))) ? "Save copied" : "Could not copy"); }),
      button("Load this save", () => {
        try {
          const raw = JSON.parse(area.value);
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("not a save");
          replaceState(migrate(raw));
          state.dev.unlocked = true;
          save();
          location.reload();
        } catch { say("That is not a save"); }
      }),
    ));
  },
};
