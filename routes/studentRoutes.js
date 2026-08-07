const express = require('express');
const router = express.Router();
const { getOrCreateStudent, generateActivationCode } = require('../services/activationService');

// Student registration/login -> Get persistent Student ID
router.post('/register', async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Full name and email are required.' });
    }
    const student = await getOrCreateStudent(name, email);
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate 8-digit Activation Code
router.post('/generate-code', async (req, res) => {
  try {
    const { email, platform } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Student email is required.' });
    }
    const codeObj = await generateActivationCode(email, platform);
    res.json({ success: true, data: codeObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
