# StoryTrail

A cozy walking game. Tap (or press Space) to take a step, collect tokens, meet people, and unlock a story.
Nothing to win, nothing to lose.

## Run it

```bash
npm install
npm run dev        # opens a local dev server
npm run build      # production build into dist/
npm run preview    # try the built game locally
npm test           # unit tests (Vitest)
npm run validate   # checks assets/data/*.json agree with each other
```

Add `?debug` to the URL to get `window.__storytrail` (state, bus, takeStep) in the console. This also works on the published game; it is a single-player game and saves can be edited in the browser anyway.

## Where it runs

- **Browser:** `npm run build` makes `dist/`. The `deploy-pages.yml` workflow publishes it to GitHub Pages (Settings -> Pages -> Source: GitHub Actions).
- **Android:** `npm run android:sync` then open the `android/` folder in Android Studio, or let `android.yml` build a debug APK on every push. Release builds: see `docs/release.md`.

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
| change errands, the daily thing, seasonal goals | `assets/data/quests.json` (numbers in `config.js`) |
| change any interface text               | `src/i18n/en.json` (see `docs/accessibility.md`, "Translating") |
| change the save format                  | bump `SAVE_VERSION`, add a step in `src/core/migrations.js` |

Modules talk through `src/core/event-bus.js` (`bus.emit("step")`, `bus.on("tokens", ...)`) instead of calling each other.

## How the world remembers you

Choices set **flags** (`fox_friend`) and **tags** (`kind`, `curious`, `restful`). Events, NPC dialogue, letters and the
ending all check them via the conditions in `src/events/consequences.js`.
