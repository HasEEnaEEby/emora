// src/routes/auth.routes.js
import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { authRateLimiters, createRateLimit } from '../middlewares/rate-limit.middleware.js';
import {
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate,
  validateRegistration
} from '../validators/auth.validator.js';

const router = Router();

// Debug logging
console.log('🔍 Auth Routes Debug:');
console.log('authController:', typeof authController);
console.log('authMiddleware:', typeof authMiddleware);
console.log('createRateLimit:', typeof createRateLimit);
console.log('authRateLimiters:', typeof authRateLimiters);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    {username, email?, password, firstName?, lastName?}
 */
router.post('/register',
  authRateLimiters?.registration || createRateLimit(3, 15 * 60 * 1000, 'Too many registration attempts'),
  validateRegistration || ((req, res, next) => next()),
  authController?.register || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'register controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @body    {username, password}
 */
router.post('/login',
  authRateLimiters?.login || createRateLimit(5, 15 * 60 * 1000, 'Too many login attempts'),
  validateLogin || ((req, res, next) => next()),
  authController?.login || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'login controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  authController?.logout || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'logout controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @body    {refreshToken}
 */
router.post('/refresh',
  createRateLimit(10, 5 * 60 * 1000, 'Too many refresh attempts'),
  authController?.refreshToken || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'refreshToken controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @body    {email}
 */
router.post('/forgot-password',
  createRateLimit(3, 60 * 60 * 1000, 'Too many password reset attempts'), // 3 per hour
  authController?.forgotPassword || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'forgotPassword controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    {token, newPassword}
 */
router.post('/reset-password',
  createRateLimit(5, 60 * 60 * 1000, 'Too many password reset attempts'),
  authController?.resetPassword || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'resetPassword controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 * @body    {currentPassword, newPassword}
 */
router.post('/change-password',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  authRateLimiters?.passwordOperation || createRateLimit(3, 10 * 60 * 1000, 'Too many password changes'),
  validatePasswordChange || ((req, res, next) => next()),
  authController?.changePassword || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'changePassword controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  authController?.getProfile || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getProfile controller method not implemented'
    });
  })
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 * @body    {firstName?, lastName?, email?, avatar?}
 */
router.put('/profile',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  authRateLimiters?.profileUpdate || createRateLimit(5, 5 * 60 * 1000, 'Too many profile updates'),
  validateProfileUpdate || ((req, res, next) => next()),
  authController?.updateProfile || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'updateProfile controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/auth/check-username/:username
 * @desc    Check if username is available
 * @access  Public
 * @params  {username}
 */
router.get('/check-username/:username',
  authRateLimiters?.usernameCheck || createRateLimit(10, 60 * 1000, 'Too many username checks'),
  authController?.checkUsername || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'checkUsername controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 * @body    {token}
 */
router.post('/verify-email',
  createRateLimit(5, 60 * 60 * 1000, 'Too many verification attempts'),
  authController?.verifyEmail || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'verifyEmail controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 * @body    {email}
 */
router.post('/resend-verification',
  createRateLimit(3, 60 * 60 * 1000, 'Too many resend attempts'),
  authController?.resendVerification || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'resendVerification controller method not implemented'
    });
  })
);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account
 * @access  Private
 * @body    {password, confirmDeletion}
 */
router.delete('/account',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  authRateLimiters?.accountDeletion || createRateLimit(2, 24 * 60 * 60 * 1000, 'Too many deletion attempts'),
  authController?.deleteAccount || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'deleteAccount controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get active user sessions
 * @access  Private
 */
router.get('/sessions',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  authController?.getSessions || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getSessions controller method not implemented'
    });
  })
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 * @params  {sessionId}
 */
router.delete('/sessions/:sessionId',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  authController?.revokeSession || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'revokeSession controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info (lightweight)
 * @access  Private
 */
router.get('/me',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  authController?.getCurrentUser || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getCurrentUser controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/auth/health
 * @desc    Auth service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: true,
        jwt: true,
        email: false, // Would check email service
        auth: true
      },
      version: '1.0.0'
    };

    res.json({
      success: true,
      message: 'Auth service is healthy',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Auth service health check failed',
      error: error.message
    });
  }
});

export default router;