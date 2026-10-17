/* lecApp service worker — makes the app installable and usable offline.
   - navigation (HTML): network first, falls back to the cached shell
   - build assets (hashed): cache first, they never change name
   - cross-origin requests (Firestore, Auth): ignored, handled by the SDK */

const CACHE_NAME = 'lecapp-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const cache = caches.open(CACHE_NAME).then((store) => store.put.bind(store));

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          cache.then((put) => put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          const copy = response.clone();
          cache.then((put) => put(request, copy));
          return response;
        }),
    ),
  );
});