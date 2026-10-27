// main.js - boots the game, handles input, runs the loop.
// Every other file does one job and talks through `bus` (see event-bus.js).

import { AdaptiveMusic } from "../audio/adaptive-music.js";
import { Ambience } from "../audio/ambience.js";
import { SFX } from "../audio/sfx.js";
import { Sound } from "../audio/sound.js";
import { Companions } from "../characters/companions/companions.js";
import { Customization } from "../characters/customization.js";
import { Player } from "../characters/player.js";
import { Events } from "../events/events.js";
import { Achievements } from "../progression/achievements.js";
import { Camp } from "../progression/camp.js";
import { Collections } from "../progression/collections.js";
import { addTokens } from "../progression/tokens.js";
import { Unlocks } from "../progression/unlocks.js";
import { Endings } from "../story/endings.js";
import { Letters } from "../story/letters.js";
import { Story } from "../story/story.js";
import { HUD } from "../ui/hud.js";
import { JournalUI } from "../ui/journal-ui.js";
import { MapUI } from "../ui/map-ui.js";
import { Onboarding } from "../ui/onboarding.js";
import { Panels } from "../ui/panels.js";
import { Settings } from "../ui/settings.js";
import { Transitions } from "../ui/transitions.js";
import { Accessibility } from "../ui/accessibility.js";
import { Haptics } from "../ui/haptics.js";
import { initNative } from "./native.js";
import { SocialMenu } from "../social/menu.js";
import { Postcards } from "../social/postcards.js";
import { Visits } from "../social/visits.js";
import { QuietMode } from "../wellbeing/quiet-mode.js";
import { RestReminders } from "../wellbeing/rest-reminders.js";
import { Session, SessionSummary } from "../wellbeing/session-summary.js";
import { WelcomeBack } from "../wellbeing/welcome-back.js";
import { BIOMES, biomeIndexAt } from "../world/biomes/index.js";
import { Landmarks } from "../world/landmarks.js";
import { MapData } from "../world/map.js";
import { Seasons } from "../world/seasons.js";
import { Secrets } from "../world/secrets.js";
import { TimeOfDay } from "../world/time-of-day.js";
import { Weather } from "../world/weather.js";
import { World } from "../world/world.js";
import { CONFIG } from "./config.js";
import { bus } from "./event-bus.js";
import { load, save, startAutosave } from "./save.js";
import { state } from "./state.js";
import { setLanguage } from "../i18n/strings.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// While a panel is open, or you're at camp, walking is paused
const paused = () => Panels.isOpen() || Camp.active || Camp.visiting || Transitions.busy;

// ---- Place names ----
let shownBiome = -1;
function announceBiome() {
  const i = biomeIndexAt(state.steps);
  if (i !== shownBiome) {
    shownBiome = i;
    HUD.popup(BIOMES[i].name, canvas.width / 2, 90, 3, { always: true });
    bus.emit("biome:enter", BIOMES[i]);
  }
}

// ---- Taking a step ----
function takeStep() {
  if (paused()) return;

  state.steps += 1;
  World.step();
  Player.step();
  TimeOfDay.onStep();
  Weather.onStep();
  HUD.hideHint();

  if (state.steps % CONFIG.STEPS_PER_TOKEN === 0) addTokens(1, "walk");
  HUD.updateCounters();
  announceBiome();

  bus.emit("step", state.steps); // events, landmarks, companions, letters... all listen to this
}

// ---- Input: tap, click, or keyboard ----
canvas.addEventListener("pointerdown", takeStep);

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;                       // holding a key shouldn't spam steps
  if (paused()) return;                       // panels open: leave Space/arrows alone so they can scroll
  // Space on a focused control should use that control, not walk
  if (e.target.closest?.("button, input, select, textarea, summary, a, [role=tab]")) return;
  if (e.code === "Space" || e.code === "ArrowRight") {
    e.preventDefault();
    takeStep();
  }
});

// Browsers only allow sound after the first tap or key press
const unlockSound = () => Sound.unlock();
window.addEventListener("pointerdown", unlockSound, { once: true });
window.addEventListener("keydown", unlockSound, { once: true });

// ---- Drawing the road ----
function drawRoad(w, h) {
  const groundY = World.groundY(h);
  World.draw(ctx, w, h);
  Seasons.draw(ctx);
  Companions.draw(ctx, Player.x - 64, Player.groundY(h) + 6);
  Player.draw(ctx, h);
  Weather.draw(ctx, w, h);
  TimeOfDay.drawLighting(ctx, w, h, { x: Player.lantern.x, y: Player.lantern.y, radius: 220, color: "#ffd98a" });
  Landmarks.drawGlow(ctx, w, groundY, World.scroll);
  Weather.drawGlow(ctx);
}

// ---- Main loop: runs ~60 times per second ----
let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // seconds since last frame
  last = now;

  TimeOfDay.update(dt);
  Weather.update(dt);
  World.update(dt);
  Seasons.update(dt, World.look.seasonal);
  Player.update(dt);
  Companions.update(dt);
  Camp.update(dt);
  Ambience.update(dt);
  AdaptiveMusic.update(dt);
  HUD.update(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (Camp.active || Camp.visiting) Camp.draw(ctx, canvas.width, canvas.height);
  else drawRoad(canvas.width, canvas.height);
  Postcards.offer(canvas);   // a postcard copies the scene here, before the HUD text goes on top
  HUD.draw(ctx);

  requestAnimationFrame(loop);
}

// ---- Start ----
function boot() {
  load();                                  // old saves are upgraded by migrations.js
  setLanguage(state.settings.lang);
  Panels.init(document.getElementById("stage"));
  HUD.init();

  Seasons.init();
  TimeOfDay.init();
  Weather.init();
  World.init();
  MapData.init();

  Customization.init();
  Companions.init();
  Camp.init();
  Landmarks.init();
  Secrets.init();
  Collections.init();
  Letters.init();
  Events.init();
  Endings.init();
  Story.init();
  Unlocks.init();
  Achievements.init();

  Ambience.init();
  AdaptiveMusic.init();
  SFX.init();

  JournalUI.init();
  MapUI.init();
  Settings.init();
  Postcards.init();      // Part 25
  Visits.init();
  SocialMenu.init();
  Onboarding.init();

  Accessibility.init();
  Haptics.init();

  // Wellbeing (Part 24). SessionSummary goes first: its "going away" listeners must run before save.js's.
  SessionSummary.init();
  QuietMode.init();
  RestReminders.init();
  WelcomeBack.init();

  bus.on("time:phase", ({ label }) => HUD.setPhase(label));
  HUD.setPhase(TimeOfDay.label());
  HUD.setUnread(Letters.unread() > 0);
  HUD.updateCounters();
  if (state.steps > 0) HUD.hideHint();
  announceBiome();

  startAutosave();
  Onboarding.start();
  initNative();
  WelcomeBack.check();
  Visits.checkHash();                      // a friend's camp link (#camp=...) becomes a polite invitation
  requestAnimationFrame(loop);

  // Handy for testing: open the game with ?debug and use window.__storytrail in the console
  if (new URLSearchParams(location.search).has("debug")) window.__storytrail = { state, bus, save, takeStep, Sound, Ambience, AdaptiveMusic, Session, SessionSummary, WelcomeBack, RestReminders, QuietMode, Panels, Visits, Postcards };
}

boot();
