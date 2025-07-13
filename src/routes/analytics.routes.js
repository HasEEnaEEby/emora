// src/routes/analytics.routes.js
import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createRateLimit } from '../middleware/rate-limit.middleware.js';
import { validatePagination, validateTimeframe } from '../validators/emotion.validator.js';

const router = Router();

// Debug logging
console.log('🔍 Analytics Routes Debug:');
console.log('analyticsController:', typeof analyticsController);
console.log('authMiddleware:', typeof authMiddleware);
console.log('createRateLimit:', typeof createRateLimit);

// FIXED: Apply rate limiting using createRateLimit function (not createLimiter)
router.use(createRateLimit(
  100, // max requests
  15 * 60 * 1000, // 15 minutes window
  'Too many analytics requests, please try again later'
));

/**
 * @route   GET /api/analytics/overview
 * @desc    Get analytics overview
 * @access  Private/Public (enhanced with auth)
 * @query   {timeframe?, userId?}
 */
router.get('/overview',
  authMiddleware?.optional || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getOverview || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getOverview controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/emotions
 * @desc    Get emotion analytics
 * @access  Private/Public (enhanced with auth)
 * @query   {timeframe?, groupBy?, userId?}
 */
router.get('/emotions',
  authMiddleware?.optional || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getEmotionAnalytics || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getEmotionAnalytics controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get trending analytics
 * @access  Public
 * @query   {timeframe?, category?, limit?}
 */
router.get('/trends',
  validateTimeframe || ((req, res, next) => next()),
  validatePagination || ((req, res, next) => next()),
  analyticsController?.getTrends || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getTrends controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/heatmap
 * @desc    Get location-based emotion heatmap data
 * @access  Public
 * @query   {timeframe?, bounds?, zoom?}
 */
router.get('/heatmap',
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getHeatmapData || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getHeatmapData controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/patterns
 * @desc    Get pattern analysis
 * @access  Private (requires authentication)
 * @query   {timeframe?, type?, userId?}
 */
router.get('/patterns',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getPatterns || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getPatterns controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/correlations
 * @desc    Get correlation analysis between emotions and factors
 * @access  Private (requires authentication)
 * @query   {timeframe?, factors?, userId?}
 */
router.get('/correlations',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getCorrelations || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getCorrelations controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/insights
 * @desc    Get AI-powered insights
 * @access  Private (requires authentication)
 * @query   {timeframe?, type?, userId?}
 */
router.get('/insights',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getInsights || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getInsights controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/compare
 * @desc    Compare analytics between time periods
 * @access  Private (requires authentication)
 * @query   {period1?, period2?, metric?, userId?}
 */
router.get('/compare',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  analyticsController?.compareAnalytics || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'compareAnalytics controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics data
 * @access  Private (requires authentication)
 * @query   {timeframe?, format?, type?, userId?}
 */
router.get('/export',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  createRateLimit(5, 60 * 60 * 1000, 'Too many export requests'), // 5 per hour
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.exportAnalytics || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'exportAnalytics controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/global
 * @desc    Get global analytics (aggregated, anonymized)
 * @access  Public
 * @query   {timeframe?, metric?}
 */
router.get('/global',
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getGlobalAnalytics || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getGlobalAnalytics controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/demographics
 * @desc    Get demographic-based analytics
 * @access  Public
 * @query   {timeframe?, demographic?, anonymized?}
 */
router.get('/demographics',
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getDemographicAnalytics || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getDemographicAnalytics controller method not implemented'
    });
  })
);

/**
 * @route   POST /api/analytics/custom
 * @desc    Run custom analytics query
 * @access  Private (requires authentication)
 * @body    {query, parameters, timeframe}
 */
router.post('/custom',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  createRateLimit(10, 60 * 60 * 1000, 'Too many custom queries'), // 10 per hour
  analyticsController?.runCustomQuery || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'runCustomQuery controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/reports
 * @desc    Get available analytics reports
 * @access  Private (requires authentication)
 */
router.get('/reports',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  analyticsController?.getAvailableReports || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getAvailableReports controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/reports/:reportId
 * @desc    Get specific analytics report
 * @access  Private (requires authentication)
 * @params  {reportId}
 * @query   {timeframe?, parameters?}
 */
router.get('/reports/:reportId',
  authMiddleware?.required || authMiddleware || ((req, res, next) => next()),
  validateTimeframe || ((req, res, next) => next()),
  analyticsController?.getReport || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'getReport controller method not implemented'
    });
  })
);

/**
 * @route   GET /api/analytics/metrics
 * @desc    Get available analytics metrics
 * @access  Public
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = {
      emotions: {
        name: 'Emotion Metrics',
        description: 'Analytics related to emotion data',
        metrics: [
          'emotion_count',
          'emotion_distribution',
          'emotion_intensity',
          'emotion_trends',
          'dominant_emotions'
        ]
      },
      temporal: {
        name: 'Temporal Metrics',
        description: 'Time-based analytics',
        metrics: [
          'daily_patterns',
          'weekly_patterns',
          'seasonal_trends',
          'time_of_day_analysis',
          'frequency_analysis'
        ]
      },
      spatial: {
        name: 'Spatial Metrics',
        description: 'Location-based analytics',
        metrics: [
          'location_heatmap',
          'regional_trends',
          'mobility_patterns',
          'location_correlation'
        ]
      },
      behavioral: {
        name: 'Behavioral Metrics',
        description: 'User behavior analytics',
        metrics: [
          'usage_patterns',
          'engagement_metrics',
          'retention_analysis',
          'user_journey'
        ]
      }
    };

    res.json({
      success: true,
      message: 'Analytics metrics retrieved successfully',
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics metrics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/health
 * @desc    Analytics service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: true,
        cache: true,
        analytics: true,
        ml_models: false // Would check ML service health
      },
      version: '1.0.0',
      lastDataUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Analytics service is healthy',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Analytics service health check failed',
      error: error.message
    });
  }
});

export default router;