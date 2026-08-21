const CACHE_NAME = 'mini-games-v10';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/games/memory/',
  '/games/memory/index.html',
  '/games/memory/manifest.json',
  '/games/memory/icon.svg',
  '/games/sliding-puzzle/',
  '/games/sliding-puzzle/index.html',
  '/games/sliding-puzzle/manifest.json',
  '/games/sliding-puzzle/icon.svg',
  '/games/glide/',
  '/games/glide/index.html',
  '/games/glide/manifest.json',
  '/games/glide/icon.svg',
  '/games/sliding-puzzle/favicon.svg',
  '/games/trace/',
  '/games/trace/index.html',
  '/games/trace/manifest.json',
  '/games/trace/icon.svg',
  '/games/vantage/',
  '/games/vantage/index.html',
  '/games/vantage/manifest.json',
  '/games/vantage/icon.svg',
  '/games/sudoku/',
  '/games/sudoku/index.html',
  '/games/sudoku/manifest.json',
  '/games/sudoku/icon.svg',
  '/games/guide-the-way/',
  '/games/guide-the-way/index.html',
  '/games/guide-the-way/manifest.json',
  '/games/guide-the-way/icon.svg',
  '/games/sequence/',
  '/games/sequence/index.html',
  '/games/sequence/manifest.json',
  '/games/sequence/icon.svg',
  '/games/warehouse-keeper/',
  '/games/warehouse-keeper/index.html',
  '/games/warehouse-keeper/manifest.json',
  '/games/warehouse-keeper/icon.svg',
  '/games/circuits/',
  '/games/circuits/index.html',
  '/games/circuits/manifest.json',
  '/games/circuits/icon.svg',
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
