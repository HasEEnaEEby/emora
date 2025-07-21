import express from 'express';
import emotionStoryController from '../controllers/emotion-story.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rate-limit.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Rate limiting for story creation and contributions
const storyCreationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 stories per 15 minutes
  message: 'Too many story creations. Please try again in 15 minutes.'
});

const contributionLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 contributions per 5 minutes
  message: 'Too many contributions. Please try again in 5 minutes.'
});

// Emotion story routes
router.post('/', storyCreationLimit, emotionStoryController.createEmotionStory);
router.get('/', emotionStoryController.getUserEmotionStories);

// Story management
router.post('/:storyId/invite', emotionStoryController.inviteToEmotionStory);
router.post('/:storyId/respond', emotionStoryController.respondToInvitation);

// Contributions
router.post('/:storyId/contributions', contributionLimit, emotionStoryController.addContribution);
router.get('/:storyId/contributions', emotionStoryController.getStoryContributions);

export default router; 