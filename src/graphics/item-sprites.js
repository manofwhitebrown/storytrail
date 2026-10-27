// item-sprites.js - each keepsake as an 8x8 grid of boxes. Letters are colors (see PALETTE in blocks.js).
// An item with no sprite here is drawn as a little gift box. A real picture (media/images) wins over both.

import { Assets } from "../core/assets.js";
import { sprite } from "./blocks.js";

const S = {
  "wind-chime":    [".nnnnnn.", "k..kk..k", "l..kk..l", "l.l..l.l", "l.l..l.l", "..l..l..", "........", "........"],
  "paper-lantern": ["...kk...", "..oooo..", ".orooro.", ".oyyyyo.", ".oyyyyo.", ".orooro.", "..oooo..", "...kk..."],
  "tiny-bell":     ["...kk...", "..yyyy..", ".yyyyyy.", ".yyyyyy.", ".yyyyyy.", "yyyyyyyy", "...kk...", "........"],
  "star-lantern":  ["...yy...", "...yy...", ".yyyyyy.", "yyywwyyy", "yyywwyyy", ".yyyyyy.", "...yy...", "..y..y.."],
  "patchwork-rug": ["........", "........", "rryybbgg", "ooryvbbg", "yyrrggbb", "vvooyygg", "bbvvroyy", "........"],
  "cactus-pot":    ["...gg...", "g..gg...", "g.dgg.g.", "gggdgggg", "..gdg...", "..gdg...", ".nnnnnn.", "..nnnn.."],
  "river-stone":   ["........", "........", "..mmmm..", ".mssssm.", "mssssssm", "mssssssm", ".mmmmmm.", "........"],
  "tin-mug":       ["........", ".mmmmmm.", ".mwwwwmm", ".mmmmm.m", ".mmmmm.m", ".mmmmmmm", ".mmmmmm.", "........"],
  "seashell":      ["...pp...", "..pttp..", ".ptttpp.", "pttpttp.", "pttttttp", ".pttttp.", "..pppp..", "........"],
  "flower-frame":  ["nnnnnnnn", "nwwwwwwn", "nwpwgwwn", "nwgpgwwn", "nwwgwpwn", "nwwwgwwn", "nwwwwwwn", "nnnnnnnn"],
  "feather":       ["......ww", ".....www", "....wwwm", "...wwwm.", "..wwwm..", ".kwwm...", "kwwm....", "k......."],
  "lavender":      ["..v..v..", ".vvv.vv.", "..v.vvv.", ".vvv.v..", "..v.vvv.", "..g.g...", "..gg....", "..gg...."],
  "map-scrap":     ["tttttt..", "tkttrtt.", "ttkkttt.", "tttktkt.", "tkttttt.", "ttrtkkt.", "tttttt..", "........"],
  "sun-stone":     ["...oo...", "..oyyo..", ".oyyyyo.", "oyywwyyo", "oyyyyyyo", ".oyyyyo.", "..oooo..", "........"],
  "acorn":         ["...nn...", ".nnnnnn.", "nnnnnnnn", "tttttttt", ".tttttt.", ".tttttt.", "..tttt..", "...tt..."],
  "snow-globe":    ["..llll..", ".lwlwwl.", "lwwwlwwl", "llllllll", ".nnnnnn.", "nnnnnnnn", "........", "........"],
  "blossom-jar":   [".nnnnnn.", "..wwww..", ".wppppw.", ".wpppwp.", ".wppppw.", ".wpwppw.", ".wwwwww.", "........"],
  "sun-bottle":    ["...nn...", "...ww...", "..wyyw..", ".wyyyyw.", ".wyoyyw.", ".wyyyyw.", ".wwwwww.", "........"],
  "leaf-garland":  ["kkkkkkkk", "r..o..rk", "rr.oo.rr", "r..o..r.", "........", "........", "........", "........"],
  "frost-lantern": ["...ll...", "..lwwl..", ".lwwwwl.", ".lwllwl.", ".lwllwl.", ".lwwwwl.", "..lwwl..", "...ll..."],
  "wandering-compass": [".mmmmmm.", "mwwkwwwm", "mwwkkwwm", "mwrrkwwm", "mwwrrwwm", "mwwwrwwm", ".mmmmmm.", "........"],
  "firefly-jar":   ["..nnnn..", ".llllll.", "l..y...l", "l.y..y.l", "l...y..l", "l.y....l", "llllllll", "........"],
  "woven-basket":  ["..tttt..", ".t....t.", "t......t", "tntntntn", "ntntntnt", "tntntntn", "ntntntnt", ".tttttt."],
  "storm-lantern": ["...ss...", "..ssss..", ".syyyys.", ".syyyys.", ".syoyys.", ".syyyys.", ".ssssss.", "..ssss.."],
  "tea-tin":       ["........", "rrrrrrrr", "rwwwwwwr", "rwoowwwr", "rwwwwwwr", "rwwwwwwr", "rrrrrrrr", "........"],
  "paper-boat":    ["........", "...w....", "..www...", "..wwww..", "wwwwwwww", ".wwwwww.", "..bbbb..", "bbbbbbbb"],
};
const GIFT = ["...pp.pp", "....pp..", "bbbbbbbb", "bbbppbbb", "bbbppbbb", "bbbppbbb", "bbbppbbb", "bbbbbbbb"];

export const ItemSprites = {
  ids: () => Object.keys(S),
  rows: (id) => S[id] || GIFT,

  // Draws the item centered on (cx, cy), about 32px wide. Returns true when it drew something.
  draw(ctx, item, cx, cy, unit = 4) {
    const rows = this.rows(item.id);
    const size = rows.length * unit;
    if (Assets.draw(ctx, `item-${item.id}`, cx, cy + size / 2, size)) return true;
    sprite(ctx, rows, cx - size / 2, cy - size / 2, unit);
    return true;
  },
};
