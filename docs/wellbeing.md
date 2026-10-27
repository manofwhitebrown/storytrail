# Wellbeing

StoryTrail is meant to be a place people feel better for having visited. These are the rules the game keeps, and where each one lives in the code.

## Principles

1. **Nothing is lost by being away.** There are no streaks, no daily-login rewards that grow, no timers that expire.
2. **Nothing blocks play.** Every prompt is dismissible, and the "keep going" button is as easy to press as the "rest" one.
3. **The player is in charge.** Reminders can be set to 20/30/45/60 minutes or switched off entirely, and quiet mode is one switch.
4. **No guilt, no pressure, no scarcity.** Copy never says "you missed", "don't lose", "hurry".
5. **Everything stays on the device.** Wellbeing data (when you last visited, a recap) lives in the save file only.

## What exists

| Feature | File | Behaviour |
|---|---|---|
| Rest reminders | `src/wellbeing/rest-reminders.js` | After N minutes of *active* play (taps in the last 2 min, tab visible) a small dialog suggests a break. Waits until no event, menu or camp is open. After a reminder, silent for a whole interval. "Not today" silences it until reload. A late-night line appears between 23:00 and 04:00. Default 30 min; Menu -> Wellbeing to change or turn off. |
| Quiet mode | `src/wellbeing/quiet-mode.js` | No effects; music/ambience softened; ambient toasts and floating text skipped; fewer falling leaves/rain; road events half as frequent; no vibration. Place names and direct feedback ("Saved") still show. Everything found is still in the journal. |
| Session summary | `src/wellbeing/session-summary.js` | "Rest for now" (Menu, or from a reminder) saves and shows what the visit held (steps, tokens, discoveries) with a kind closing line. A visit with nothing found gets a kind line too. |
| Welcome back | `src/wellbeing/welcome-back.js` | Away 18 hours or more: a warm panel (what changed: season / time of day / companion / letters) and a **flat** gift of 2 tokens. A year away gives the same as three days: staying away is never rewarded and returning is never punished. |

## Tuning

All numbers are in `src/core/config.js`: `REST_REMINDER_MINUTES`, `REST_IDLE_SECONDS`, `WELCOME_BACK_HOURS`, `WELCOME_BACK_TOKENS`, `QUIET_EVENT_FACTOR`.

## Rules for adding features

- No streak counters, no "come back tomorrow or lose X", no countdowns.
- Daily and seasonal goals (`src/goals/`) may be skipped forever with no penalty.
- A notice that is only atmosphere should use `HUD.toast(text)` / `HUD.popup(...)`, so quiet mode silences it. Only direct answers to something the player just did get `{ feedback: true }`.
- Anything that moves, flashes or vibrates must honour `calmMotion()` (`src/core/util.js`).

## Known limits

- A web page cannot show anything when the tab is closed, so the recap appears when the player chooses to rest, not on exit. The welcome-back covers the return.
- Active time is measured per page visit; reloading resets the reminder clock.
