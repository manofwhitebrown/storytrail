// events.js - Part 4. Every so often the walk pauses for a small choice.
// There are no wrong answers: every choice gives tokens.

const EVENT_EVERY_STEPS = 50; // raise this to 100 for a slower pace

const EVENTS = [
  {
    text: "A small bird sits on a fence post, one wing tucked in oddly.",
    choices: [
      { label: "Carry it to a tree", result: "It hops onto a branch and sings a few notes before you leave.", tokens: 2 },
      { label: "Leave some seeds", result: "You scatter seeds and walk on. Behind you, wings flutter.", tokens: 1 },
    ],
  },
  {
    text: "A fox sits on the path holding a tiny lantern in its mouth.",
    choices: [
      { label: "Take the lantern", result: "It is warm, and lights the road ahead for a while.", tokens: 2 },
      { label: "Sit with the fox", result: "You rest together. When you stand, the fox nudges a token into your hand.", tokens: 3 },
    ],
  },
  {
    text: "A stream crosses the path. A few flat stones lie nearby.",
    choices: [
      { label: "Build stepping stones", result: "You set the stones one by one and cross without getting wet.", tokens: 2 },
      { label: "Wade across", result: "The water is cold and clear. Something shiny rests in the mud.", tokens: 1 },
    ],
  },
  {
    text: "An old traveler waves from a bench and offers you tea.",
    choices: [
      { label: "Share the tea", result: "She tells you the road is kinder than it looks, then hands you a token.", tokens: 3 },
      { label: "Wave and keep walking", result: "She smiles, as if she expected that, and tucks a token in your pocket.", tokens: 1 },
    ],
  },
  {
    text: "A mailbox stands alone by the road. It has your name on it.",
    choices: [
      { label: "Open it", result: "Inside is a folded note and a token. The note says: keep going.", tokens: 2 },
      { label: "Leave it closed", result: "Some things can wait. A token slips out from under the lid anyway.", tokens: 1 },
    ],
  },
  {
    text: "Wind chimes hang from a tree, though no one is around.",
    choices: [
      { label: "Add one of your own", result: "The new chime is slightly out of tune, which somehow suits them.", tokens: 2 },
      { label: "Listen for a while", result: "The sound settles you. Your steps feel lighter.", tokens: 2 },
    ],
  },
];

const Events = {
  active: false,
  lastIndex: -1,
  panel: document.getElementById("eventPanel"),

  start() {
    // Pick a random event, but never the same one twice in a row
    let i;
    do { i = Math.floor(Math.random() * EVENTS.length); } while (i === this.lastIndex);
    this.lastIndex = i;

    const ev = EVENTS[i];
    this.active = true;
    this.panel.replaceChildren();

    const text = makeEl("p", ev.text);
    text.id = "eventText";
    const row = makeEl("div");
    row.className = "choices";

    ev.choices.forEach((choice) => {
      const btn = makeEl("button", choice.label);
      btn.type = "button";
      btn.addEventListener("click", () => this.choose(choice));
      row.append(btn);
    });

    this.panel.append(text, row);
    this.panel.classList.remove("hidden");
    row.firstChild.focus();
  },

  choose(choice) {
    this.panel.replaceChildren();

    const result = makeEl("p", choice.result);
    result.id = "eventText";
    const reward = makeEl("p", `+${choice.tokens} token${choice.tokens > 1 ? "s" : ""}`);
    reward.className = "reward";
    const next = makeEl("button", "Keep walking");
    next.type = "button";
    next.addEventListener("click", () => this.close());

    this.panel.append(result, reward, next);
    next.focus();

    addTokens(choice.tokens); // defined in main.js
  },

  close() {
    this.panel.classList.add("hidden");
    this.panel.replaceChildren();
    this.active = false;
  },
};

function makeEl(tag, text) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
}
