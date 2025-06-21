import express from 'express';
import recommendationsController from '../controllers/recommendations.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// All recommendation routes require authentication
router.use(authMiddleware);

// Get user recommendations based on mood
router.get('/', recommendationsController.getRecommendations);

// Get music recommendations
router.get('/music', recommendationsController.getMusicRecommendations);

// Get activity recommendations
router.get('/activities', recommendationsController.getActivityRecommendations);

// Get mindfulness recommendations
router.get('/mindfulness', recommendationsController.getMindfulnessRecommendations);

export default router;