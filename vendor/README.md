# vendor/

Third-party libraries checked in so the site works fully offline (a CDN would
break the PWA). Not hand-edited — regenerate with `make vendor`.

- `three.module.min.js` + `three.core.min.js` — three.js `0.186.0`, MIT
  (`three.LICENSE`). `three.module.min.js` imports `./three.core.min.js`, so
  both files must sit in this directory and both must be cached by `/sw.js`.

These two are **not** upstream's minified builds: three stopped publishing any
`.min.js` in r186, so `make vendor` minifies `build/three.module.js` and
`build/three.core.js` itself via `tools/vendor-three.mjs`. That script also
rewrites the `./three.core.js` import to match the `.min.js` filename, and
downlevels to `safari15` so the ES2022 class static blocks introduced in r184
don't break older iPads. Shipping the raw builds instead would take the engine
from 194 KB to 419 KB gzipped, on the critical path of the offline install.

Import from a game with an absolute path:

```js
import * as THREE from '/vendor/three.module.min.js';
```
