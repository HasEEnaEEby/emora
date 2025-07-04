import redis from 'redis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisClient = null;

const connectRedis = async () => {
  // Skip Redis completely in development unless explicitly enabled
  if (config.NODE_ENV === 'development' && !process.env.FORCE_REDIS) {
    logger.info('🔴 Redis disabled in development mode (set FORCE_REDIS=true to enable)');
    return null;
  }

  // Only try Redis if URL is provided
  if (!process.env.REDIS_URL) {
    logger.info('🔴 Redis not configured - skipping');
    return null;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('🔴 Redis connection failed after 3 retries - continuing without cache');
            return false; // Stop retrying
          }
          return Math.min(retries * 1000, 5000); // Exponential backoff, max 5s
        }
      }
    });

    // Only log successful connections
    redisClient.on('connect', () => {
      logger.info('🔴 Redis connected successfully');
    });

    // Handle connection errors gracefully
    redisClient.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        logger.warn('🔴 Redis unavailable - continuing without cache');
        redisClient = null;
      } else {
        logger.warn('🔴 Redis error:', err.message);
      }
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.info('🔴 Redis connection failed - continuing without cache:', error.message);
    redisClient = null;
    return null;
  }
};

// Graceful Redis operations
export const getRedisClient = () => redisClient;

export const setCache = async (key, value, ttl = 300) => {
  if (!redisClient) return false;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.warn('Cache set failed:', error.message);
    return false;
  }
};

export const getCache = async (key) => {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.warn('Cache get failed:', error.message);
    return null;
  }
};

export const deleteCache = async (key) => {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.warn('Cache delete failed:', error.message);
    return false;
  }
};

export default connectRedis;