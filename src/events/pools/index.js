// index.js - which pool of events belongs to which place.

import callbacks from "./callback-events.js";
import coast from "./coast-events.js";
import common from "./common-events.js";
import desert from "./desert-events.js";
import forest from "./forest-events.js";
import meadow from "./meadow-events.js";
import mountains from "./mountain-events.js";
import rare from "./rare-events.js";
import snowfields from "./snowfield-events.js";

export const BY_BIOME = { forest, meadow, mountains, snowfields, desert, coast };
export { callbacks, common, rare };
