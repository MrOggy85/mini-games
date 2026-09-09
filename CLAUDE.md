# Mini Games

A collection of browser-based mini games served as a single Cloudflare Workers site.

## Project Structure

- `/index.html` — portal page listing all games
- `/games/<name>/index.html` — each game is a self-contained single HTML file
- `/vendor/` — checked-in third-party libraries shared by all games (see **3D / three.js**)
- `/wrangler.jsonc` — Cloudflare Workers config, serves `./` as asset root

## Game Conventions

Every game page must include:

- A **back link** to the portal at the top of the page: `<a href="/" class="back-link">&larr; All Games</a>`
  - Styled as subtle gray text, top-left aligned, turns blue on hover
- When adding a new game, also add a link to it on the portal page (`/index.html`) in the `.games` div

## Target Devices

Games are designed for **iPad and iPhone**. All UI must be touch-friendly with appropriately sized tap targets.

## Color & Contrast

Games use dark, near-black backgrounds, but must still be playable outdoors or on a dimmed screen.

- Don't pick two colors that are both very dark and close in lightness (e.g. a background of `#09091a` next to a board/tile color of `#0f0f20`) — on a dimmed tablet screen these read as identical.
- Board/tile surfaces, borders, and label text need a real lightness jump from the background — aim for a contrast ratio of at least 3:1 (check with a contrast calculator), not just a "looks fine on a bright monitor" difference.
- Bright accent colors (path lines, markers, highlights) are usually fine as-is since they already contrast strongly against dark backgrounds — the recurring mistake is dark-gray-on-black neutrals blending together.

## PWA / Offline Support

The site must work as a PWA ("Add to Home Screen") and function fully offline. Each game can be independently added to the home screen.

- `/sw.js` — global service worker at the project root, caches all game assets for offline use
- `/manifest.json` — manifest for the portal page
- `/games/<name>/manifest.json` — each game has its own manifest (own name, start_url, theme_color)
- Each HTML page must include:
  - `<link rel="manifest" href="...">` pointing to its own manifest (use absolute paths, e.g. `/games/memory/manifest.json`)
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - Service worker registration: `navigator.serviceWorker.register('/sw.js')`
  - `<link rel="icon" href=".../icon.svg" type="image/svg+xml">` and `<link rel="apple-touch-icon" href=".../apple-touch-icon.png">`
- Each game is a **self-contained single HTML file** — no per-game JS/CSS files. The only permitted external dependency is a shared library under `/vendor/` (see **3D / three.js**), which every game imports from the same path so the browser caches one copy
- Non-`games/` paths are only deployed if whitelisted in `.assetsignore` — root-level assets need an explicit `!` entry there, or they 404 and break the service worker install
- When adding a new game:
  1. Create `/games/<name>/manifest.json`
  2. Create `/games/<name>/icon.svg`, then run `make icons`
  3. Add the game's paths to the `GAMES` array in `/sw.js`
  4. Bump the `CACHE_NAME` version in `/sw.js`

### Icons

Each page has a full-bleed `icon.svg` (the source of truth) plus three generated PNGs:
`apple-touch-icon.png` (180, iOS home screen), `icon-192.png` and `icon-512.png` (manifest).

- **iOS ignores SVG `apple-touch-icon`s** — the PNGs are required for a home screen icon to appear at all
- Regenerate with `make icons` after editing any `icon.svg`; never hand-edit the PNGs
- `icon.svg` must be full-bleed (background rect covering all of `0 0 100 100`, no rounded corners) — iOS applies its own mask
- Don't use `<text>` in `icon.svg`; the renderer has no fonts, and system font stacks aren't portable. Use paths
- Icons aren't declared `purpose: "maskable"`: artwork extends to ~10% of the edge, which Android's circular safe zone would clip

## 3D / three.js

