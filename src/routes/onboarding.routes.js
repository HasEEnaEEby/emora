import express from 'express';
import onboardingController from '../controllers/onboarding.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import onboardingValidator from '../validators/onboarding.validator.js';

const router = express.Router();

// Public routes (no auth required)
router.post('/create-user', 
  validationMiddleware(onboardingValidator.createUser),
  onboardingController.createUser
);

router.get('/check-username/:username',
  onboardingController.checkUsername
);

// Protected routes (require auth)
router.use(authMiddleware);

router.put('/pronouns',
  validationMiddleware(onboardingValidator.updatePronouns),
  onboardingController.updatePronouns
);

router.put('/age-group',
  validationMiddleware(onboardingValidator.updateAgeGroup),
  onboardingController.updateAgeGroup
);

router.put('/avatar',
  validationMiddleware(onboardingValidator.updateAvatar),
  onboardingController.updateAvatar
);

router.get('/profile',
  onboardingController.getProfile
);

router.put('/preferences',
  validationMiddleware(onboardingValidator.updatePreferences),
  onboardingController.updatePreferences
);

export default router;