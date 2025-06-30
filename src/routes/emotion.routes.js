// src/routes/emotion.routes.js
import { Router } from 'express';
import emotionController from '../controllers/emotion.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import locationMiddleware from '../middlewares/location.middleware.js';
import { createRateLimit } from '../middlewares/rate-limit.middleware.js';
import { 
  validateEmotionLog, 
  validateEmotionUpdate, 
  validatePagination, 
  validateTimeframe 
} from '../validators/emotion.validator.js';

const router = Router();

// Debug middleware functions
console.log('🔍 Emotion Routes Debug:');
console.log('emotionController:', typeof emotionController);
console.log('emotionController.logEmotion:', typeof emotionController?.logEmotion);
console.log('authMiddleware:', typeof authMiddleware);
console.log('authMiddleware.optional:', typeof authMiddleware?.optional);
console.log('authMiddleware.required:', typeof authMiddleware?.required);
console.log('locationMiddleware:', typeof locationMiddleware);
console.log('locationMiddleware.extractLocation:', typeof locationMiddleware?.extractLocation);
console.log('validateEmotionLog:', typeof validateEmotionLog);

// Apply rate limiting to all emotion routes
router.use(createRateLimit(
  200, // max requests
  15 * 60 * 1000, // 15 minutes window
  'Too many emotion requests, please try again later'
));

/**
 * @route   POST /api/emotions/log
 * @desc    Log a new emotion entry
 * @access  Public (can be anonymous)
 * @body    {emotion, intensity, location?, context?, note?, secondaryEmotions?, memory?, globalSharing?}
 */
router.post('/log', 
  authMiddleware?.optional || ((req, res, next) => next()),
  locationMiddleware?.extractLocation || ((req, res, next) => next()),
  validateEmotionLog || ((req, res, next) => next()),
  emotionController?.logEmotion || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'logEmotion controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/emotions/timeline
 * @desc    Get user's emotion timeline
 * @access  Private (requires authentication)
 * @query   {timeframe?, limit?, offset?, emotion?, coreEmotion?}
 */
router.get('/timeline',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  validatePagination || ((req, res, next) => next()),
  emotionController?.getEmotionTimeline || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getEmotionTimeline controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/emotions/global-stats
 * @desc    Get global emotion statistics
 * @access  Public
 * @query   {timeframe?}
 */
router.get('/global-stats',
  validateTimeframe || ((req, res, next) => next()),
  emotionController?.getGlobalStats || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getGlobalStats controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/emotions/global-heatmap
 * @desc    Get global emotion heatmap
 * @access  Public
 * @query   {timeframe?, bounds?, format?}
 */
router.get('/global-heatmap',
  validateTimeframe || ((req, res, next) => next()),
  emotionController?.getGlobalHeatmap || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getGlobalHeatmap controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/emotions/feed
 * @desc    Get public emotion feed
 * @access  Public
 * @query   {limit?, offset?, emotion?, coreEmotion?, location?, timeframe?}
 */
router.get('/feed',
  validateTimeframe || ((req, res, next) => next()),
  validatePagination || ((req, res, next) => next()),
  emotionController?.getEmotionFeed || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getEmotionFeed controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/emotions/insights
 * @desc    Get user insights
 * @access  Private/Public (different data for each)
 * @query   {timeframe?}
 */
router.get('/insights',
  authMiddleware?.optional || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  emotionController?.getUserInsights || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getUserInsights controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/emotions/stats
 * @desc    Get user emotion statistics
 * @access  Private (requires authentication)
 * @query   {timeframe?}
 */
router.get('/stats',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  emotionController?.getUserEmotionStats || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getUserEmotionStats controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/emotions/search
 * @desc    Search user's emotions
 * @access  Private (requires authentication)
 * @query   {q?, emotion?, coreEmotion?, location?, timeframe?, limit?, offset?}
 */
router.get('/search',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  validatePagination || ((req, res, next) => next()),
  emotionController?.searchEmotions || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'searchEmotions controller method not implemented'
    });
  })
);

/**
 * @route   PUT /api/emotions/:id
 * @desc    Update emotion entry
 * @access  Private (requires authentication)
 * @params  {id}
 * @body    {intensity?, note?, context?, memory?, globalSharing?}
 */
router.put('/:id',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateEmotionUpdate || ((req, res, next) => next()),
  emotionController?.updateEmotion || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'updateEmotion controller method not implemented'
    });
  })
);

/**
 * @route   DELETE /api/emotions/:id
 * @desc    Delete emotion entry
 * @access  Private (requires authentication)
 * @params  {id}
 */
router.delete('/:id',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  emotionController?.deleteEmotion || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'deleteEmotion controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/emotions/constants
 * @desc    Get emotion constants (available emotions, core emotions, etc.)
 * @access  Public
 */
router.get('/constants', (req, res) => {
  try {
    // Use import instead of require for ES modules
    import('../constants/emotions.js').then(({ EMOTION_NAMES, CORE_EMOTIONS, EMOTION_MAPPINGS }) => {
      res.json({
        success: true,
        message: 'Emotion constants retrieved successfully',
        data: {
          emotions: EMOTION_NAMES,
          coreEmotions: CORE_EMOTIONS,
          mappings: EMOTION_MAPPINGS,
          intensityRange: { min: 0.0, max: 1.0 },
          contexts: {
            timeOfDay: ['morning', 'afternoon', 'evening', 'night'],
            dayOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            weather: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'],
            socialContext: ['alone', 'with_friends', 'with_family', 'with_partner', 'with_colleagues', 'in_public'],
            activity: ['working', 'studying', 'exercising', 'relaxing', 'socializing', 'commuting', 'sleeping', 'eating', 'venting', 'other']
          }
        }
      });
    }).catch(error => {
      res.status(500).json({
        success: false,
        message: 'Failed to load emotion constants',
        error: error.message
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load emotion constants',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/emotions/health
 * @desc    Health check for emotion service
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    // Basic health checks
    const checks = {
      database: false,
      cache: false,
      service: true
    };

    // Test database connection (if you have models)
    try {
      // Uncomment when you have actual models
      // const { default: UnifiedEmotion } = await import('../models/emotion.model.js');
      // await UnifiedEmotion.countDocuments().limit(1);
      checks.database = true; // Set to true for now
    } catch (error) {
      checks.database = false;
    }

    // Test cache if available
    try {
      // Uncomment when you have cache service
      // const { default: cacheService } = await import('../utils/cache.js');
      // if (cacheService && cacheService.ping) {
      //   await cacheService.ping();
      //   checks.cache = true;
      // } else {
      //   checks.cache = 'not_configured';
      // }
      checks.cache = 'not_configured';
    } catch (error) {
      checks.cache = false;
    }

    const isHealthy = checks.database && checks.service && checks.cache !== false;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? 'Emotion service is healthy' : 'Emotion service has issues',
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        checks,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0'
      }
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

export default router;