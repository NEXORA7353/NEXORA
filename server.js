/*
Deploy to Railway or Render:
- Set start command: node server.js
- No environment variables needed (PORT auto-set)
- data/apps.json will be created automatically on first run
- For persistent storage on Railway: attach a volume at /data
*/

const express = require('express')
const axios   = require('axios')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = process.env.PORT || 3000
const DATA_FILE = path.join(__dirname, 'data', 'apps.json')

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// Strip Netlify function path prefix if routed via Netlify Functions
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/server')) {
    req.url = req.url.replace('/.netlify/functions/server', '');
    if (!req.url) req.url = '/';
  }
  next();
});

// Dark Theme Error Page HTML
const ERROR_PAGE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #0a0a0a; color: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 100vh; padding: 24px; text-align: center;
    }
    .label {
      font-family: monospace; font-size: 11px;
      text-transform: uppercase; letter-spacing: 1.4px;
      color: #7d8187; margin-bottom: 16px;
    }
    .title { font-size: 18px; color: #ffffff; margin-bottom: 8px; font-weight: 400; }
    .sub   { font-size: 14px; color: #7d8187; font-weight: 400; }
  </style>
</head>
<body>
  <p class="label">NEXORA — CONNECTION ERROR</p>
  <p class="title">Platform unavailable</p>
  <p class="sub">Could not establish connection to this platform.</p>
</body>
</html>`

// Global In-Memory, Netlify Blobs & Upstash Redis Store
let globalAppsStore = null;

let Redis = null;
try {
  Redis = require('@upstash/redis').Redis;
} catch (e) {}

function getUpstashClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (Redis && url && token) {
    try {
      return new Redis({ url, token });
    } catch (e) {
      console.warn('Upstash Redis init warning:', e.message);
    }
  }
  return null;
}

let getStore = null;
try {
  const blobs = require('@netlify/blobs');
  getStore = blobs.getStore;
} catch (e) {}

function getNetlifyBlobStore() {
  if (!getStore) return null;
  try {
    return getStore({ name: 'nexora-platforms', consistency: 'strong' });
  } catch (e) {
    return null;
  }
}

// Helper Functions
async function readApps() {
  // 1. Try Upstash Redis Cloud DB
  const redis = getUpstashClient();
  if (redis) {
    try {
      const redisData = await redis.get('nexora_apps');
      if (redisData && Array.isArray(redisData)) {
        globalAppsStore = redisData;
        return globalAppsStore;
      }
    } catch (e) {
      console.warn('Upstash Redis read notice:', e.message);
    }
  }

  // 2. Try Netlify Blobs Store
  const store = getNetlifyBlobStore();
  if (store) {
    try {
      const blobData = await store.get('apps', { type: 'json' });
      if (blobData && Array.isArray(blobData)) {
        globalAppsStore = blobData;
        return globalAppsStore;
      }
    } catch (e) {
      console.log('Netlify Blobs read notice:', e.message);
    }
  }

  // 3. Fallback to In-Memory / File
  if (globalAppsStore !== null && Array.isArray(globalAppsStore)) {
    return globalAppsStore;
  }

  let apps = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8')
      apps = JSON.parse(content || '[]')
      globalAppsStore = apps;
      return globalAppsStore;
    }
  } catch (err) {
    console.error('Error reading apps.json:', err.message)
  }

  apps = [
    {
      "id": "110ec44a-0941-4b77-88d0-e37784013401",
      "name": "Khan Academy",
      "url": "https://www.khanacademy.org",
      "logoUrl": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150&auto=format&fit=crop&q=80",
      "category": "Live Class",
      "featured": true,
      "order": 1,
      "addedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "220ec44a-0941-4b77-88d0-e37784013402",
      "name": "Coursera",
      "url": "https://www.coursera.org",
      "logoUrl": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80",
      "category": "Coaching",
      "featured": true,
      "order": 2,
      "addedAt": "2024-01-02T00:00:00.000Z"
    },
    {
      "id": "330ec44a-0941-4b77-88d0-e37784013403",
      "name": "Physics Wallah",
      "url": "https://www.pw.live",
      "logoUrl": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=150&auto=format&fit=crop&q=80",
      "category": "Live Class",
      "featured": false,
      "order": 3,
      "addedAt": "2024-01-03T00:00:00.000Z"
    },
    {
      "id": "440ec44a-0941-4b77-88d0-e37784013404",
      "name": "NPTEL Courses",
      "url": "https://nptel.ac.in",
      "logoUrl": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=150&auto=format&fit=crop&q=80",
      "category": "Test Series",
      "featured": false,
      "order": 4,
      "addedAt": "2024-01-04T00:00:00.000Z"
    },
    {
      "id": "550ec44a-0941-4b77-88d0-e37784013405",
      "name": "GeeksforGeeks",
      "url": "https://www.geeksforgeeks.org",
      "logoUrl": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=150&auto=format&fit=crop&q=80",
      "category": "Notes",
      "featured": true,
      "order": 5,
      "addedAt": "2024-01-05T00:00:00.000Z"
    }
  ];

  globalAppsStore = apps;

  if (store) {
    store.setJSON('apps', globalAppsStore).catch(() => {});
  }

  return globalAppsStore;
}

async function writeApps(data) {
  globalAppsStore = data;

  // 1. Save to Upstash Redis
  const redis = getUpstashClient();
  if (redis) {
    try {
      await redis.set('nexora_apps', data);
    } catch (e) {
      console.warn('Upstash Redis write notice:', e.message);
    }
  }

  // 2. Save to Netlify Blobs Store
  const store = getNetlifyBlobStore();
  if (store) {
    try {
      await store.setJSON('apps', data);
    } catch (e) {
      console.log('Netlify Blobs write notice:', e.message);
    }
  }

  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.warn('Filesystem write notice (Serverless/Read-only):', err.message)
  }
}

// REST API ROUTES

// GET /api/apps
app.get('/api/apps', async (req, res) => {
  try {
    const apps = await readApps()

    // Sort: featured items first, then by order ASC, then by addedAt DESC
    apps.sort((a, b) => {
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1

      const orderA = typeof a.order === 'number' ? a.order : 9999
      const orderB = typeof b.order === 'number' ? b.order : 9999
      if (orderA !== orderB) return orderA - orderB

      const dateA = new Date(a.addedAt || 0).getTime()
      const dateB = new Date(b.addedAt || 0).getTime()
      return dateB - dateA
    })

    res.json({
      success: true,
      data: apps,
      count: apps.length
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// POST /api/apps
app.post('/api/apps', async (req, res) => {
  try {
    const { name, url, logoUrl, category, featured, order } = req.body

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Platform name is required.'
      })
    }

    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      return res.status(400).json({
        success: false,
        error: 'URL is required and must start with http:// or https://'
      })
    }

    const apps = await readApps()

    const parsedOrder = typeof order === 'number' && !isNaN(order) 
      ? order 
      : (parseInt(order, 10) || (apps.length + 1))

    const newItem = {
      id: uuidv4(),
      name: name.trim(),
      url: url.trim(),
      logoUrl: logoUrl ? logoUrl.trim() : '',
      category: category ? category.trim() : 'GENERAL',
      featured: Boolean(featured),
      order: parsedOrder,
      addedAt: new Date().toISOString()
    }

    apps.push(newItem)
    await writeApps(apps)

    res.status(201).json({
      success: true,
      data: newItem
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// PUT /api/apps/:id
app.put('/api/apps/:id', async (req, res) => {
  try {
    const { id } = req.params
    const apps = await readApps()
    const index = apps.findIndex(item => item.id === id)

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      })
    }

    const existing = apps[index]
    const body = req.body || {}

    const updatedItem = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      url: body.url !== undefined ? String(body.url).trim() : existing.url,
      logoUrl: body.logoUrl !== undefined ? String(body.logoUrl).trim() : (body.logo !== undefined ? String(body.logo).trim() : existing.logoUrl),
      category: body.category !== undefined ? String(body.category).trim() : existing.category,
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      order: body.order !== undefined ? (parseInt(body.order, 10) || existing.order) : existing.order
      // Preserve original id and addedAt
    }

    apps[index] = updatedItem
    await writeApps(apps)

    res.json({
      success: true,
      data: updatedItem
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// DELETE /api/apps/:id
app.delete('/api/apps/:id', async (req, res) => {
  try {
    const { id } = req.params
    let apps = await readApps()
    const index = apps.findIndex(item => item.id === id)

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      })
    }

    apps = apps.filter(item => item.id !== id)
    await writeApps(apps)

    res.json({
      success: true,
      message: 'Deleted'
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// PROXY ROUTE — GET /proxy
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url

  // 1. Read & Validate url
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send(ERROR_PAGE_HTML)
  }

  // 2. Validate url starts with http:// or https://
  if (!/^https?:\/\//i.test(targetUrl.trim())) {
    return res.status(400).send(ERROR_PAGE_HTML)
  }

  try {
    // 3. Axios fetch target site
    const response = await axios.get(targetUrl.trim(), {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      maxRedirects: 5
    })

    // 4. Delete iframe-blocking headers
    const forbiddenHeaders = [
      'x-frame-options',
      'content-security-policy',
      'content-security-policy-report-only',
      'frame-options',
      'x-content-type-options'
    ]

    Object.keys(response.headers).forEach(header => {
      if (forbiddenHeaders.includes(header.toLowerCase())) {
        delete response.headers[header]
      }
    })

    // 5. Get content-type
    const contentType = response.headers['content-type'] || ''

    if (contentType.includes('text/html')) {
      // a. Convert arraybuffer to string
      let htmlString = response.data.toString('utf-8')

      // b. Target origin
      const targetOrigin = new URL(targetUrl.trim()).origin

      // c. Anti-Framebuster, History API Polyfill & Network Interceptor script
      const proxyScript = `
<script>
(function() {
  var PROXY_PREFIX = '/proxy?url=';

  // 1. Anti-framebuster: Override window.top and window.parent to stay inside iframe
  try {
    Object.defineProperty(window, 'top', {
      get: function() { return window.self; },
      set: function() {}
    });
    Object.defineProperty(window, 'parent', {
      get: function() { return window.self; },
      set: function() {}
    });
  } catch(e) {}

  // 2. Polyfill History API (pushState & replaceState) for cross-origin SPA routing
  try {
    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;

    history.pushState = function(state, title, url) {
      if (url) {
        try {
          var parsed = new URL(url, window.location.href);
          if (parsed.origin !== window.location.origin) {
            url = parsed.pathname + parsed.search + parsed.hash;
          }
        } catch(e) {}
      }
      try {
        return origPushState.call(history, state, title, url);
      } catch(e) {}
    };

    history.replaceState = function(state, title, url) {
      if (url) {
        try {
          var parsed = new URL(url, window.location.href);
          if (parsed.origin !== window.location.origin) {
            url = parsed.pathname + parsed.search + parsed.hash;
          }
        } catch(e) {}
      }
      try {
        return origReplaceState.call(history, state, title, url);
      } catch(e) {}
    };
  } catch(e) {}

  // 3. Intercept fetch() calls to route cross-origin API requests through proxy
  try {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      var urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (urlStr && !urlStr.startsWith('data:') && !urlStr.startsWith('blob:') && !urlStr.includes(PROXY_PREFIX)) {
        var fullUrl = new URL(urlStr, window.location.href).href;
        if (!fullUrl.startsWith(window.location.origin + '/proxy')) {
          if (typeof input === 'string') {
            input = PROXY_PREFIX + encodeURIComponent(fullUrl);
          } else if (input && input.url) {
            input = new Request(PROXY_PREFIX + encodeURIComponent(fullUrl), init);
          }
        }
      }
      return origFetch.call(this, input, init);
    };
  } catch(e) {}

  // 4. Intercept XMLHttpRequest calls to route cross-origin API requests through proxy
  try {
    var origXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      if (typeof url === 'string' && !url.startsWith('data:') && !url.startsWith('blob:') && !url.includes(PROXY_PREFIX)) {
        var fullUrl = new URL(url, window.location.href).href;
        if (!fullUrl.startsWith(window.location.origin + '/proxy')) {
          url = PROXY_PREFIX + encodeURIComponent(fullUrl);
        }
      }
      return origXhrOpen.call(this, method, url, async, user, password);
    };
  } catch(e) {}

  // 5. Intercept click on <a> links
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
      e.preventDefault();
      a.target = '_self';
      var fullUrl = new URL(a.getAttribute('href') || a.href, window.location.href).href;
      if (!fullUrl.includes(PROXY_PREFIX)) {
        window.location.href = PROXY_PREFIX + encodeURIComponent(fullUrl);
      } else {
        window.location.href = fullUrl;
      }
    }
  }, true);

  // 6. Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action) {
      e.preventDefault();
      var actionUrl = new URL(form.action, window.location.href).href;
      if (!actionUrl.includes(PROXY_PREFIX)) {
        window.location.href = PROXY_PREFIX + encodeURIComponent(actionUrl);
      }
    }
  }, true);
})();
</script>
`

      // d. Anti-Framebuster string replacements & target="_top" neutralization
      htmlString = htmlString
        .replace(/top\.location\s*=/gi, 'window.self.location =')
        .replace(/parent\.location\s*=/gi, 'window.self.location =')
        .replace(/window\.top\s*!==\s*window\.self/gi, 'false')
        .replace(/self\s*!==\s*top/gi, 'false')
        .replace(/top\s*!==\s*self/gi, 'false')
        .replace(/target=["']?(_top|_parent|_blank)["']?/gi, 'target="_self"')
        .replace(/<base[^>]*target=["']?[^"'>]+["']?[^>]*>/gi, '')

      // e. Inject <base> and proxyScript as FIRST element in <head>
      const baseTag = `<base href="${targetOrigin}/">`
      const headInjection = baseTag + proxyScript

      if (/<head[^>]*>/i.test(htmlString)) {
        htmlString = htmlString.replace(/<head[^>]*>/i, match => `${match}${headInjection}`)
      } else {
        htmlString = headInjection + htmlString
      }

      // f. Rewrite src="/ and href="/
      htmlString = htmlString
        .replace(/src="\//g, `src="${targetOrigin}/`)
        .replace(/href="\//g, `href="${targetOrigin}/`)

      // g. Set Content-Type & Send
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.send(htmlString)
    } else {
      // Non-HTML assets (CSS, JS, images, fonts, etc.)
      if (contentType) {
        res.setHeader('Content-Type', contentType)
      }
      return res.send(response.data)
    }
  } catch (error) {
    if (error.response) {
      console.error(`Proxy request failed with status: ${error.response.status}`)
    } else {
      console.error(`Proxy request error: ${error.message}`)
    }
    return res.status(200).send(ERROR_PAGE_HTML)
  }
})

// CATCH-ALL ROUTE
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// SERVER START
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NEXORA running on port ${PORT}`)
    if (!fs.existsSync('./data')) fs.mkdirSync('./data')
    if (!fs.existsSync('./data/apps.json')) fs.writeFileSync('./data/apps.json', '[]')
  })
}

module.exports = app
