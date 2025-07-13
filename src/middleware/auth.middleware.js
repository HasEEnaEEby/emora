// src/middleware/auth.middleware.js - COMPLETE AUTH MIDDLEWARE
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import { createErrorResponse } from '../utils/response.js';

// Main authentication middleware
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required',
        errorCode: 'TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = jwt.verify(
      token, 
      config.JWT_SECRET
    );

    // ✅ DEBUG: Log token verification for development
    if (process.env.DEBUG_JWT === 'true') {
      logger.info('🔑 JWT Token verified successfully', {
        userId: decoded.userId,
        username: decoded.username,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    }

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    console.log('🔑 User:', user);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token',
        errorCode: 'TOKEN_INVALID'
      });
    }

    // Update last active timestamp
    if (user.analytics) {
      user.analytics.lastActiveAt = new Date();
      await user.save();
    }

    // Attach user info to request
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      id: user._id // For backward compatibility
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
        errorCode: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
        errorCode: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
      errorCode: 'AUTH_ERROR'
    });
  }
};

// Optional authentication middleware
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(
          token, 
          config.JWT_SECRET
        );

        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          req.user = {
            userId: user._id,
            username: user.username,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            id: user._id
          };
        }
      } catch (error) {
        // Ignore auth errors for optional auth
        logger.warn('Optional auth failed:', error.message);
      }
    }
    
    next();
  } catch (error) {
    next(); // Continue without authentication for optional auth
  }
};

// Legacy auth function for backward compatibility
export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(createErrorResponse('Access denied. No token provided.'));
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Handle both userId and id from different auth systems
    req.user = {
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      id: decoded.userId || decoded.id
    };
    
    next();
  } catch (error) {
    return res.status(401).json(createErrorResponse('Invalid token.'));
  }
};

// Aliases for different naming conventions
export const authenticate = authMiddleware;
export const required = authMiddleware;

// Default export with multiple auth methods
const authMiddlewareExport = {
  required: authMiddleware,
  optional: optionalAuth,
  auth: auth
};

export default authMiddlewareExport;