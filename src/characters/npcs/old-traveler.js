// old-traveler.js - Part 17. A woman on a bench who always seems to know the road.
// encounter(meet) builds the road event for her Nth visit. Text can change with what you did earlier.

export default {
  id: "old-traveler",
  name: "The Old Traveler",
  biomes: ["forest", "meadow", "mountains", "snowfields"],

  encounter(meet) {
    if (meet === 1) {
      return {
        text: "An old traveler waves from a bench and offers you tea.",
        choices: [
          { label: "Share the tea", result: "She tells you the road is kinder than it looks, then hands you a token.", tokens: 3, tags: ["restful", "kind"], set: ["tea_shared"], memory: "You shared tea with an old traveler, who said the road is kinder than it looks." },
          { label: "Wave and keep walking", result: "She smiles, as if she expected that, and tucks a token in your pocket.", tokens: 1, tags: ["curious"], set: ["tea_declined"] },
        ],
      };
    }
    if (meet === 2) {
      return {
        text: [
          { if: { flag: "tea_shared" }, text: "The old traveler is on a stone wall this time, with two cups already poured. 'I hoped it was you,' she says." },
          { if: { notFlag: "tea_shared" }, text: "The old traveler is here again. This time she doesn't offer anything. 'Not everyone stops,' she says. 'I don't mind. Sit anyway?'" },
          { if: { flag: "fox_friend" }, text: "She nods at the way you walk. 'You've made a friend with fur, I see.'" },
        ],
        choices: [
          { label: "Sit and listen to her hum", result: "She hums a tune with no beginning, only a middle. You find you know the next part.", tokens: 3, tags: ["restful"], collect: { kind: "songs", id: "travelers-hum" } },
          { label: "Ask about the lighthouse", result: "'Ah,' she says. 'Somebody's lamp has been lit for a very long time. Follow the salt.'", tokens: 2, tags: ["curious"], set: ["asked_lighthouse"] },
        ],
      };
    }
    return {
      text: [
        "The old traveler is walking the other way this time, with a pack as light as yours was heavy.",
        { if: { flag: "helped_bird" }, text: "'Heard you carried a bird to a tree,' she says. 'News travels, out here.'" },
        { if: { flag: "asked_lighthouse" }, text: "'Close now, aren't you? Tell her I said hello.'" },
      ],
      choices: [
        { label: "Walk with her a while", result: "You swap stories until the road forks. She taps your lantern, once, for luck.", tokens: 3, tags: ["kind"] },
        { label: "Trade her a token for a tip", result: "'Look up when the sky turns the color of weak tea,' she says. Whatever that means.", tokens: 2, tags: ["curious"] },
      ],
    };
  },

  // Letters arrive some steps after a meeting, and remember what you did.
  letters: [
    { id: "ot-1", afterMeet: 1, delay: 30, subject: "I forgot to say",
      parts: [
        "Dear {name},",
        { if: { flag: "tea_shared" }, text: "Thank you for the tea. I don't get many sitters." },
        { if: { flag: "tea_declined" }, text: "I don't mind that you didn't stop. The road is long, and you looked like someone with a destination." },
        "What I forgot to say is this: the way is slow on purpose. If you hurry, you will arrive and have nothing to remember.",
        { if: { flag: "fox_friend" }, text: "I hear the foxes like you. That is a very good sign." },
      ] },
    { id: "ot-2", afterMeet: 2, delay: 35, subject: "A map is a kind of letter",
      parts: [
        "Dear {name},",
        { if: { flag: "asked_lighthouse" }, text: "You asked about the lighthouse. I should tell you: I knew the woman who built it, long ago. She drew maps on whatever she had." },
        { if: { notFlag: "asked_lighthouse" }, text: "You didn't ask where you were headed, and I admire that. Some people prefer to find out by walking." },
        "A map is a kind of letter, {name}. It's from someone who has been where you're going, to someone who hasn't yet.",
      ] },
    { id: "ot-3", afterMeet: 3, delay: 40, subject: "Last thing, I promise",
      parts: [
        "Dear {name},",
        { if: { flag: "helped_bird" }, text: "A bird sang near my bench this morning, one wing held a little oddly. It looked well. I thought you'd want to know." },
        "I am not sure where I will be when you read this. That is the whole joy of it. Walk well, and keep your lantern lit.",
      ] },
  ],
};
