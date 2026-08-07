const { getRedisClient } = require('./redisClient');
const crypto = require('crypto');

// Generate persistent Student ID: NEX-YYYY-XXXXX
async function getOrCreateStudent(name, email) {
  const redis = getRedisClient();
  const emailLower = String(email).trim().toLowerCase();
  const studentKey = `student:${emailLower}`;

  if (redis) {
    try {
      const existing = await redis.get(studentKey);
      if (existing) {
        const student = typeof existing === 'string' ? JSON.parse(existing) : existing;
        student.lastLogin = new Date().toISOString();
        if (name && name.trim()) student.name = name.trim();
        await redis.set(studentKey, JSON.stringify(student));
        return student;
      }
    } catch (e) {}
  }

  const year = new Date().getFullYear();
  const randDigits = Math.floor(10000 + Math.random() * 90000);
  const studentId = `NEX-${year}-${randDigits}`;

  const newStudent = {
    studentId,
    name: String(name).trim(),
    email: emailLower,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    status: 'ACTIVE',
    totalDownloads: 0,
    activationCodes: [],
    devices: []
  };

  if (redis) {
    try {
      await redis.set(studentKey, JSON.stringify(newStudent));
      await redis.set(`studentid:${studentId}`, emailLower);
    } catch (e) {}
  }

  return newStudent;
}

// Generate 8-digit Activation Code: XXXX-XXXX
async function generateActivationCode(email, platform) {
  const redis = getRedisClient();
  const emailLower = String(email).trim().toLowerCase();

  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const code = `${randomPart.substring(0, 4)}-${randomPart.substring(4, 8)}`;

  const student = await getOrCreateStudent('Student', emailLower);

  const codeData = {
    code,
    studentId: student.studentId,
    email: emailLower,
    platform: (platform || 'android').toLowerCase(),
    createdAt: new Date().toISOString(),
    usedAt: null,
    deviceFingerprint: null,
    status: 'PENDING'
  };

  if (redis) {
    try {
      await redis.set(`activation:${code}`, JSON.stringify(codeData));
      
      // Update student activationCodes list
      student.activationCodes = student.activationCodes || [];
      student.activationCodes.push(code);
      await redis.set(`student:${emailLower}`, JSON.stringify(student));
    } catch (e) {}
  }

  return codeData;
}

// Verify activation code & bind device fingerprint
async function verifyAndActivateDevice({ email, activationCode, deviceFingerprint, platform, appVersion }) {
  const redis = getRedisClient();
  const emailLower = String(email).trim().toLowerCase();

  // Check master activation setting
  if (redis) {
    try {
      const enabled = await redis.get('settings:activation:enabled');
      if (enabled === false || enabled === 'false') {
        return { success: true, bypassed: true, message: 'Activation system is currently disabled by administrator.' };
      }
    } catch (e) {}
  }

  // Check student status
  let student = null;
  if (redis) {
    try {
      const sVal = await redis.get(`student:${emailLower}`);
      if (sVal) student = typeof sVal === 'string' ? JSON.parse(sVal) : sVal;
    } catch (e) {}
  }

  if (student && student.status === 'BANNED') {
    throw new Error('Your student account has been suspended by the administrator.');
  }

  // Find activation code
  let codeObj = null;
  if (redis) {
    try {
      const cVal = await redis.get(`activation:${activationCode.trim()}`);
      if (cVal) codeObj = typeof cVal === 'string' ? JSON.parse(cVal) : cVal;
    } catch (e) {}
  }

  if (!codeObj) {
    throw new Error('Invalid activation code. Please check and try again.');
  }

  if (codeObj.email !== emailLower) {
    throw new Error("Activation code does not match this email address.");
  }

  if (codeObj.status === 'REVOKED') {
    throw new Error('This activation code has been revoked by an administrator.');
  }

  // Device Fingerprint Binding Logic
  if (codeObj.deviceFingerprint && codeObj.deviceFingerprint !== deviceFingerprint) {
    throw new Error('This activation code is already registered to another device. Contact support for device transfer.');
  }

  // Activate & Bind
  const now = new Date().toISOString();
  codeObj.usedAt = now;
  codeObj.deviceFingerprint = deviceFingerprint;
  codeObj.status = 'ACTIVE';
  codeObj.appVersion = appVersion || '1.0.0';

  const sessionToken = 'NEX-SES-' + crypto.randomBytes(16).toString('hex').toUpperCase();

  if (redis) {
    try {
      await redis.set(`activation:${activationCode.trim()}`, JSON.stringify(codeObj));
      await redis.set(`device:${deviceFingerprint}`, JSON.stringify({
        studentId: codeObj.studentId,
        email: emailLower,
        platform: platform || codeObj.platform,
        activationCode: codeObj.code,
        activatedAt: now,
        lastSeen: now,
        appVersion: appVersion || '1.0.0'
      }));
    } catch (e) {}
  }

  return {
    success: true,
    sessionToken,
    studentInfo: {
      studentId: codeObj.studentId,
      name: student ? student.name : 'Student',
      email: emailLower,
      activatedAt: now
    }
  };
}

module.exports = {
  getOrCreateStudent,
  generateActivationCode,
  verifyAndActivateDevice
};
