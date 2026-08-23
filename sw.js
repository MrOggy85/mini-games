const CACHE_NAME = 'mini-games-v10';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/games/memory/',
  '/games/memory/index.html',
  '/games/memory/manifest.json',
  '/games/sliding-puzzle/',
  '/games/sliding-puzzle/index.html',
  '/games/sliding-puzzle/manifest.json',
  '/games/glide/',
  '/games/glide/index.html',
  '/games/glide/manifest.json',
  '/games/sliding-puzzle/favicon.svg',
  '/games/trace/',
  '/games/trace/index.html',
  '/games/trace/manifest.json',
  '/games/vantage/',
  '/games/vantage/index.html',
  '/games/vantage/manifest.json',
  '/games/sudoku/',
  '/games/sudoku/index.html',
  '/games/sudoku/manifest.json',
  '/games/guide-the-way/',
  '/games/guide-the-way/index.html',
  '/games/guide-the-way/manifest.json',
  '/games/sequence/',
  '/games/sequence/index.html',
  '/games/sequence/manifest.json',
  '/games/warehouse-keeper/',
  '/games/warehouse-keeper/index.html',
  '/games/warehouse-keeper/manifest.json',
  '/games/circuits/',
  '/games/circuits/index.html',
  '/games/circuits/manifest.json',
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
