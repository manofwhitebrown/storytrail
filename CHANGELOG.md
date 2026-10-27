# Changelog

## Part 25 (social, kept gentle) and phone fit
- Postcards (`social/postcards.js`): frame the scene you are looking at with place, season, time, steps and up to 60 words of your own, plus a stamp. Save it as a picture (browser) or hand it to another app (share sheet; Android uses the Share and Filesystem plugins).
- Camp visits (`social/visits.js`): a camp link holds how your camp looks and nothing else. A friend can open it, look around read-only and sit by your fire (1 token, once per camp, never for your own). Links are validated before use: unknown ids dropped, names cleaned and cut to 16 characters, `{ }` removed.
- `social/share.js` (clipboard, share sheet, download) and `social/menu.js` (Menu -> Share & visit). No leaderboards, no accounts, nothing is sent anywhere by the game.
- Achievements: Wish You Were Here (first postcard), Room by the Fire (first visit).
- `Camp.draw`, `Companions.draw`, `Player.draw` and `Customization.look` can now draw someone else's look and camp.
- Phone fit (`styles/mobile.css`): the scene fits landscape screens without scrolling; dialogs use the whole screen on phones; buttons are at least 44px on touch screens; notches and gesture bars are respected (`viewport-fit=cover`); the camp/visit bar floats in the corner in landscape.
- Fixed: the first-time tutorial tip no longer sits on top of dialog buttons.
- New dependencies: `@capacitor/share`, `@capacitor/filesystem` (Android gradle files regenerated with `npx cap sync android`).
- Docs: `docs/social.md`; economy table updated.

## Easy group (docs, tools, accessibility, workflows)
- Docs: `game-design.md`, `story-bible.md`, `accessibility.md`.
- Accessibility: Menu -> Accessibility (text size, contrast, reduce motion, vibration) and `styles/accessibility.css`.
- Haptics: `ui/haptics.js` (Capacitor Haptics on Android, `navigator.vibrate` in browsers); respects quiet mode and reduced motion.
- Tool: `npm run optimize` (`tools/optimize-assets.js`) shrinks images; optional `sharp`.
- Workflows: `test.yml` (validate, test, build) and `deploy-pages.yml` (GitHub Pages).

## Parts 23-24 (audio and wellbeing)
- Part 23: generative adaptive music (follows place, weather, time, camp), place ambience (brook, waves, sand, birds, owls, campfire), soft sound effects (footsteps per ground type, chimes), shared mixer with limiter, Music/Ambience/Effects sliders. Audio suspends when the tab is hidden.
- Part 24: rest reminders, quiet mode, session summary ("Rest for now"), welcome back (flat 2-token gift), docs/wellbeing.md.
- Menu is now collapsible sections that other files register into (`Settings.section`).
- Save format v6 (new settings, wellbeing, social, goals, privacy fields; migration included).
- Fixed: empty camp bar showing on load; tutorial tip covering the menu.
- Foundation only: src/i18n/strings.js and en.json (new strings only so far).

## 0.2.0 - Parts 10-22

**Foundation**
- Part 10: restructured into `core/ world/ characters/ story/ events/ progression/ audio/ ui/`; added `config.js`, `state.js`, `event-bus.js`, `save.js`; split CSS into `base/hud/panels/themes`; story and events moved to `assets/data/*.json`; Vite dev server.
- Part 11: save migrations (`core/migrations.js`) and onboarding (name, gentle tutorial, first token and journal page within the first minute).

**Atmosphere**
- Part 12: dawn / midday / dusk / night with moving sun, moon, stars and lantern light. Menu setting: follow your clock or in-game time.
- Part 13: rain, mist, snow, wind, fireflies, tied to place, season and time; real-calendar seasons; weather changes the sound.
- Part 14: name, coat, hat and lantern customization.

**Attachment**
- Part 15: companions (fox, owl, hare) with names, moods, quirks, bonding and gifts.
- Part 16: camp with decorating, a resting companion, and leave/return.
- Part 17: recurring characters (Old Traveler, Lighthouse Keeper) and letters that remember what you did.

**Story and discovery**
- Part 18: flags, tags and memories; "the world remembers" events.
- Part 19: four chapters, three endings (picked by how you played), road stays open afterwards.
- Part 20: meadow, desert and snowfields with their own event pools; rare events.
- Part 21: six landmarks, six secrets, and a hand-drawn map that fills in.
- Part 22: birds, pressed flowers, songs, stamps, and discovery achievements in a tabbed journal.

**Behaviour changes to be aware of**
- The road now has 6 places (720 steps per loop), so story pages are spaced further apart (ending around 100 tokens).
- The Old Traveler's tea event is now her first meeting (`old-traveler.js`), not a generic event.
- The final story page waits until you actually reach the lighthouse.
