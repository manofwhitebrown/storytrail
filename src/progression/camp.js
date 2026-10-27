// camp.js - Part 16. A cozy home base. Decorate it with things you find on the road,
// let your companion rest by the fire, and leave from it (or come back to it) any time.
// Rest at camp also brings you and your companion closer.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { hash, makeEl } from "../core/util.js";
import { cube, pixel } from "../graphics/blocks.js";
import { ItemSprites } from "../graphics/item-sprites.js";
import { Companions } from "../characters/companions/companions.js";
import { Customization } from "../characters/customization.js";
import { Player } from "../characters/player.js";
import { Panels } from "../ui/panels.js";
import { HUD } from "../ui/hud.js";
import { Transitions } from "../ui/transitions.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Weather } from "../world/weather.js";
import { World } from "../world/world.js";
import { t } from "../i18n/strings.js";
import { Inventory } from "./inventory.js";

const FIRE = { x: 430, y: 372 };
// Where things can sit. type: hang (from the rope), ground, shelf (on the crate)
export const SLOTS = [
  { id: "hang-1", type: "hang", x: 330, y: 168, label: "Rope, left" },
  { id: "hang-2", type: "hang", x: 560, y: 168, label: "Rope, right" },
  { id: "ground-1", type: "ground", x: 270, y: 404, label: "Ground, left" },
  { id: "ground-2", type: "ground", x: 620, y: 404, label: "Ground, right" },
  { id: "shelf-1", type: "shelf", x: 700, y: 330, label: "Crate, left" },
  { id: "shelf-2", type: "shelf", x: 748, y: 330, label: "Crate, right" },
];
const typeWord = (type) => t(`camp.type.${type}`);
const slotLabel = (slot) => t(`camp.slot.${slot.id}`);

let btn = null, bar = null;
let selected = null;   // item id picked from your pack
let clock = 0, restAcc = 0;

