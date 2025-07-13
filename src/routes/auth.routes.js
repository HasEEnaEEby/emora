// src/routes/auth.routes.js - CLEAN AUTHENTICATION SYSTEM
import express from 'express';
import jwt from 'jsonwebtoken';
import AuthController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateRegistration, validateLogin } from '../validators/auth.validator.js';

const router = express.Router();

// ✅ AUTHENTICATION ENDPOINTS ONLY - Clean separation of concerns

// User registration with confirmPassword validation
router.post('/register', validateRegistration, AuthController.register);

// User login
router.post('/login', validateLogin, AuthController.login);

// User logout (requires authentication)
router.post('/logout', authMiddleware, AuthController.logout);

// Get current user profile (requires authentication)
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// Refresh authentication token
router.post('/refresh', AuthController.refreshToken);

// Check username availability (public endpoint)
router.get('/check-username/:username', AuthController.checkUsernameAvailability);

// Password reset endpoints
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Email verification endpoints
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);

export default router;