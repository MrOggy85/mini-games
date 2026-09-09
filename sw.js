const CACHE_NAME = 'mini-games-v18';
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
];
const ICONS = ['icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/games/sliding-puzzle/favicon.svg',
  // Shared three.js engine — three.module.min.js imports three.core.min.js,
  // so both must be cached or the 3D games break offline.
  '/vendor/three.module.min.js',
  '/vendor/three.core.min.js',
  ...ICONS.map((i) => `/${i}`),
  ...GAMES.flatMap((g) => [
    `/games/${g}/`,
    `/games/${g}/index.html`,
    `/games/${g}/manifest.json`,
    ...ICONS.map((i) => `/games/${g}/${i}`),
  ]),
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
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

self.addEventListener('fetch', (e) => {
  // Network-first for HTML navigation requests so users always get the latest version.
  // Falls back to cache when offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for all other assets.
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
