// camp.js - Part 16. A cozy home base. Decorate it with things you find on the road,
// let your companion rest by the fire, and leave from it (or come back to it) any time.
// Rest at camp also brings you and your companion closer.

import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { hash, makeEl } from "../core/util.js";
import { Companions } from "../characters/companions/companions.js";
import { Player } from "../characters/player.js";
import { Panels } from "../ui/panels.js";
import { HUD } from "../ui/hud.js";
import { Transitions } from "../ui/transitions.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Weather } from "../world/weather.js";
import { World } from "../world/world.js";
import { Inventory } from "./inventory.js";

const FIRE = { x: 430, y: 372 };
// Where things can sit. type: hang (from the rope), ground, shelf (on the crate)
const SLOTS = [
  { id: "hang-1", type: "hang", x: 330, y: 168, label: "Rope, left" },
  { id: "hang-2", type: "hang", x: 560, y: 168, label: "Rope, right" },
  { id: "ground-1", type: "ground", x: 270, y: 404, label: "Ground, left" },
  { id: "ground-2", type: "ground", x: 620, y: 404, label: "Ground, right" },
  { id: "shelf-1", type: "shelf", x: 700, y: 330, label: "Crate, left" },
  { id: "shelf-2", type: "shelf", x: 748, y: 330, label: "Crate, right" },
];
const TYPE_WORD = { hang: "hang", ground: "sit on the ground", shelf: "sit on the crate" };

let btn = null, bar = null;
let selected = null;   // item id picked from your pack
let clock = 0, restAcc = 0;

