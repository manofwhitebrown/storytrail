# Economy

Everything is tunable in `src/core/config.js`. Rough numbers at the defaults:

| Source                  | Tokens                                   |
|-------------------------|------------------------------------------|
| Walking                 | 1 per 10 steps                           |
| Road events (every 50 steps) | 1-3 per choice, 3-4 for rare events |
| Landmarks (6, once)     | 2 each                                   |
| Secrets (6, once)       | 3-4 each                                 |
| Welcome token           | 1 (tutorial, at step 3)                  |
| Sitting by a friend's fire | 1 per camp, once (never your own)     |

About 0.14-0.16 tokens per step, so one place on the road (120 steps) is roughly 16-19 tokens.

**No dead ends:** every event choice pays tokens; nothing is ever lost or spent; every journal page is reachable by walking alone.
The last page also needs you to reach the lighthouse (step 690), which walking always gets you to.

## Welcome-back gift (Part 24)
Returning after 18+ hours gives a flat 2 tokens, however long you were away. Not a streak, never grows.

## Visiting (Part 25)
Sitting by a friend's fire pays `VISIT_TOKENS` (1) once per camp. Your own camp pays nothing. The list of camps you have sat by is capped at `VISITED_MAX` (200) so a save cannot grow without limit; past that, visiting still works and simply pays nothing. This is a small thank-you for company, not a way to earn: the whole list of visits is worth a few percent of a single walk through the road.
