// transitions.js - a quick fade to black and back, used when you go to or leave camp.

import { prefersReducedMotion } from "../core/util.js";

export const Transitions = {
  busy: false,

  fade(midpoint) {
    if (this.busy) return;
    if (prefersReducedMotion()) { midpoint(); return; }

    const el = document.getElementById("fade");
    this.busy = true;
    el.classList.add("on");
    setTimeout(() => {
      midpoint();
      el.classList.remove("on");
      setTimeout(() => { this.busy = false; }, 300);
    }, 300);
  },
};
