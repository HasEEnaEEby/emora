const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { updateProfileValidator } = require('../validators/profile.validator');
const { validateRequest } = require('../middlewares/validation.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Profile routes
router.get('/', profileController.getProfile);
router.put('/', updateProfileValidator, validateRequest, profileController.updateProfile);
router.delete('/', profileController.deleteAccount);

// Streak routes
router.get('/streak', profileController.getStreakInfo);

module.exports = router;