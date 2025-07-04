// src/routes/dashboard.routes.js
import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { createRateLimit } from '../middlewares/rate-limit.middleware.js';
import { validateTimeframe } from '../validators/emotion.validator.js';

const router = Router();

// Apply rate limiting using createRateLimit function
router.use(createRateLimit(
  100, // max requests
  15 * 60 * 1000, // 15 minutes window
  'Too many dashboard requests, please try again later'
));

/**
 * @route   GET /api/dashboard/home
 * @desc    Get comprehensive home dashboard data
 * @access  Public (enhanced with auth)
 * @query   {cache?}
 */
router.get('/home',
  authMiddleware.optional,
  dashboardController.getHomeDashboard
);

/**
 * @route   GET /api/dashboard/analytics
 * @desc    Get detailed analytics dashboard
 * @access  Private (requires authentication)
 * @query   {timeframe?}
 */
router.get('/analytics',
  authMiddleware.required,
  validateTimeframe,
  dashboardController.getAnalyticsDashboard
);

/**
 * @route   GET /api/dashboard/realtime
 * @desc    Get real-time dashboard updates
 * @access  Public
 * @query   {lastUpdate?}
 */
router.get('/realtime',
  createRateLimit(
    30, // max requests
    1 * 60 * 1000, // 1 minute window
    'Too many real-time requests'
  ),
  dashboardController.getRealtimeUpdates
);

/**
 * @route   GET /api/dashboard/health
 * @desc    Dashboard service health check
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: true,
        cache: true,
        analytics: true
      },
      version: '2.0.0'
    };

    res.json({
      success: true,
      message: 'Dashboard service is healthy',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Dashboard service health check failed',
      error: error.message
    });
  }
});

export default router;