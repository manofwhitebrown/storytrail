# StoryTrail

A cozy walking game. Tap (or press Space) to take a step, collect tokens, meet people, and unlock a story.
Nothing to win, nothing to lose.

## Run it

```bash
npm install
npm run dev        # opens a local dev server (browsers block JSON loading from file://)
npm run build      # production build into dist/
npm run preview    # try the built game locally
```

Add `?debug` to the URL to get `window.__storytrail` (state, bus, takeStep) in the console.

## Where things live

| I want to...                            | Edit                                         |
|-----------------------------------------|----------------------------------------------|
| change pacing (steps per token, etc.)   | `src/core/config.js`                         |
| write story pages / endings             | `assets/data/story.json`                     |
| write road events, rare events, callbacks | `assets/data/events.json`                  |
| add a companion species                 | `assets/data/companions.json`                |
| add items, birds, flowers, songs        | `assets/data/items.json`, `collections.json` |
| add landmarks and secrets               | `assets/data/landmarks.json`                 |
| add a place on the road                 | new file in `src/world/biomes/`, then list it in `biomes/index.js` |
| add a recurring character               | copy `src/characters/npcs/old-traveler.js`, list it in `npcs/index.js` |
| change what happens at a chapter's start/end | `src/story/chapters/chNN-*.js`          |
| change the save format                  | bump `SAVE_VERSION`, add a step in `src/core/migrations.js` |

Modules talk through `src/core/event-bus.js` (`bus.emit("step")`, `bus.on("tokens", ...)`) instead of calling each other.

## How the world remembers you

Choices set **flags** (`fox_friend`) and **tags** (`kind`, `curious`, `restful`). Events, NPC dialogue, letters and the
ending all check them via the conditions in `src/events/consequences.js`.
