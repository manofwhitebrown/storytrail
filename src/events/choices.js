// choices.js - what happens when you pick an option in an event.
// Handles everything an event choice can do: tokens, tags, flags, memories, items, collections.

import { addTag, resolveText, setFlag } from "./consequences.js";
import { Memories } from "../story/memories.js";
import { Collections } from "../progression/collections.js";
import { Inventory } from "../progression/inventory.js";
import { addTokens } from "../progression/tokens.js";

export function applyChoice(event, choice, index) {
  (choice.tags || []).forEach(addTag);
  (choice.set || []).forEach((flag) => setFlag(flag));
  if (choice.memory) Memories.add(`${event.id}:${index}`, choice.memory);
  if (choice.item) Inventory.give(choice.item);
  if (choice.collect) Collections.add(choice.collect.kind, choice.collect.id);
  choice.onChoose?.();

  const text = resolveText(choice.result);
  addTokens(choice.tokens || 0, "event");
  return { text, tokens: choice.tokens || 0 };
}
