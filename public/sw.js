/* lecApp service worker — makes the app installable and usable offline.
   - navigation (HTML): network first, falls back to the cached shell
   - build assets (hashed): cache first, they never change name
   - cross-origin requests (Firestore, Auth): ignored, handled by the SDK */

const CACHE_NAME = 'lecapp-v2';

// Assets the launcher needs to draw the app icon in the device's app list:
// the manifest plus every icon, cached at install time so the logo resolves
// even on the first offline launch after installation.
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((store) => store.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
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