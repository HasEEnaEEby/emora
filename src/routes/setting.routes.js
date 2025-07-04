const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { updateSettingsValidator } = require('../validators/settings.validator');
const { validateRequest } = require('../middlewares/validation.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Settings routes
router.get('/', settingsController.getSettings);
router.put('/', updateSettingsValidator, validateRequest, settingsController.updateSettings);
router.patch('/notifications', settingsController.updateNotificationSettings);
router.patch('/privacy', settingsController.updatePrivacySettings);

module.exports = router;