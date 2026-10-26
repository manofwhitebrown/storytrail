// map-ui.js - Part 21. Opens Grandmother's map: a hand-drawn canvas that fills in as you travel.

import { makeEl } from "../core/util.js";
import { MAP_H, MAP_W, MapData } from "../world/map.js";
import { Panels } from "./panels.js";

let el = null;

export const MapUI = {
  init() {
    el = Panels.create("map", { className: "journal-like", label: "Map", onOpen: () => this.render() });
    document.getElementById("mapBtn").addEventListener("click", () => Panels.open("map"));
  },

  render() {
    el.replaceChildren();
    const head = makeEl("div", null, "panel-head");
    head.append(makeEl("h2", "Grandmother's Map"));
    const close = makeEl("button", "Close");
    close.type = "button";
    close.addEventListener("click", () => Panels.close("map"));
    head.append(close);

    const canvas = makeEl("canvas", null, "map-canvas");
    canvas.width = MAP_W; canvas.height = MAP_H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "A hand-drawn map of the road. A red dot marks where you are.");
    MapData.draw(canvas.getContext("2d"));

    const d = MapData.describe();
    const list = (title, items) => makeEl("p", `${title}: ${items.length ? items.join(", ") : "none yet"}.`, "menu-sub");
    el.append(
      head,
      canvas,
      makeEl("p", `Road explored: ${MapData.progress()}%. A red dot is you; the little star near the sea is where she drew hers.`, "menu-sub"),
      list("Places visited", d.places), list("Landmarks", d.lms), list("Secrets found", d.secrets),
    );
  },
};
