#!/usr/bin/env node
// optimize-assets.js - makes images smaller without changing how they look.
//
//   npm run optimize            shrink every image in assets/images and public/ (only keeps a result if it is smaller)
//   npm run optimize -- --dry   just report what would change, write nothing
//   npm run optimize -- --max-kb 150   warn about any file bigger than 150 KB after optimizing (default 300)
//
// SVG files are tidied with no extra tools. PNG / JPEG / WebP use `sharp` (an optional dependency); if it
// isn't installed those files are skipped with a note. Audio and fonts: nothing to do yet (everything is
// generated in code), but the folders are scanned too, so large files there still get a size warning.

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FOLDERS = ["assets/images", "assets/audio", "assets/fonts", "public"];
const RASTER = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export function minifySvg(text) {
  return text
    .replace(/<\?xml[^>]*\?>\s*/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim() + "\n";
}

async function* walk(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; } // folder may not exist
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function loadSharp() {
  try { return (await import("sharp")).default; } catch { return null; }
}

async function optimizeRaster(sharp, file, ext, input) {
  const img = sharp(input, { animated: false });
  if (ext === ".png") return img.png({ compressionLevel: 9, effort: 10, palette: true }).toBuffer();
  if (ext === ".webp") return img.webp({ quality: 82, effort: 6 }).toBuffer();
  return img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

export async function run({ dry = false, maxKb = 300 } = {}) {
  const sharp = await loadSharp();
  const report = [];
  let skippedRaster = 0;

  for (const folder of FOLDERS) {
    for await (const file of walk(join(ROOT, folder))) {
      const ext = extname(file).toLowerCase();
      const before = (await stat(file)).size;
      let after = before;
      let note = "";

      if (ext === ".svg") {
        const out = Buffer.from(minifySvg(await readFile(file, "utf8")));
        if (out.length < before) { after = out.length; if (!dry) await writeFile(file, out); }
      } else if (RASTER.has(ext)) {
        if (!sharp) { skippedRaster++; note = "skipped (sharp not installed)"; }
        else {
          const input = await readFile(file);
          const out = await optimizeRaster(sharp, file, ext, input);
          if (out.length < before) { after = out.length; if (!dry) await writeFile(file, out); }
        }
      }
      report.push({ file: relative(ROOT, file), before, after, note, big: after > maxKb * 1024 });
    }
  }
  return { report, skippedRaster, sharp: !!sharp };
}

const kb = (n) => (n / 1024).toFixed(1) + " KB";

// Run from the command line (not when imported by a test)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const i = args.indexOf("--max-kb");
  const maxKb = i >= 0 ? Number(args[i + 1]) || 300 : 300;

  const { report, skippedRaster } = await run({ dry, maxKb });
  if (!report.length) console.log("No assets found.");
  let saved = 0;
  for (const r of report) {
    saved += r.before - r.after;
    const change = r.after < r.before ? `${kb(r.before)} -> ${kb(r.after)}` : kb(r.before);
    console.log(`${r.big ? "!" : " "} ${r.file.padEnd(44)} ${change} ${r.note}`);
  }
  console.log(`\n${report.length} file(s). ${dry ? "Would save" : "Saved"} ${kb(saved)}.`);
  if (skippedRaster) console.log(`${skippedRaster} image(s) skipped: run "npm install" to get the optional "sharp" tool.`);
  const big = report.filter((r) => r.big);
  if (big.length) console.log(`${big.length} file(s) over ${maxKb} KB (marked with !). Consider making them smaller.`);
}
