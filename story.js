// story.js - Part 5. Diary pages unlock as your token total grows.
// To add a page, add another entry. Keep `tokens` increasing.

const STORY = [
  { tokens: 1,  title: "The Road Begins",
    text: "I left before sunrise. The house was quiet, and the lantern on the table still held its last bit of oil." },
  { tokens: 3,  title: "Grandmother's Map",
    text: "She drew it on the back of a bakery receipt: a road, a river, and a small star near the sea. 'You'll know it when you see it,' she said." },
  { tokens: 6,  title: "Small Kindnesses",
    text: "A stranger gave me bread today. I have started to notice that the road is full of people who want to help." },
  { tokens: 10, title: "The Sound of Pines",
    text: "The forest is louder at night than I expected. I stopped counting steps and started counting birds." },
  { tokens: 15, title: "Above the Clouds",
    text: "The air is thin up here. I looked back and could see the whole green valley, small as a handkerchief." },
  { tokens: 21, title: "What I Left Behind",
    text: "I packed too many worries. The mountain took most of them, one cold step at a time." },
  { tokens: 28, title: "Salt on the Wind",
    text: "I can smell the sea. The star on the map must be close now." },
  { tokens: 36, title: "The Lighthouse",
    text: "It was her lighthouse all along. The lamp inside is still warm. I think she wanted me to find the way, not just the place." },
];

const Story = {
  unlocked: 0,
  open: false,
  panel: document.getElementById("journal"),
  list: document.getElementById("journalList"),
  openBtn: document.getElementById("journalBtn"),
  closeBtn: document.getElementById("journalClose"),

  // Call whenever tokens change
  check(state) {
    while (this.unlocked < STORY.length && state.tokens >= STORY[this.unlocked].tokens) {
      UI.toast(`Journal updated: ${STORY[this.unlocked].title}`);
      this.unlocked++;
    }
    if (this.open) this.render();
  },

  render() {
    this.list.replaceChildren();
    STORY.forEach((entry, i) => {
      const li = document.createElement("li");
      if (i < this.unlocked) {
        li.append(makeEl("h3", entry.title), makeEl("p", entry.text));
      } else {
        li.className = "locked";
        li.append(makeEl("p", `Locked. Collect ${entry.tokens} tokens to read this page.`));
      }
      this.list.append(li);
    });
  },

  show() {
    this.open = true;
    this.render();
    this.panel.classList.remove("hidden");
    this.closeBtn.focus();
  },

  hide() {
    this.open = false;
    this.panel.classList.add("hidden");
    this.openBtn.focus();
  },
};

Story.openBtn.addEventListener("click", () => {
  if (Events.active) return;
  Story.show();
});
Story.closeBtn.addEventListener("click", () => Story.hide());
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && Story.open) Story.hide();
});
