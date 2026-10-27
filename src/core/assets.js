// assets.js - OPTIONAL real image, audio and font files.
//
// The game draws and sounds fine with none of them. To use your own, drop files in public/media/ and
// list them in public/media/manifest.json (see docs/media.md). Anything listed that loads is used;
// anything missing or broken quietly falls back to the built-in boxes, synth sounds and system fonts.

import { Sound } from "../audio/sound.js";

const BASE = `${import.meta.env?.BASE_URL ?? "./"}media/`;
const images = new Map();   // name -> HTMLImageElement (only once it has loaded)
const files = { audio: {} };
const buffers = new Map();  // sfx name -> AudioBuffer[] | null (null = could not load)
const loading = new Set();


export const Assets = {
  loaded: { images: 0, audio: 0, fonts: 0 },

  async init() {
    let manifest;
    try {
      const res = await fetch(`${BASE}manifest.json`, { cache: "no-cache" });
      if (!res.ok) return;
      manifest = await res.json();
    } catch { return; }   // no manifest (or no fetch): nothing to do
    files.audio = manifest.audio || {};
    await Promise.all([
      ...Object.entries(manifest.images || {}).map(([name, file]) => this.loadImage(name, file)),
      ...Object.entries(manifest.fonts || {}).map(([role, file]) => this.loadFont(role, file)),
    ]);
  },

  loadImage(name, file) {
    return new Promise((resolve) => {
      if (typeof Image === "undefined") return resolve();
      const img = new Image();
      img.onload = () => { images.set(name, img); this.loaded.images++; resolve(); };
      img.onerror = () => resolve();
      img.src = `${BASE}images/${file}`;
    });
  },

  // roles: "body" (all text) and "display" (headings)
  async loadFont(role, file) {
    try {
      if (typeof FontFace === "undefined" || !document.fonts) return;
      const face = new FontFace(`StoryTrail ${role}`, `url(${BASE}fonts/${file})`);
      await face.load();
      document.fonts.add(face);
      document.documentElement.style.setProperty(`--font-${role}`, `"StoryTrail ${role}", Georgia, serif`);
      this.loaded.fonts++;
    } catch { /* keep the system font */ }
  },

  has: (name) => images.has(name),

  // Draws the picture anchored at the bottom-center (x, bottom), `height` tall, keeping its shape.
  draw(ctx, name, x, bottom, height) {
    const img = images.get(name);
    if (!img) return false;
    const w = (img.naturalWidth / img.naturalHeight) * height;
    ctx.drawImage(img, x - w / 2, bottom - height, w, height);
    return true;
  },

  // Plays a real sound for an effect name (step, token, item, page...) if one was provided and has loaded.
  // The first call only starts loading it, so that one time the synth sound plays instead.
  playSample(name) {
    const ctx = Sound.context;
    const entry = files.audio[name];
    if (!ctx || !entry) return false;
    const list = buffers.get(name);
    if (list === undefined) { this.loadSamples(name, ctx); return false; }
    if (!list || !list.length) return false;
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = 0.96 + Math.random() * 0.08;
    src.connect(Sound.bus("sfx"));
    src.start();
    return true;
  },

  async loadSamples(name, ctx) {
    if (loading.has(name)) return;
    loading.add(name);
    const out = [];
    for (const file of [].concat(files.audio[name])) {
      try {
        const res = await fetch(`${BASE}audio/${file}`);
        out.push(await ctx.decodeAudioData(await res.arrayBuffer()));
        this.loaded.audio++;
      } catch { /* skip this file */ }
    }
    buffers.set(name, out.length ? out : null);
  },
};
