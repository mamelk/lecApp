/* lecApp service worker — makes the app installable and usable offline.
   - navigation (HTML): network first, falls back to the cached shell
   - build assets (hashed): cache first, they never change name
   - cross-origin requests (Firestore, Auth): ignored, handled by the SDK */

const CACHE_NAME = 'lecapp-v7';

// Assets the launcher needs to draw the app icon in the device's app list:
// the manifest plus every icon, cached at install time so the logo resolves
// even on the first offline launch after installation.
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon.svg',
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

// Push notifications (FCM Web Push): display in the system notification
// panel even when the app is closed. The payload comes from the Cloud
// Function triggered on mass creation (see functions/index.js).
//
// Data-only message (no `notification` block) so this service worker alone
// decides when to display something: FCM would otherwise auto-display the
// notification even though the open app already showed its own.
self.addEventListener('push', (event) => {
  const payload = { title: 'lecApp', body: 'Nouvelle messe programmée', url: '/', massId: null };
  try {
    const data = event.data ? event.data.json() : null;
    // FCM wraps a data-only message as { data: {...}, from, fcmMessageId }.
    const raw = (data && data.data) || data || {};
    const notification = (data && data.notification) || {};
    payload.title = raw.title || notification.title || payload.title;
    payload.body = raw.body || notification.body || payload.body;
    payload.url = raw.url || notification.url || payload.url;
    payload.massId = raw.massId || raw.mass_id || null;
  } catch (e) {
    // Non-JSON payload: keep the defaults.
  }

  event.waitUntil(
    (async () => {
      // App visible au premier plan : le snapshot Firestore a déjà affiché
      // l'alerte, on n'ajoute pas une seconde notification système.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.some((client) => client.visibilityState === 'visible' || client.focused)) return;

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: payload.massId ? `mass-${payload.massId}` : 'lecapp-mass',
        renotify: true,
        data: { url: payload.url },
      });
    })(),
  );
});

// Tapping the notification opens (or focuses) the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
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