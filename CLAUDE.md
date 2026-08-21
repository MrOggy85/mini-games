# Mini Games

A collection of browser-based mini games served as a single Cloudflare Workers site.

## Project Structure

- `/index.html` — portal page listing all games
- `/games/<name>/index.html` — each game is a self-contained single HTML file
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
- Each game is a **self-contained single HTML file** (no external JS/CSS dependencies), so the service worker only needs to cache the HTML files and manifests
- When adding a new game:
  1. Create `/games/<name>/manifest.json`
  2. Add the game's paths to the `ASSETS` array in `/sw.js`
  3. Bump the `CACHE_NAME` version in `/sw.js`

## Portal Page

The root `index.html` is the portal/index that links to all games. When a new game is added, its link must be added here.

## Juice Toolkit

`/templates/juice.js` is a small, dependency-free set of "game feel" helpers (spring easing, squash & stretch, screen shake, particle burst). It is **not loaded by any game** — it exists purely as a copy-paste source, consistent with the self-contained-single-file rule above. `.assetsignore` excludes `/templates/` from deployment.

When a game would benefit from more tactile/alive feedback (a piece landing, an invalid move, a piece being cleared), open `/templates/juice.js`, copy only the function(s) needed, and paste them directly into that game's `<script>` block rather than reaching for an external animation/physics library.

- `juiceSquash(el, opts)` — squash & stretch scale pulse, e.g. for "landed" or "placed correctly" feedback
- `juiceShake(el, opts)` — brief shake, e.g. for an invalid move or collision
- `juiceBurst(x, y, colors, opts)` — small particle burst at a viewport position, e.g. for a piece being cleared/collected
- `juiceSpring(from, to, onUpdate, opts)` — damped-spring value animation for anything driven by a changing target (e.g. drag-to-target, follow)

All four use only the Web Animations API and `requestAnimationFrame` — no build step, no external assets. See `games/glide/index.html` for a working example (squash on a landed block, shake on a stuck block, burst when a block exits the board).
