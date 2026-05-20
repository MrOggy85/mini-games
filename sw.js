const CACHE_NAME = 'mini-games-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/games/memory/',
  '/games/memory/index.html',
  '/games/sliding-puzzle/',
  '/games/sliding-puzzle/index.html',
  '/games/sliding-puzzle/favicon.svg',
  '/games/sudoku/',
  '/games/sudoku/index.html',
  '/games/sudoku/manifest.json',
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
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
