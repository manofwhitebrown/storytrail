# Changelog

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
