// Edzésnapló service worker — az app offline is elindul.
// Stratégia: a tárolt verziót adja azonnal, közben a háttérben letölti az újat;
// ha változott, szól az appnak ("Új verzió érhető el").
const CACHE = 'edzesnaplo-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // fájlonként cache-el: ha egy ikon hiányzik, attól még az app offline működik
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function notifyUpdate() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(c => c.postMessage({ type: 'updated' }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  const isPage = req.mode === 'navigate';
  const key = isPage ? new URL('./index.html', self.location).href : req;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key, { ignoreSearch: isPage });
    const network = fetch(req).then(async res => {
      if (res && (res.ok || res.type === 'opaque')) {
        if (cached && isPage) {
          const oldTag = cached.headers.get('etag') || cached.headers.get('last-modified');
          const newTag = res.headers.get('etag') || res.headers.get('last-modified');
          if (oldTag && newTag && oldTag !== newTag) notifyUpdate();
        }
        await cache.put(key, res.clone());
      }
      return res;
    }).catch(() => null);

    if (cached) { e.waitUntil(network); return cached; }
    const res = await network;
    return res || new Response('Offline — nyisd meg egyszer interneten is.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
