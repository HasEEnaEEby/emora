import expressRateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Enhanced rate limiter factory function
export const rateLimit = (options) => {
  return createRateLimit(options.max, options.windowMs, options.message, options.keyGenerator);
};

export const createRateLimit = (max, windowMs, message = 'Too many requests', keyGenerator = null) => {
  return expressRateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message,
      retryAfter: Math.ceil(windowMs / 1000),
      errorCode: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => {
      // Create more specific keys for different types of requests
      const baseKey = req.user?.userId || req.ip;
      const route = req.route?.path || req.path;
      const method = req.method;
      
      // For username checks, include the username in the key
      if (route.includes('check-username')) {
        const username = req.query.username || req.body.username || 'anonymous';
        return `${baseKey}:${method}:${route}:${username}`;
      }
      
      // For login/register, include username for more targeted limiting
      if (route.includes('login') || route.includes('register')) {
        const username = req.body.username || 'anonymous';
        return `${baseKey}:${method}:${route}:${username}`;
      }
      
      return `${baseKey}:${method}:${route}`;
    }),
    handler: (req, res) => {
      const userInfo = req.user?.userId || req.ip;
      const route = req.route?.path || req.path;
      
      logger.warn(`Rate limit exceeded for ${userInfo} on ${route}`, {
        userId: req.user?.userId,
        ip: req.ip,
        route,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        status: 'error',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
        errorCode: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString()
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health' || req.path === '/health';
    }
  });
};

// Specific rate limiters for different endpoints
export const authRateLimiters = {
  // Registration: 3 attempts per 15 minutes per IP+username combo
  registration: createRateLimit(
    3, 
    15 * 60 * 1000, 
    'Too many registration attempts. Please try again later.',
    (req) => `register:${req.ip}:${req.body.username?.toLowerCase() || 'anonymous'}`
  ),

  // Login: 5 attempts per 15 minutes per IP+username combo
  login: createRateLimit(
    5, 
    15 * 60 * 1000, 
    'Too many login attempts. Please try again later.',
    (req) => `login:${req.ip}:${req.body.username?.toLowerCase() || 'anonymous'}`
  ),

  // Username check: 10 attempts per minute per IP
  usernameCheck: createRateLimit(
    10, 
    60 * 1000, 
    'Too many username checks. Please slow down.',
    (req) => `username-check:${req.ip}`
  ),

  // Profile updates: 5 attempts per 5 minutes per user
  profileUpdate: createRateLimit(
    5, 
    5 * 60 * 1000, 
    'Too many profile updates. Please wait before updating again.',
    (req) => `profile-update:${req.user?.userId || req.ip}`
  ),

  // Password operations: 3 attempts per 10 minutes per user
  passwordOperation: createRateLimit(
    3, 
    10 * 60 * 1000, 
    'Too many password operations. Please wait before trying again.',
    (req) => `password-op:${req.user?.userId || req.ip}`
  ),

  // Account deletion: 2 attempts per day per user
  accountDeletion: createRateLimit(
    2, 
    24 * 60 * 60 * 1000, 
    'Too many account deletion attempts.',
    (req) => `delete-account:${req.user?.userId || req.ip}`
  ),

  // General API: 100 requests per 15 minutes per user/IP
  general: createRateLimit(
    100, 
    15 * 60 * 1000, 
    'Too many requests. Please slow down.',
    (req) => `general:${req.user?.userId || req.ip}`
  )
};

// Your existing general rate limit middleware (enhanced)
const rateLimitMiddleware = expressRateLimit({
  windowMs: config.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // 15 minutes
  max: config.RATE_LIMIT_MAX || 100, // 100 requests per window
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.userId || req.ip;
  },
  handler: (req, res) => {
    const userInfo = req.user?.userId || req.ip;
    logger.warn(`General rate limit exceeded for ${userInfo}`, {
      userId: req.user?.userId,
      ip: req.ip,
      route: req.path,
      method: req.method
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((config.RATE_LIMIT_WINDOW || 15 * 60 * 1000) / 1000),
      errorCode: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks and specific paths
    const skipPaths = ['/api/health', '/health', '/api/status'];
    return skipPaths.includes(req.path);
  }
});

// Enhanced middleware that can be applied globally
export const globalRateLimit = (req, res, next) => {
  // Apply different rate limits based on route
  if (req.path.includes('/auth/register')) {
    return authRateLimiters.registration(req, res, next);
  }
  
  if (req.path.includes('/auth/login') || req.path.includes('/auth/quick-access')) {
    return authRateLimiters.login(req, res, next);
  }
  
  if (req.path.includes('/auth/check-username')) {
    return authRateLimiters.usernameCheck(req, res, next);
  }
  
  if (req.path.includes('/auth/profile')) {
    return authRateLimiters.profileUpdate(req, res, next);
  }
  
  if (req.path.includes('/auth/password') || req.path.includes('/auth/add-password') || req.path.includes('/auth/change-password')) {
    return authRateLimiters.passwordOperation(req, res, next);
  }
  
  if (req.path.includes('/auth/account') && req.method === 'DELETE') {
    return authRateLimiters.accountDeletion(req, res, next);
  }
  
  // Default to general rate limiting
  return authRateLimiters.general(req, res, next);
};

export default rateLimitMiddleware;