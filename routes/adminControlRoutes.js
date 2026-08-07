const express = require('express');
const router = express.Router();
const { getRedisClient } = require('../services/redisClient');

// Get global activation status
router.get('/activation/status', async (req, res) => {
  try {
    const redis = getRedisClient();
    let enabled = true;
    if (redis) {
      const val = await redis.get('settings:activation:enabled');
      if (val !== null && val !== undefined) enabled = (val === true || val === 'true');
    }
    res.json({ success: true, enabled });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle global activation requirement
router.post('/activation/toggle', async (req, res) => {
  try {
    const { enabled } = req.body || {};
    const redis = getRedisClient();
    if (redis) {
      await redis.set('settings:activation:enabled', String(Boolean(enabled)));
    }
    res.json({ success: true, enabled: Boolean(enabled) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all activation codes & bound devices
router.get('/codes', async (req, res) => {
  try {
    const redis = getRedisClient();
    if (!redis) return res.json({ success: true, data: [] });

    const keys = await redis.keys('activation:*');
    const codes = [];

    for (const key of keys) {
      const raw = await redis.get(key);
      if (raw) {
        codes.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
      }
    }

    res.json({ success: true, data: codes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke activation code
router.post('/code/revoke', async (req, res) => {
  try {
    const { code } = req.body || {};
    const redis = getRedisClient();
    if (redis && code) {
      const raw = await redis.get(`activation:${code}`);
      if (raw) {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        obj.status = 'REVOKED';
        await redis.set(`activation:${code}`, JSON.stringify(obj));
      }
    }
    res.json({ success: true, message: 'Code revoked successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset bound device fingerprint
router.post('/device/reset', async (req, res) => {
  try {
    const { code } = req.body || {};
    const redis = getRedisClient();
    if (redis && code) {
      const raw = await redis.get(`activation:${code}`);
      if (raw) {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (obj.deviceFingerprint) {
          await redis.del(`device:${obj.deviceFingerprint}`);
        }
        obj.deviceFingerprint = null;
        obj.status = 'PENDING';
        obj.usedAt = null;
        await redis.set(`activation:${code}`, JSON.stringify(obj));
      }
    }
    res.json({ success: true, message: 'Device binding reset successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ban Student
router.post('/student/ban', async (req, res) => {
  try {
    const { email } = req.body || {};
    const redis = getRedisClient();
    if (redis && email) {
      const emailLower = String(email).trim().toLowerCase();
      const raw = await redis.get(`student:${emailLower}`);
      if (raw) {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        obj.status = 'BANNED';
        await redis.set(`student:${emailLower}`, JSON.stringify(obj));
      }
    }
    res.json({ success: true, message: 'Student banned successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save Popup Announcement
router.post('/popup/save', async (req, res) => {
  try {
    const { enabled, type, title, message, buttonText, buttonUrl, targetAudience } = req.body || {};
    const redis = getRedisClient();

    const popupObj = {
      id: 'popup_' + Date.now(),
      enabled: Boolean(enabled),
      type: type || 'info',
      title: title || '',
      message: message || '',
      buttonText: buttonText || '',
      buttonUrl: buttonUrl || '',
      targetAudience: targetAudience || 'all',
      updatedAt: new Date().toISOString()
    };

    if (redis) {
      await redis.set('popup:current', JSON.stringify(popupObj));
    }

    res.json({ success: true, data: popupObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
