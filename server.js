const express = require('express')
const axios   = require('axios')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = process.env.PORT || 3000

// ✅ FIX: Proper CORS - Cloudflare Pages domain allow karo
const allowedOrigins = [
  'https://nexora-download-center.pages.dev',  // Apna Cloudflare domain
  'https://nexora7.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // Allow any *.pages.dev domain
    if (origin && origin.endsWith('.pages.dev')) {
      return callback(null, true);
    }
    // Allow any *.railway.app domain
    if (origin && origin.endsWith('.railway.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Dev me sab allow
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// ✅ MOUNT SECURE ACTIVATION & PROXY SYSTEM ROUTES
const studentRoutes = require('./routes/studentRoutes');
const activationRoutes = require('./routes/activationRoutes');
const secureDownloadRoutes = require('./routes/secureDownloadRoutes');
const popupRoutes = require('./routes/popupRoutes');
const adminControlRoutes = require('./routes/adminControlRoutes');

app.use('/api/student', studentRoutes);
app.use('/api/activation', activationRoutes);
app.use('/api/downloads', secureDownloadRoutes);
app.use('/api/popup', popupRoutes);
app.use('/api/admin/control', adminControlRoutes);

// ============================================================
// DATA FILE PATHS
// ============================================================
const DATA_DIR       = path.join(__dirname, 'data');
const DATA_FILE      = path.join(DATA_DIR, 'apps.json');
const SETTINGS_FILE  = path.join(DATA_DIR, 'settings.json');
const FEEDBACK_FILE  = path.join(DATA_DIR, 'feedback.json');
const CLICKS_FILE    = path.join(DATA_DIR, 'clicks.json');
const DOWNLOADS_FILE = path.join(DATA_DIR, 'downloads.json');
const DL_ANALYTICS_FILE = path.join(DATA_DIR, 'download_analytics.json');
const STUDENTS_FILE  = path.join(DATA_DIR, 'students.json');

// ============================================================
// UPSTASH REDIS SETUP
// ============================================================
let Redis = null;
try { Redis = require('@upstash/redis').Redis; } catch (e) {}

function getRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL   || 'https://legible-loon-84378.upstash.io';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN  || 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';
  if (Redis && url && token) {
    try { return new Redis({ url, token }); } catch (e) {}
  }
  return null;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8') || JSON.stringify(fallback));
    }
  } catch (e) {}
  return fallback;
}

function writeJson(filePath, data) {
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// ============================================================
// IN-MEMORY STORES (Railway ephemeral disk ke liye)
// ============================================================
let store = {
  apps: null,
  settings: null,
  feedback: null,
  clicks: null,
  downloads: null,
  dlAnalytics: null,
  students: null
};

// ============================================================
// DEFAULT DATA
// ============================================================
const DEFAULT_SETTINGS = {
  telegramEnabled: true,
  telegramLink: 'https://t.me/telegram',
  telegramTitle: 'Join Official Channel',
  telegramMessage: 'Get instant updates, live class links, and announcements!',
  announcementEnabled: false,
  announcementText: ''
};

const DEFAULT_DOWNLOADS = {
  published: true,
  globalMaintenance: false,
  android: {
    version: '1.0.0',
    latestVersion: '1.0.0',
    minVersion: '1.0.0',
    minSupportedVersion: '1.0.0',
    fileSize: '6.62 MB',
    downloadUrl: 'https://github.com/NEXORA7353/NEXORA/releases/latest/download/NEXORA.apk',
    apkUrl: 'https://github.com/NEXORA7353/NEXORA/releases/latest/download/NEXORA.apk',
    checksum: 'sha256:b04e2cadb9254fb8274bde4df526b372b2702885ec0ca6ce5b6bdbd81a240780',
    sha256: 'sha256:b04e2cadb9254fb8274bde4df526b372b2702885ec0ca6ce5b6bdbd81a240780',
    releaseDate: '2026-08-07',
    maintenance: false,
    maintenanceMode: false,
    forceUpdate: false,
    releaseNotes: [
      'Initial Official Android Release',
      'Performance Improvements',
      'UI Enhancements',
      'Bug Fixes',
      'Security Improvements'
    ]
  },
  windows: {
    version: '1.0.0',
    latestVersion: '1.0.0',
    minVersion: '1.0.0',
    minSupportedVersion: '1.0.0',
    fileSize: '88.2 MB',
    downloadUrl: 'https://github.com/NEXORA7353/NEXORA/releases/latest/download/NEXORA.Setup.1.0.0.exe',
    exeUrl: 'https://github.com/NEXORA7353/NEXORA/releases/latest/download/NEXORA.Setup.1.0.0.exe',
    checksum: 'sha256:2c5e529c5966e780365e13866067542156f3c5174c4026ca705c5dd957639c5e',
    sha256: 'sha256:2c5e529c5966e780365e13866067542156f3c5174c4026ca705c5dd957639c5e',
    releaseDate: '2026-08-07',
    maintenance: false,
    maintenanceMode: false,
    forceUpdate: false,
    releaseNotes: [
      'Initial Official Windows Release',
      'Performance Improvements',
      'UI Enhancements',
      'Bug Fixes',
      'Security Improvements'
    ]
  },
  updatedAt: new Date().toISOString()
};

// ============================================================
// DATA ACCESS LAYER - Upstash → Memory → File
// ============================================================
async function getData(key, fileStore, filePath, fallback) {
  // 1. Memory cache
  if (store[fileStore] !== null) return store[fileStore];

  // 2. Upstash Redis
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get(key);
      if (val !== null && val !== undefined) {
        store[fileStore] = val;
        return store[fileStore];
      }
    } catch (e) {}
  }

  // 3. Local file
  const fromFile = readJson(filePath, null);
  if (fromFile !== null) {
    store[fileStore] = fromFile;
    return store[fileStore];
  }

  // 4. Fallback default
  store[fileStore] = fallback;
  return store[fileStore];
}

