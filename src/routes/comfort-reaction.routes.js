import express from 'express';
import comfortReactionController from '../controllers/comfort-reaction.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { comfortReactionValidator, markReadValidator } from '../validators/comfort-reaction.validator.js';
import { validateRequest } from '../middleware/validation.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Comfort reaction routes
router.post('/emotions/:emotionId/reactions', comfortReactionValidator, validateRequest, comfortReactionController.sendComfortReaction);
router.get('/emotions/:emotionId/reactions', comfortReactionController.getReactionsForEmotion);

// User reaction management
router.get('/my-reactions', comfortReactionController.getUserReactions);
router.patch('/reactions/mark-read', markReadValidator, validateRequest, comfortReactionController.markReactionsAsRead);
router.delete('/reactions/:reactionId', comfortReactionController.deleteReaction);
router.get('/reactions/unread-count', comfortReactionController.getUnreadReactionsCount);

export default router;