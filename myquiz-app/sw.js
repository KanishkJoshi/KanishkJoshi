/* MY QUIZ service worker: works offline after the first visit.
 * - App shell: stale-while-revalidate (instant load, refreshed in the background).
 * - /data/*.json content: network first so new current affairs appear, cache when offline.
 * - Google Fonts: cache first.
 * Bump CACHE when shipping breaking changes to force a clean cache. */
const CACHE = 'myquiz-v2';
const SHELL = ['./', './index.html', './app.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png',
  './data/questions.json', './data/news.json', './data/days.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.includes('/data/')) {
    e.respondWith(fetch(req).then(res => put(req, res)).catch(() => caches.match(req)));
  } else if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => put(req, res)).catch(() => hit);
      return hit || net;
    }));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res))));
  }
});
