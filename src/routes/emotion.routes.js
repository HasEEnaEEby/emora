import express from 'express';
import emotionController from '../controllers/emotion.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import locationMiddleware from '../middlewares/location.middleware.js';
import { authRateLimiters } from '../middlewares/rate-limit.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import { comfortReactionSchema, emotionLogSchema } from '../validators/emotion.validator.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/constants', emotionController.getEmotionConstants);
router.get('/global-stats', emotionController.getGlobalStats);
router.get('/global-heatmap', emotionController.getGlobalHeatmap);
router.get('/feed', authMiddleware.optional, emotionController.getEmotionFeed);

// Protected routes (auth required)
router.use(authMiddleware.required);

// Emotion CRUD
router.post('/log', 
  authRateLimiters.general,
  locationMiddleware.extractLocation,
  locationMiddleware.validateLocation,
  validationMiddleware(emotionLogSchema),
  emotionController.logEmotion
);

router.get('/timeline', emotionController.getEmotionTimeline);
router.get('/stats', emotionController.getUserEmotionStats);
router.get('/insights', emotionController.getUserInsights);
router.get('/search', emotionController.searchEmotions);

router.put('/:id', 
  authRateLimiters.general,
  validationMiddleware(emotionLogSchema),
  emotionController.updateEmotion
);

router.delete('/:id', emotionController.deleteEmotion);

// Social features
router.post('/:emotionId/comfort-reaction',
  authRateLimiters.general,
  validationMiddleware(comfortReactionSchema),
  emotionController.sendComfortReaction
);

export default router;