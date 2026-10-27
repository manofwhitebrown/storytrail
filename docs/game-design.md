# Game design

StoryTrail is a cozy walking game. You tap (or press Space) to take a step, steps become tokens, tokens unlock a story, and a small world, a companion and a camp grow around you. There is no way to lose, fail or fall behind.

## Pillars

1. **Calm over challenge.** Nothing is timed, nothing is lost, no enemies, no scarcity. Every choice pays tokens.
2. **Noticing is the reward.** Birds, flowers, songs, hidden places, small letters, odd weather. The game pays attention to what you notice.
3. **The world responds.** Place, season (from the real calendar), time of day (your clock or in-game), and weather change how the road looks, sounds and what can happen.
4. **Respect the player.** No streaks, no ads, no leaderboards, no dark patterns. See `docs/wellbeing.md`.

## The loop

Tap -> step -> every 10 steps a token -> tokens unlock journal pages and features. Every 50 steps a road event offers a small choice. Every 120 steps the place changes. Now and then something rare happens.

| Layer | What it does | Where |
|---|---|---|
| Walking | Step counter, token every 10 steps | `core/main.js`, `progression/tokens.js` |
| Places | 6 biomes of 120 steps each, 720-step loop, 20-step fades | `world/biomes/*` |
| Landmarks and secrets | 6 fixed landmarks; 6 secrets that only appear at certain times or weather | `world/landmarks.js`, `world/secrets.js` |
| Road events | A small scene with 2-3 choices; common, per-place, rare, and callbacks to earlier choices | `events/*`, `assets/data/events.json` |
| Story | Journal pages unlocked by token totals; three endings | `story/*`, `assets/data/story.json` |
| Companions | Fox, owl or hare, offered after 100 steps; moods, quirks, bonding, gifts | `characters/companions/*` |
| Camp | Unlocks at 6 tokens; decorate three kinds of slot (hang, ground, shelf) | `progression/camp.js` |
| Collections | 9 birds, 8 flowers, 9 songs | `progression/collections.js` |
| Letters and memories | Letters from people you meet; memories the road keeps | `story/letters.js`, `story/memories.js` |
| Achievements | Quiet badges, never required | `progression/achievements.js` |
| Atmosphere | Dawn/noon/dusk/night, rain/mist/snow/wind/fireflies, four seasons | `world/*` |
| Audio | Generative music, place ambience, soft effects | `audio/*` |
| Wellbeing | Rest reminders, quiet mode, recap, welcome back | `wellbeing/*` |

## Unlocks

| At | You get |
|---|---|
| step 3 | The first token (during the tutorial) |
| 3 tokens | The Map |
| 6 tokens | Camp |
| 100 steps | A companion offer |
| token totals in `story.json` | Journal pages (1, 3, 6, 10, 20, 36, 44, 54, 70, 78, 88, 98) |

## Pacing

About 0.14-0.16 tokens per step: one place on the road is roughly 16-19 tokens. The final page needs 98 tokens and the lighthouse, so a first journey takes about 600-700 steps. After the story ends the road keeps looping; collections, camp decorating and companions give reasons to continue. Numbers: `docs/economy.md`, tuning: `src/core/config.js`.

## Endings

The ending depends on how you tended to act on the road: **kind**, **curious** or **restful** (`story/endings.js`). All three are warm; none is "better".

## What we will not do

- Streaks, daily-login rewards that grow, expiring content, countdowns.
- Leaderboards or any public ranking. Social features (planned) are gentle and local-first.
- Spending tokens, gambling mechanics, or paid advantages.
- Anything that says "you missed" or "don't lose".

## Adding content

- Story pages: add to `assets/data/story.json`, keep `tokens` increasing.
- Events, items, collections, landmarks, companions: the matching file in `assets/data/`. Each file has a `_note` at the top explaining its format.
- Save format changes: bump `SAVE_VERSION` and add a step in `core/migrations.js`.
