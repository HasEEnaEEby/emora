import express from 'express';
import moodController from '../controllers/mood.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import moodValidator from '../validators/mood.validator.js';

const router = express.Router();

// All mood routes require authentication
router.use(authMiddleware);

// Create mood entry
router.post('/', 
  validationMiddleware(moodValidator.createMood),
  moodController.createMood
);

// Get user's moods
router.get('/', moodController.getUserMoods);

// Get user's mood statistics
router.get('/stats', moodController.getUserMoodStats);

// Get user's mood history
router.get('/history', moodController.getUserMoodHistory);

// Get specific mood
router.get('/:moodId', moodController.getMoodById);

// Update mood (if needed)
router.put('/:moodId', 
  validationMiddleware(moodValidator.updateMood),
  moodController.updateMood
);

// Delete mood
router.delete('/:moodId', moodController.deleteMood);

export default router;
