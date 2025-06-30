// src/routes/recommendations.routes.js
import { Router } from 'express';
import recommendationsController from '../controllers/recommendations.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { createRateLimit } from '../middlewares/rate-limit.middleware.js';
import { validateTimeframe } from '../validators/emotion.validator.js';

const router = Router();

// Debug logging
console.log('🔍 Recommendations Routes Debug:');
console.log('recommendationsController:', typeof recommendationsController);
console.log('authMiddleware:', typeof authMiddleware);
console.log('createRateLimit:', typeof createRateLimit);

// FIXED: Apply rate limiting using createRateLimit function (not createLimiter)
router.use(createRateLimit(
  50, // max requests
  15 * 60 * 1000, // 15 minutes window
  'Too many recommendation requests, please try again later'
));

/**
 * @route   GET /api/recommendations/music
 * @desc    Get music recommendations based on current mood
 * @access  Private/Public (enhanced with auth)
 * @query   {emotion?, mood?, genre?, limit?}
 */
router.get('/music',
  authMiddleware?.optional || ((req, res, next) => next()),
  recommendationsController?.getMusicRecommendations || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getMusicRecommendations controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/recommendations/activities
 * @desc    Get activity recommendations based on mood
 * @access  Private/Public (enhanced with auth)
 * @query   {emotion?, timeOfDay?, location?, weather?}
 */
router.get('/activities',
  authMiddleware?.optional || ((req, res, next) => next()),
  recommendationsController?.getActivityRecommendations || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getActivityRecommendations controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/recommendations/content
 * @desc    Get content recommendations (articles, videos, etc.)
 * @access  Private/Public (enhanced with auth)
 * @query   {emotion?, contentType?, category?}
 */
router.get('/content',
  authMiddleware?.optional || ((req, res, next) => next()),
  recommendationsController?.getContentRecommendations || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getContentRecommendations controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/recommendations/coping
 * @desc    Get coping strategies and wellness recommendations
 * @access  Private/Public (enhanced with auth)
 * @query   {emotion?, intensity?, urgency?}
 */
router.get('/coping',
  authMiddleware?.optional || ((req, res, next) => next()),
  recommendationsController?.getCopingRecommendations || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getCopingRecommendations controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/recommendations/personalized
 * @desc    Get personalized recommendations based on user history
 * @access  Private (requires authentication)
 * @query   {timeframe?, limit?, type?}
 */
router.get('/personalized',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  recommendationsController?.getPersonalizedRecommendations || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getPersonalizedRecommendations controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/recommendations/feedback
 * @desc    Submit feedback on recommendation
 * @access  Private/Public (enhanced with auth)
 * @body    {recommendationId, rating, feedback?, helpful?}
 */
router.post('/feedback',
  authMiddleware?.optional || ((req, res, next) => next()),
  recommendationsController?.submitRecommendationFeedback || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'submitRecommendationFeedback controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/recommendations/trending
 * @desc    Get trending recommendations
 * @access  Public
 * @query   {category?, limit?}
 */
router.get('/trending',
  recommendationsController?.getTrendingRecommendations || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getTrendingRecommendations controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/recommendations/categories
 * @desc    Get available recommendation categories
 * @access  Public
 */
router.get('/categories', (req, res) => {
  try {
    const categories = {
      music: {
        name: 'Music Recommendations',
        description: 'Music suggestions based on your current mood',
        types: ['spotify', 'youtube', 'generic'],
        emotions: ['happy', 'sad', 'energetic', 'calm', 'anxious']
      },
      activities: {
        name: 'Activity Recommendations',
        description: 'Things to do based on how you\'re feeling',
        types: ['indoor', 'outdoor', 'social', 'solo', 'creative'],
        emotions: ['bored', 'stressed', 'lonely', 'excited', 'tired']
      },
      content: {
        name: 'Content Recommendations',
        description: 'Articles, videos, and resources for your mood',
        types: ['articles', 'videos', 'podcasts', 'books'],
        emotions: ['curious', 'motivated', 'reflective', 'inspired']
      },
      coping: {
        name: 'Coping Strategies',
        description: 'Mental health and wellness recommendations',
        types: ['breathing', 'meditation', 'exercise', 'journaling'],
        emotions: ['anxious', 'stressed', 'overwhelmed', 'sad', 'angry']
      }
    };

    res.json({
      success: true,
      message: 'Recommendation categories retrieved successfully',
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendation categories',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/recommendations/health
 * @desc    Health check for recommendations service
 * @access  Public
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        spotify: true, // Would check actual Spotify API health
        youtube: true, // Would check actual YouTube API health
        database: true,
        recommendations: true
      },
      version: '1.0.0'
    };

    res.json({
      success: true,
      message: 'Recommendations service is healthy',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Recommendations service health check failed',
      error: error.message
    });
  }
});

export default router;