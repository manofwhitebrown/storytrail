// bonding.js - Part 15. Friendship grows with time together (steps, and rest at camp).

import { bus } from "../../core/event-bus.js";
import { state } from "../../core/state.js";
import { t } from "../../i18n/strings.js";
import { HUD } from "../../ui/hud.js";

export const LEVELS = [
  { min: 0, label: "Wary" },
  { min: 40, label: "Friendly" },
  { min: 120, label: "Close" },
  { min: 300, label: "Inseparable" },
];

export function levelIndex(bond) {
  let i = 0;
  LEVELS.forEach((l, n) => { if (bond >= l.min) i = n; });
  return i;
}
export const levelLabel = (bond) => LEVELS[levelIndex(bond)].label;

export function addBond(amount) {
  const c = state.companion;
  if (!c) return;
  const before = levelIndex(c.bond);
  c.bond += amount;
  const after = levelIndex(c.bond);
  if (after > before) {
    HUD.toast(t("bond.now", { name: c.name, level: LEVELS[after].label.toLowerCase() }));
    bus.emit("companion:level", after);
  }
}
