const express = require('express')
const axios   = require('axios')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = process.env.PORT || 3000
const DATA_FILE = path.join(__dirname, 'data', 'apps.json')
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json')

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

// Generic Dark Theme Error HTML (No branding names or emojis)
function getErrorHtml(targetUrl) {
  let safeUrl = targetUrl ? String(targetUrl).trim() : '';
  if (safeUrl && !/^https?:\/\//i.test(safeUrl)) {
    safeUrl = 'https://' + safeUrl;
  }
  const escapedUrl = safeUrl.replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html>
<head>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5451638891460185" crossorigin="anonymous"></script>
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
    .sub   { font-size: 14px; color: #7d8187; font-weight: 400; margin-bottom: 24px; }
    .btn   {
      background: #ffffff; color: #0a0a0a; border: none;
      border-radius: 9999px; padding: 12px 24px; font-size: 14px;
      font-weight: 400; cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; justify-content: center;
    }
  </style>
</head>
<body>
  <p class="label">NOTICE</p>
  <p class="title">Protected Educational Platform</p>
  <p class="sub">This platform requires direct tab access.</p>
  ${safeUrl ? `<a href="${escapedUrl}" target="_self" class="btn">Open Platform Directly</a>` : ''}
</body>
</html>`
}

let globalAppsStore = null;
let globalSettingsStore = null;

let Redis = null;
try {
  Redis = require('@upstash/redis').Redis;
} catch (e) {}

const DEFAULT_UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
const DEFAULT_UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

function getUpstashClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || DEFAULT_UPSTASH_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || DEFAULT_UPSTASH_TOKEN;
  if (Redis && url && token) {
    try {
      return new Redis({ url, token });
    } catch (e) {
      console.warn('Upstash Redis init warning:', e.message);
    }
  }
  return null;
}

const CF_KV_URL = 'https://api.cloudflare.com/client/v4/accounts/ce3f6c1f773e98fb3d8039bfaf999b62/storage/kv/namespaces/791f4ba63d8b4e07baa2ca09986cd53d/values/nexora_apps';
const CF_KV_SETTINGS_URL = 'https://api.cloudflare.com/client/v4/accounts/ce3f6c1f773e98fb3d8039bfaf999b62/storage/kv/namespaces/791f4ba63d8b4e07baa2ca09986cd53d/values/nexora_settings';
const CF_KV_TOKEN = Buffer.from('Y2ZhdF83anlsVHRaSEYyNlZwRnNudW94QmdnMHdwSEVsdVJBVnRxZjI5VGY1MjA2YmU4MmE=', 'base64').toString('utf-8');

function normalizeApps(apps) {
  if (!Array.isArray(apps)) return [];
  return apps.map(app => {
    let links = Array.isArray(app.links) && app.links.length > 0 ? app.links : [];
    if (links.length === 0 && app.url) {
      links = [{
        id: 'link_' + uuidv4().substr(0, 8),
        title: app.name ? `${app.name} Portal` : 'Main Access',
        url: app.url,
        statusMode: app.statusMode || 'auto',
        keyRequirement: app.keyRequirement || 'without_key',
        loginRequirement: app.loginRequirement || 'login_not_required'
      }];
    }
    return {
      id: app.id || uuidv4(),
      name: app.name || 'Platform',
      logoUrl: app.logoUrl || app.logo || '',
      logo: app.logoUrl || app.logo || '',
      category: app.category || 'GENERAL',
      featured: Boolean(app.featured),
      order: typeof app.order === 'number' ? app.order : 1,
      addedAt: app.addedAt || new Date().toISOString(),
      links: links
    };
  });
}

async function fetchCloudflareKV() {
  try {
    const response = await axios.get(CF_KV_URL, {
      headers: { Authorization: `Bearer ${CF_KV_TOKEN}` },
      timeout: 5000
    });
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
  } catch (e) {}
  return null;
}

async function writeCloudflareKV(data) {
  try {
    await axios.put(CF_KV_URL, JSON.stringify(data), {
      headers: {
        Authorization: `Bearer ${CF_KV_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      timeout: 5000
    });
  } catch (e) {}
}

async function readApps() {
  const cfApps = await fetchCloudflareKV();
  if (cfApps && Array.isArray(cfApps)) {
    globalAppsStore = normalizeApps(cfApps);
    return globalAppsStore;
  }

  const redis = getUpstashClient();
  if (redis) {
    try {
      const redisData = await redis.get('nexora_apps');
      if (redisData && Array.isArray(redisData)) {
        globalAppsStore = normalizeApps(redisData);
        return globalAppsStore;
      }
    } catch (e) {}
  }

  if (globalAppsStore !== null && Array.isArray(globalAppsStore)) {
    return globalAppsStore;
  }

  let apps = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8')
      apps = JSON.parse(content || '[]')
      globalAppsStore = normalizeApps(apps);
      return globalAppsStore;
    }
  } catch (err) {}

  apps = [];
  globalAppsStore = apps;
  return globalAppsStore;
}

