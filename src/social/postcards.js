// postcards.js - Part 25. Turns the scene you are looking at into a framed postcard:
// place, season and time of day, how far you have walked, a few words from you, a stamp.
// You can save it as a picture or hand it to another app. The picture is made on your device and
// goes nowhere unless you choose to send it.
//
// The scene is copied straight from the game canvas on the next frame, BEFORE the HUD is drawn
// (main.js calls Postcards.offer), so floating text and "+1 token" never end up on the postcard.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { cleanText, makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { Camp } from "../progression/camp.js";
import { HUD } from "../ui/hud.js";
import { Panels } from "../ui/panels.js";
import { biomeAt } from "../world/biomes/index.js";
import { Seasons } from "../world/seasons.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Share } from "./share.js";

export const POSTCARD = { w: 1000, h: 850 };
const SERIF = 'Georgia, "Times New Roman", serif';

export const cleanMessage = (text) => cleanText(text, CONFIG.POSTCARD_MESSAGE_MAX);

function wrap(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

// Draws the whole card. `frame` is the scene (a canvas). data = { place, when, steps, message, name, date }
export function drawPostcard(ctx, frame, data) {
  const { w, h } = POSTCARD;
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // paper and a thin inner border
  ctx.fillStyle = "#f3ead3"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#c9b98f"; ctx.lineWidth = 2; ctx.strokeRect(14, 14, w - 28, h - 28);

  // the picture, with a white edge like a printed photo
  const px = 48, py = 48, pw = w - 96, ph = Math.round(pw * 450 / 800);
  ctx.fillStyle = "#fffdf6"; ctx.fillRect(px - 6, py - 6, pw + 12, ph + 12);
  if (frame) ctx.drawImage(frame, px, py, pw, ph);
  ctx.strokeStyle = "rgba(60,45,30,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(px - 6, py - 6, pw + 12, ph + 12);

  // words
  const ty = py + ph + 62;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#3a2f22"; ctx.font = `bold 36px ${SERIF}`;
  ctx.fillText(data.place, 58, ty, 640);
  ctx.fillStyle = "#7a6a52"; ctx.font = `italic 23px ${SERIF}`;
  ctx.fillText(data.when, 58, ty + 36, 640);
  ctx.font = `23px ${SERIF}`;
  ctx.fillText(data.steps, 58, ty + 68, 640);

  ctx.fillStyle = "#2c3a56"; ctx.font = `italic 28px ${SERIF}`;
  let y = ty + 104;
  if (data.message) for (const line of wrap(ctx, data.message, 640, 2)) { ctx.fillText(line, 58, y); y += 34; }
  ctx.fillStyle = "#7a6a52"; ctx.font = `22px ${SERIF}`;
  ctx.fillText(`- ${data.name}`, 58, Math.max(y + 6, ty + 168), 640);

  // a stamp (perforated edge, a little lantern) and a postmark over its corner
  const sx = w - 190, sy = py + ph + 36, sw = 104, sh = 128;
  ctx.fillStyle = "#e9dcb8"; ctx.fillRect(sx, sy, sw, sh);
  ctx.strokeStyle = "#f3ead3"; ctx.lineWidth = 7; ctx.setLineDash([5, 5]); ctx.strokeRect(sx, sy, sw, sh); ctx.setLineDash([]);
  ctx.fillStyle = "#243a63"; ctx.fillRect(sx + 10, sy + 10, sw - 20, sh - 20);
  const glow = ctx.createRadialGradient(sx + sw / 2, sy + 62, 2, sx + sw / 2, sy + 62, 38);
  glow.addColorStop(0, "rgba(255,217,138,0.95)"); glow.addColorStop(1, "rgba(255,217,138,0)");
  ctx.fillStyle = glow; ctx.fillRect(sx + 10, sy + 20, sw - 20, 90);
  ctx.fillStyle = "#b88a3c"; ctx.fillRect(sx + sw / 2 - 9, sy + 50, 18, 24);
  ctx.fillStyle = "#ffd98a"; ctx.fillRect(sx + sw / 2 - 5, sy + 55, 10, 14);
  ctx.fillStyle = "#dfe8ee"; ctx.font = `bold 11px ${SERIF}`; ctx.textAlign = "center";
  ctx.fillText("STORYTRAIL", sx + sw / 2, sy + sh - 18);

  ctx.strokeStyle = "rgba(60,45,30,0.5)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(sx - 18, sy + 58, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx - 18, sy + 58, 33, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "rgba(60,45,30,0.6)"; ctx.font = `10px ${SERIF}`;
  ctx.fillText(data.date, sx - 18, sy + 62);
  ctx.restore();
}

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));

