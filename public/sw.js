const CACHE_NAME = 'typingverse-v2';
const STATIC_ASSETS = [
  '/',
  '/practice/',
  '/game/',
  '/test/',
  '/stats/',
  '/settings/',
  '/ranking/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests - Cache API does not support HEAD/POST
  if (event.request.method !== 'GET') return;

  // Don't cache _next/static chunks - they change every build
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Network-first for navigation, cache-first for assets
      if (event.request.mode === 'navigate') {
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached || caches.match('/'));
      }

      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('/'));
    })
  );
});
