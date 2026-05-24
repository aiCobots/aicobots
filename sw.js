// ⚡ DopaMind ServiceWorker — Offline + PWA Cache
const CACHE = 'dopamind-v2';

// GitHub Pages पर base path auto-detect होगा
const BASE = self.location.pathname.replace('/sw.js', '');

const LOCAL_FILES = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icon.png',
];

const CDN_FILES = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
];

// ── INSTALL: सब cache करो ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Local files — must cache
      try { await cache.addAll(LOCAL_FILES); } catch(err) {
        // Try one by one if batch fails
        for(const url of LOCAL_FILES){
          try { await cache.add(url); } catch(e2) {}
        }
      }
      // CDN files — best effort
      for(const url of CDN_FILES){
        try {
          const r = await fetch(url, {mode:'cors'});
          if(r.ok) await cache.put(url, r);
        } catch(e) {}
      }
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: पुराने cache हटाओ ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache First, Network fallback ──
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  if(!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;

      return fetch(e.request).then(response => {
        if(response && response.ok){
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — navigation requests को index.html दो
        if(e.request.mode === 'navigate'){
          return caches.match(BASE + '/index.html') ||
                 caches.match(BASE + '/');
        }
      });
    })
  );
});