async function setData(key, fileStore, filePath, data) {
  store[fileStore] = data;

  // Save to Upstash
  const redis = getRedis();
  if (redis) {
    try { await redis.set(key, data); } catch (e) {}
  }

  // Save to file
  writeJson(filePath, data);
}

// Shorthand helpers
const readApps     = () => getData('nexora_apps',     'apps',       DATA_FILE,          []);
const writeApps    = (d) => setData('nexora_apps',    'apps',       DATA_FILE,          d);
const readSettings = () => getData('nexora_settings', 'settings',   SETTINGS_FILE,      DEFAULT_SETTINGS);
const writeSettings= (d) => setData('nexora_settings','settings',   SETTINGS_FILE,      d);
const readFeedback = () => getData('nexora_feedback',  'feedback',   FEEDBACK_FILE,      []);
const writeFeedback= (d) => setData('nexora_feedback', 'feedback',   FEEDBACK_FILE,      d);
const readClicks   = () => getData('nexora_clicks',    'clicks',     CLICKS_FILE,        {});
const writeClicks  = (d) => setData('nexora_clicks',   'clicks',     CLICKS_FILE,        d);
const readDownloads= () => getData('nexora_download_config', 'downloads', DOWNLOADS_FILE, DEFAULT_DOWNLOADS);
const writeDownloads=(d) => setData('nexora_download_config','downloads', DOWNLOADS_FILE, d);
const readDlAnalytics=()=> getData('nexora_dl_analytics','dlAnalytics',DL_ANALYTICS_FILE,{ totalDownloads:0, androidDownloads:0, windowsDownloads:0, history:[] });
const writeDlAnalytics=(d)=>setData('nexora_dl_analytics','dlAnalytics',DL_ANALYTICS_FILE,d);
const readStudents = () => getData('nexora_students',  'students',   STUDENTS_FILE,      []);
const writeStudents= (d) => setData('nexora_students', 'students',   STUDENTS_FILE,      d);

// ============================================================
// APPS NORMALIZER
// ============================================================
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
      badgeTag: app.badgeTag || 'NONE',
      order: typeof app.order === 'number' ? app.order : 1,
      addedAt: app.addedAt || new Date().toISOString(),
      links
    };
  });
}

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    service: 'NEXORA Backend'
  });
});

