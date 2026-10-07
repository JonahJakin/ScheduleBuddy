/* ScheduleBuddy offline helper.
   Keeps a copy of the app (and its fonts) on the phone so ScheduleBuddy opens with no signal.
   When there IS a connection, the newest version from the website always wins. */
const CACHE = 'schedulebuddy-app-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(c => c.add(new Request('./', { cache: 'reload' }))).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function saveCopy(request, response) {
  if (response && (response.ok || response.type === 'opaque')) {
    const copy = response.clone();
    caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app itself: try the internet first (4 second limit), fall back to the saved copy.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const saved = (await caches.match(req, { ignoreSearch: true })) || (await caches.match('./'));
      try {
        const fresh = await Promise.race([
          fetch(req),
          new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), saved ? 4000 : 30000))
        ]);
        return saveCopy(req, fresh);
      } catch (e) {
        if (saved) return saved;
        throw e;
      }
    })());
    return;
  }

  // Fonts: use the saved copy if there is one, otherwise fetch and keep it.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => saveCopy(req, res)))
    );
  }
});
