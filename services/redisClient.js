const { Redis } = require('@upstash/redis');

let redisInstance = null;

function getRedisClient() {
  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL || 'https://legible-loon-84378.upstash.io';
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';
    if (url && token) {
      try {
        redisInstance = new Redis({ url, token });
      } catch (e) {
        console.error('Failed to initialize Upstash Redis client:', e.message);
      }
    }
  }
  return redisInstance;
}

module.exports = { getRedisClient };