export const Camp = {
  active: false,

  init() {
    btn = document.getElementById("campBtn");
    btn.addEventListener("click", () => (this.active ? this.leave() : this.enter()));
    bar = makeEl("section", null, "camp-bar hidden");
    bar.setAttribute("aria-label", "Your camp");
    document.getElementById("stage").after(bar);
  },

  enter() {
    if (this.active || Transitions.busy || Panels.isOpen()) return;
    Transitions.fade(() => {
      this.active = true;
      state.camp.visits += 1;
      selected = null;
      bar.classList.remove("hidden");
      btn.textContent = "Leave camp";
      this.renderBar();
      bus.emit("camp:enter");
    });
  },

  leave() {
    if (!this.active || Transitions.busy) return;
    Transitions.fade(() => {
      this.active = false;
      bar.classList.add("hidden");
      btn.textContent = "Camp";
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
    head.append(makeEl("h2", "Your camp"));
    head.append(makeEl("p", Companions.has() ? `${Companions.info()} is resting by the fire.` : "A quiet fire, and room for company.", "camp-sub"));
    bar.append(head);

    const pack = makeEl("div", null, "camp-group");
    pack.append(makeEl("h3", "Your pack"));
    const carried = Inventory.carried();
    if (!carried.length) pack.append(makeEl("p", "Nothing to decorate with yet. Things you find on the road, and gifts from friends, end up here.", "camp-sub"));
    for (const { item, count } of carried) {
      const b = makeEl("button", `${item.emoji} ${item.name}${count > 1 ? ` ×${count}` : ""}`);
      b.type = "button";
      b.title = `${item.note} (${TYPE_WORD[item.slot]})`;
      b.setAttribute("aria-pressed", String(selected === item.id));
      b.addEventListener("click", () => { selected = selected === item.id ? null : item.id; this.renderBar(); });
      pack.append(b);
    }
    bar.append(pack);

    const spots = makeEl("div", null, "camp-group");
    spots.append(makeEl("h3", selected ? `Where should the ${Inventory.get(selected).name} go?` : "Spots"));
    for (const slot of SLOTS) {
      const id = state.camp.slots[slot.id];
      const item = id && Inventory.get(id);
      const b = makeEl("button", item ? `${item.emoji} ${item.name}` : `${slot.label}: empty`);
      b.type = "button";
      b.setAttribute("aria-label", item ? `${slot.label}: ${item.name}. Press to take it down.` : `${slot.label}: empty`);
      b.addEventListener("click", () => this.useSlot(slot));
      spots.append(b);
    }
    bar.append(spots);

    const leave = makeEl("button", "Leave camp");
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
      if (item.slot !== slot.type) { HUD.toast(`The ${item.name} would rather ${TYPE_WORD[item.slot]}.`); return; }
      if (!Inventory.take(selected)) return;
      state.camp.slots[slot.id] = selected;
      if (!Inventory.count(selected)) selected = null;
    } else {
      HUD.toast("Pick something from your pack first");
      return;
    }
    this.renderBar();
    bus.emit("camp:changed");
  },

  // ---- drawing ----
  draw(ctx, w, h) {
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
    this.drawDecor(ctx);

    Companions.draw(ctx, 372, 398, true);
    Player.draw(ctx, h, { x: 520, still: true });

    Seasons.draw(ctx);
    Weather.draw(ctx, w, h);
    TimeOfDay.drawLighting(ctx, w, h, { x: FIRE.x, y: FIRE.y - 10, radius: 360, color: "#ffb060" });
    Weather.drawGlow(ctx);
  },

  drawTent(ctx) {
    ctx.fillStyle = "#b7885a";
    ctx.beginPath(); ctx.moveTo(150, 232); ctx.lineTo(228, 392); ctx.lineTo(72, 392); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8f6540";
    ctx.beginPath(); ctx.moveTo(150, 232); ctx.lineTo(150, 392); ctx.lineTo(228, 392); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2a1f1a";
    ctx.beginPath(); ctx.moveTo(150, 290); ctx.lineTo(180, 392); ctx.lineTo(120, 392); ctx.closePath(); ctx.fill();
  },

  drawPolesAndRope(ctx) {
    ctx.strokeStyle = "#4a382c"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(262, 400); ctx.lineTo(262, 140); ctx.moveTo(642, 400); ctx.lineTo(642, 140); ctx.stroke();
    ctx.strokeStyle = "#cdbd9a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(262, 142); ctx.quadraticCurveTo(450, 164, 642, 142); ctx.stroke();
  },

  drawCrate(ctx) {
    ctx.fillStyle = "#6b4a30"; ctx.fillRect(676, 340, 100, 56);
    ctx.fillStyle = "#4f3623"; ctx.fillRect(676, 340, 100, 6); ctx.fillRect(722, 340, 4, 56);
  },

  drawFire(ctx) {
    const { x, y } = FIRE;
    ctx.fillStyle = "#4a3326";
    ctx.save(); ctx.translate(x, y + 12); ctx.rotate(0.3); ctx.fillRect(-30, -4, 60, 8); ctx.rotate(-0.6); ctx.fillRect(-30, -4, 60, 8); ctx.restore();
    const flick = (n) => 1 + Math.sin(clock * 9 + n * 2) * 0.12;
    for (const [rx, ry, col] of [[17, 36, "#e8782a"], [12, 28, "#f6a33a"], [7, 18, "#fde08a"]]) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x, y - ry * 0.5 * flick(rx), rx, ry * flick(rx), 0, 0, Math.PI * 2); ctx.fill();
    }
  },

  drawDecor(ctx) {
    ctx.textAlign = "center";
    ctx.font = "30px serif";
    for (const slot of SLOTS) {
      const id = state.camp.slots[slot.id];
      const item = id && Inventory.get(id);
      if (!item) {
        ctx.strokeStyle = "rgba(223,232,238,0.18)"; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(slot.x, slot.y - (slot.type === "hang" ? 0 : 12), 17, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }
      if (slot.type === "hang") {
        const sway = Math.sin(clock * 1.4 + hash(slot.x) * 6) * (3 + Weather.wind * 6);
        ctx.strokeStyle = "#cdbd9a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(slot.x, 152); ctx.lineTo(slot.x + sway, slot.y - 12); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillText(item.emoji, slot.x + sway, slot.y + 10);
      } else {
        ctx.fillStyle = "#fff"; ctx.fillText(item.emoji, slot.x, slot.y);
      }
    }
  },
};
