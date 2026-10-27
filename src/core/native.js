// native.js - only does anything inside the Android app (Capacitor). In a browser it does nothing.
// Makes the Android Back button close the open panel first, and only leave the app when nothing is open.

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Camp } from "../progression/camp.js";
import { Visits } from "../social/visits.js";
import { Panels } from "../ui/panels.js";

export function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  App.addListener("backButton", () => {
    const open = Panels.current();
    if (open) Panels.close(open);
    else if (Visits.active) Visits.leave();   // Back leaves a friend's camp, and your own camp, before it leaves the app
    else if (Camp.active) Camp.leave();
    else App.minimizeApp();
  });
}
