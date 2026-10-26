// onboarding.js - Part 11. The first two minutes: a name, a gentle tutorial,
// and a first token and journal page within the opening minute.

import { CONFIG } from "../core/config.js";
import { bus } from "../core/event-bus.js";
import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { Customization } from "../characters/customization.js";
import { addTokens } from "../progression/tokens.js";
import { Panels } from "./panels.js";

let tip = null;
let journalBtn = null;

export const Onboarding = {
  init() {
    tip = document.getElementById("tutorial");
    journalBtn = document.getElementById("journalBtn");

    const el = Panels.create("welcome", { className: "centered", label: "Welcome to StoryTrail", dismissable: false, onOpen: () => this.renderWelcome(el) });
    this.welcome = el;

    bus.on("step", () => { if (state.onboardStep === "walk") this.afterStep(); });
    bus.on("panel:open", (id) => { if (id === "journal" && state.onboardStep === "journal") { state.onboardStep = "read"; this.showTip(); } });
    bus.on("panel:close", (id) => { if (id === "journal" && state.onboardStep === "read") this.finish(); });
  },

  start() {
    if (state.onboarded) return;
    if (state.onboardStep === "welcome") Panels.open("welcome");
    else this.showTip();
  },

  renderWelcome(el) {
    el.replaceChildren();
    const label = makeEl("label", "What should the road call you?");
    label.htmlFor = "welcomeName";
    const input = makeEl("input");
    input.type = "text"; input.id = "welcomeName"; input.maxLength = CONFIG.NAME_MAX; input.placeholder = "Traveler";
    input.dataset.autofocus = "";

    const go = makeEl("button", "Begin");
    go.type = "button";
    const begin = () => {
      Customization.setName(input.value);
      state.onboardStep = "walk";
      Panels.close("welcome");
      this.showTip();
    };
    go.addEventListener("click", begin);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") begin(); });

    el.append(
      makeEl("h2", "StoryTrail"),
      makeEl("p", "A quiet walk, one step at a time. There is nothing to win and nothing to lose. Just a road, and whatever you find on it."),
      label, input, go,
    );
  },

  afterStep() {
    if (state.steps >= CONFIG.WELCOME_TOKEN_AT_STEP) this.giveWelcomeToken();
    this.showTip();
  },

  giveWelcomeToken() {
    if (state.flags.welcome_token) return;
    state.flags.welcome_token = true;
    addTokens(1, "welcome");
    state.onboardStep = "journal";
    journalBtn.classList.add("pulse");
  },

  showTip() {
    const step = state.onboardStep;
    tip.replaceChildren();
    let text = "";
    if (step === "walk") text = `Tap the scene, or press Space, to take a step. (${Math.min(state.steps, CONFIG.WELCOME_TOKEN_AT_STEP)}/${CONFIG.WELCOME_TOKEN_AT_STEP})`;
    else if (step === "journal") text = "That's a token. Walking earns them, and so does helping what you meet. Open your journal to see what it unlocked.";
    else if (step === "read") text = "Your first journal page. Close it and keep walking: the road will tell you the rest.";
    else { tip.classList.add("hidden"); return; }

    const skip = makeEl("button", "Skip tutorial");
    skip.type = "button";
    skip.addEventListener("click", () => this.finish());
    tip.append(makeEl("p", text), skip);
    tip.classList.remove("hidden");
  },

  finish() {
    if (!state.flags.welcome_token) this.giveWelcomeToken();
    state.onboarded = true;
    state.onboardStep = "done";
    journalBtn.classList.remove("pulse");
    tip.classList.add("hidden");
    tip.replaceChildren();
  },
};
