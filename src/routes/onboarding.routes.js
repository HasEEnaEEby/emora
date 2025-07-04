// src/routes/onboarding.routes.js - SIMPLE FIX VERSION
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import authMiddleware from '../middlewares/auth.middleware.js';
import onboardingController from '../controllers/onboarding.controller.js';
import { createRateLimit } from '../middlewares/rate-limit.middleware.js';

const router = express.Router();

// Helper function to check validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * @route   GET /api/onboarding/steps
 * @desc    Get onboarding steps
 * @access  Public
 */
router.get('/steps', onboardingController.getOnboardingSteps);

/**
 * @route   GET /api/onboarding/check-username/:username
 * @desc    Check if username is available
 * @access  Public
 * @params  {username}
 */
router.get('/check-username/:username', [
  param('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  handleValidationErrors,
  createRateLimit(10, 60 * 1000, 'Too many username checks'),
], onboardingController.checkUsernameAvailability);

/**
 * @route   POST /api/onboarding/user-data
 * @desc    Save user onboarding data (anonymous)
 * @access  Public
 */
router.post('/user-data', [
  // No validation needed for anonymous data saving
  createRateLimit(20, 60 * 1000, 'Too many data save attempts'),
], onboardingController.saveUserOnboardingData);

/**
 * @route   POST /api/onboarding/complete
 * @desc    Complete anonymous onboarding
 * @access  Public
 */
router.post('/complete', [
  // No validation needed for anonymous completion
  createRateLimit(5, 60 * 1000, 'Too many completion attempts'),
], onboardingController.completeOnboarding);

/**
 * @route   POST /api/onboarding/register
 * @desc    Register user with onboarding data
 * @access  Public
 * @body    {username, password, email, pronouns?, ageGroup?, selectedAvatar?, location?, latitude?, longitude?}
 */
router.post('/register', [
  // Simple validation - let the controller handle the heavy lifting
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required'),
  
  handleValidationErrors,
  createRateLimit(3, 15 * 60 * 1000, 'Too many registration attempts'),
], onboardingController.registerUser);

/**
 * @route   POST /api/onboarding/login
 * @desc    Login existing user
 * @access  Public
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
  createRateLimit(5, 15 * 60 * 1000, 'Too many login attempts'),
], onboardingController.loginUser);

/**
 * @route   GET /api/onboarding/health
 * @desc    Onboarding service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: true,
        onboarding: true,
        registration: true,
        authentication: true
      },
      endpoints: {
        steps: '/api/onboarding/steps',
        register: '/api/onboarding/register',
        login: '/api/onboarding/login',
        checkUsername: '/api/onboarding/check-username/:username'
      },
      version: '1.0.0'
    };

    res.json({
      status: 'success',
      message: 'Onboarding service is healthy',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Onboarding service health check failed',
      error: error.message
    });
  }
});

export default router;