export const Camp = {
  active: false,
  visiting: null, // a friend's camp being looked at (Part 25, see social/visits.js). Drawn by draw(), never changed.

  init() {
    btn = document.getElementById("campBtn");
    btn.addEventListener("click", () => (this.active ? this.leave() : this.enter()));
    bar = makeEl("section", null, "camp-bar hidden");
    bar.setAttribute("aria-label", "Your camp");
    document.getElementById("stage").after(bar);
  },

  enter() {
    if (this.active || this.visiting || Transitions.busy || Panels.isOpen()) return;
    Transitions.fade(() => {
      this.active = true;
      state.camp.visits += 1;
      selected = null;
      bar.classList.remove("hidden");
      btn.textContent = t("camp.leave");
      this.renderBar();
      bus.emit("camp:enter");
    });
  },

  leave() {
    if (!this.active || Transitions.busy) return;
    Transitions.fade(() => {
      this.active = false;
      bar.classList.add("hidden");
      btn.textContent = t("camp.button");
      bus.emit("camp:leave");
    });
  },

  update(dt) {
    clock += dt;
    if (!this.active) return;
    restAcc += dt;
    if (restAcc >= 1) { Companions.restTick(restAcc); restAcc = 0; }
  },

  // ---- the decorate bar (plain buttons, so it works with keyboard and screen readers) ----
  renderBar() {
    bar.replaceChildren();
    const head = makeEl("div", null, "camp-head");
    head.append(makeEl("h2", t("camp.title")));
    head.append(makeEl("p", Companions.has() ? t("camp.resting", { info: Companions.info() }) : t("camp.quiet"), "camp-sub"));
    bar.append(head);

    const pack = makeEl("div", null, "camp-group");
    pack.append(makeEl("h3", t("camp.pack")));
    const carried = Inventory.carried();
    if (!carried.length) pack.append(makeEl("p", t("camp.pack.empty"), "camp-sub"));
    for (const { item, count } of carried) {
      const b = makeEl("button", `${item.emoji} ${item.name}${count > 1 ? ` ×${count}` : ""}`);
      b.type = "button";
      b.title = `${item.note} (${typeWord(item.slot)})`;
      b.setAttribute("aria-pressed", String(selected === item.id));
      b.addEventListener("click", () => { selected = selected === item.id ? null : item.id; this.renderBar(); });
      pack.append(b);
    }
    bar.append(pack);

    const spots = makeEl("div", null, "camp-group");
    spots.append(makeEl("h3", selected ? t("camp.where", { name: Inventory.get(selected).name }) : t("camp.spots")));
    for (const slot of SLOTS) {
      const id = state.camp.slots[slot.id];
      const item = id && Inventory.get(id);
      const b = makeEl("button", item ? `${item.emoji} ${item.name}` : t("camp.empty", { label: slotLabel(slot) }));
      b.type = "button";
      b.setAttribute("aria-label", item ? t("camp.aria.full", { label: slotLabel(slot), name: item.name }) : t("camp.empty", { label: slotLabel(slot) }));
      b.addEventListener("click", () => this.useSlot(slot));
      spots.append(b);
    }
    bar.append(spots);

    const leave = makeEl("button", t("camp.leave"));
    leave.type = "button";
    leave.addEventListener("click", () => this.leave());
    bar.append(leave);
  },

  useSlot(slot) {
    const current = state.camp.slots[slot.id];
    if (current) {
      delete state.camp.slots[slot.id];
      Inventory.give(current, 1, { silent: true });
    } else if (selected) {
      const item = Inventory.get(selected);
      if (item.slot !== slot.type) { HUD.toast(t("camp.wrongSlot", { name: item.name, how: typeWord(item.slot) }), { feedback: true }); return; }
      if (!Inventory.take(selected)) return;
      state.camp.slots[slot.id] = selected;
      if (!Inventory.count(selected)) selected = null;
    } else {
      HUD.toast(t("camp.pickFirst"), { feedback: true });
      return;
    }
    this.renderBar();
    bus.emit("camp:changed");
  },

  // ---- drawing ----
  // `view` draws a friend's camp instead of yours: { slots, player: { coat, hat, lantern }, companion }
  draw(ctx, w, h, view = this.visiting) {
    const look = World.look;
    const groundY = World.groundY(h);
    World.drawBackdrop(ctx, w, h);

    ctx.fillStyle = look.ground;
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = look.path;                       // a worn patch of dirt around the fire
    ctx.beginPath(); ctx.ellipse(430, 392, 330, 52, 0, 0, Math.PI * 2); ctx.fill();

    this.drawTent(ctx);
    this.drawPolesAndRope(ctx);
    this.drawCrate(ctx);
    this.drawFire(ctx);
    this.drawDecor(ctx, view ? view.slots : state.camp.slots, !view);

    Companions.draw(ctx, 372, 398, true, view ? view.companion : undefined);
    Player.draw(ctx, h, { x: 520, still: true, look: view ? Customization.look(view.player) : undefined });

    Seasons.draw(ctx);
    Weather.draw(ctx, w, h);
    TimeOfDay.drawLighting(ctx, w, h, { x: FIRE.x, y: FIRE.y - 10, radius: 360, color: "#ffb060" });
    Weather.drawGlow(ctx);
  },

  drawTent(ctx) {
    for (let i = 0; i < 5; i++) {                      // five tiers, wide at the bottom
      const w = 160 - i * 32;
      cube(ctx, 150 - w / 2, 392 - 32 * (i + 1), w, 32, i % 2 ? "#a67a50" : "#b7885a", 6);
    }
    pixel(ctx, 130, 342, 40, 50, "#2a1f1a");           // doorway
    pixel(ctx, 138, 312, 24, 30, "#2a1f1a");
  },

  drawPolesAndRope(ctx) {
    cube(ctx, 259, 140, 7, 262, "#4a382c", 3);
    cube(ctx, 639, 140, 7, 262, "#4a382c", 3);
    for (let x = 266; x < 639; x += 12) {              // the rope: a row of little boxes that sags
      const sag = Math.sin(((x - 266) / 373) * Math.PI) * 22;
      pixel(ctx, x, 142 + Math.round(sag / 3) * 3, 9, 3, "#cdbd9a");
    }
  },

  drawCrate(ctx) {
    cube(ctx, 676, 340, 100, 56, "#6b4a30", 8);
    pixel(ctx, 676, 340, 100, 6, "#4f3623");
    pixel(ctx, 722, 340, 4, 56, "#4f3623");
    pixel(ctx, 676, 366, 100, 4, "#4f3623");
  },

  drawFire(ctx) {
    const { x, y } = FIRE;
    cube(ctx, x - 32, y + 8, 64, 10, "#4a3326", 4);    // logs
    cube(ctx, x - 22, y - 2, 44, 10, "#5a4030", 4);
    const flick = (n) => 1 + Math.sin(clock * 9 + n * 2) * 0.12;
    for (const [w, hgt, col] of [[34, 36, "#e8782a"], [24, 28, "#f6a33a"], [12, 18, "#fde08a"]]) {
      const hh = Math.round((hgt * flick(w)) / 3) * 3;  // flames grow in whole 3px steps
      pixel(ctx, x - w / 2, y + 6 - hh, w, hh, col);
    }
  },

  drawDecor(ctx, slots, showEmpty = true) {
    ctx.textAlign = "center";
    ctx.font = "30px serif";
    for (const slot of SLOTS) {
      const id = slots[slot.id];
      const item = id && Inventory.get(id);
      if (!item) {
        if (!showEmpty) continue;   // in a friend's camp the empty spots are just empty
        ctx.strokeStyle = "rgba(223,232,238,0.18)"; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5;
        ctx.strokeRect(slot.x - 17, slot.y - (slot.type === "hang" ? 0 : 12) - 17, 34, 34);   // an empty box
        ctx.setLineDash([]);
        continue;
      }
      if (slot.type === "hang") {
        const sway = Math.sin(clock * 1.4 + hash(slot.x) * 6) * (3 + Weather.wind * 6);
        ctx.strokeStyle = "#cdbd9a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(slot.x, 152); ctx.lineTo(slot.x + sway, slot.y - 12); ctx.stroke();
        ItemSprites.draw(ctx, item, slot.x + sway, slot.y - 4);
      } else {
        ItemSprites.draw(ctx, item, slot.x, slot.y - 12);
      }
    }
  },
};
