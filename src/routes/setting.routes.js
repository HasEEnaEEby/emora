import express from 'express';
import settingsController from '../controllers/settings.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { updateSettingsValidator } from '../validators/settings.validator.js';
import { validateRequest } from '../middleware/validation.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Settings routes
router.get('/', settingsController.getSettings);
router.put('/', updateSettingsValidator, validateRequest, settingsController.updateSettings);
router.patch('/notifications', settingsController.updateNotificationSettings);
router.patch('/privacy', settingsController.updatePrivacySettings);

export default router;