import dotenv from 'dotenv';
dotenv.config();

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/emora',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'emora-super-secret-jwt-key-for-development-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // Client
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // External APIs
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  WEATHER_API_KEY: process.env.WEATHER_API_KEY,
  
  // Push Notifications
  FCM_SERVER_KEY: process.env.FCM_SERVER_KEY,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100, // requests per window
  
  // Caching
  CACHE_TTL: 300, // 5 minutes
  
  // Privacy
  LOCATION_PRECISION: 0.01, // Reduce coordinate precision for privacy
};

export default config;