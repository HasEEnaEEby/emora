// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { createAuthErrorResponse } from '../utils/response.js';

// Main auth function (for backward compatibility)
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(createAuthErrorResponse('Access denied. No token provided.'));
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(createAuthErrorResponse('Invalid token.'));
  }
};

// Auth middleware object with required and optional methods
const authMiddleware = {
  // Required authentication - must have valid token
  required: async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json(createAuthErrorResponse('Access denied. No token provided.'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json(createAuthErrorResponse('Invalid token.'));
    }
  },

  // Optional authentication - don't fail if no token
  optional: async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (token) {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
      }
      
      next();
    } catch (error) {
      // Don't fail, just continue without user
      next();
    }
  },

  // Admin authentication
  admin: async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json(createAuthErrorResponse('Access denied. No token provided.'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      if (!decoded.isAdmin) {
        return res.status(403).json(createAuthErrorResponse('Access denied. Admin privileges required.'));
      }

      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json(createAuthErrorResponse('Invalid token.'));
    }
  }
};

// For backward compatibility, make auth function accessible
authMiddleware.auth = auth;

export { auth };
export default authMiddleware;