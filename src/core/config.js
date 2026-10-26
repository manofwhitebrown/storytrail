// config.js - every tunable number lives here. Change a value, reload, feel the difference.

export const CONFIG = Object.freeze({
  // ---- Walking & tokens ----
  STEPS_PER_TOKEN: 10,       // change this to make tokens easier or harder
  EVENT_EVERY_STEPS: 50,     // raise to 100 for a slower pace
  STEP_DISTANCE: 60,         // pixels the world moves per step

  // ---- World ----
  BIOME_LENGTH: 120,         // steps spent in each biome
  BLEND_STEPS: 20,           // steps over which one biome fades into the next
  GROUND_RATIO: 0.72,        // where the horizon sits (fraction of canvas height)
  PLAYER_X: 220,

  // ---- Time of day ----
  GAME_DAY_STEPS: 200,       // in-game mode: steps for a full day/night cycle
  GAME_DAY_IDLE_SECONDS: 600,// in-game mode: time also drifts a little while you stand still

  // ---- Weather & seasons ----
  WEATHER_MIN_STEPS: 35,
  WEATHER_MAX_STEPS: 80,
  HEMISPHERE: "north",       // "north" or "south" - flips the seasons

  // ---- Onboarding & unlocks ----
  WELCOME_TOKEN_AT_STEP: 3,  // the guaranteed first token during the tutorial
  UNLOCK_MAP_TOKENS: 3,
  UNLOCK_CAMP_TOKENS: 6,

  // ---- People ----
  NAME_MAX: 16,
  COMPANION_OFFER_AFTER_STEPS: 100,
  QUIRK_EVERY_STEPS: 30,
  GIFT_EVERY_STEPS: 60,
  BOND_PER_CAMP_SECOND: 0.2,
  NPC_CHANCE: 0.25,
  NPC_COOLDOWN_EVENTS: 3,    // events that must pass before the same NPC returns

  // ---- Events ----
  RARE_CHANCE: 0.12,
  CALLBACK_CHANCE: 0.6,      // chance a "the world remembers" event is picked when one is ready

  // ---- Discovery ----
  LANDMARK_TOKENS: 2,
  SIGHTING_EVERY_STEPS: 12,
  SIGHTING_CHANCE: 0.4,
  MAP_SEGMENT_STEPS: 10,

  // ---- Saving ----
  SAVE_KEY: "storytrail.save",
  SAVE_VERSION: 5,
  AUTOSAVE_MS: 15000,
});
