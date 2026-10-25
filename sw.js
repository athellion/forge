// The Forge – offline support.
// The app's own files are kept on the device so it opens without a connection. The page itself is
// fetched fresh whenever there is a connection (so updates arrive by themselves) and falls back to
// the saved copy when there isn't. Your data is NOT here: it lives in the app's own storage (IndexedDB)
// and is never touched by updates.
const CACHE = 'forge-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './seed-foods.json',
  './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './fonts/big-shoulders-display-latin-600-normal.woff2', './fonts/big-shoulders-display-latin-700-normal.woff2', './fonts/big-shoulders-display-latin-800-normal.woff2',
  './fonts/ibm-plex-sans-latin-400-normal.woff2', './fonts/ibm-plex-sans-latin-500-normal.woff2', './fonts/ibm-plex-sans-latin-600-normal.woff2',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    // fresh page when online (with a short wait), saved page when offline
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
        if (res.ok) cache.put('./index.html', res.clone());
        return res;
      } catch (err) { return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error(); }
    })());
    return;
  }
  // Everything else (fonts, icons, the Excel library from cdnjs): saved copy first, then the network.
  if (url.origin === self.location.origin || url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
