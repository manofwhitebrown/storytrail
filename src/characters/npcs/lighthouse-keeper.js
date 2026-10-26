// lighthouse-keeper.js - Part 17. She keeps the lamp on the coast, and she knew your grandmother.

export default {
  id: "lighthouse-keeper",
  name: "The Lighthouse Keeper",
  biomes: ["coast"],

  encounter(meet) {
    if (meet === 1) {
      return {
        text: [
          "A woman is polishing the lamp-room glass when you reach the lighthouse. She doesn't seem surprised. 'You walk like her,' she says.",
          { if: { flag: "asked_lighthouse" }, text: "'The old traveler sent word you might come.'" },
        ],
        choices: [
          { label: "Show her Grandmother's map", result: "She traces the star with one finger. 'She drew it twice,' she says. 'The first one was a rehearsal.'", tokens: 3, tags: ["curious"], set: ["showed_map"], memory: "You showed the Lighthouse Keeper Grandmother's map." },
          { label: "Ask about my grandmother", result: "'Stubborn, funny, always cold. She left her tea-tin here, and I've kept it warm.'", tokens: 3, tags: ["kind"], set: ["asked_about_grandmother"], memory: "The Keeper told you stories about Grandmother." },
          { label: "Just watch the lamp turn", result: "She lets you. The beam goes round, and so does your breathing.", tokens: 3, tags: ["restful"], set: ["watched_lamp"] },
        ],
      };
    }
    return {
      text: [
        "The Keeper looks up from her tea and nods, as if you'd stepped out for a minute.",
        { if: { flag: "story_ended" }, text: "'The road is still yours,' she says. 'The lamp stays lit either way.'" },
      ],
      choices: [
        { label: "Have tea with her", result: "She sings the lamp a lullaby while the kettle works. You hear every word.", tokens: 3, tags: ["restful"], collect: { kind: "songs", id: "keepers-lullaby" } },
        { label: "Help her trim the wick", result: "It's smaller work than it looks, and you feel enormously useful.", tokens: 3, tags: ["kind"] },
      ],
    };
  },

  letters: [
    { id: "lk-1", afterMeet: 1, delay: 45, subject: "The lamp is lit",
      parts: [
        "Dear {name},",
        { if: { flag: "showed_map" }, text: "I've pinned the second copy of her map up in the lamp room, where the light is best." },
        { if: { flag: "asked_about_grandmother" }, text: "I remembered another story about her: she once tried to teach a seagull to carry mail. The seagull took the letter and the sandwich." },
        { if: { flag: "watched_lamp" }, text: "Anyone who can sit quietly with a lamp is welcome in my kitchen." },
        "Come when you like.",
      ] },
    { id: "lk-after", afterFlag: "story_ended", delay: 40, subject: "After the lamp",
      parts: [
        "Dear {name},",
        "I wanted to write while the lamp was still warm from your visit.",
        { if: { companion: true }, text: "Please give {companion} a scratch behind the ears from me." },
        "Whatever the road does next, there is a chair here with your name worn into it. Light travels farther than people think.",
      ] },
  ],
};
