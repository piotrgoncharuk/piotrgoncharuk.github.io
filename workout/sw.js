// Service worker: офлайн-режим и кэш приложения.
const VERSION = 'v1.3.0';
const CACHE = `fitpro-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/ui.js',
  './js/charts.js',
  './js/timer.js',
  './js/share.js',
  './js/coach.js',
  './js/ai.js',
  './js/data/exercises.js',
  './js/data/programs.js',
  './js/data/football.js',
  './js/views/home.js',
  './js/views/programs.js',
  './js/views/exercises.js',
  './js/views/workout.js',
  './js/views/history.js',
  './js/views/stats.js',
  './js/views/tools.js',
  './js/views/body.js',
  './js/views/settings.js',
  './js/views/builder.js',
  './js/views/install.js',
  './js/views/more.js',
  './js/views/help.js',
  './js/views/football.js',
  './js/views/profiles.js',
  './js/views/achievements.js',
  './js/views/coach.js',
  './js/views/plan.js',
  './data/videos.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-64.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // видео и внешние ссылки — мимо кэша

  // Навигация: сначала сеть, при отсутствии — кэшированная оболочка
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Остальное: кэш с фоновым обновлением
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
