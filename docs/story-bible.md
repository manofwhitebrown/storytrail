# Story bible

## In one line

A traveler follows their grandmother's hand-drawn map (a road, a river and a star by the sea) to find out what she left at the end of it.

## Tone

Gentle, wry, observational. The narrator is the traveler, writing in a journal in the first person and past tense. Small details over big drama. Kindness is normal. Sadness is allowed but never heavy; things "look away politely". Humor is quiet ("the wind is only polite"). Never preachy.

## Characters

- **The traveler** (the player). Named by the player at the start; coat, hat and lantern are customizable. Carries a lantern that was still lit when they left.
- **Grandmother.** Never seen. Drew the map on the back of a bakery receipt. Says "You'll know it when you see it." Her voice appears in notes and in the keeper's memory of her.
- **The lighthouse keeper.** Waits at the end. Warm, practical, puts the kettle on. Was asked by Grandmother to keep the lamp for "someone kind".
- **The old traveler.** A wanderer met on the road who sends letters afterwards. Hums a song that can be collected.
- **Companions** (optional): a russet fox kit (curious, bold), a round-eyed owlet (sleepy, wise), a long-eared hare (gentle, skittish). Named by the player; their moods depend on weather, place and time of day.

## Places (in road order)

| # | Place | Steps | Landmark | Secret |
|---|---|---|---|---|
| 1 | Forest | 0-120 | The Old Bridge (70) | The Hidden Shrine (dawn/dusk) |
| 2 | Meadow | 120-240 | The Quiet Windmill (190) | The Moon Pool (night) |
| 3 | Mountains | 240-360 | Cairn Pass (305) | The Echo Hollow (mist) |
| 4 | Snowfields | 360-480 | The Frozen Falls (425) | The Aurora Hollow (night) |
| 5 | Desert | 480-600 | The Sun Gate (545) | The Hidden Oasis (noon) |
| 6 | Coast | 600-720 | The Lighthouse (690) | The Tidepool Cave (rain/mist) |

(Names, texts and exact positions: `assets/data/landmarks.json`.)

## Plot, in four chapters

1. **The Road Begins** (tokens 1-10). Leaving before sunrise; the map; small kindnesses; the forest at night. Theme: setting out, noticing help.
2. **Grandmother's Map** (20-44). The meadow feels wide; the mountains thin the air; worries left behind on the mountain. Theme: space and letting go.
3. **The Long Quiet** (54-78). Snow takes the edges off sound; the desert teaches patience; small kept things (a feather, a stone, a pressed flower). Theme: slowness and keeping.
4. **The Lighthouse** (88-98). Salt on the wind; the star on the map is a lighthouse, and the lamp is still warm. Theme: the way was the gift.

## Endings

| Ending | Title | Leans toward | Last idea |
|---|---|---|---|
| kind | The Lamp That Stayed Lit | helping, sharing | "Keep it lit for the next one." |
| curious | The Other Side of the Map | looking behind things | A second star past the sea; the road is open. |
| restful | Warm by the Window | slowing down | Tea, the lamp, "nowhere you have to be." |

Each ending has a companion line if you have one.

## Recurring motifs

The lantern; the lamp; the map; small kept objects (feather, stone, flower); kindness between strangers; the road as patient and polite; the sea and the star.

## Rules for writing new text

- Warm, short, concrete. One idea per page.
- Never mention failure, loss of progress or urgency.
- Use `{name}` for the traveler and `{companion}` for the companion; text must read well when there is no companion.
- Keep `tokens` increasing across pages. Avoid multiples of 50 for landmark positions so they don't collide with event steps.
- Strings that appear in the interface (not the story) belong in `src/i18n/en.json`.
