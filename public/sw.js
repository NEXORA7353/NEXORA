const CACHE_NAME = 'nexora-v15';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/app.js',
  '/admin.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install Event - Skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// Activate Event - Purge ALL old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Includes Client-Side SW Proxy Header Stripping Engine (/sw-proxy)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. CLIENT-SIDE SERVICE WORKER PROXY ENGINE (/sw-proxy?url=...)
  if (url.pathname === '/sw-proxy' || url.pathname === '/client-proxy') {
    const targetUrlParam = url.searchParams.get('url');
    if (!targetUrlParam) {
      event.respondWith(new Response('Missing target URL', { status: 400 }));
      return;
    }

    let targetUrl = decodeURIComponent(targetUrlParam);
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    event.respondWith(handleSwProxyRequest(targetUrl, request));
    return;
  }

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Network First for HTML & JS to ensure instant code updates
  if (request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(request).then((cached) => cached || caches.match('/index.html'));
      })
    );
    return;
  }

  // Cache First for static images & CSS
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request);
    })
  );
});

// CLIENT-SIDE PROXY ENGINE FUNCTION (Runs inside User Device Browser Memory)
async function handleSwProxyRequest(targetUrl, originalRequest) {
  try {
    const targetOrigin = new URL(targetUrl).origin;

    // Fetch directly from User's Device Browser IP (Bypasses Cloudflare Datacenter 403 WAF blocks!)
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
      },
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || '';

    // Create sanitized headers (Strip X-Frame-Options & CSP locally in device memory!)
    const cleanHeaders = new Headers();
    for (const [key, val] of response.headers.entries()) {
      const lower = key.toLowerCase();
      if (
        lower !== 'x-frame-options' &&
        lower !== 'content-security-policy' &&
        lower !== 'content-security-policy-report-only' &&
        lower !== 'frame-options' &&
        lower !== 'x-content-type-options'
      ) {
        cleanHeaders.set(key, val);
      }
    }
    cleanHeaders.set('Access-Control-Allow-Origin', '*');

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Anti-Framebuster Injection
      const scriptInjection = `
        <script>
          (function() {
            var PROXY_PREFIX = '/sw-proxy?url=';
            try {
              Object.defineProperty(window, 'top', { get: function() { return window.self; }, set: function() {} });
              Object.defineProperty(window, 'parent', { get: function() { return window.self; }, set: function() {} });
            } catch(e) {}

            try {
              var origWindowOpen = window.open;
              window.open = function(url) {
                if (url && typeof url === 'string') {
                  var full = new URL(url, window.location.href).href;
                  if (!full.includes(PROXY_PREFIX)) {
                    window.location.href = PROXY_PREFIX + encodeURIComponent(full);
                    return window;
                  }
                }
                return origWindowOpen ? origWindowOpen.apply(window, arguments) : null;
              };
            } catch(e) {}
          })();
        </script>
      `;

      html = html
        .replace(/top\.location\s*=/gi, 'window.self.location =')
        .replace(/parent\.location\s*=/gi, 'window.self.location =')
        .replace(/window\.top\s*!==\s*window\.self/gi, 'false')
        .replace(/self\s*!==\s*top/gi, 'false')
        .replace(/target=["']?(_top|_parent|_blank)["']?/gi, 'target="_self"')
        .replace(/<base[^>]*target=["']?[^"'>]+["']?[^>]*>/gi, '');

      const baseTag = `<base href="${targetOrigin}/">`;
      const headContent = baseTag + scriptInjection;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, match => match + headContent);
      } else {
        html = headContent + html;
      }

      cleanHeaders.set('Content-Type', 'text/html; charset=utf-8');

      return new Response(html, {
        status: 200,
        headers: cleanHeaders
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: cleanHeaders
    });
  } catch (err) {
    // If direct fetch fails due to CORS, fallback to edge proxy
    return fetch(`/proxy?url=${encodeURIComponent(targetUrl)}`);
  }
}
