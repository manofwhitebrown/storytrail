// menu.js (social) - Part 25. The "Share & visit" section of the Menu:
// make a postcard, share or copy your camp link, and visit a friend by pasting theirs.

import { state } from "../core/state.js";
import { makeEl } from "../core/util.js";
import { t } from "../i18n/strings.js";
import { HUD } from "../ui/hud.js";
import { Panels } from "../ui/panels.js";
import { Settings, button } from "../ui/settings.js";
import { Postcards } from "./postcards.js";
import { codeFromText, viewFromCode, Visits } from "./visits.js";

let draft = "";          // what is typed in the "paste a link" box (kept when the menu redraws)
let note = "";           // a short answer under that box
let fallbackLink = "";   // shown in a box if the phone would not let us copy

const SAID = { shared: "share.camp.shared", copied: "share.camp.copied" };

export const SocialMenu = {
  init() {
    Settings.section("share", 50, (box, rerender) => {
      box.append(makeEl("p", t("share.privacy"), "menu-sub"));

      const post = makeEl("div", null, "options");
      post.append(button(t("share.postcard"), () => { Panels.close("menu"); Postcards.open(); }));
      box.append(post);

      const mine = makeEl("div", null, "options");
      mine.append(
        button(t("share.camp.share"), async () => {
          const result = await Visits.shareOwn();
          if (SAID[result]) HUD.toast(t(SAID[result]), { feedback: true });
          else if (result === "failed") { fallbackLink = Visits.ownLink(); rerender(); }
        }),
        button(t("share.camp.copy"), async () => {
          if ((await Visits.copyOwn()) === "copied") HUD.toast(t("share.camp.copied"), { feedback: true });
          else { fallbackLink = Visits.ownLink(); rerender(); }
        }),
      );
      box.append(mine);

      if (fallbackLink) {
        const label = makeEl("label", t("share.camp.byHand"));
        const field = makeEl("input");
        field.type = "text";
        field.readOnly = true;
        field.value = fallbackLink;
        field.addEventListener("focus", () => field.select());
        label.append(field);
        box.append(label);
      }

      // visit a friend
      const label = makeEl("label", t("share.visit.label"));
      const field = makeEl("input");
      field.type = "text";
      field.autocomplete = "off";
      field.placeholder = t("share.visit.placeholder");
      field.value = draft;
      field.addEventListener("input", () => { draft = field.value; });
      const go = () => {
        const code = codeFromText(field.value);
        if (!code || !viewFromCode(code)) { note = t("share.visit.invalid"); rerender(); return; }
        note = ""; draft = "";
        Panels.close("menu");     // closes the Menu first: a visit can only start when nothing is open
        Visits.visitCode(code);
      };
      field.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
      label.append(field);
      box.append(label);

      const row = makeEl("div", null, "options");
      row.append(button(t("share.visit.go"), go));
      box.append(row);

      if (note) {
        const msg = makeEl("p", note, "menu-sub");
        msg.setAttribute("role", "alert");
        box.append(msg);
      }

      const n = state.social.visited.length;
      if (n > 0) box.append(makeEl("p", t("share.visited", { n }), "menu-sub"));
    });
  },
};
