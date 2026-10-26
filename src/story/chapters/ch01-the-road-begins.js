// Chapter hooks. The words live in assets/data/story.json; this file is for things that
// HAPPEN when a chapter starts or ends. `api` has: setFlag, giveItem, toast.

export default {
  id: "ch01",
  onComplete(api) {
    api.giveItem("tin-mug");
    api.toast("Grandmother's tin mug was in your pack all along");
  },
};
