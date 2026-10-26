// tokens.js - the one way tokens are earned (steps, events, landmarks, secrets).

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { HUD } from "../ui/hud.js";

export function addTokens(n, source = "other") {
  if (!n) return;
  state.tokens += n;
  state.stats.tokensEarned += n;
  HUD.popup(`+${n} token${n > 1 ? "s" : ""}`, CONFIG.PLAYER_X, 450 * CONFIG.GROUND_RATIO - 20);
  HUD.updateCounters();
  bus.emit("tokens", { n, source, total: state.tokens });
}
