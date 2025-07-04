import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { createErrorResponse } from '../utils/response.js';

const auth = async (req, res, next) => {
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

const authMiddleware = {
  required: async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json(createErrorResponse('Access denied. No token provided.'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      req.user = {
        userId: decoded.userId || decoded.id,
        username: decoded.username,
        id: decoded.userId || decoded.id
      };
      
      next();
    } catch (error) {
      return res.status(401).json(createErrorResponse('Invalid token.'));
    }
  },

  optional: async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (token) {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = {
          userId: decoded.userId || decoded.id,
          username: decoded.username,
          id: decoded.userId || decoded.id
        };
      }
      
      next();
    } catch (error) {
      next();
    }
  }
};

authMiddleware.auth = auth;

// Export individual functions
export { auth };
export const authenticate = authMiddleware.required;
export const optionalAuth = authMiddleware.optional;

export default authMiddleware;