Games are being moved to three.js for an extruded, depth-lit board look (issue #63).
Converted so far: `glide`, `trace`, `guide-the-way`, `warehouse-keeper`.
`games/glide/index.html` is the reference implementation; `trace` additionally shows a
variable-size board, per-instance tile colours and a swept path tube; `guide-the-way`
shows a full-viewport animated environment behind a board framed into a DOM-defined
slot; `warehouse-keeper` adds procedural canvas textures, an env-mapped glossy board
and a fogged landscape; `circuits` adds instanced beads and lightning bolts driven off
a BFS over the puzzle graph.

Each game keeps its own palette — the 3D treatment is a rendering change, not a
re-theme. `glide`/`trace` stay dark and neon; `guide-the-way` stays bright and
playful, so it uses a lighter light rig and pastel surfaces.

three.js is **vendored, not loaded from a CDN** — a CDN request breaks offline play:

- `/vendor/three.module.min.js` + `/vendor/three.core.min.js` (the module build imports the
  core build by relative path, so both files must exist and both must be in `sw.js`)
- Import with an absolute path: `import * as THREE from '/vendor/three.module.min.js';`
  inside a `<script type="module">`
- Refresh with `make vendor` (bump `THREE_VERSION` in the `Makefile`); never hand-edit `vendor/`
- Only the core module is vendored — nothing from `three/examples/`. Anything from `addons`
  (`RoundedBoxGeometry`, `OrbitControls`, postprocessing) has to be written by hand instead.
  Rounded/beveled solids come from `ExtrudeGeometry` over a rounded-rect `Shape`.

Conventions for a 3D game:

- **Keep the grid axis-aligned on screen.** Tilt the camera down with no yaw rather than using a
  true 45° isometric view: rows/columns stay mapped to screen up/down/left/right, and a square
  board still fits a portrait phone (a rotated board becomes a wide, short diamond).
- **Pick the tilt from how tall the pieces are.** A piece of height `h` hides `h / tan(pitch)`
  of board behind it. ~50° suits flat boards (`glide`, `trace`); a game with things standing on
  the cells needs to go shallower — `guide-the-way` uses 64°, where a 0.5-tall wall costs 0.24
  of a cell instead of 0.4.
- Low-FOV `PerspectiveCamera` (~26°) placed far back — near-orthographic, with just enough
  convergence to read as 3D.
- **Fit the camera by measuring, not predicting.** An orthographic solve from the board's
  bounding box under-reserves: perspective spreads the near edge of a tilted board outward, which
  crops the corner cells by a few percent. Project the bounding corners, iterate the distance
  until the widest lands just inside NDC ±0.97, and slide the look-at point along the camera's
  own up axis to recentre (a slab's underside and any floating labels push content off-centre).
  Then retighten the canvas aspect to the measured spans. See `fitCamera()` in either game.
- Camera-aligned `Sprite`s occupy a fixed slab of *screen*, so they contribute a screen-space pad
  to the fit rather than a world-space point.
- **Gloss needs an environment map.** Direct lights alone give a hard specular dot on a flat
  diffuse, which doesn't read as shiny. Build a small equirect sky on a canvas, run it through
  `PMREMGenerator`, and set it as `envMap` on the board materials. Assign it per-material rather
  than as `scene.environment` when the background is meant to stay dimmer than the board.
- **Textures need reprojected UVs.** `ExtrudeGeometry` emits UVs in raw shape units, so a map
  lands arbitrarily. Use the `boxUV(geo, worldUnitsPerTile)` helper (in `guide-the-way` and
  `warehouse-keeper`) to reproject each face along its dominant normal. All textures are drawn
  procedurally on a canvas — no external image assets.
- **Instance the scenery.** `warehouse-keeper`'s hills, trees and cloud puffs were ~200 draw
  calls as individual meshes; as four `InstancedMesh`es they're four.
- **Watch the far plane when the scenery is at a fixed depth.** A `far` derived purely from the
  camera distance (`dist * n`) clips the backdrop as soon as a small board pulls the camera in
  close. Fold the backdrop's own drop into it — see `circuits`, which clipped its floor on iPad
  landscape until `far` accounted for `GROUND_Y`.
- Self-lit scenery (neon grids, glowing traces, energy beads) wants `MeshBasicMaterial`, which
  ignores lights and renders the texture at full brightness — cheaper and brighter than trying
  to drive an emissive PBR material, and it still respects fog.
- Budget for iPhone/iPad: `setPixelRatio(Math.min(2, devicePixelRatio))`, one shadow-casting
  `DirectionalLight` at 1024², no postprocessing, `InstancedMesh` for repeated board tiles.
- Tune light intensities so a fully lit top face lands at roughly the material's own color —
  otherwise the **Color & Contrast** rules above can't be checked against a hex value.
- Meshes aren't tappable targets on their own. Give each interactive piece an oversized
  invisible collider (`colorWrite: false`) as a child, and raycast that.
- The HUD, buttons, toasts and win overlay stay as DOM on top of the canvas.

## Portal Page

The root `index.html` is the portal/index that links to all games. When a new game is added, its link must be added here.

## Juice Toolkit

`/templates/juice.js` is a small, dependency-free set of "game feel" helpers (spring easing, squash & stretch, screen shake, particle burst). It is **not loaded by any game** — it exists purely as a copy-paste source, consistent with the self-contained-single-file rule above. `.assetsignore` excludes `/templates/` from deployment.

When a game would benefit from more tactile/alive feedback (a piece landing, an invalid move, a piece being cleared), open `/templates/juice.js`, copy only the function(s) needed, and paste them directly into that game's `<script>` block rather than reaching for an external animation/physics library.

- `juiceSquash(el, opts)` — squash & stretch scale pulse, e.g. for "landed" or "placed correctly" feedback
- `juiceShake(el, opts)` — brief shake, e.g. for an invalid move or collision
- `juiceBurst(x, y, colors, opts)` — small particle burst at a viewport position, e.g. for a piece being cleared/collected
- `juiceSpring(from, to, onUpdate, opts)` — damped-spring value animation for anything driven by a changing target (e.g. drag-to-target, follow)

All four use only the Web Animations API and `requestAnimationFrame` — no build step, no external assets.

In a three.js game these apply to meshes, not DOM elements, so only `juiceBurst` copies over as-is (it spawns DOM particles at a projected screen position). Squash, shake and spring get re-expressed as tweens on `mesh.scale` / `mesh.position` / `camera.position` inside the render loop — see `games/glide/index.html` (squash on a landed block, nudge-and-bounce plus camera shake on a stuck block, `juiceBurst` at the projected position when a block exits the board).
