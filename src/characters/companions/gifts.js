// gifts.js - Part 15. Close companions bring you small things from the road.

import { CONFIG } from "../../core/config.js";
import { state } from "../../core/state.js";
import { pick } from "../../core/util.js";
import { Inventory } from "../../progression/inventory.js";
import { HUD } from "../../ui/hud.js";
import { biomeAt } from "../../world/biomes/index.js";
import { levelIndex } from "./bonding.js";
import { speciesById } from "./personalities.js";

export function maybeGift(steps) {
  const c = state.companion;
  if (!c || !c.name || steps % CONFIG.GIFT_EVERY_STEPS !== 0) return;
  if (levelIndex(c.bond) < 1 || Math.random() > 0.65) return;

  // Prefer something from the place you're in, otherwise something they like to carry
  const here = biomeAt(steps).id;
  const local = Inventory.catalog.filter((i) => i.foundIn.includes(here));
  const id = local.length && Math.random() < 0.6 ? pick(local).id : pick(speciesById(c.species).gifts);

  Inventory.give(id, 1, { silent: true });
  c.gifts += 1;
  const item = Inventory.get(id);
  HUD.toast(`${c.name} brought you a gift: ${item.name} ${item.emoji}`);
}
