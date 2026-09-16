// Offline-capable, but update-first.
//
// Those two goals pull against each other, so they are split by request type:
//   - Navigations go to the network first. Every page here is a self-contained
//     single HTML file, so the page IS the app: a fresh navigation response is a
//     fresh game. A timeout falls back to cache so a bad connection can't hang
//     the splash screen.
//   - Everything else answers from cache immediately and refreshes in the
//     background, so /vendor/ and the icons pick up a deploy on the next launch
//     instead of sitting stale until someone remembers to bump CACHE_NAME.
//
// CACHE_NAME still needs bumping when the asset LIST changes (a new game, a new
// icon); it is no longer the only thing that makes existing files update.
const CACHE_NAME = 'mini-games-v24';

// How long a navigation waits for the network before painting from cache. The
// response still lands in the cache when it eventually arrives.
const NAV_TIMEOUT = 4000;

// Every page has: dir, index.html, manifest.json, icon.svg, apple-touch-icon.png,
// icon-192.png, icon-512.png
const GAMES = [
  'memory',
  'sliding-puzzle',
  'glide',
  'trace',
  'vantage',
  'sudoku',
  'guide-the-way',
  'sequence',
  'warehouse-keeper',
  'circuits',
  'flag-quiz',
  'unblock-me',
];
const ICONS = ['icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

// Without these the app cannot start offline at all, so a failure here should
// fail the install and leave the working previous version in place.
const CORE = [
  '/',
  '/index.html',
  // Shared three.js engine — three.module.min.js imports three.core.min.js,
  // so both must be cached or the 3D games break offline.
  '/vendor/three.module.min.js',
  '/vendor/three.core.min.js',
];

// Best-effort. cache.addAll() is all-or-nothing, so one 404 in here used to abort
// the entire install: the new worker never activated, the old cache was never
// purged, and the device stayed pinned to the previous deploy with no error
// anywhere. Cached one at a time instead, so a missing icon costs that icon only.
const EXTRA = [
  '/manifest.json',
  '/games/sliding-puzzle/favicon.svg',
  ...ICONS.map((i) => `/${i}`),
  ...GAMES.flatMap((g) => [
    `/games/${g}/`,
    `/games/${g}/index.html`,
    `/games/${g}/manifest.json`,
    ...ICONS.map((i) => `/games/${g}/${i}`),
  ]),
];

// An install is the one moment we know we want the bytes that were just
// deployed, so bypass the HTTP cache rather than trust whatever it still holds.
const fresh = (u) => new Request(u, { cache: 'reload' });

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE.map(fresh));
    await Promise.allSettled(EXTRA.map((u) => cache.add(fresh(u))));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// URLs this worker instance has already refreshed. A service worker is torn down
// once it goes idle, so the set resets roughly per app launch — one revalidation
// pass per session, not one per request.
const revalidated = new Set();

self.addEventListener('fetch', (e) => {
  // Cross-origin (the Sweden tile) and non-GET are none of our business — let
  // the browser handle them so they never touch the cache.
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(e.request.mode === 'navigate' ? navigate(e) : asset(e));
});

// ignoreVary because entries are written by two different code paths (install's
// plain GET, and a real navigation) whose headers differ; without it a Vary on
// the response can make a perfectly good cached page invisible offline.
const MATCH = { ignoreVary: true };

async function navigate(e) {
  const cache = await caches.open(CACHE_NAME);
  const net = fetch(e.request)
    .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
    .catch(() => null);
  e.waitUntil(net);

  const cached = await cache.match(e.request, MATCH);
  const res = cached
    ? await Promise.race([net, new Promise((r) => setTimeout(() => r(null), NAV_TIMEOUT))])
    : await net;

  // A 5xx, or a captive portal's interception page, must not displace a page we
  // already have a good copy of.
  if (res && res.ok) return res;
  return cached || res || Response.error();
}

async function asset(e) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(e.request, MATCH);

  if (cached && revalidated.has(e.request.url)) return cached;
  revalidated.add(e.request.url);

  const net = fetch(e.request)
    .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
    .catch(() => null);

  if (!cached) return (await net) || Response.error();
  // Answer from cache now; take the update for next launch.
  e.waitUntil(net);
  return cached;
}