let el = null, preview = null, input = null;
let frame = null;
let waiting = null;
let message = "";

function info() {
  const d = new Date();
  const place = Camp.visiting ? t("postcard.atFriend", { name: Camp.visiting.name })
    : Camp.active ? t("postcard.atCamp") : biomeAt(state.steps).name;
  return {
    place,
    when: `${Seasons.label()} \u00b7 ${TimeOfDay.label()}`,
    steps: t("postcard.steps", { n: state.steps }),
    message,
    name: cleanText(state.player.name, CONFIG.NAME_MAX, "Traveler"),
    date: `${d.getDate()} ${d.toLocaleDateString("en", { month: "short" }).toUpperCase()}`,
  };
}

export const Postcards = {
  init() {
    el = Panels.create("postcard", { className: "centered postcard", label: t("postcard.title"), onOpen: () => this.render() });
  },

  open() { Panels.open("postcard"); },

  // main.js calls this every frame with the finished scene (before the HUD). It only does work when a postcard asked.
  offer(canvas) {
    if (!waiting) return;
    const copy = document.createElement("canvas");
    copy.width = canvas.width; copy.height = canvas.height;
    copy.getContext("2d").drawImage(canvas, 0, 0);
    frame = copy;
    const done = waiting;
    waiting = null;
    done();
  },

  grab() {
    return new Promise((resolve) => {
      waiting = resolve;
      // if the page is hidden no frames come; take whatever is on the canvas
      setTimeout(() => { if (waiting === resolve) this.offer(document.getElementById("game")); }, 400);
    });
  },

  render() {
    frame = null;
    message = "";
    el.replaceChildren(makeEl("h2", t("postcard.title")));

    preview = makeEl("canvas", null, "postcard-preview");
    preview.width = POSTCARD.w; preview.height = POSTCARD.h;
    preview.setAttribute("role", "img");
    preview.setAttribute("aria-label", t("postcard.alt"));
    el.append(preview);

    const label = makeEl("label", t("postcard.message.label", { max: CONFIG.POSTCARD_MESSAGE_MAX }));
    input = makeEl("input");
    input.type = "text";
    input.maxLength = CONFIG.POSTCARD_MESSAGE_MAX;
    input.placeholder = t("postcard.message.placeholder");
    input.autocomplete = "off";
    input.dataset.autofocus = "";
    input.addEventListener("input", () => { message = cleanMessage(input.value); this.refresh(); });
    label.append(input);
    el.append(label);

    const row = makeEl("div", null, "row");
    if (Share.isNative()) {
      row.append(this.button(t("postcard.shareNative"), () => this.send("share")));
    } else {
      row.append(this.button(t("postcard.save"), () => this.send("save")));
      if (Share.canShareImage()) row.append(this.button(t("postcard.share"), () => this.send("share")));
    }
    row.append(this.button(t("postcard.close"), () => Panels.close("postcard")));
    el.append(row);

    this.grab().then(() => this.refresh());
  },

  button(text, onClick) {
    const b = makeEl("button", text);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  },

  refresh() {
    if (!preview || !frame) return;
    drawPostcard(preview.getContext("2d"), frame, info());
  },

  async send(how) {
    if (!frame) return;
    const out = document.createElement("canvas");
    out.width = POSTCARD.w; out.height = POSTCARD.h;
    drawPostcard(out.getContext("2d"), frame, info());
    const blob = await toBlob(out);
    if (!blob) { HUD.toast(t("postcard.failed"), { feedback: true }); return; }

    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const filename = `storytrail-postcard-${stamp}.png`;
    let result;
    if (how === "save") result = Share.downloadImage(blob, filename) ? "saved" : "failed";
    else result = await Share.shareImage(blob, filename, { title: t("postcard.title"), text: message });

    if (result === "saved" || result === "shared") {
      state.social.postcards += 1;
      bus.emit("postcard:made");
      HUD.toast(t(result === "saved" ? "postcard.saved" : "postcard.shared"), { feedback: true });
    } else if (result !== "cancelled") {
      HUD.toast(t("postcard.failed"), { feedback: true });
    }
  },
};
