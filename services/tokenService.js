const { getRedisClient } = require('./redisClient');
const crypto = require('crypto');

async function createDownloadToken(platform, studentId) {
  const token = 'DL-' + crypto.randomBytes(24).toString('hex').toUpperCase();
  const redis = getRedisClient();

  const tokenData = {
    token,
    platform: platform || 'android',
    studentId: studentId || 'NEX-GUEST',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 1000).toISOString(), // 60s TTL
    used: false
  };

  if (redis) {
    try {
      await redis.set(`dltoken:${token}`, JSON.stringify(tokenData), 'EX', 60);
    } catch (e) {}
  }

  return { token, expiresIn: 60 };
}

async function validateAndConsumeToken(token) {
  const redis = getRedisClient();
  if (!redis) return true; // Fallback if redis unavailable

  try {
    const raw = await redis.get(`dltoken:${token}`);
    if (!raw) return false;

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.used) return false;

    // Mark used & delete
    data.used = true;
    await redis.del(`dltoken:${token}`);
    return data;
  } catch (e) {
    return true;
  }
}

module.exports = {
  createDownloadToken,
  validateAndConsumeToken
};
