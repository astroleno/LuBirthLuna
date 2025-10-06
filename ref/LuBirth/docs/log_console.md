[plugin:vite:import-analysis] Failed to resolve import "../utils/textureLoader" from "src/scenes/simple/api/components/Earth.tsx". Does the file exist?
/Users/zuobowen/Documents/GitHub/LuBirth/src/scenes/simple/api/components/Earth.tsx:3:33
18 |  import { useMemo, useEffect } from "react";
19 |  import * as THREE from "three";
20 |  import { useTextureLoader } from "../utils/textureLoader";
   |                                    ^
21 |  export function Earth({
22 |    position,
    at TransformPluginContext._formatError (file:///Users/zuobowen/Documents/GitHub/LuBirth/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49258:41)
    at TransformPluginContext.error (file:///Users/zuobowen/Documents/GitHub/LuBirth/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49253:16)
    at normalizeUrl (file:///Users/zuobowen/Documents/GitHub/LuBirth/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:64291:23)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async file:///Users/zuobowen/Documents/GitHub/LuBirth/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:64423:39
    at async Promise.all (index 5)
    at async TransformPluginContext.transform (file:///Users/zuobowen/Documents/GitHub/LuBirth/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:64350:7)
    at async PluginContainer.transform (file:///Users/zuobowen/Documents/GitHub/LuBirth/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49099:18)
    at async loadAndTransform (file:///Users/zuobowen/Documents/GitHub/LuBirth/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:51977:27
Click outside, press Esc key, or fix the code to dismiss.
You can also disable this overlay by setting server.hmr.overlay to false in vite.config.ts.