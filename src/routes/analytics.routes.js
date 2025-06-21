import express from 'express';
import analyticsController from '../controllers/analytics.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authMiddleware);

// Get user analytics
router.get('/', analyticsController.getUserAnalytics);

// Get user insights
router.get('/insights', analyticsController.getUserInsights);

// Get user recommendations
router.get('/recommendations', analyticsController.getUserRecommendations);

export default router;