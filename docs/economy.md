# Economy

Everything is tunable in `src/core/config.js`. Rough numbers at the defaults:

| Source                  | Tokens                                   |
|-------------------------|------------------------------------------|
| Walking                 | 1 per 10 steps                           |
| Road events (every 50 steps) | 1-3 per choice, 3-4 for rare events |
| Landmarks (6, once)     | 2 each                                   |
| Secrets (6, once)       | 3-4 each                                 |
| Welcome token           | 1 (tutorial, at step 3)                  |

About 0.14-0.16 tokens per step, so one place on the road (120 steps) is roughly 16-19 tokens.

**No dead ends:** every event choice pays tokens; nothing is ever lost or spent; every journal page is reachable by walking alone.
The last page also needs you to reach the lighthouse (step 690), which walking always gets you to.

## Welcome-back gift (Part 24)
Returning after 18+ hours gives a flat 2 tokens, however long you were away. Not a streak, never grows.
