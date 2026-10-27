// inventory.js - things you find on the road (and use to decorate your camp).

import items from "../../assets/data/items.json";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { t } from "../i18n/strings.js";
import { HUD } from "../ui/hud.js";

const BY_ID = Object.fromEntries(items.items.map((i) => [i.id, i]));

export const Inventory = {
  catalog: items.items,
  get: (id) => BY_ID[id],
  count: (id) => state.inventory[id] || 0,

  give(id, n = 1, { silent = false } = {}) {
    const item = BY_ID[id];
    if (!item) { console.warn(`[inventory] unknown item "${id}"`); return; }
    state.inventory[id] = this.count(id) + n;
    if (!silent) HUD.toast(t("inventory.found", { name: item.name, emoji: item.emoji }));
    bus.emit("item:gained", item);
  },

  take(id, n = 1) {
    if (this.count(id) < n) return false;
    state.inventory[id] -= n;
    if (state.inventory[id] <= 0) delete state.inventory[id];
    return true;
  },

  // [{ item, count }] for things you're carrying
  carried() {
    return Object.keys(state.inventory).filter((id) => BY_ID[id]).map((id) => ({ item: BY_ID[id], count: state.inventory[id] }));
  },
};
