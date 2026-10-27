// haptics.js - Part 27. A very light tap of vibration for the moments that deserve one.
//
// Rules: off by default in quiet mode and when the player (or their device) wants less motion;
// can be switched off in Menu -> Accessibility; never buzzes more than ~6 times a second;
// does nothing on devices that can't vibrate. On Android (Capacitor) it uses the Haptics plugin,
// in a browser it uses navigator.vibrate.

import { Capacitor } from "@capacitor/core";
import { Haptics as NativeHaptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { prefersReducedMotion } from "../core/util.js";

const MIN_GAP_MS = 160;
let last = 0;

const native = () => Capacitor.isNativePlatform();
const canVibrate = () => native() || (typeof navigator !== "undefined" && typeof navigator.vibrate === "function");

export const Haptics = {
  enabled() {
    return !!state.settings.haptics && !state.wellbeing?.quiet && !prefersReducedMotion() && canVibrate();
  },

  // kind: "step" | "token" | "big" (landmark, secret, page, ending)
  pulse(kind) {
    if (!this.enabled()) return;
    const now = performance.now();
    if (now - last < MIN_GAP_MS) return;
    last = now;
    try {
      if (native()) {
        if (kind === "big") NativeHaptics.notification({ type: NotificationType.Success });
        else NativeHaptics.impact({ style: ImpactStyle.Light });
      } else {
        navigator.vibrate(kind === "big" ? [18, 40, 18] : kind === "token" ? 14 : 7);
      }
    } catch { /* a device that refuses to vibrate is fine */ }
  },

  init() {
    bus.on("step", () => this.pulse("step"));
    bus.on("tokens", ({ source }) => { if (source !== "walk") this.pulse("token"); });
    for (const evt of ["landmark:found", "secret:found", "story:page", "story:ended", "welcome:back", "visit:sat"]) {
      bus.on(evt, () => this.pulse("big"));
    }
  },

  supported: canVibrate,
};
