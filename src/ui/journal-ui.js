// journal-ui.js - the Journal screen: Diary, Letters, Memories, Collection, Achievements, Goals.

import { Daily } from "../goals/daily.js";
import { Quests } from "../goals/quests.js";
import { Seasonal } from "../goals/seasonal.js";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { ACHIEVEMENTS, Achievements, achHint, achName } from "../progression/achievements.js";
import { Collections } from "../progression/collections.js";
import { Inventory } from "../progression/inventory.js";
import { Journal } from "../story/journal.js";
import { Letters } from "../story/letters.js";
import { button } from "./settings.js";
import { Panels } from "./panels.js";

const TABS = ["diary", "letters", "memories", "collection", "achievements", "goals"];

let el = null, body = null, tabsEl = null;
let tab = "diary";

const bar = (done, goal) => {
  const p = makeEl("progress");
  p.max = goal; p.value = Math.min(done, goal);
  p.setAttribute("aria-label", t("goals.progress", { done, goal }));
  return p;
};

function goalRow(text, done, goal, extra) {
  const li = makeEl("li", null, "goal");
  li.append(makeEl("p", text), bar(done, goal), makeEl("span", t("goals.progress", { done, goal }), "menu-sub"));
  if (extra) li.append(extra);
  return li;
}

const VIEWS = {
  diary(root) {
    Journal.diary().forEach((ch, i) => {
      if (!ch.reached) {
        root.append(makeEl("h3", t("journal.chapter", { num: i + 1 })), makeEl("p", t("journal.notReached"), "locked"));
        return;
      }
      root.append(makeEl("h3", t("journal.chapter.title", { num: i + 1, title: ch.title })));
      const list = makeEl("ol");
      list.start = Journal.diary().slice(0, i).reduce((n, c) => n + c.pages.length, 0) + 1;
      for (const p of ch.pages) {
        const li = makeEl("li");
        if (p.unlocked) li.append(makeEl("h4", p.title), makeEl("p", p.text));
        else { li.className = "locked"; li.append(makeEl("p", t(p.landmark ? "journal.locked.landmark" : "journal.locked", { tokens: p.tokens }))); }
        list.append(li);
      }
      root.append(list);
    });
    if (state.story.ended) root.append(makeEl("p", t("journal.ended"), "reward"));
  },

  letters(root) {
    const letters = Journal.letters();
    if (!letters.length) { root.append(makeEl("p", t("journal.letters.none"), "locked")); return; }
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
    if (!list.length) { root.append(makeEl("p", t("journal.memories.none"), "locked")); return; }
    const ul = makeEl("ul");
    list.forEach((m) => ul.append(makeEl("li", m.text)));
    root.append(ul);
  },

  collection(root) {
    root.append(makeEl("h3", t("journal.stamps")));
    const stamps = makeEl("div", null, "tiles");
    for (const s of Journal.stamps()) stamps.append(tile(s.got ? s.icon : "?", s.got ? s.name : (s.secret ? t("journal.hiddenPlace") : t("journal.notReachedYet")), s.got, s.got ? s.text : ""));
    root.append(stamps);

    for (const kind of Collections.kinds) {
      root.append(makeEl("h3", `${t(`journal.kind.${kind}`)} (${Collections.count(kind)}/${Collections.total(kind)})`));
      const grid = makeEl("div", null, "tiles");
      for (const e of Journal.entries(kind)) grid.append(tile(e.got ? e.icon : "?", e.got ? e.name : t("journal.notFound"), e.got, e.got ? e.note : ""));
      root.append(grid);
    }
  },

  achievements(root) {
    const ul = makeEl("ul", null, "plain");
    for (const a of ACHIEVEMENTS) {
      const got = Achievements.has(a.id);
      ul.append(makeEl("li", got ? `🏅 ${achName(a.id)}` : `🔒 ${achHint(a.id)}`, got ? "" : "locked"));
    }
    root.append(ul);
  },

  goals(root) {
    root.append(makeEl("p", t("goals.note"), "menu-sub"));

    // today
    root.append(makeEl("h3", t("goals.today")));
    const day = Daily.current();
    if (day) {
      const ul = makeEl("ul", null, "plain goals");
      if (day.done) ul.append(makeEl("li", t("goals.today.done"), "reward"));
      else ul.append(goalRow(day.text, day.n, day.goal));
      root.append(ul);
    }

    // errands
    root.append(makeEl("h3", t("goals.errands.active", { count: state.goals.active.length, max: CONFIG.MAX_ACTIVE_ERRANDS })));
    const active = Quests.active();
    if (!active.length) root.append(makeEl("p", t("goals.errands.none"), "locked"));
    const ul = makeEl("ul", null, "plain goals");
    for (const e of active) {
      const li = goalRow(`${e.title}: ${e.text}`, Quests.progress(e.id), e.goal, button(t("goals.putDown"), () => Quests.abandon(e.id)));
      ul.append(li);
    }
    root.append(ul);

    const available = Quests.available();
    if (available.length) {
      root.append(makeEl("h3", t("goals.errands.available")));
      if (!Quests.canTakeMore()) root.append(makeEl("p", t("goals.errands.full"), "menu-sub"));
      const list = makeEl("ul", null, "plain goals");
      for (const e of available) {
        const li = makeEl("li", null, "goal");
        li.append(makeEl("p", `${e.title}: ${e.text}`), makeEl("span", t("goals.reward", { tokens: e.reward.tokens }), "menu-sub"));
        const take = button(t("goals.take"), () => Quests.accept(e.id));
        take.disabled = !Quests.canTakeMore();
        li.append(take);
        list.append(li);
      }
      root.append(list);
    }
    if (state.goals.done.length) root.append(makeEl("p", t("goals.errands.finished", { count: state.goals.done.length }), "menu-sub"));

    // season
    const s = Seasonal.current();
    root.append(makeEl("h3", t("goals.seasonal", { season: t(`goals.season.${s.season}`) })));
    const sl = makeEl("ul", null, "plain goals");
    for (const g of s.goals) sl.append(g.done ? makeEl("li", `✓ ${g.text}`, "reward") : goalRow(g.text, g.n, g.goal));
    root.append(sl);
    const keep = Inventory.get(s.keepsake);
    if (keep) root.append(makeEl("p", t("goals.seasonal.hint", { name: keep.name, emoji: keep.emoji }), "menu-sub"));
  },
};

