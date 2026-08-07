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

// Feedback Data File
const FEEDBACK_FILE = path.join(__dirname, 'data', 'feedback.json');
let globalFeedbackStore = null;

async function readFeedback() {
  if (globalFeedbackStore !== null) return globalFeedbackStore;
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const content = fs.readFileSync(FEEDBACK_FILE, 'utf8');
      globalFeedbackStore = JSON.parse(content || '[]');
      return globalFeedbackStore;
    }
  } catch (e) {}
  globalFeedbackStore = [];
  return globalFeedbackStore;
}

async function writeFeedback(data) {
  globalFeedbackStore = data;
  try {
    const dir = path.dirname(FEEDBACK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// Click Analytics Storage
const CLICKS_FILE = path.join(__dirname, 'data', 'clicks.json');
let globalClicksStore = null;

async function readClicks() {
  if (globalClicksStore !== null) return globalClicksStore;
  try {
    if (fs.existsSync(CLICKS_FILE)) {
      const content = fs.readFileSync(CLICKS_FILE, 'utf8');
      globalClicksStore = JSON.parse(content || '{}');
      return globalClicksStore;
    }
  } catch (e) {}
  globalClicksStore = {};
  return globalClicksStore;
}

async function writeClicks(data) {
  globalClicksStore = data;
  try {
    const dir = path.dirname(CLICKS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CLICKS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// Download Center Config Storage
const DOWNLOADS_FILE = path.join(__dirname, 'data', 'downloads.json');
let globalDownloadsStore = null;

const DEFAULT_DOWNLOADS = {
  published: true,
  globalMaintenance: false,
  android: {
    version: "2.4.1",
    minVersion: "2.0.0",
    downloadUrl: "https://github.com/nexora-edu/releases/releases/download/v2.4.1/nexora-student-v2.4.1.apk",
    fileSize: "42.5 MB",
    checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    releaseDate: "2026-08-01",
    maintenance: false,
    forceUpdate: false,
    releaseNotes: [
      "Added high-speed offline lecture sync capabilities.",
      "Fixed background notification delay on Android 14+ devices.",
      "Enhanced security token validation during live session entrance.",
      "Optimized battery consumption during live video streaming."
    ]
  },
  windows: {
    version: "1.8.0",
    minVersion: "1.5.0",
    downloadUrl: "https://github.com/nexora-edu/releases/releases/download/v1.8.0/nexora-desktop-setup-1.8.0.exe",
    fileSize: "88.2 MB",
    checksum: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
    releaseDate: "2026-07-28",
    maintenance: false,
    forceUpdate: false,
    releaseNotes: [
      "Introduced hardware-accelerated rendering for 4K live streams.",
      "Added automatic background updates with SmartScreen verification.",
      "Improved multi-monitor display support and full-screen shortcuts.",
      "Fixed audio device hot-plugging bug."
    ]
  },
  updatedAt: new Date().toISOString()
};

async function readDownloads() {
  if (globalDownloadsStore !== null) return globalDownloadsStore;
  try {
    if (fs.existsSync(DOWNLOADS_FILE)) {
      const content = fs.readFileSync(DOWNLOADS_FILE, 'utf8');
      globalDownloadsStore = { ...DEFAULT_DOWNLOADS, ...JSON.parse(content || '{}') };
      return globalDownloadsStore;
    }
  } catch (e) {}
  globalDownloadsStore = DEFAULT_DOWNLOADS;
  return globalDownloadsStore;
}

async function writeDownloads(data) {
  globalDownloadsStore = data;
  try {
    const dir = path.dirname(DOWNLOADS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// Download Analytics Storage
const DOWNLOAD_ANALYTICS_FILE = path.join(__dirname, 'data', 'download_analytics.json');
let globalDownloadAnalyticsStore = null;

async function readDownloadAnalytics() {
  if (globalDownloadAnalyticsStore !== null) return globalDownloadAnalyticsStore;
  try {
    if (fs.existsSync(DOWNLOAD_ANALYTICS_FILE)) {
      const content = fs.readFileSync(DOWNLOAD_ANALYTICS_FILE, 'utf8');
      globalDownloadAnalyticsStore = JSON.parse(content || '{"totalDownloads":0,"androidDownloads":0,"windowsDownloads":0,"history":[]}');
      return globalDownloadAnalyticsStore;
    }
  } catch (e) {}
  globalDownloadAnalyticsStore = { totalDownloads: 0, androidDownloads: 0, windowsDownloads: 0, history: [] };
  return globalDownloadAnalyticsStore;
}

async function writeDownloadAnalytics(data) {
  globalDownloadAnalyticsStore = data;
  try {
    const dir = path.dirname(DOWNLOAD_ANALYTICS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DOWNLOAD_ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// Student Profiles Storage
const STUDENTS_FILE = path.join(__dirname, 'data', 'students.json');
let globalStudentsStore = null;

async function readStudents() {
  if (globalStudentsStore !== null) return globalStudentsStore;
  try {
    if (fs.existsSync(STUDENTS_FILE)) {
      const content = fs.readFileSync(STUDENTS_FILE, 'utf8');
      globalStudentsStore = JSON.parse(content || '[]');
      return globalStudentsStore;
    }
  } catch (e) {}
  globalStudentsStore = [];
  return globalStudentsStore;
}

async function writeStudents(data) {
  globalStudentsStore = data;
  try {
    const dir = path.dirname(STUDENTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// Download Center API Endpoints

app.get('/api/downloads/config', async (req, res) => {
  try {
    const config = await readDownloads();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/downloads/config', async (req, res) => {
  try {
    const current = await readDownloads();
    const body = req.body || {};
    
    const updated = {
      ...current,
      published: body.published !== undefined ? Boolean(body.published) : current.published,
      globalMaintenance: body.globalMaintenance !== undefined ? Boolean(body.globalMaintenance) : current.globalMaintenance,
      android: {
        ...current.android,
        version: body.android?.version ? String(body.android.version).trim() : current.android.version,
        minVersion: body.android?.minVersion ? String(body.android.minVersion).trim() : current.android.minVersion,
        downloadUrl: body.android?.downloadUrl ? String(body.android.downloadUrl).trim() : current.android.downloadUrl,
        fileSize: body.android?.fileSize ? String(body.android.fileSize).trim() : current.android.fileSize,
        checksum: body.android?.checksum ? String(body.android.checksum).trim() : current.android.checksum,
        releaseDate: body.android?.releaseDate || current.android.releaseDate,
        maintenance: body.android?.maintenance !== undefined ? Boolean(body.android.maintenance) : current.android.maintenance,
        forceUpdate: body.android?.forceUpdate !== undefined ? Boolean(body.android.forceUpdate) : current.android.forceUpdate,
        releaseNotes: Array.isArray(body.android?.releaseNotes) ? body.android.releaseNotes : current.android.releaseNotes
      },
      windows: {
        ...current.windows,
        version: body.windows?.version ? String(body.windows.version).trim() : current.windows.version,
        minVersion: body.windows?.minVersion ? String(body.windows.minVersion).trim() : current.windows.minVersion,
        downloadUrl: body.windows?.downloadUrl ? String(body.windows.downloadUrl).trim() : current.windows.downloadUrl,
        fileSize: body.windows?.fileSize ? String(body.windows.fileSize).trim() : current.windows.fileSize,
        checksum: body.windows?.checksum ? String(body.windows.checksum).trim() : current.windows.checksum,
        releaseDate: body.windows?.releaseDate || current.windows.releaseDate,
        maintenance: body.windows?.maintenance !== undefined ? Boolean(body.windows.maintenance) : current.windows.maintenance,
        forceUpdate: body.windows?.forceUpdate !== undefined ? Boolean(body.windows.forceUpdate) : current.windows.forceUpdate,
        releaseNotes: Array.isArray(body.windows?.releaseNotes) ? body.windows.releaseNotes : current.windows.releaseNotes
      },
      updatedAt: new Date().toISOString()
    };

    await writeDownloads(updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/downloads/register-student', async (req, res) => {
  try {
    const { name, email, studentId } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const students = await readStudents();
    const existingIndex = students.findIndex(s => (s.email || '').toLowerCase() === email.trim().toLowerCase());

    const now = new Date().toISOString();
    let studentObj;

    if (existingIndex !== -1) {
      studentObj = {
        ...students[existingIndex],
        name: name.trim(),
        email: email.trim(),
        lastActive: now
      };
      students[existingIndex] = studentObj;
    } else {
      const year = new Date().getFullYear();
      const randId = 'NEX-' + year + '-' + Math.floor(10000 + Math.random() * 90000);
      studentObj = {
        studentId: studentId || randId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        registeredAt: now,
        lastActive: now,
        downloadCount: 0
      };
      students.unshift(studentObj);
    }

    await writeStudents(students);
    res.json({ success: true, data: studentObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/downloads/students', async (req, res) => {
  try {
    const students = await readStudents();
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/downloads/track', async (req, res) => {
  try {
    const { platform, version, studentId, studentName, studentEmail, ip, userAgent } = req.body || {};
    const analytics = await readDownloadAnalytics();

    analytics.totalDownloads = (analytics.totalDownloads || 0) + 1;
    if (platform === 'android') {
      analytics.androidDownloads = (analytics.androidDownloads || 0) + 1;
    } else if (platform === 'windows') {
      analytics.windowsDownloads = (analytics.windowsDownloads || 0) + 1;
    }

    const logEntry = {
      id: 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      platform: platform || 'unknown',
      version: version || '1.0.0',
      studentId: studentId || 'Anonymous',
      studentName: studentName || 'Student',
      studentEmail: studentEmail || '',
      timestamp: new Date().toISOString(),
      status: 'COMPLETED'
    };

    analytics.history = [logEntry, ...(analytics.history || [])].slice(0, 100);
    await writeDownloadAnalytics(analytics);

    // Update student download count
    if (studentEmail || studentId) {
      const students = await readStudents();
      const sIdx = students.findIndex(s => s.studentId === studentId || (s.email && s.email === studentEmail));
      if (sIdx !== -1) {
        students[sIdx].downloadCount = (students[sIdx].downloadCount || 0) + 1;
        students[sIdx].lastActive = new Date().toISOString();
        await writeStudents(students);
      }
    }

    res.json({ success: true, log: logEntry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/api/downloads/verify-token', (req, res) => {
  try {
    const { platform, version, studentId } = req.body || {};
    const token = 'NEX-DL-' + uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins validity
    res.json({
      success: true,
      token,
      expiresAt,
      platform,
      version,
      studentId: studentId || 'STUDENT'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/downloads/analytics', async (req, res) => {
  try {
    const analytics = await readDownloadAnalytics();
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve Nexora Download Center sub-project static files
const DOWNLOAD_CENTER_PUBLIC = path.join(__dirname, 'nexora-download-center', 'public');
const DOWNLOAD_CENTER_SRC = path.join(__dirname, 'nexora-download-center', 'src');
app.use('/download-center/src', express.static(DOWNLOAD_CENTER_SRC));
app.use('/download-center', express.static(DOWNLOAD_CENTER_PUBLIC));
app.get('/download-center/*', (req, res) => {
  if (fs.existsSync(path.join(DOWNLOAD_CENTER_PUBLIC, 'index.html'))) {
    res.sendFile(path.join(DOWNLOAD_CENTER_PUBLIC, 'index.html'));
  } else {
    res.status(404).send('Download Center sub-project setup in progress.');
  }
});

// API Routes

app.get('/api/track-click', async (req, res) => {
  const clicks = await readClicks();
  res.json(clicks);
});

app.post('/api/track-click', async (req, res) => {
  try {
    const { appName, linkTitle, linkUrl } = req.body || {};
    const key = linkUrl || appName || 'unknown';
    const clicks = await readClicks();
    if (!clicks[key]) {
      clicks[key] = {
        appName: appName || 'Platform',
        linkTitle: linkTitle || 'Access Link',
        url: linkUrl || '#',
        count: 0,
        lastClicked: new Date().toISOString()
      };
    }
    clicks[key].count = (clicks[key].count || 0) + 1;
    clicks[key].lastClicked = new Date().toISOString();
    await writeClicks(clicks);
    res.json({ success: true, count: clicks[key].count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/apps', async (req, res) => {
  const apps = await readApps();
  res.json(apps);
});

app.get('/api/feedback', async (req, res) => {
  const list = await readFeedback();
  res.json(list);
});

app.post('/api/feedback', async (req, res) => {
  try {
    const body = req.body || {};
    const current = await readFeedback();

    if (body.action === 'reply') {
      const { id, adminReply } = body;
      const index = current.findIndex(f => f.id === id);
      if (index !== -1) {
        current[index].adminReply = adminReply;
        current[index].status = 'REPLIED';
        current[index].repliedAt = new Date().toISOString();
        await writeFeedback(current);
        return res.json({ success: true, item: current[index] });
      }
      return res.status(404).json({ error: 'Item not found' });
    }

    if (body.action === 'delete') {
      const { id } = body;
      const filtered = current.filter(f => f.id !== id);
      await writeFeedback(filtered);
      return res.json({ success: true });
    }

    const newItem = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: body.type || 'QUESTION',
      userName: body.userName || 'Student',
      userEmail: body.userEmail || '',
      message: body.message || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      adminReply: '',
      repliedAt: ''
    };

    const updated = [newItem, ...current];
    await writeFeedback(updated);
    res.json({ success: true, item: newItem });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/apps (Main list)
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

// DOWNLOAD CENTER API ENDPOINTS
const DOWNLOAD_CONFIG_FILE = path.join(__dirname, 'data', 'download_config.json');

function getDownloadConfig() {
  try {
    if (fs.existsSync(DOWNLOAD_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(DOWNLOAD_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {
    android: {
      latestVersion: "2.5.0",
      minSupportedVersion: "2.0.0",
      apkUrl: "https://github.com/nexora-edu/releases/releases/download/v2.4.1/nexora-student-v2.4.1.apk",
      fileSize: "45.2 MB",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      releaseNotes: ["Added high-speed offline lecture sync capabilities.", "Fixed background notification delay on Android 14+ devices."],
      maintenanceMode: false,
      forceUpdate: false
    },
    windows: {
      latestVersion: "1.8.0",
      minSupportedVersion: "1.0.0",
      exeUrl: "https://github.com/nexora-edu/releases/releases/download/v1.8.0/nexora-desktop-setup-1.8.0.exe",
      fileSize: "88.2 MB",
      sha256: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
      releaseNotes: ["Introduced hardware-accelerated rendering for 4K live streams."],
      maintenanceMode: false,
      forceUpdate: false
    }
  };
}

app.get('/api/downloads/config', (req, res) => {
  res.json({ success: true, data: getDownloadConfig() });
});

app.post('/api/downloads/config', (req, res) => {
  try {
    const configData = req.body;
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
      fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    }
    fs.writeFileSync(DOWNLOAD_CONFIG_FILE, JSON.stringify(configData, null, 2));
    res.json({ success: true, data: configData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/downloads/verify-token', (req, res) => {
  const { token, platform } = req.body || {};
  const config = getDownloadConfig();
  const target = platform === 'windows' ? config.windows : config.android;
  
  res.json({
    success: true,
    token: token || uuidv4(),
    downloadUrl: target ? (target.apkUrl || target.exeUrl) : '',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });
});

app.post('/api/downloads/track', (req, res) => {
  res.json({ success: true, timestamp: new Date().toISOString() });
});

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
