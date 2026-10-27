// strings.js - Part 27. All the words the interface says, in one place.
//
//   t("menu.title")                      -> "Menu"
//   t("steps.count", { n: 3 })           -> "3 steps"   (picks "steps.count.one" / ".other" from the number)
//   t("welcome.back", { name: "Sam" })   -> "Welcome back, Sam."
//
// HOW TO ADD A LANGUAGE: copy en.json to fr.json, translate the values (never the keys, never the {braces}),
// import it below and add it to TABLES. Anything missing falls back to English, so a half-finished
// translation still works. The story, events and letters live in assets/data/*.json and are translated
// by making a copy of those files per language (see docs/accessibility.md, "Translating").

import en from "./en.json";

const TABLES = { en };
const FALLBACK = "en";
const missing = new Set();
let lang = FALLBACK;
let plural = new Intl.PluralRules(FALLBACK);

export const languages = () => Object.keys(TABLES);
export const language = () => lang;

export function setLanguage(code) {
  lang = TABLES[code] ? code : FALLBACK;
  plural = new Intl.PluralRules(lang);
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

function raw(key) {
  return TABLES[lang]?.[key] ?? TABLES[FALLBACK][key];
}

export function t(key, vars = {}) {
  let text = null;
  if (typeof vars.n === "number") text = raw(`${key}.${plural.select(vars.n)}`) ?? raw(`${key}.other`);
  text ??= raw(key);
  if (text == null) {
    if (!missing.has(key)) { missing.add(key); console.warn(`[i18n] missing string "${key}"`); }
    return key;
  }
  return text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

// Fills in text that lives in index.html:  <span data-i18n="hud.steps">  and  <button data-i18n-aria="...">
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(el.dataset.i18nAria));
}
