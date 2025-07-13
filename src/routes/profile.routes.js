import express from 'express';
import profileController from '../controllers/profile.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { updateProfileValidator } from '../validators/profile.validator.js';
import { validateRequest } from '../middleware/validation.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Profile routes
router.get('/', profileController.getProfile);
router.put('/', updateProfileValidator, validateRequest, profileController.updateProfile);
router.delete('/', profileController.deleteAccount);

// Streak routes
router.get('/streak', profileController.getStreakInfo);

export default router;