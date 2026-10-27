# Optional real images, sounds and fonts

StoryTrail draws everything from boxes, makes every sound in code and uses system fonts, so it needs no files.
If you want to swap some of that for real files, put them in `public/media/` and list them in
`public/media/manifest.json`. Only listed files are requested. A file that is missing or broken is skipped and the
built-in version stays.

```json
{
  "images": { "player": "traveler.png", "fox": "fox.png", "item-acorn": "acorn.png", "landmark-lighthouse": "lighthouse.png" },
  "audio":  { "step": ["step1.ogg", "step2.ogg"], "token": "chime.ogg" },
  "fonts":  { "body": "Lora.woff2", "display": "Cinzel.woff2" }
}
```

## Images (`public/media/images/`, PNG or WebP with a transparent background)
Pictures keep their shape and stand on the ground (bottom-center).

| name                  | replaces                | drawn this tall |
|-----------------------|-------------------------|-----------------|
| `player`              | the traveler (lantern is still drawn) | 96 px |
| `fox`, `owl`, `hare`  | the companion           | 44 px           |
| `item-<id>`           | a camp keepsake (ids are in `assets/data/items.json`) | 32 px |
| `landmark-<kind>`     | bridge, windmill, cairn, falls, arch, lighthouse | 62-210 px |

## Audio (`public/media/audio/`, OGG, MP3 or WAV)
Use any effect name from `src/audio/sfx.js`: `step`, `token`, `item`, `page`, `letter`, `landmark`, `secret`,
`achievement`, `collection`, `memory`, `panelOpen`, `panelClose`, `campEnter`, `campLeave`, `bond`, `ending`, `welcome`.
A list picks one at random each time. The first play of an effect uses the synth sound while the file loads.
Files go through the Effects slider, Quiet mode and the limiter like everything else. Music and ambience stay generated.

## Fonts (`public/media/fonts/`, WOFF2)
`body` is all text, `display` is headings. Text drawn inside the scene (popups, the HUD canvas text) still uses Georgia.

Only add files you have the right to use, and keep the sizes small (`npm run optimize` shrinks images).