function tile(icon, name, got, note) {
  const el = makeEl("div", null, `tile${got ? "" : " locked"}`);
  el.append(makeEl("span", icon, "tile-icon"), makeEl("span", name, "tile-name"));
  if (note) el.title = note;
  return el;
}

export const JournalUI = {
  init() {
    el = Panels.create("journal", { className: "journal-like", label: t("journal.title"), onOpen: () => this.render() });
    document.getElementById("journalBtn").addEventListener("click", () => Panels.open("journal"));
    for (const evt of ["tokens", "letter:received", "collection:added", "memory:added", "achievement", "goals:changed"]) {
      bus.on(evt, () => { if (Panels.current() === "journal") this.render(true); });
    }
  },

  render(keepFocus = false) {
    const active = keepFocus ? document.activeElement : null;
    const focused = active?.dataset?.tab ?? null;
    el.replaceChildren();
    const head = makeEl("div", null, "panel-head");
    head.append(makeEl("h2", t("journal.title")));
    const close = makeEl("button", t("journal.close"));
    close.type = "button";
    close.addEventListener("click", () => Panels.close("journal"));
    head.append(close);

    tabsEl = makeEl("div", null, "tabs");
    tabsEl.setAttribute("role", "tablist");
    for (const id of TABS) {
      const unread = id === "letters" && Letters.unread() ? " ●" : "";
      const b = makeEl("button", t(`journal.tab.${id}`) + unread);
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
