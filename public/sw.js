// Saving Vision Service Worker (Offline Fallback Read-Only Data & Asset Cache)
const CACHE_NAME = 'saving-vision-v2';
const STATIC_ASSETS = [
  '/',
  '/banks',
  '/history',
  '/profile',
  '/receivables',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for offline fallback
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSupabaseApi = url.hostname.includes('supabase.co');

  if (isSupabaseApi) {
    // Network-first with Cache fallback for Supabase REST API GET queries
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return 504 Gateway Timeout fallback for offline API query cache-miss
          return new Response(
            JSON.stringify({ message: 'Offline - Data belum pernah di-cache' }),
            {
              status: 504,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
  } else {
    // Stale-while-revalidate for static assets & pages
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
