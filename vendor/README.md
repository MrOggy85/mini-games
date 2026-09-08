# vendor/

Third-party libraries checked in so the site works fully offline (a CDN would
break the PWA). Not hand-edited — regenerate with `make vendor`.

- `three.module.min.js` + `three.core.min.js` — three.js `0.185.1`, MIT
  (`three.LICENSE`). `three.module.min.js` imports `./three.core.min.js`, so
  both files must sit in this directory and both must be cached by `/sw.js`.

Import from a game with an absolute path:

```js
import * as THREE from '/vendor/three.module.min.js';
```
