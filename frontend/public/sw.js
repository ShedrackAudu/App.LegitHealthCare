// Simple Service Worker for PWA Installability
const CACHE_NAME = 'legit-healthcare-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  // Vite assets will have hashes, so we'll rely on a more advanced strategy for production 
  // but for "installability" this simple script is enough to satisfy the browser.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
