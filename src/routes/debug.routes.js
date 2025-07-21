// src/routes/debug.routes.js - JWT Debugging Routes
import express from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/user.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Debug JWT token validation
router.post('/debug-jwt', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is required for debugging'
      });
    }

    console.log('. DEBUG JWT - Received token:', token.substring(0, 20) + '...');
    console.log('🔑 DEBUG JWT - Using secret:', config.JWT_SECRET.substring(0, 10) + '...');

    try {
      // Attempt to decode without verification first
      const decoded = jwt.decode(token, { complete: true });
      console.log('. DEBUG JWT - Decoded header:', decoded?.header);
      console.log('. DEBUG JWT - Decoded payload:', decoded?.payload);

      // Now attempt verification
      const verified = jwt.verify(token, config.JWT_SECRET);
      console.log('. DEBUG JWT - Verification successful:', verified);

      // Check if user exists
      const user = await User.findById(verified.userId);
      console.log('. DEBUG JWT - User found:', user ? user.username : 'NOT FOUND');

      return res.json({
        status: 'success',
        message: 'Token is valid',
        data: {
          decoded: decoded,
          verified: verified,
          userExists: !!user,
          userActive: user?.isActive || false,
          jwtSecret: config.JWT_SECRET.substring(0, 10) + '...'
        }
      });

    } catch (jwtError) {
      console.log('. DEBUG JWT - Verification failed:', jwtError.message);
      
      return res.status(401).json({
        status: 'error',
        message: 'Token verification failed',
        error: jwtError.message,
        data: {
          tokenValid: false,
          jwtSecret: config.JWT_SECRET.substring(0, 10) + '...',
          errorType: jwtError.name
        }
      });
    }

  } catch (error) {
    console.log('💥 DEBUG JWT - Unexpected error:', error);
    return res.status(500).json({
      status: 'error', 
      message: 'Debug endpoint error',
      error: error.message
    });
  }
});

// Test auth middleware
router.get('/test-auth', authMiddleware, (req, res) => {
  res.json({
    status: 'success',
    message: 'Auth middleware working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Environment info
router.get('/env-info', (req, res) => {
  res.json({
    status: 'success',
    data: {
      nodeEnv: process.env.NODE_ENV,
      jwtSecretExists: !!process.env.JWT_SECRET,
      jwtSecretFromConfig: !!config.JWT_SECRET,
      jwtSecretPreview: config.JWT_SECRET.substring(0, 10) + '...',
      debugFlags: {
        DEBUG_JWT: process.env.DEBUG_JWT,
        DEBUG_AUTH: process.env.DEBUG_AUTH
      }
    }
  });
});

// Generate test token
router.post('/generate-test-token', async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    if (!userId || !username) {
      return res.status(400).json({
        status: 'error',
        message: 'userId and username are required'
      });
    }

    const token = jwt.sign(
      { userId, username },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('. Generated test token for:', username);

    res.json({
      status: 'success',
      message: 'Test token generated',
      data: {
        token,
        userId,
        username,
        expiresIn: '7d',
        jwtSecret: config.JWT_SECRET.substring(0, 10) + '...'
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate test token',
      error: error.message
    });
  }
});

export default router; 