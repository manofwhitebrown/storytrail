// secrets.js - Part 21. Rare discoveries just off the main path.
// A glimmer appears at the edge of the road, but only under the right conditions
// (a certain time of day, weather...). Tap "Look closer" before you walk past.

import data from "../../assets/data/landmarks.json";
import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { hash, makeEl } from "../core/util.js";
import { fillVars, meets } from "../events/consequences.js";
import { Collections } from "../progression/collections.js";
import { Inventory } from "../progression/inventory.js";
import { addTokens } from "../progression/tokens.js";
import { Panels } from "../ui/panels.js";
import { HUD } from "../ui/hud.js";
import { LOOP_STEPS } from "./biomes/index.js";

const { STEP_DISTANCE, PLAYER_X } = CONFIG;
let promptBtn = null;
let panel = null;
let offered = null;   // the secret you can look at right now
let opening = null;   // the secret the panel is showing
let clock = 0;

// How many steps from the secret's spot (negative = still ahead of you)
function distance(secret, steps) {
  let d = (steps % LOOP_STEPS) - secret.at;
  if (d > LOOP_STEPS / 2) d -= LOOP_STEPS;
  if (d < -LOOP_STEPS / 2) d += LOOP_STEPS;
  return d;
}

export const Secrets = {
  list: data.secrets,
  byId: (id) => data.secrets.find((s) => s.id === id),
  found: (id) => state.discovered.secrets.includes(id),
  isHidden: (s) => Secrets.found(s.id) || !meets(s.when), // not here right now

  init() {
    promptBtn = document.getElementById("secretPrompt");
    promptBtn.textContent = "✦ Look closer";
    promptBtn.addEventListener("click", () => { if (offered) this.open(offered); });

    panel = Panels.create("secret", {
      className: "centered", label: "A discovery",
      onOpen: () => this.claim(),
      onClose: () => { opening = null; },
    });

    bus.on("step", (steps) => this.onStep(steps));
    bus.on("panel:open", () => this.refresh());
    bus.on("panel:close", () => this.refresh());
  },

  onStep(steps) {
    offered = null;
    for (const s of this.list) {
      if (this.isHidden(s)) continue;
      const d = distance(s, steps);
      if (d >= -3 && d <= 2) {
        offered = s;
        if (d === -3) HUD.toast(s.prompt);
      }
    }
    this.refresh();
  },

  refresh() {
    const show = offered && !Panels.isOpen();
    promptBtn.classList.toggle("hidden", !show);
    if (show) promptBtn.setAttribute("aria-label", `Look closer. ${offered.prompt}`);
  },

  open(secret) {
    opening = secret;
    Panels.open("secret");
  },

  // Give the rewards (once) the moment the panel opens
  claim() {
    const s = opening;
    panel.replaceChildren();
    if (!s) return;
    const first = !this.found(s.id);
    const lines = [];

    if (first) {
      state.discovered.secrets.push(s.id);
      const r = s.reward || {};
      if (r.tokens) { addTokens(r.tokens, "secret"); lines.push(`+${r.tokens} tokens`); }
      if (r.item) { Inventory.give(r.item, 1, { silent: true }); lines.push(`Found: ${Inventory.get(r.item).name} ${Inventory.get(r.item).emoji}`); }
      if (r.collect && Collections.add(r.collect.kind, r.collect.id, { silent: true })) {
        const e = Collections.find(r.collect.kind, r.collect.id);
        lines.push(`${e.icon} Added to your journal: ${e.name}`);
      }
      bus.emit("secret:found", s);
    }

    offered = null;
    const done = makeEl("button", "Continue");
    done.type = "button";
    done.dataset.autofocus = "";
    done.addEventListener("click", () => Panels.close("secret"));

    panel.append(
      makeEl("h2", `${s.icon} ${s.name}`),
      makeEl("p", fillVars(s.text)),
      ...lines.map((t) => makeEl("p", t, "reward")),
      done,
    );
  },

  update(dt) { clock += dt; },

  // A little twinkle at the edge of the road, ahead of you
  draw(ctx, w, groundY, scroll) {
    const pos = scroll / STEP_DISTANCE;
    const loop = Math.floor(pos / LOOP_STEPS);
    for (const s of this.list) {
      if (this.isHidden(s)) continue;
      for (const k of [loop, loop + 1]) {
        const x = PLAYER_X + (s.at + k * LOOP_STEPS - pos) * STEP_DISTANCE;
        if (x < -20 || x > w + 20) continue;
        const y = groundY - 36 - hash(s.at) * 24;
        const pulse = 0.55 + 0.45 * Math.sin(clock * 3 + s.at);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 24);
        g.addColorStop(0, `rgba(255,240,170,${0.6 * pulse})`);
        g.addColorStop(1, "rgba(255,240,170,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 24, y - 24, 48, 48);
        ctx.fillStyle = `rgba(255,250,220,${0.9 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(x, y - 9); ctx.lineTo(x + 2.5, y - 2.5); ctx.lineTo(x + 9, y); ctx.lineTo(x + 2.5, y + 2.5);
        ctx.lineTo(x, y + 9); ctx.lineTo(x - 2.5, y + 2.5); ctx.lineTo(x - 9, y); ctx.lineTo(x - 2.5, y - 2.5);
        ctx.fill();
      }
    }
  },
};
