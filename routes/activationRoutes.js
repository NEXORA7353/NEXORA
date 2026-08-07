const express = require('express');
const router = express.Router();
const { verifyAndActivateDevice } = require('../services/activationService');

// App Activation Endpoint
router.post('/verify', async (req, res) => {
  try {
    const { email, activationCode, deviceFingerprint, platform, appVersion } = req.body || {};

    if (!email || !activationCode || !deviceFingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Email, activation code, and hardware device fingerprint are required.'
      });
    }

    const result = await verifyAndActivateDevice({
      email,
      activationCode,
      deviceFingerprint,
      platform,
      appVersion
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
