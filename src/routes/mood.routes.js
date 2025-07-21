// src/routes/mood.routes.js
import { Router } from 'express';
import moodController from '../controllers/mood.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createRateLimit } from '../middleware/rate-limit.middleware.js';

const router = Router();

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
 * @body    {type, emotion, intensity, note?, tags?, location?, context?, privacy?, source?}
 */
router.post('/', authMiddleware, moodController.logMood);

/**
 * @route   GET /api/moods
 * @desc    Get user's mood entries
 * @access  Private (requires authentication)
 * @query   {limit?, offset?, startDate?, endDate?, type?, minIntensity?, maxIntensity?}
 */
router.get('/', authMiddleware, moodController.getUserMoods);

/**
 * @route   GET /api/moods/combined
 * @desc    Get combined moods and emotions
 * @access  Private (requires authentication)
 * @query   {limit?, offset?, startDate?, endDate?}
 */
router.get('/combined', authMiddleware, moodController.getCombinedMoodsEmotions);

/**
 * @route   DELETE /api/moods/clear-history
 * @desc    Clear user's mood history
 * @access  Private (requires authentication)
 */
router.delete('/clear-history', authMiddleware, moodController.clearMoodHistory);

/**
 * @route   GET /api/moods/debug
 * @desc    Debug endpoint to check user mood data
 * @access  Private (requires authentication)
 */
router.get('/debug', authMiddleware, moodController.debugUserMoods);

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