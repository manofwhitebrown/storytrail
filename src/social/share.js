// share.js - Part 25. The few ways something can leave the game, and only when the player asks:
// copy to the clipboard, open the phone's share sheet, or download a picture.
// Nothing here talks to a server. Every function says what happened ("shared", "copied",
// "cancelled", "failed", "unsupported") and never throws, so callers can show one gentle message.

import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share as NativeShare } from "@capacitor/share";
import { CONFIG } from "../core/config.js";

const native = () => Capacitor.isNativePlatform();

// A browser reports "the person closed the share sheet" as an AbortError. That is not a failure.
const cancelled = (err) => err?.name === "AbortError" || /cancel/i.test(String(err?.message || ""));

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export const Share = {
  isNative: native,

  // Where a link should point. In a browser that is the page you are on; inside the Android app
  // (or on localhost while developing) it is the published game, so a friend can really open it.
  baseUrl() {
    const here = typeof location !== "undefined" ? location : null;
    const local = !here || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(here.hostname) || !/^https?:$/.test(here.protocol);
    if (native() || local) return CONFIG.SHARE_URL;
    return here.origin + here.pathname;
  },

  async copy(text) {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* fall through to the old way */ }
    try {
      const box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.append(box);
      box.select();
      const ok = document.execCommand("copy");
      box.remove();
      return ok;
    } catch { return false; }
  },

  // Opens the share sheet if there is one, otherwise copies the link.
  async shareLink({ title, text, url }) {
    try {
      if (native()) { await NativeShare.share({ title, text, url, dialogTitle: title }); return "shared"; }
      if (typeof navigator.share === "function") { await navigator.share({ title, text, url }); return "shared"; }
    } catch (err) {
      if (cancelled(err)) return "cancelled";
    }
    return (await this.copy(url)) ? "copied" : "failed";
  },

  // Can this device hand a picture to other apps?
  canShareImage() {
    if (native()) return true;
    try {
      const probe = new File([""], "a.png", { type: "image/png" });
      return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [probe] });
    } catch { return false; }
  },

  async shareImage(blob, filename, { title = "", text = "" } = {}) {
    try {
      if (native()) {
        // The share sheet needs a real file, so write it to the app's cache folder first.
        const data = await blobToBase64(blob);
        const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
        await NativeShare.share({ title, text, files: [uri], dialogTitle: title });
        return "shared";
      }
      if (!this.canShareImage()) return "unsupported";
      await navigator.share({ files: [new File([blob], filename, { type: blob.type || "image/png" })], title, text });
      return "shared";
    } catch (err) {
      return cancelled(err) ? "cancelled" : "failed";
    }
  },

  // A plain download (browsers). The Android app uses the share sheet instead; downloads do nothing there.
  downloadImage(blob, filename) {
    if (native()) return false;
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch { return false; }
  },
};
