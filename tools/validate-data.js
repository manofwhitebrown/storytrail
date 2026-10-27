#!/usr/bin/env node
// validate-data.js - checks that assets/data/*.json agree with each other. Run: npm run validate
import { readFileSync } from "node:fs";

const read = (f) => JSON.parse(readFileSync(new URL(`../assets/data/${f}.json`, import.meta.url), "utf8"));
const items = read("items").items, coll = read("collections"), comp = read("companions").species;
const ev = read("events"), lm = read("landmarks"), story = read("story"), quests = read("quests");
const BIOMES = ["forest", "meadow", "mountains", "snowfields", "desert", "coast"], BIOME_LENGTH = 120;
const problems = [];
const bad = (m) => problems.push(m);

const dupes = (arr, label) => { const s = new Set(); for (const x of arr) { if (s.has(x)) bad(`duplicate ${label}: ${x}`); s.add(x); } };
const itemIds = new Set(items.map((i) => i.id));
dupes(items.map((i) => i.id), "item id");
for (const k of ["birds", "flowers", "songs"]) dupes(coll[k].map((x) => x.id), k);
dupes(lm.landmarks.map((x) => x.id), "landmark");
dupes(lm.secrets.map((x) => x.id), "secret");

const events = Object.values(ev.pools).flat();
dupes(events.map((e) => e.id), "event");
for (const e of events) {
  if (!e.text || !e.choices?.length) bad(`event ${e.id}: needs text and choices`);
  for (const c of e.choices || []) {
    if (!c.result) bad(`event ${e.id}: choice "${c.label}" has no result`);
    if (c.item && !itemIds.has(c.item)) bad(`event ${e.id}: unknown item ${c.item}`);
    if (c.collect && !coll[c.collect.kind]?.some((x) => x.id === c.collect.id)) bad(`event ${e.id}: unknown collectable ${c.collect.id}`);
    for (const t of c.tags || []) if (!["kind", "curious", "restful"].includes(t)) bad(`event ${e.id}: unknown tag ${t}`);
  }
}
for (const l of lm.landmarks) {
  const i = BIOMES.indexOf(l.biome);
  if (l.at < i * BIOME_LENGTH || l.at >= (i + 1) * BIOME_LENGTH) bad(`landmark ${l.id}: step ${l.at} is outside ${l.biome}`);
  if (l.at % 50 === 0) bad(`landmark ${l.id}: step ${l.at} lands on an event step`);
}
for (const s of lm.secrets) {
  if (s.reward?.item && !itemIds.has(s.reward.item)) bad(`secret ${s.id}: unknown item ${s.reward.item}`);
  if (s.reward?.collect && !coll[s.reward.collect.kind]?.some((x) => x.id === s.reward.collect.id)) bad(`secret ${s.id}: unknown collectable`);
}
for (const s of comp) for (const g of s.gifts) if (!itemIds.has(g)) bad(`companion ${s.id}: unknown gift ${g}`);
for (const i of items) if (!Array.isArray(i.foundIn)) bad(`item ${i.id}: foundIn must be a list`);

let prev = -1;
for (const c of story.chapters) for (const p of c.pages) {
  if (p.tokens < prev) bad(`page ${p.id}: token threshold goes down`);
  prev = p.tokens;
  if (p.landmark && !lm.landmarks.some((l) => l.id === p.landmark)) bad(`page ${p.id}: unknown landmark ${p.landmark}`);
}
for (const t of ["kind", "curious", "restful"]) if (!story.endings.some((e) => e.id === t)) bad(`missing ending: ${t}`);


// goals (quests.json)
const METRICS = ["steps", "tokens", "landmarks", "collections", "items", "letters", "memories", "camp", "postcards", "visits", "events"];
const seasonGoals = Object.values(quests.seasonal).flatMap((s) => s.goals);
const goals = [...quests.errands, ...quests.daily, ...seasonGoals];
dupes(goals.map((g) => g.id), "goal id");
for (const g of goals) {
  if (!METRICS.includes(g.metric)) bad(`goal ${g.id}: unknown metric ${g.metric}`);
  if (!(g.goal > 0)) bad(`goal ${g.id}: goal must be above 0`);
  if (g.kind && (g.metric !== "collections" || !coll[g.kind])) bad(`goal ${g.id}: kind ${g.kind} does not fit`);
}
for (const e of quests.errands) {
  if (!(e.reward?.tokens > 0)) bad(`errand ${e.id}: needs a token reward`);
  if (e.reward?.item && !itemIds.has(e.reward.item)) bad(`errand ${e.id}: unknown item ${e.reward.item}`);
}
for (const k of ["spring", "summer", "autumn", "winter"]) {
  const s = quests.seasonal[k];
  if (!s) { bad(`quests: missing season ${k}`); continue; }
  if (!itemIds.has(s.keepsake)) bad(`season ${k}: unknown keepsake ${s.keepsake}`);
}

if (problems.length) { console.error(problems.map((p) => "x " + p).join("\n")); process.exit(1); }
console.log("Data OK.");
