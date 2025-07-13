// src/routes/onboarding.routes.js - ONBOARDING STEPS ONLY
import express from 'express';
import onboardingController from '../controllers/onboarding.controller.js';

const router = express.Router();

// ✅ ONBOARDING ENDPOINTS ONLY - Clean separation of concerns

// Get onboarding steps/flow information
router.get('/steps', onboardingController.getOnboardingSteps);

// Check username availability (used during onboarding flow)
router.get('/check-username/:username', onboardingController.checkUsernameAvailability);

// Save user onboarding data (anonymous - no validation needed)
router.post('/user-data', onboardingController.saveUserOnboardingData);

// Complete anonymous onboarding
router.post('/complete', onboardingController.completeOnboarding);

// ❌ REMOVED: Registration and login endpoints moved to /api/auth/*
// ❌ REMOVED: getOnboardingProgress - method doesn't exist in controller
// These endpoints caused confusion and violated clean architecture principles

export default router;