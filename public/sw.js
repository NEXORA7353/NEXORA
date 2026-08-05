const CACHE_NAME = 'nexora-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and non-http/https
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Strategy 1: /proxy* -> Network only, do NOT cache or block cross-origin
  if (url.pathname.startsWith('/proxy')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { background: #0a0a0a; color: #ffffff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              p { font-family: monospace; color: #7d8187; font-size: 13px; }
            </style>
          </head>
          <body><p>NEXORA — CONNECTION UNAVAILABLE</p></body>
          </html>
        `, {
          status: 503,
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // Strategy 2: /api/* -> Network first, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ success: false, error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For external third-party requests (e.g., Cloudflare, external CDNs), let browser handle directly
  if (url.origin !== self.location.origin) {
    return;
  }

  // Strategy 3: Local static assets -> Cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('/index.html').then((indexMatch) => {
            if (indexMatch) return indexMatch;
            return new Response('NEXORA — Connection unavailable', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        }
        return new Response('', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});
