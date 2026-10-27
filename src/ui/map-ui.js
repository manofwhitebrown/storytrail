// map-ui.js - Part 21. Opens Grandmother's map: a hand-drawn canvas that fills in as you travel.

import { makeEl } from "../core/util.js";
import { MAP_H, MAP_W, MapData } from "../world/map.js";
import { t } from "../i18n/strings.js";
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
    head.append(makeEl("h2", t("map.title")));
    const close = makeEl("button", t("journal.close"));
    close.type = "button";
    close.addEventListener("click", () => Panels.close("map"));
    head.append(close);

    const canvas = makeEl("canvas", null, "map-canvas");
    canvas.width = MAP_W; canvas.height = MAP_H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", t("map.aria"));
    MapData.draw(canvas.getContext("2d"));

    const d = MapData.describe();
    const list = (title, items) => makeEl("p", t("map.list", { title, items: items.length ? items.join(", ") : t("map.none") }), "menu-sub");
    el.append(
      head,
      canvas,
      makeEl("p", t("map.explored", { pct: MapData.progress() }), "menu-sub"),
      list(t("map.places"), d.places), list(t("map.landmarks"), d.lms), list(t("map.secrets"), d.secrets),
    );
  },
};
