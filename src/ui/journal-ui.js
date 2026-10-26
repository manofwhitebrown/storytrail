// journal-ui.js - the Journal screen: Diary, Letters, Memories, Collection, Achievements.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { ACHIEVEMENTS, Achievements } from "../progression/achievements.js";
import { Collections } from "../progression/collections.js";
import { Journal } from "../story/journal.js";
import { Letters } from "../story/letters.js";
import { Panels } from "./panels.js";

const TABS = [
  ["diary", "Diary"],
  ["letters", "Letters"],
  ["memories", "Memories"],
  ["collection", "Collection"],
  ["achievements", "Achievements"],
];

let el = null, body = null, tabsEl = null;
let tab = "diary";

const VIEWS = {
  diary(root) {
    Journal.diary().forEach((ch, i) => {
      if (!ch.reached) {
        root.append(makeEl("h3", `Chapter ${i + 1}`), makeEl("p", "Not reached yet.", "locked"));
        return;
      }
      root.append(makeEl("h3", `Chapter ${i + 1}: ${ch.title}`));
      const list = makeEl("ol");
      list.start = Journal.diary().slice(0, i).reduce((n, c) => n + c.pages.length, 0) + 1;
      for (const p of ch.pages) {
        const li = makeEl("li");
        if (p.unlocked) li.append(makeEl("h4", p.title), makeEl("p", p.text));
        else { li.className = "locked"; li.append(makeEl("p", p.landmark ? `Locked. Collect ${p.tokens} tokens, then reach the place this page is about.` : `Locked. Collect ${p.tokens} tokens to read this page.`)); }
        list.append(li);
      }
      root.append(list);
    });
    if (state.story.ended) root.append(makeEl("p", "The story is finished. The road is not.", "reward"));
  },

  letters(root) {
    const letters = Journal.letters();
    if (!letters.length) { root.append(makeEl("p", "No letters yet. People you meet on the road may write to you.", "locked")); return; }
    for (const l of letters) {
      const d = makeEl("details", null, "letter");
      if (!l.read) d.open = false;
      d.append(makeEl("summary", `${l.read ? "" : "● "}${l.from}: ${l.subject}`));
      d.append(makeEl("p", l.text));
      d.addEventListener("toggle", () => { if (d.open && !l.read) { Letters.markRead(l.id); l.read = true; d.querySelector("summary").textContent = `${l.from}: ${l.subject}`; } });
      root.append(d);
    }
  },

  memories(root) {
    const list = Journal.memories();
    if (!list.length) { root.append(makeEl("p", "Nothing yet. The road remembers the choices that matter.", "locked")); return; }
    const ul = makeEl("ul");
    list.forEach((m) => ul.append(makeEl("li", m.text)));
    root.append(ul);
  },

  collection(root) {
    root.append(makeEl("h3", "Stamps"));
    const stamps = makeEl("div", null, "tiles");
    for (const s of Journal.stamps()) stamps.append(tile(s.got ? s.icon : "?", s.got ? s.name : (s.secret ? "A hidden place" : "Not yet reached"), s.got, s.got ? s.text : ""));
    root.append(stamps);

    const heads = { birds: "Sketches: birds seen", flowers: "Pressed flowers", songs: "Songs heard" };
    for (const kind of Collections.kinds) {
      root.append(makeEl("h3", `${heads[kind]} (${Collections.count(kind)}/${Collections.total(kind)})`));
      const grid = makeEl("div", null, "tiles");
      for (const e of Journal.entries(kind)) grid.append(tile(e.got ? e.icon : "?", e.got ? e.name : "Not yet found", e.got, e.got ? e.note : ""));
      root.append(grid);
    }
  },

  achievements(root) {
    const ul = makeEl("ul", null, "plain");
    for (const a of ACHIEVEMENTS) {
      const got = Achievements.has(a.id);
      ul.append(makeEl("li", got ? `🏅 ${a.name}` : `🔒 ${a.hint}`, got ? "" : "locked"));
    }
    root.append(ul);
  },
};

function tile(icon, name, got, note) {
  const t = makeEl("div", null, `tile${got ? "" : " locked"}`);
  t.append(makeEl("span", icon, "tile-icon"), makeEl("span", name, "tile-name"));
  if (note) t.title = note;
  return t;
}

export const JournalUI = {
  init() {
    el = Panels.create("journal", { className: "journal-like", label: "Journal", onOpen: () => this.render() });
    document.getElementById("journalBtn").addEventListener("click", () => Panels.open("journal"));
    for (const evt of ["tokens", "letter:received", "collection:added", "memory:added", "achievement"]) {
      bus.on(evt, () => { if (Panels.current() === "journal") this.render(true); });
    }
  },

  render(keepFocus = false) {
    const focused = keepFocus ? document.activeElement?.dataset?.tab : null;
    el.replaceChildren();
    const head = makeEl("div", null, "panel-head");
    head.append(makeEl("h2", "Journal"));
    const close = makeEl("button", "Close");
    close.type = "button";
    close.addEventListener("click", () => Panels.close("journal"));
    head.append(close);

    tabsEl = makeEl("div", null, "tabs");
    tabsEl.setAttribute("role", "tablist");
    for (const [id, label] of TABS) {
      const unread = id === "letters" && Letters.unread() ? " ●" : "";
      const b = makeEl("button", label + unread);
      b.type = "button"; b.dataset.tab = id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(tab === id));
      b.addEventListener("click", () => { tab = id; this.render(); el.querySelector(`[data-tab="${id}"]`).focus(); });
      tabsEl.append(b);
    }

    body = makeEl("div", null, "journal-body");
    body.setAttribute("role", "tabpanel");
    VIEWS[tab](body);
    el.append(head, tabsEl, body);
    if (focused) el.querySelector(`[data-tab="${focused}"]`)?.focus();
  },
};
