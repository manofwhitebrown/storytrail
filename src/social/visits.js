// visits.js - Part 25. A camp link is a small code in the web address that holds how your camp looks:
// your traveler's name, coat, hat and lantern, your companion's species and name, and what hangs
// or sits around your fire. A friend who opens it sees your camp, read-only, and can sit by your fire.
//
//   your link ->  https://.../storytrail/#camp=eyJ2IjoxLC4uLn0
//
// The part after "#" is never sent to any server. There is no account, no list of friends and no
// score. Sitting by a friend's fire gives CONFIG.VISIT_TOKENS once per camp (never for your own).
//
// SAFETY: a link is text anyone could have typed by hand. Everything read from one goes through
// sanitizeCamp() before it is drawn or saved: unknown ids are dropped (never trusted), names are
// cleaned and shortened, and { } are removed. A bad link is simply "not a camp link".

import { COATS, HATS, LANTERNS } from "../characters/customization.js";
import { Companions } from "../characters/companions/companions.js";
import { SPECIES, speciesById } from "../characters/companions/personalities.js";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { cleanText, makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { Camp, SLOTS } from "../progression/camp.js";
import { Inventory } from "../progression/inventory.js";
import { addTokens } from "../progression/tokens.js";
import { HUD } from "../ui/hud.js";
import { Panels } from "../ui/panels.js";
import { Transitions } from "../ui/transitions.js";
import { Share } from "./share.js";

const ID_PATTERN = /^[a-z0-9]{6,16}$/;

// ---- the code: JSON -> UTF-8 -> base64url ----
function toCode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCamp(code) {
  try {
    if (typeof code !== "string" || !code || code.length > CONFIG.CAMP_LINK_MAX || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { return null; }
}

// Turns whatever came out of a link into a camp we are willing to draw, or null.
export function sanitizeCamp(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.v !== 1) return null;
  if (typeof raw.i !== "string" || !ID_PATTERN.test(raw.i)) return null;

  const known = (list, id) => (list.some((o) => o.id === id) ? id : list[0].id);

  let companion = null;
  const f = raw.f;
  if (f && typeof f === "object" && !Array.isArray(f) && SPECIES.some((s) => s.id === f.s)) {
    const name = cleanText(f.n, CONFIG.NAME_SAFE_MAX);
    if (name) companion = { species: f.s, name };
  }

  const slots = {};
  const given = raw.s && typeof raw.s === "object" && !Array.isArray(raw.s) ? raw.s : {};
  for (const slot of SLOTS) {
    const id = given[slot.id];
    const item = typeof id === "string" ? Inventory.catalog.find((i) => i.id === id) : null;
    if (item && item.slot === slot.type) slots[slot.id] = item.id;   // right kind of thing for that spot, or nothing
  }

  return {
    id: raw.i,
    name: cleanText(raw.n, CONFIG.NAME_SAFE_MAX, t("visit.someone")),
    player: { coat: known(COATS, raw.c), hat: known(HATS, raw.h), lantern: known(LANTERNS, raw.l) },
    companion,
    slots,
  };
}

export function viewFromCode(code) {
  return sanitizeCamp(decodeCamp(code));
}

// Finds the code in a pasted link, or in a bare code
export function codeFromText(text) {
  const s = String(text ?? "").trim().slice(0, CONFIG.CAMP_LINK_MAX + 200);
  const found = s.match(/camp=([A-Za-z0-9_-]+)/);
  const code = found ? found[1] : /^[A-Za-z0-9_-]{16,}$/.test(s) ? s : null;
  return code && code.length <= CONFIG.CAMP_LINK_MAX ? code : null;
}

// ---- your own camp ----
function ensureCampId() {
  if (!ID_PATTERN.test(state.social.campId || "")) {
    const bytes = new Uint8Array(8);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    state.social.campId = Array.from(bytes, (b) => (b % 36).toString(36)).join("");
  }
  return state.social.campId;
}

export function ownCamp() {
  const c = state.companion;
  return {
    id: ensureCampId(),
    name: cleanText(state.player.name, CONFIG.NAME_SAFE_MAX, "Traveler"),
    player: { coat: state.player.coat, hat: state.player.hat, lantern: state.player.lantern },
    companion: Companions.has() ? { species: c.species, name: c.name } : null,
    slots: { ...state.camp.slots },
  };
}

export function encodeCamp(view) {
  const body = { v: 1, i: view.id, n: view.name, c: view.player.coat, h: view.player.hat, l: view.player.lantern, s: view.slots };
  if (view.companion) body.f = { s: view.companion.species, n: view.companion.name };
  return toCode(body);
}

// ---- the visit itself ----
let bar = null;
let invite = null;
let invited = null;   // the camp the invite panel is about

export const Visits = {
  get active() { return !!Camp.visiting; },

  ownLink: () => `${Share.baseUrl()}#camp=${encodeCamp(ownCamp())}`,

  async copyOwn() {
    return (await Share.copy(this.ownLink())) ? "copied" : "failed";
  },

  shareOwn() {
    return Share.shareLink({
      title: t("share.camp.title", { name: ownCamp().name }),
      text: t("share.camp.text"),
      url: this.ownLink(),
    });
  },

  init() {
    bar = makeEl("section", null, "camp-bar hidden");
    bar.setAttribute("aria-label", t("visit.aria"));
    document.getElementById("stage").after(bar);

    invite = Panels.create("visit-invite", { className: "centered", label: t("visit.invite.aria"), onOpen: () => this.renderInvite() });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && Camp.visiting && !Panels.isOpen()) this.leave();
    });
  },

  // A link opened with the game (#camp=...) becomes a polite invitation, never a surprise
  checkHash() {
    const found = location.hash.match(/^#camp=([A-Za-z0-9_-]+)$/);
    if (!found) return;
    history.replaceState(null, "", location.pathname + location.search);   // so a reload does not ask again
    this.invite(found[1]);
  },

  // A camp code from anywhere (the address, or the Android app opened by a link). Asks first.
  invite(code) {
    const view = viewFromCode(code);
    if (!view) { HUD.toast(t("visit.bad"), { feedback: true }); return false; }
    invited = view;
    Panels.open("visit-invite");
    return true;
  },

  // From a pasted link or code. Returns false when it is not a camp.
  visitCode(code) {
    const view = viewFromCode(code);
    if (!view) return false;
    return this.enter(view) || true;
  },

  enter(view) {
    if (Camp.visiting || Transitions.busy || Panels.isOpen()) return false;
    if (Camp.active) { HUD.toast(t("visit.leaveCampFirst"), { feedback: true }); return false; }
    Transitions.fade(() => {
      Camp.visiting = view;
      document.body.dataset.visiting = "true";
      bar.classList.remove("hidden");
      this.renderBar(false);
      bus.emit("visit:enter", view.id);
    });
    return true;
  },

  leave() {
    if (!Camp.visiting || Transitions.busy) return;
    Transitions.fade(() => {
      Camp.visiting = null;
      delete document.body.dataset.visiting;
      bar.classList.add("hidden");
      bus.emit("visit:leave");
    });
  },

  sit() {
    const v = Camp.visiting;
    if (!v) return;
    const first = v.id !== state.social.campId && !state.social.visited.includes(v.id) && state.social.visited.length < CONFIG.VISITED_MAX;
    if (first) {
      state.social.visited.push(v.id);
      addTokens(CONFIG.VISIT_TOKENS, "visit");
    }
    bus.emit("visit:sat", { id: v.id, first });
    this.renderBar(true, first);
  },

  renderInvite() {
    invite.replaceChildren();
    if (!invited) return;
    invite.append(
      makeEl("h2", t("visit.invite.title", { name: invited.name })),
      makeEl("p", t("visit.invite.body")),
    );
    const row = makeEl("div", null, "row");
    const yes = makeEl("button", t("visit.yes"));
    yes.type = "button";
    yes.dataset.autofocus = "";
    yes.addEventListener("click", () => { const v = invited; Panels.close("visit-invite"); this.enter(v); });
    const later = makeEl("button", t("visit.later"));
    later.type = "button";
    later.addEventListener("click", () => Panels.close("visit-invite"));
    row.append(yes, later);
    invite.append(row);
  },

  renderBar(sat, first = false) {
    const v = Camp.visiting;
    if (!v) return;
    bar.replaceChildren();

    const head = makeEl("div", null, "camp-head");
    head.append(makeEl("h2", t("visit.title", { name: v.name })));
    head.append(makeEl("p", v.companion
      ? t("visit.with", { companion: v.companion.name, species: speciesById(v.companion.species).label })
      : t("visit.alone"), "camp-sub"));
    bar.append(head);

    if (sat) {
      const said = makeEl("p", t("visit.sitText", { name: v.name }), "camp-sub");
      said.setAttribute("role", "status");
      bar.append(said);
      if (first) bar.append(makeEl("p", t("visit.reward", { n: CONFIG.VISIT_TOKENS }), "reward"));
    } else {
      const sitBtn = makeEl("button", t("visit.sit"));
      sitBtn.type = "button";
      sitBtn.addEventListener("click", () => this.sit());
      bar.append(sitBtn);
    }

    const leave = makeEl("button", t("visit.leave"));
    leave.type = "button";
    leave.addEventListener("click", () => this.leave());
    bar.append(leave);
    if (sat) leave.focus();   // the Sit button is gone; keep keyboard focus in the bar
  },
};
