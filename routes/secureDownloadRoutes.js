const express = require('express');
const router = express.Router();
const axios = require('axios');
const { createDownloadToken, validateAndConsumeToken } = require('../services/tokenService');
const { getRedisClient } = require('../services/redisClient');

// Step 1: Issue temporary 60s download token
router.post('/request-token', async (req, res) => {
  try {
    const { platform, studentId } = req.body || {};
    const result = await createDownloadToken(platform, studentId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Step 2: Secure Stream File Download (Hides GitHub URLs)
router.get('/secure/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const valid = await validateAndConsumeToken(token);

    if (!valid) {
      return res.status(403).send('Download token expired or invalid. Please initiate download from NEXORA Download Center.');
    }

    const platform = valid.platform || 'android';
    const redis = getRedisClient();

    // Read current download config to get GitHub URL
    let config = null;
    if (redis) {
      try {
        const raw = await redis.get('nexora_download_config');
        if (raw) config = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {}
    }

    const isAndroid = platform.toLowerCase() === 'android';
    const release = isAndroid ? config?.android : config?.windows;
    const githubUrl = release?.downloadUrl || release?.apkUrl || release?.exeUrl || (
      isAndroid 
        ? 'https://github.com/NEXORA7353/NEXORA/releases/latest/download/NEXORA.apk'
        : 'https://github.com/NEXORA7353/NEXORA/releases/latest/download/NEXORA.Setup.1.0.0.exe'
    );

    const filename = isAndroid ? 'NEXORA.apk' : 'NEXORA.Setup.exe';
    const contentType = isAndroid ? 'application/vnd.android.package-archive' : 'application/octet-stream';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);

    // Stream file server-side directly from GitHub
    const githubStream = await axios({
      method: 'GET',
      url: githubUrl,
      responseType: 'stream',
      maxRedirects: 5
    });

    githubStream.data.pipe(res);

  } catch (err) {
    console.error('Secure Stream error:', err.message);
    res.status(500).send('File streaming failed. Please try again later.');
  }
});

module.exports = router;
