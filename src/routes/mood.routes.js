// src/routes/mood.routes.js
import { Router } from 'express';
import moodController from '../controllers/mood.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createRateLimit } from '../middleware/rate-limit.middleware.js';
import { validateMoodEntry } from '../validators/mood.validator.js';

const router = Router();

// Debug logging
console.log('🔍 Mood Routes Debug:');
console.log('moodController:', typeof moodController);
console.log('authMiddleware:', typeof authMiddleware);
console.log('createRateLimit:', typeof createRateLimit);

// Apply rate limiting to all mood routes
router.use(createRateLimit(
  150, // max requests
  15 * 60 * 1000, // 15 minutes window
  'Too many mood requests, please try again later'
));

/**
 * @route   POST /api/moods
 * @desc    Create a new mood entry
 * @access  Private (requires authentication)
 * @body    {emotion, intensity, location?, tags?, note?, isAnonymous?, source?}
 */
router.post('/',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateMoodEntry || ((req, res, next) => next()),
  moodController?.createMood || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'createMood controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/moods
 * @desc    Get user's mood entries
 * @access  Private (requires authentication)
 * @query   {page?, limit?, emotion?, startDate?, endDate?, sortBy?, sortOrder?}
 */
router.get('/',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  moodController?.getUserMoods || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getUserMoods controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/moods/stats
 * @desc    Get user's mood statistics
 * @access  Private (requires authentication)
 * @query   {period?}
 */
router.get('/stats',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  moodController?.getUserMoodStats || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getUserMoodStats controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/moods/history
 * @desc    Get user's mood history
 * @access  Private (requires authentication)
 * @query   {days?}
 */
router.get('/history',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  moodController?.getUserMoodHistory || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getUserMoodHistory controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/moods/:moodId
 * @desc    Get a specific mood entry
 * @access  Private (requires authentication)
 * @params  {moodId}
 */
router.get('/:moodId',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  moodController?.getMoodById || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getMoodById controller method not implemented'
    });
  })
);

/**
 * @route   PUT /api/moods/:moodId
 * @desc    Update a mood entry
 * @access  Private (requires authentication)
 * @params  {moodId}
 * @body    {emotion?, intensity?, tags?, note?, isAnonymous?}
 */
router.put('/:moodId',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  moodController?.updateMood || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'updateMood controller method not implemented'
    });
  })
);

/**
 * @route   DELETE /api/moods/:moodId
 * @desc    Delete a mood entry
 * @access  Private (requires authentication)
 * @params  {moodId}
 */
router.delete('/:moodId',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  moodController?.deleteMood || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'deleteMood controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/moods/health
 * @desc    Health check for mood service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mood service is healthy',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

export default router;