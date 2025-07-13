import express from 'express';
import insightsController from '../controllers/insights.controller.js';
import { validateInsightsQuery } from '../validators/insights.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication to all insights routes
router.use(authenticate);

// Get comprehensive user insights
router.get('/',
  validateInsightsQuery,
  insightsController.getUserInsights
);

// Get emotion statistics
router.get('/emotions',
  validateInsightsQuery,
  insightsController.getEmotionStats
);

// Get weekly patterns
router.get('/patterns/weekly',
  validateInsightsQuery,
  insightsController.getWeeklyPatterns
);

// Get daily patterns
router.get('/patterns/daily',
  validateInsightsQuery,
  insightsController.getDailyPatterns
);

// Get mood streak
router.get('/streak',
  insightsController.getMoodStreak
);

// Get top emotions
router.get('/emotions/top',
  validateInsightsQuery,
  insightsController.getTopEmotions
);

// Get recent trends
router.get('/trends',
  validateInsightsQuery,
  insightsController.getRecentTrends
);

// Get personalized recommendations
router.get('/recommendations',
  validateInsightsQuery,
  insightsController.getRecommendations
);

// Get vent statistics
router.get('/vents',
  validateInsightsQuery,
  insightsController.getVentStats
);

// Get daily recap
router.get('/recap',
  insightsController.getDailyRecap
);

// Get global insights (admin only)
router.get('/global',
  insightsController.getGlobalInsights
);

export default router; 