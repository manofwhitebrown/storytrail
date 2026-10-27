# Accessibility

StoryTrail should be comfortable for as many people as possible. This page says what exists, how it works, what is **not** done yet, and how to translate the game.

## What the player can change (Menu -> Accessibility)

| Setting | Options | Effect | Where |
|---|---|---|---|
| Text size | Normal / Large (125%) / Extra large (150%) | Scales all interface text (everything is sized in `rem`). | `styles/accessibility.css` |
| Contrast | Normal / High | Pure black and white, solid panels, thick yellow focus outlines, solid selected buttons. Works in every time of day and season. | `styles/accessibility.css` |
| Motion | Follow my device / Reduce | Switches off CSS transitions and animations, thins falling leaves, rain and snow, and stops vibration. "Follow my device" respects the system's *reduce motion* setting. | `core/util.js` (`prefersReducedMotion`, `calmMotion`) |
| Vibration | On / Off | Light haptic taps on steps and special moments. Only shown on devices that can vibrate. Never more than ~6 per second. | `ui/haptics.js` |

Related: **Quiet mode** (Menu -> Wellbeing) gives a calm experience without sound effects, with fewer notices and events (see `docs/wellbeing.md`). Volume for music, ambience and effects can be set separately, so a player can keep one and mute the others.

All settings are saved with the game and restored on load. Settings are written onto `<html>` as `data-text`, `data-contrast` and `data-motion` (`ui/accessibility.js`).

## Already in the game

- The whole game can be played with the keyboard: Space takes a step; menus and panels use Tab, Enter and Escape.
- Panels trap focus while open and give it back when they close.
- Visible focus outlines on every control.
- Toggle buttons use `aria-pressed`; groups of options are labelled with `role="group"`.
- Nothing is timed, so nobody is rushed. Nothing depends on colour alone.
- Windows "forced colors" mode is supported by a small stylesheet block.

## Known limits (honest list)

- **Text drawn on the picture** (place names, "+1 token") is part of the canvas and does **not** scale with the Text size setting. The setting scales the words around the road. The menu says so.
- High contrast changes the interface, not the artwork of the scene.
- The game has been tested with automated browser checks (settings apply, save and restore, keyboard focus), **not yet** with a screen reader such as TalkBack or VoiceOver, or with real users. Please test and report problems.
- UI text in the older parts of the game is still written directly in the code, not in `src/i18n/en.json` (see below), so it cannot be translated yet.

## Rules for new features

1. Use `calmMotion()` / `prefersReducedMotion()` for anything that moves a lot.
2. Use `rem`, not `px`, for text sizes.
3. Do not use colour as the only way to tell things apart; add a word or an icon.
4. Give every button text or an `aria-label`.
5. Do not add timers, or anything the player can fail by being slow.
6. New interface text goes in `src/i18n/en.json` and is read with `t("key")`.

## Translating

The interface text lives in `src/i18n/en.json`: one flat list of `"key": "text"`.

1. Copy `en.json` to e.g. `fr.json`. Translate the **values** only. Never change a key, and keep `{braces}` such as `{name}` exactly as they are.
2. Plurals use `key.one` and `key.other` (add `.few`, `.many` etc. if the language needs them; the right one is chosen automatically).
3. In `src/i18n/strings.js` import the file and add it to `TABLES`.
4. Anything not translated falls back to English, so a half-finished translation still works.

The **story, events, letters, items, collections and companions** are in `assets/data/*.json`, not in `en.json`. Translating those means making a copy of the data files for the language. That loading step is not built yet.

**Still to do before the game can be fully translated:** move the remaining hard-coded interface text (menu bits, journal, map, onboarding, camp, HUD, `index.html`) into `en.json`.

## Reporting a problem

If something is hard to see, read, hear or use, please open an issue describing the device, the setting you used, and what happened.
