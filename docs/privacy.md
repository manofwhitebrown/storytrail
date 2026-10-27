# Privacy

**As shipped, StoryTrail sends nothing anywhere.** No accounts, no ads, no tracking, no cookies. The game lives in your browser's storage (`localStorage`) or the Android app's storage.

## What can leave the device, and only when the player asks
See `docs/social.md`: a camp link (a code in the web address that is never sent to a server), a postcard picture, a backup file (Menu -> Back up & restore).

## Optional anonymous counts (Part 27)
Off unless **all three** are true:
1. `ANALYTICS_ENDPOINT` in `src/core/config.js` is set to an `https://` address (it is empty).
2. The player said yes (asked once after the tutorial; changeable in Menu -> Privacy).
3. The device does not send Do Not Track / Global Privacy Control.

Only these events can be sent: `session_start`, `biome_enter` (a place id), `story_page` (a page number), `story_end` (an ending id), `achievement` (an id). Values can only be numbers, true/false or short lowercase ids. No names, no free text, no device or person id, no timestamp, no cookies, nothing stored between visits. A failed send is dropped. (`src/privacy/analytics.js`, tested in `tests/privacy*.test.js`.)

## For the Play Store form
- Data collected: none by default. Data shared: none.
- If you ever set an endpoint: say "anonymous usage counts, optional, off by default", and publish a policy page that says the same as this file.
- The app has the `INTERNET` permission (to load nothing in the app itself; it is needed for the share sheet and links).
