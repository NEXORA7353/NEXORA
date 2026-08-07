const express = require('express');
const router = express.Router();
const { getRedisClient } = require('../services/redisClient');

// Get active popup for student/platform
router.get('/check', async (req, res) => {
  try {
    const { email, platform } = req.query;
    const redis = getRedisClient();

    if (!redis) {
      return res.json({ hasPopup: false });
    }

    const popupRaw = await redis.get('popup:current');
    if (!popupRaw) return res.json({ hasPopup: false });

    const popup = typeof popupRaw === 'string' ? JSON.parse(popupRaw) : popupRaw;

    if (!popup.enabled) return res.json({ hasPopup: false });

    // Check dismissal
    if (email && popup.id) {
      const dismissed = await redis.get(`popup:dismissed:${email.toLowerCase()}:${popup.id}`);
      if (dismissed) return res.json({ hasPopup: false });
    }

    res.json({
      hasPopup: true,
      popup
    });
  } catch (err) {
    res.status(500).json({ hasPopup: false, error: err.message });
  }
});

// Dismiss popup
router.post('/dismiss', async (req, res) => {
  try {
    const { email, popupId } = req.body || {};
    const redis = getRedisClient();

    if (redis && email && popupId) {
      await redis.set(`popup:dismissed:${email.toLowerCase()}:${popupId}`, new Date().toISOString(), 'EX', 86400 * 7);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
