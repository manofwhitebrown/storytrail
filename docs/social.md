# Social features (Part 25)

There are no accounts, no friend lists, no scores and no leaderboards. Nothing here talks to a server. Two things can leave the game, and only when the player presses a button.

## Postcards
Menu -> Share & visit -> Make a postcard. The picture is built on the device from the scene on screen. The player can add up to 60 characters. It is saved as a PNG (browsers) or passed to the phone's share sheet (Android and phones that support it). A postcard holds: the picture, the place, season, time of day, the step count, the message, the traveler's name.

## Camp links
Menu -> Share & visit -> Share my camp / Copy camp link. The link looks like `https://.../storytrail/#camp=<code>`. The code holds: the traveler's name, coat, hat and lantern, the companion's species and name, which decorations hang or sit in which spot, and a random camp id (made on first share, used so a camp only pays a visitor once).

The part after `#` is never sent to a web server by browsers. It does not hold: steps, tokens, story progress, letters, memories, or anything else.

## Opening a link
- In a browser, opening a link shows an invitation ("... has asked you to sit by their fire"). The player chooses Visit or Not now.
- In the Android app, pasting a link into Menu -> Share & visit does the same. (Links opened from other apps open the web version; deep links into the app are not set up yet.)
- A visit is read-only. Walking pauses; Back or Escape leaves. "Sit by the fire" pays 1 token once per camp.

## What is checked (`social/visits.js`, `sanitizeCamp`)
A link is text anyone could write by hand, so everything read from it is cleaned before use:
- must be version 1 with a camp id of 6-16 lowercase letters/digits; anything else is "not a camp link";
- links longer than `CAMP_LINK_MAX` (1500 characters) are not read at all;
- names (traveler, companion): control and invisible direction characters, `{ }` and `< >` removed, spaces collapsed, cut to 16 characters;
- coat, hat, lantern, companion species: must be known ids, otherwise the first option is used;
- decorations: only item ids that exist, and only in a spot of the right kind (hang / ground / shelf);
- all text is shown with `textContent`, never as HTML.

## Privacy notes (for a store listing)
The game collects no personal data and sends nothing by itself. Sharing uses the device's own share sheet or clipboard, chosen by the player. The Android app writes a postcard picture to its private cache folder so the share sheet can read it.
