const express = require('express');
const router = express.Router();
const comfortReactionController = require('../controllers/comfort-reaction.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { comfortReactionValidator, markReadValidator } = require('../validators/comfort-reaction.validator');
const { validateRequest } = require('../middlewares/validation.middleware');

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

module.exports = router;