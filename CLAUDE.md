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
