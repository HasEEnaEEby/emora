import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const rateLimitMiddleware = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW,
  max: config.RATE_LIMIT_MAX,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator for authenticated users
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  // Skip rate limiting for certain routes if needed
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  }
});

export default rateLimitMiddleware;