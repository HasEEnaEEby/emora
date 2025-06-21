import express from 'express';
import authController from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import authValidator from '../validators/auth.validator.js';

const router = express.Router();

// Public routes
router.post('/login',
  validationMiddleware(authValidator.login),
  authController.login
);

router.post('/quick-access',
  validationMiddleware(authValidator.quickAccess),
  authController.quickAccess
);

// Protected routes
router.use(authMiddleware);

router.get('/me', authController.getMe);

router.post('/add-password',
  validationMiddleware(authValidator.addPassword),
  authController.addPassword
);

export default router;