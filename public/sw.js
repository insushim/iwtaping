const CACHE_NAME = 'typingverse-v23';
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

  const url = new URL(event.request.url);

  // 교차 출처 요청(웹폰트 CDN 등)은 SW가 절대 건드리지 않는다.
  // <link rel=stylesheet>는 no-cors 요청이라 SW 안에서 fetch()하면 opaque 응답이 되고,
  // opaque 응답은 MIME 타입을 읽을 수 없어 브라우저가 "Refused to apply style"로 거부한다.
  // → 첫 페이지 이후 모든 페이지에서 Pretendard·Outfit·JetBrains Mono가 전부 사라졌다(실측).
  if (url.origin !== self.location.origin) {
    return;
  }

  // Don't cache _next/static chunks - they change every build
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    return;
  }

  // API responses must never be served from the SW cache:
  // they are per-user and time-sensitive (rankings, leagues, wallet).
  // Without this, a cache-first fetch handler would pin them forever.
  if (url.pathname.startsWith('/api/')) {
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
