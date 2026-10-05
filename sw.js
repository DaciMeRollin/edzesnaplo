// Edzésnapló service worker — az app offline is elindul.
// A tárolt verziót adja azonnal; a háttérben (indításkor és amikor az app előtérbe kerül)
// a szerverrel ellenőrzi, van-e új verzió, és ha igen, szól az appnak („Új verzió érhető el”).
const CACHE = 'edzesnaplo-feaefb84-2';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png'];
const PAGE = new URL('./index.html', self.location).href;

self.addEventListener('install', e => {
  // cache:'reload' → a böngésző HTTP-gyorsítótárát kikerülve a friss fájlokat tölti le
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => fetch(new Request(u, { cache: 'reload' }))
      .then(r => r.ok ? c.put(u === './' ? PAGE : new URL(u, self.location).href, r) : null).catch(() => null))))
    .then(() => self.skipWaiting()));
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
const tag = r => r && (r.headers.get('etag') || r.headers.get('last-modified'));

async function checkPage() {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(PAGE);
  try {
    const res = await fetch(PAGE, { cache: 'no-cache' });
    if (!res.ok) return;
    if (cached && tag(cached) && tag(res) && tag(cached) !== tag(res)) notifyUpdate();
    await cache.put(PAGE, res.clone());
  } catch (e) { /* offline */ }
}
self.addEventListener('message', e => { if (e.data && e.data.type === 'check') e.waitUntil(checkPage()); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;
  const isPage = req.mode === 'navigate';
  const key = isPage ? PAGE : req;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key, { ignoreSearch: isPage });
    if (isPage) {
      if (cached) { e.waitUntil(checkPage()); return cached; }
      try { const res = await fetch(req, { cache: 'no-cache' }); if (res.ok) await cache.put(PAGE, res.clone()); return res; }
      catch (err) { return new Response('Offline — nyisd meg egyszer interneten is.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
    }
    const network = fetch(req, isFont ? undefined : { cache: 'no-cache' }).then(async res => {
      if (res && (res.ok || res.type === 'opaque')) await cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    return (await network) || new Response('', { status: 504 });
  })());
});
