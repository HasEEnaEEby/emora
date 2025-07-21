// src/controllers/user.controller.js
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/user.model.js';
import UnifiedEmotion from '../models/emotion.model.js';
import moodService from '../services/mood.service.js';
import { errorResponse, successResponse } from '../utils/response.js';
import { handleAsync } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class UserController {
  // . Get home dashboard data (matches Flutter app expectation)
  getHomeData = handleAsync(async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // Get user data
      const user = await User.findById(userId).select('username pronouns ageGroup selectedAvatar streaks analytics');
      
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Get recent emotions (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentEmotions = await UnifiedEmotion.find({
        userId: userId.toString(),
        createdAt: { $gte: sevenDaysAgo }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('emotion intensity createdAt note');

      // Get today's emotions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEmotions = await UnifiedEmotion.countDocuments({
        userId: userId.toString(),
        createdAt: { $gte: todayStart }
      });

      // Calculate mood trends
      const totalEmotions = await UnifiedEmotion.countDocuments({
        userId: userId.toString()
      });

      // Calculate average mood score
      const emotionStats = await UnifiedEmotion.aggregate([
        { 
          $match: { 
            userId: userId.toString(),
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            avgIntensity: { $avg: '$intensity' },
            totalCount: { $sum: 1 }
          }
        }
      ]);

      const avgMoodScore = emotionStats.length > 0 
        ? Math.round(emotionStats[0].avgIntensity * 100) 
        : 50;

      // Get streak information
      const currentStreak = user.streaks?.current || 0;
      const longestStreak = user.streaks?.longest || 0;

      // Prepare home data response
      const homeData = {
        user: {
          id: user._id,
          username: user.username,
          pronouns: user.pronouns,
          ageGroup: user.ageGroup,
          selectedAvatar: user.selectedAvatar,
          currentStreak,
          longestStreak
        },
        dashboard: {
          totalEmotions,
          todayEmotions,
          averageMoodScore: avgMoodScore,
          recentEmotions: recentEmotions.map(emotion => ({
            id: emotion._id,
            emotion: emotion.emotion,
            intensity: emotion.intensity,
            note: emotion.note,
            createdAt: emotion.createdAt
          }))
        },
        insights: {
          weeklyProgress: emotionStats.length > 0 ? emotionStats[0].totalCount : 0,
          moodTrend: avgMoodScore >= 60 ? 'improving' : avgMoodScore >= 40 ? 'stable' : 'needs_attention',
          dominantEmotion: recentEmotions.length > 0 ? recentEmotions[0].emotion : null
        },
        timestamp: new Date().toISOString()
      };

      logger.info(`🏠 Home data retrieved for user: ${user.username}`);

      successResponse(res, {
        message: 'Home data retrieved successfully',
        data: homeData
      });

    } catch (error) {
      logger.error('. Error getting home data:', error);
      errorResponse(res, 'Failed to retrieve home data', 500, error.message);
    }
  });

  // . Log mood/emotion (wrapper around existing mood service)
  logMood = handleAsync(async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const {
        emotion,
        intensity,
        note,
        context,
        location,
        privacyLevel = 'private'
      } = req.body;

      // Validate required fields
      if (!emotion) {
        return errorResponse(res, 'Emotion is required', 400);
      }

      if (intensity === undefined || intensity < 0 || intensity > 1) {
        return errorResponse(res, 'Intensity must be between 0 and 1', 400);
      }

      // Create emotion entry
      const emotionData = {
        userId: userId.toString(),
        emotion,
        intensity,
        note,
        context: context || {},
        location,
        privacyLevel,
        timestamp: new Date(),
        source: 'mobile_app'
      };

      const savedEmotion = await UnifiedEmotion.create(emotionData);

      // Update user's streak if this is their first emotion today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEmotionCount = await UnifiedEmotion.countDocuments({
        userId: userId.toString(),
        createdAt: { $gte: todayStart }
      });

      // If this is the first emotion today, update streak
      if (todayEmotionCount === 1) {
        await User.findByIdAndUpdate(userId, {
          $inc: { 'streaks.current': 1 },
          $max: { 'streaks.longest': { $add: ['$streaks.current', 1] } },
          $set: { 'streaks.lastLogDate': new Date() }
        });
      }

      logger.info(`😊 Mood logged: ${emotion} (${intensity}) by user ${userId}`);

      successResponse(res, {
        message: 'Mood logged successfully',
        data: {
          emotion: {
            id: savedEmotion._id,
            emotion: savedEmotion.emotion,
            intensity: savedEmotion.intensity,
            note: savedEmotion.note,
            createdAt: savedEmotion.createdAt
          }
        }
      }, 201);

    } catch (error) {
      logger.error('. Error logging mood:', error);
      errorResponse(res, 'Failed to log mood', 500, error.message);
    }
  });

  // . Mark first-time login as complete
  markFirstTimeLoginComplete = handleAsync(async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // Update user's onboarding status
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            isOnboardingCompleted: true,
            'analytics.firstTimeLoginCompleted': true,
            'analytics.firstTimeLoginCompletedAt': new Date()
          }
        },
        { new: true }
      ).select('username isOnboardingCompleted');

      if (!updatedUser) {
        return errorResponse(res, 'User not found', 404);
      }

      logger.info(`. First-time login marked complete for user: ${updatedUser.username}`);

      successResponse(res, {
        message: 'First-time login marked as complete',
        data: {
          userId: updatedUser._id,
          username: updatedUser.username,
          isOnboardingCompleted: updatedUser.isOnboardingCompleted
        }
      });

    } catch (error) {
      logger.error('. Error marking first-time login complete:', error);
      errorResponse(res, 'Failed to mark first-time login complete', 500, error.message);
    }
  });

  // . Get user profile
  getProfile = handleAsync(async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const user = await User.findById(userId).select('-password -__v');
      
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const profile = user.getPublicProfile();

      successResponse(res, {
        message: 'User profile retrieved successfully',
        data: { user: profile }
      });

    } catch (error) {
      logger.error('. Error getting user profile:', error);
      errorResponse(res, 'Failed to retrieve user profile', 500, error.message);
    }
  });

  // . Update user profile
  updateProfile = handleAsync(async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const allowedUpdates = ['pronouns', 'ageGroup', 'selectedAvatar', 'bio', 'settings'];
      const updates = {};

      // Filter allowed updates
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      if (Object.keys(updates).length === 0) {
        return errorResponse(res, 'No valid fields to update', 400);
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password -__v');

      if (!updatedUser) {
        return errorResponse(res, 'User not found', 404);
      }

      const profile = updatedUser.getPublicProfile();

      logger.info(`📝 Profile updated for user: ${updatedUser.username}`);

      successResponse(res, {
        message: 'Profile updated successfully',
        data: { user: profile }
      });

    } catch (error) {
      logger.error('. Error updating profile:', error);
      errorResponse(res, 'Failed to update profile', 500, error.message);
    }
  });

  // . Get user statistics
  getUserStats = handleAsync(async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get emotion statistics
      const emotionStats = await UnifiedEmotion.aggregate([
        { 
          $match: { 
            userId: userId.toString(),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$emotion',
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const totalEmotions = await UnifiedEmotion.countDocuments({
        userId: userId.toString()
      });

      const stats = {
        totalEmotions,
        periodEmotions: emotionStats.reduce((sum, stat) => sum + stat.count, 0),
        emotionBreakdown: emotionStats,
        period: `${days} days`,
        generatedAt: new Date().toISOString()
      };

      successResponse(res, {
        message: 'User statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      logger.error('. Error getting user stats:', error);
      errorResponse(res, 'Failed to retrieve user statistics', 500, error.message);
    }
  });
}

export default new UserController(); 