// ============================================================
// APPS API
// ============================================================
app.get('/api/apps', async (req, res) => {
  try {
    let apps = await readApps();
    apps = normalizeApps(apps);

    apps.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      const oA = typeof a.order === 'number' ? a.order : 9999;
      const oB = typeof b.order === 'number' ? b.order : 9999;
      if (oA !== oB) return oA - oB;
      return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
    });

    res.json({ success: true, data: apps, count: apps.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/apps', async (req, res) => {
  try {
    const { name, url, logoUrl, logo, category, featured, order, links, badgeTag } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Platform name is required.' });
    }

    const apps = await readApps();
    const parsedOrder = parseInt(order, 10) || (apps.length + 1);

    let finalLinks = Array.isArray(links) && links.length > 0 ? links : [];
    if (finalLinks.length === 0 && url) {
      finalLinks = [{
        id: 'link_' + uuidv4().substr(0, 8),
        title: String(name).trim() + ' Portal',
        url: String(url).trim(),
        statusMode: 'auto',
        keyRequirement: 'without_key',
        loginRequirement: 'login_not_required'
      }];
    }

    const newItem = {
      id: uuidv4(),
      name: String(name).trim(),
      logoUrl: (logoUrl || logo || '').trim(),
      logo: (logoUrl || logo || '').trim(),
      category: (category || 'GENERAL').trim(),
      featured: Boolean(featured),
      badgeTag: badgeTag || 'NONE',
      order: parsedOrder,
      addedAt: new Date().toISOString(),
      links: finalLinks
    };

    apps.push(newItem);
    await writeApps(apps);
    res.status(201).json({ success: true, data: newItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/apps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const apps = await readApps();
    const index = apps.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Platform not found' });

    const existing = apps[index];
    const body = req.body || {};

    let finalLinks = Array.isArray(body.links) && body.links.length > 0
      ? body.links
      : existing.links;

    apps[index] = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      logoUrl: (body.logoUrl || body.logo || existing.logoUrl || '').trim(),
      logo: (body.logoUrl || body.logo || existing.logoUrl || '').trim(),
      category: (body.category || existing.category || 'GENERAL').trim(),
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      badgeTag: body.badgeTag || existing.badgeTag || 'NONE',
      order: body.order !== undefined ? (parseInt(body.order, 10) || existing.order) : existing.order,
      links: finalLinks
    };

    await writeApps(apps);
    res.json({ success: true, data: apps[index] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/apps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let apps = await readApps();
    const index = apps.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Platform not found' });
    apps = apps.filter(item => item.id !== id);
    await writeApps(apps);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk overwrite (Admin backup restore)
app.post('/api/apps/bulk', async (req, res) => {
  try {
    const { apps: incoming } = req.body || {};
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ success: false, error: 'apps array required' });
    }
    const normalized = normalizeApps(incoming);
    await writeApps(normalized);
    res.json({ success: true, count: normalized.length, data: normalized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// SETTINGS API
// ============================================================
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const current = await readSettings();
    const body = req.body || {};
    const updated = {
      ...current,
      ...body,
      // Force boolean types
      telegramEnabled: body.telegramEnabled !== undefined
        ? Boolean(body.telegramEnabled) : current.telegramEnabled,
      announcementEnabled: body.announcementEnabled !== undefined
        ? Boolean(body.announcementEnabled) : current.announcementEnabled
    };
    await writeSettings(updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// FEEDBACK API
// ============================================================
app.get('/api/feedback', async (req, res) => {
  try {
    const list = await readFeedback();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const body = req.body || {};
    const current = await readFeedback();

    // Admin reply action
    if (body.action === 'reply') {
      const index = current.findIndex(f => f.id === body.id);
      if (index !== -1) {
        current[index].adminReply = body.adminReply;
        current[index].status = 'REPLIED';
        current[index].repliedAt = new Date().toISOString();
        await writeFeedback(current);
        return res.json({ success: true, item: current[index] });
      }
      return res.status(404).json({ error: 'Item not found' });
    }

    // Delete action
    if (body.action === 'delete') {
      const filtered = current.filter(f => f.id !== body.id);
      await writeFeedback(filtered);
      return res.json({ success: true });
    }

    // New feedback submission
    const newItem = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: body.type || 'QUESTION',
      userName: body.userName || 'Student',
      userEmail: body.userEmail || '',
      message: body.message || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      adminReply: '',
      repliedAt: ''
    };

    await writeFeedback([newItem, ...current]);
    res.json({ success: true, item: newItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CLICK TRACKING API
// ============================================================
app.get('/api/track-click', async (req, res) => {
  try {
    const clicks = await readClicks();
    res.json(clicks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DOWNLOAD CENTER API - ✅ NO DUPLICATES
// ============================================================

// GET Download Config
app.get('/api/downloads/config', async (req, res) => {
  try {
    const config = await readDownloads();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Download Config (Admin saves settings)
app.post('/api/downloads/config', async (req, res) => {
  try {
    const current = await readDownloads();
    const body = req.body || {};

    const parseNotes = (val, fallback) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return val.split('\n').map(s => s.trim()).filter(Boolean);
      return fallback;
    };

    const updated = {
      ...current,
      published: body.published !== undefined ? Boolean(body.published) : current.published,
      globalMaintenance: body.globalMaintenance !== undefined
        ? Boolean(body.globalMaintenance) : current.globalMaintenance,
      android: {
        ...current.android,
        ...(body.android || {}),
        version: body.android?.version || current.android.version,
        latestVersion: body.android?.version || body.android?.latestVersion || current.android.latestVersion,
        minVersion: body.android?.minVersion || current.android.minVersion,
        minSupportedVersion: body.android?.minVersion || current.android.minSupportedVersion,
        downloadUrl: body.android?.downloadUrl || current.android.downloadUrl,
        apkUrl: body.android?.downloadUrl || current.android.apkUrl,
        fileSize: body.android?.fileSize || current.android.fileSize,
        checksum: body.android?.checksum || current.android.checksum,
        sha256: body.android?.checksum || current.android.sha256,
        releaseNotes: parseNotes(body.android?.releaseNotes, current.android.releaseNotes),
        maintenance: body.android?.maintenance !== undefined
          ? Boolean(body.android.maintenance) : current.android.maintenance,
        maintenanceMode: body.android?.maintenance !== undefined
          ? Boolean(body.android.maintenance) : current.android.maintenanceMode,
        forceUpdate: body.android?.forceUpdate !== undefined
          ? Boolean(body.android.forceUpdate) : current.android.forceUpdate
      },
      windows: {
        ...current.windows,
        ...(body.windows || {}),
        version: body.windows?.version || current.windows.version,
        latestVersion: body.windows?.version || body.windows?.latestVersion || current.windows.latestVersion,
        minVersion: body.windows?.minVersion || current.windows.minVersion,
        minSupportedVersion: body.windows?.minVersion || current.windows.minSupportedVersion,
        downloadUrl: body.windows?.downloadUrl || current.windows.downloadUrl,
        exeUrl: body.windows?.downloadUrl || current.windows.exeUrl,
        fileSize: body.windows?.fileSize || current.windows.fileSize,
        checksum: body.windows?.checksum || current.windows.checksum,
        sha256: body.windows?.checksum || current.windows.sha256,
        releaseNotes: parseNotes(body.windows?.releaseNotes, current.windows.releaseNotes),
        maintenance: body.windows?.maintenance !== undefined
          ? Boolean(body.windows.maintenance) : current.windows.maintenance,
        maintenanceMode: body.windows?.maintenance !== undefined
          ? Boolean(body.windows.maintenance) : current.windows.maintenanceMode,
        forceUpdate: body.windows?.forceUpdate !== undefined
          ? Boolean(body.windows.forceUpdate) : current.windows.forceUpdate
      },
      updatedAt: new Date().toISOString()
    };

    await writeDownloads(updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Student Registration
app.post('/api/downloads/register-student', async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const students = await readStudents();
    const emailLower = String(email).trim().toLowerCase();
    const existingIdx = students.findIndex(
      s => (s.email || '').toLowerCase() === emailLower
    );

    const now = new Date().toISOString();
    let studentObj;

    if (existingIdx !== -1) {
      // Existing student - update & return
      studentObj = {
        ...students[existingIdx],
        name: String(name).trim(),
        lastActive: now
      };
      students[existingIdx] = studentObj;
    } else {
      // New student
      const year = new Date().getFullYear();
      const randId = `NEX-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
      studentObj = {
        studentId: randId,
        name: String(name).trim(),
        email: emailLower,
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

// Get All Students (Admin)
app.get('/api/downloads/students', async (req, res) => {
  try {
    const students = await readStudents();
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Track Download
app.post('/api/downloads/track', async (req, res) => {
  try {
    const { platform, version, studentId, studentName, studentEmail } = req.body || {};
    const analytics = await readDlAnalytics();

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

    analytics.history = [logEntry, ...(analytics.history || [])].slice(0, 200);
    await writeDlAnalytics(analytics);

    // Update student download count
    if (studentEmail || studentId) {
      const students = await readStudents();
      const sIdx = students.findIndex(
        s => s.studentId === studentId || (s.email && s.email === studentEmail)
      );
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

// Verify Download Token
app.post('/api/downloads/verify-token', (req, res) => {
  try {
    const { platform, version, studentId } = req.body || {};
    const token = 'NEX-DL-' + uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    res.json({
      success: true,
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      platform,
      version,
      studentId: studentId || 'STUDENT'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Download Analytics (Admin)
app.get('/api/downloads/analytics', async (req, res) => {
  try {
    const analytics = await readDlAnalytics();
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// CATCH-ALL → Serve Frontend
// ============================================================
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// ============================================================
// SERVER START
// ============================================================
if (require.main === module) {
  // Ensure data directory exists on startup
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  app.listen(PORT, () => {
    console.log(`✅ NEXORA Backend running on port ${PORT}`);
    console.log(`📡 Health: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
