// src/routes/recommendations.routes.js
import express from 'express';
import RecommendationsController from '../controllers/recommendations.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/music', RecommendationsController.getMusicRecommendations);
router.get('/activities', RecommendationsController.getActivityRecommendations);
router.get('/wellness', RecommendationsController.getWellnessRecommendations);

// Protected routes
router.get('/comprehensive', authenticateToken, RecommendationsController.getComprehensiveRecommendations);

export default router;