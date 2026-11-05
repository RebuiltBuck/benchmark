// Benchmark offline support. Bump VERSION with each new build.
const VERSION = 'benchmark-v18';
const SHELL = ['./', './index.html', './zxing.min.js', './foods-usda.txt', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.hostname.endsWith('openfoodfacts.org')) return; // always live
  if (u.origin === location.origin) {
    // The page itself: always try the network first so updates show on the next open; use the saved copy offline.
    if (req.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html')) {
      e.respondWith(fetch(req, { cache: 'no-store' }).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put('./index.html', r.clone())); return r; }).catch(() => caches.match('./index.html', { ignoreSearch: true }).then(h => h || caches.match('./'))));
      return;
    }
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION + '-fonts').then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r;
    }));
  }
});