async function writeApps(data) {
  const normalized = normalizeApps(data);
  globalAppsStore = normalized;

  writeCloudflareKV(normalized).catch(() => {});

  const redis = getUpstashClient();
  if (redis) {
    try {
      await redis.set('nexora_apps', normalized);
    } catch (e) {}
  }

  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(normalized, null, 2), 'utf8')
  } catch (err) {}
}

// Telegram Settings Read/Write
const DEFAULT_SETTINGS = {
  telegramEnabled: true,
  telegramLink: 'https://t.me/telegram',
  telegramTitle: 'Join Official Channel',
  telegramMessage: 'Get instant access to daily updates, live class links, and announcements!'
};

async function readSettings() {
  if (globalSettingsStore) return globalSettingsStore;

  try {
    const res = await axios.get(CF_KV_SETTINGS_URL, {
      headers: { Authorization: `Bearer ${CF_KV_TOKEN}` },
      timeout: 5000
    });
    if (res.data && typeof res.data === 'object') {
      globalSettingsStore = { ...DEFAULT_SETTINGS, ...res.data };
      return globalSettingsStore;
    }
  } catch (e) {}

  const redis = getUpstashClient();
  if (redis) {
    try {
      const redisData = await redis.get('nexora_settings');
      if (redisData && typeof redisData === 'object') {
        globalSettingsStore = { ...DEFAULT_SETTINGS, ...redisData };
        return globalSettingsStore;
      }
    } catch (e) {}
  }

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
      globalSettingsStore = { ...DEFAULT_SETTINGS, ...JSON.parse(content || '{}') };
      return globalSettingsStore;
    }
  } catch (e) {}

  globalSettingsStore = DEFAULT_SETTINGS;
  return globalSettingsStore;
}

async function writeSettings(data) {
  globalSettingsStore = data;

  try {
    await axios.put(CF_KV_SETTINGS_URL, JSON.stringify(data), {
      headers: { Authorization: `Bearer ${CF_KV_TOKEN}`, 'Content-Type': 'application/json' },
      timeout: 5000
    });
  } catch (e) {}

  const redis = getUpstashClient();
  if (redis) {
    try {
      await redis.set('nexora_settings', data);
    } catch (e) {}
  }

  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// REST API ROUTES

// GET /api/apps
app.get('/api/apps', async (req, res) => {
  try {
    const apps = await readApps()

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
    const { name, url, logoUrl, category, featured, order, links } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Platform name is required.'
      })
    }

    const apps = await readApps()

    const parsedOrder = typeof order === 'number' && !isNaN(order) 
      ? order 
      : (parseInt(order, 10) || (apps.length + 1));

    let finalLinks = Array.isArray(links) && links.length > 0 ? links : [];
    if (finalLinks.length === 0 && url && /^https?:\/\//i.test(url.trim())) {
      finalLinks = [{
        id: 'link_' + uuidv4().substr(0, 8),
        title: name.trim() + ' Portal',
        url: url.trim(),
        statusMode: 'auto',
        keyRequirement: 'without_key',
        loginRequirement: 'login_not_required'
      }];
    }

    const newItem = {
      id: uuidv4(),
      name: name.trim(),
      logoUrl: logoUrl ? logoUrl.trim() : '',
      logo: logoUrl ? logoUrl.trim() : '',
      category: category ? category.trim() : 'GENERAL',
      featured: Boolean(featured),
      order: parsedOrder,
      addedAt: new Date().toISOString(),
      links: finalLinks
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

    let finalLinks = Array.isArray(body.links) && body.links.length > 0 ? body.links : existing.links;
    if (body.url && (!finalLinks || finalLinks.length === 0)) {
      finalLinks = [{
        id: 'link_' + uuidv4().substr(0, 8),
        title: (body.name || existing.name) + ' Portal',
        url: String(body.url).trim(),
        statusMode: 'auto',
        keyRequirement: 'without_key',
        loginRequirement: 'login_not_required'
      }];
    }

    const updatedItem = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      logoUrl: body.logoUrl !== undefined ? String(body.logoUrl).trim() : (body.logo !== undefined ? String(body.logo).trim() : existing.logoUrl),
      logo: body.logoUrl !== undefined ? String(body.logoUrl).trim() : (body.logo !== undefined ? String(body.logo).trim() : existing.logoUrl),
      category: body.category !== undefined ? String(body.category).trim() : existing.category,
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      order: body.order !== undefined ? (parseInt(body.order, 10) || existing.order) : existing.order,
      links: finalLinks
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

// GET /api/settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
})

// POST /api/settings
app.post('/api/settings', async (req, res) => {
  try {
    const current = await readSettings();
    const body = req.body || {};
    const updated = {
      ...current,
      telegramEnabled: body.telegramEnabled !== undefined ? Boolean(body.telegramEnabled) : current.telegramEnabled,
      telegramLink: body.telegramLink ? String(body.telegramLink).trim() : current.telegramLink,
      telegramTitle: body.telegramTitle ? String(body.telegramTitle).trim() : current.telegramTitle,
      telegramMessage: body.telegramMessage ? String(body.telegramMessage).trim() : current.telegramMessage
    };
    await writeSettings(updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
})

// CATCH-ALL ROUTE
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// SERVER START
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    if (!fs.existsSync('./data')) fs.mkdirSync('./data')
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]')
  })
}

module.exports = app
