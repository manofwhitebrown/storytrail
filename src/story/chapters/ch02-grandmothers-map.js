export default {
  id: "ch02",
  onEnter(api) { api.setFlag("left_the_forest"); },
  onComplete(api) { api.giveItem("patchwork-rug"); },
};
