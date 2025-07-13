// src/routes/index.js
import express from 'express';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Import route modules
import analyticsRoutes from './analytics.routes.js';
import authRoutes from './auth.routes.js';
import comfortReactionRoutes from './comfort-reaction.routes.js';
import communityRoutes from './community.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import debugRoutes from './debug.routes.js'; // ✅ Add debug routes
import emotionRoutes from './emotion.routes.js';
import friendRoutes from './friend.routes.js';
import heatmapRoutes from './heatmap.routes.js';
import insightsRoutes from './insights.routes.js';
import moodRoutes from './mood.routes.js';
import onboardingRoutes from './onboarding.routes.js';
import profileRoutes from './profile.routes.js';
import recommendationsRoutes from './recommendations.routes.js';
import settingRoutes from './setting.routes.js';
import userRoutes from './user.routes.js';
import ventRoutes from './vent.routes.js';

// User routes are imported above with other route modules

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EMORA Backend is running smoothly',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: true,
        redis: true,
        socketio: true,
        scheduler: false, // Disabled in development
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: {
        emotionLogging: true,
        globalHeatmap: true,
        analytics: true,
        realTimeUpdates: true,
        insights: true,
        userProfiles: true,
        professionalDashboard: true,
      }
    }
  });
});

// API Documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'EMORA API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/auth',
        description: 'Authentication and authorization endpoints',
        endpoints: [
          'POST /login - User login',
          'POST /register - User registration',
          'POST /logout - User logout',
          'GET /me - Get current user info',
        ]
      },
      onboarding: {
        base: '/onboarding',
        description: 'User onboarding process',
        endpoints: [
          'GET /steps - Get onboarding steps',
          'POST /user-data - Save user data',
          'POST /complete - Complete onboarding',
          'GET /check-username/:username - Check username availability',
          'POST /register - Register new user',
        ]
      },
      emotions: {
        base: '/api/emotions',
        description: 'Emotion logging and management',
        endpoints: [
          'POST / - Log new emotion',
          'GET / - Get user emotions',
          'GET /constants - Get emotion constants',
          'GET /feed - Get emotion feed',
          'GET /stats - Get emotion statistics',
        ]
      },
      user: {
        base: '/api/user',
        description: 'User profile and data management',
        endpoints: [
          'GET /profile - Get user profile',
          'PUT /profile - Update user profile',
          'PUT /preferences - Update preferences',
          'GET /achievements - Get user achievements',
          'POST /export-data - Export user data',
          'GET /home-data - Get home dashboard data',
          'GET /emotion-summary - Get emotion summary',
        ]
      },
      dashboard: {
        base: '/api/dashboard',
        description: 'Dashboard and analytics',
        endpoints: [
          'GET /home - Get dashboard data',
          'GET /admin - Get admin dashboard',
          'GET /professional - Get professional dashboard',
        ]
      },
      heatmap: {
        base: '/api/heatmap',
        description: 'Global emotion heatmap',
        endpoints: [
          'GET /global - Get global heatmap data',
          'GET /regional - Get regional data',
        ]
      }
    }
  });
});

// Mount routes with their base paths
router.use('/onboarding', onboardingRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/community', communityRoutes);
router.use('/api/debug', debugRoutes); // ✅ Add debug routes for development
router.use('/api/emotions', emotionRoutes);
router.use('/api/mood', moodRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/heatmap', heatmapRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/insights', insightsRoutes);
router.use('/api/recommendations', recommendationsRoutes);
router.use('/api/user', userRoutes); // ✅ Fixed: singular /user for Flutter app
router.use('/api/profile', profileRoutes);
router.use('/api/settings', settingRoutes);
router.use('/api/friends', friendRoutes);
router.use('/api/vents', ventRoutes);
router.use('/api/comfort-reactions', comfortReactionRoutes);

// Catch-all for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      health: 'GET /api/health',
      docs: 'GET /api/docs',
      onboarding: 'GET /onboarding/steps',
      auth: 'POST /api/auth/login',
      emotions: 'GET /api/emotions/constants',
      dashboard: 'GET /api/dashboard/home',
      heatmap: 'GET /api/heatmap/global',
      user: 'GET /api/user/profile',
    }
  });
});

export default router;