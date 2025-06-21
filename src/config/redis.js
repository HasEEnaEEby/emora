import redis from 'redis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisClient = null;

const connectRedis = async () => {
  // Skip Redis completely in development
  if (config.NODE_ENV === 'development') {
    logger.info('🔴 Redis disabled in development mode');
    return null;
  }

  // Only try Redis in production or when explicitly enabled
  if (!process.env.REDIS_URL) {
    logger.info('🔴 Redis not configured - skipping');
    return null;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 2000,
        lazyConnect: true
      }
    });

    // Only log successful connections
    redisClient.on('connect', () => {
      logger.info('🔴 Redis connected');
    });

    // Disable error retry loop
    redisClient.on('error', (err) => {
      logger.warn('🔴 Redis unavailable - continuing without cache');
      redisClient = null;
      return; // Don't retry
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.info('🔴 Redis skipped - continuing without cache');
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