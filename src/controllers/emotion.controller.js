const Emotion = require('../models/emotion.model');
const User = require('../models/user.model');
const CommunityPost = require('../models/community-post.model');
const { validateEmotionData } = require('../validators/emotion.validator');
const { calculateUserStats } = require('../services/analytics.service');
const emotionService = require('../services/emotion.service');
const Logger = require('../utils/logger');

// POST /api/emotions - Log a new emotion
exports.logEmotion = async (req, res) => {
  try {
    Logger.info(`🔄 Logging emotion for user: ${req.user.id || req.user.userId}`);
    
    // Validate request data
    const validation = validateEmotionData(req.body);
    if (!validation.isValid) {
      Logger.warning(`❌ Invalid emotion data: ${validation.errors.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid emotion data',
        errors: validation.errors,
        errorCode: 'INVALID_EMOTION_DATA'
      });
    }

    const {
      type,
      emotion,
      intensity,
      note,
      tags = [],
      location,
      shareToCommunity = false,
      context = {}
    } = req.body;

    // Normalize emotion field (handle both 'emotion' and 'type')
    const emotionType = emotion || type;
    
    // Create emotion object with proper field mapping
    const emotionData = {
      userId: req.user.id || req.user.userId,
      emotion: emotionType, // Primary field
      type: emotionType,    // Backward compatibility
      intensity: Math.max(1, Math.min(5, intensity)), // Clamp between 1-5
      note: note?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      location: location || null,
      context: {
        ...context,
        timeOfDay: context.timeOfDay || getTimeOfDay(new Date().getHours()),
        dayOfWeek: context.dayOfWeek || getDayOfWeek(new Date().getDay()),
        isWeekend: context.isWeekend || isWeekend(new Date().getDay())
      },
      privacy: shareToCommunity ? 'public' : 'private',
      isAnonymous: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    Logger.info(`📝 Creating emotion: ${emotionData.emotion} with intensity ${emotionData.intensity}`);

    // Use emotion service for enhanced processing
    const savedEmotion = await emotionService.logEmotion(emotionData);

    Logger.info(`✅ Emotion saved with ID: ${savedEmotion._id}`);

    // Update user stats
    try {
      await calculateUserStats(req.user.id || req.user.userId);
      Logger.info(`📊 User stats updated for: ${req.user.id || req.user.userId}`);
    } catch (statsError) {
      Logger.warning(`⚠️ Failed to update user stats: ${statsError.message}`);
    }

    // Check for new achievements
    let newAchievements = [];
    try {
      const user = await User.findById(req.user.id || req.user.userId);
      if (user) {
        // Check for streak achievements
        const userStats = await calculateUserStats(req.user.id || req.user.userId);
        if (userStats.currentStreak === 1 && userStats.totalEntries === 1) {
          newAchievements.push({
            id: 'first_steps',
            earnedAt: new Date(),
            value: 1
          });
        }
        if (userStats.currentStreak === 3) {
          newAchievements.push({
            id: 'three_day_streak',
            earnedAt: new Date(),
            value: 3
          });
        }
        if (userStats.currentStreak === 7) {
          newAchievements.push({
            id: 'week_warrior',
            earnedAt: new Date(),
            value: 7
          });
        }
      }
    } catch (achievementError) {
      Logger.warning(`⚠️ Failed to check achievements: ${achievementError.message}`);
    }

    // Prepare response
    const response = {
      status: 'success',
      message: 'Emotion logged successfully',
      data: {
        emotion: {
          id: savedEmotion._id,
          emotion: savedEmotion.emotion,
          type: savedEmotion.type,
          intensity: savedEmotion.intensity,
          note: savedEmotion.note,
          tags: savedEmotion.tags,
          hasLocation: !!savedEmotion.location,
          createdAt: savedEmotion.createdAt
        },
        newAchievements
      }
    };

    Logger.info(`✅ Emotion logged successfully for user: ${req.user.id || req.user.userId}`);
    res.status(201).json(response);

  } catch (error) {
    Logger.error(`❌ Error logging emotion: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to log emotion',
      errorCode: 'EMOTION_LOG_FAILED'
    });
  }
};

// GET /api/emotions/insights - Get user emotion insights
exports.getUserInsights = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { timeframe = '30d' } = req.query;
    
    Logger.info(`📊 Fetching insights for user: ${userId} (${timeframe})`);

    const insights = await emotionService.getUserEmotionInsights(userId, timeframe);

    res.json({
      status: 'success',
      data: insights
    });

  } catch (error) {
    Logger.error(`❌ Error fetching user insights: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch insights',
      errorCode: 'INSIGHTS_FETCH_FAILED'
    });
  }
};

// GET /api/emotions/analytics - Get emotion analytics for charts
exports.getEmotionAnalytics = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { timeframe = '7d' } = req.query;
    
    Logger.info(`📈 Fetching analytics for user: ${userId} (${timeframe})`);

    const analytics = await emotionService.getEmotionAnalytics(userId, timeframe);

    res.json({
      status: 'success',
      data: analytics
    });

  } catch (error) {
    Logger.error(`❌ Error fetching emotion analytics: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics',
      errorCode: 'ANALYTICS_FETCH_FAILED'
    });
  }
};

// GET /api/emotions/history - Get user emotion history
exports.getUserEmotionHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { limit = 50, offset = 0 } = req.query;
    
    Logger.info(`📜 Fetching emotion history for user: ${userId}`);

    const emotions = await emotionService.getUserEmotionHistory(userId, parseInt(limit), parseInt(offset));

    res.json({
      status: 'success',
      data: {
        emotions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: emotions.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    Logger.error(`❌ Error fetching emotion history: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch emotion history',
      errorCode: 'HISTORY_FETCH_FAILED'
    });
  }
};

// GET /api/emotions - Get user emotions with filtering
exports.getEmotions = async (req, res) => {
  try {
    Logger.info(`🔄 Fetching emotions for user: ${req.user.id || req.user.userId}`);

    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      type,
      emotion,
      minIntensity,
      maxIntensity,
      period = '7d' // Default to 7 days
    } = req.query;

    // Build query - use the correct user ID field
    const query = { userId: req.user.id || req.user.userId };
    
    // Debug logging
    Logger.info(`🔍 AUTH DEBUG: Token User ID: ${req.user.id || req.user.userId}`);
    Logger.info(`🔍 AUTH DEBUG: Username: ${req.user.username}`);
    Logger.info(`🔍 AUTH DEBUG: Query: ${JSON.stringify(query)}`);

    // Add date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    } else if (period) {
      // Handle period-based filtering
      const now = new Date();
      let startTime;
      
      switch (period) {
        case '1d':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      query.createdAt = { $gte: startTime };
    }

    // Add emotion filtering (handle both 'emotion' and 'type' fields)
    if (emotion || type) {
      const emotionType = emotion || type;
      query.$or = [
        { emotion: emotionType.toLowerCase() },
        { type: emotionType.toLowerCase() }
      ];
    }

    // Add intensity filtering
    if (minIntensity || maxIntensity) {
      query.intensity = {};
      if (minIntensity) query.intensity.$gte = parseInt(minIntensity);
      if (maxIntensity) query.intensity.$lte = parseInt(maxIntensity);
    }

    Logger.info(`🔍 Query: ${JSON.stringify(query)}`);

    // Execute query
    const emotions = await Emotion.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Get total count for pagination
    const total = await Emotion.countDocuments(query);

    Logger.info(`✅ Found ${emotions.length} emotions for user: ${req.user.id || req.user.userId}`);

    res.json({
      status: 'success',
      data: {
        emotions,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + emotions.length
        }
      }
    });

  } catch (error) {
    Logger.error(`❌ Error fetching emotions: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch emotions',
      errorCode: 'EMOTIONS_FETCH_FAILED'
    });
  }
};

// GET /api/emotions/stats - Get emotion statistics
exports.getEmotionStats = async (req, res) => {
  try {
    Logger.info(`📊 Fetching emotion stats for user: ${req.user.id || req.user.userId}`);

    const { period = '7d' } = req.query;
    
    // Calculate stats
    const stats = await calculateUserStats(req.user.id || req.user.userId, period);

    Logger.info(`✅ Stats calculated for user: ${req.user.id || req.user.userId}`);

    res.json({
      status: 'success',
      data: stats
    });

  } catch (error) {
    Logger.error(`❌ Error fetching emotion stats: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch emotion statistics',
      errorCode: 'STATS_FETCH_FAILED'
    });
  }
};

// DELETE /api/emotions/:id - Delete an emotion
exports.deleteEmotion = async (req, res) => {
  try {
    const { id } = req.params;
    Logger.info(`🗑️ Deleting emotion: ${id} for user: ${req.user.id || req.user.userId}`);

    const emotion = await Emotion.findOneAndDelete({
      _id: id,
      userId: req.user.id || req.user.userId
    });

    if (!emotion) {
      Logger.warning(`⚠️ Emotion not found: ${id}`);
      return res.status(404).json({
        status: 'error',
        message: 'Emotion not found',
        errorCode: 'EMOTION_NOT_FOUND'
      });
    }

    // Update user stats
    try {
      await calculateUserStats(req.user.id || req.user.userId);
      Logger.info(`📊 User stats updated after deletion`);
    } catch (statsError) {
      Logger.warning(`⚠️ Failed to update user stats: ${statsError.message}`);
    }

    Logger.info(`✅ Emotion deleted successfully: ${id}`);
    res.json({
      status: 'success',
      message: 'Emotion deleted successfully'
    });

  } catch (error) {
    Logger.error(`❌ Error deleting emotion: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete emotion',
      errorCode: 'EMOTION_DELETE_FAILED'
    });
  }
};

// PUT /api/emotions/:id - Update an emotion
exports.updateEmotion = async (req, res) => {
  try {
    const { id } = req.params;
    Logger.info(`📝 Updating emotion: ${id} for user: ${req.user.id || req.user.userId}`);

    const updateData = {
      emotion: req.body.emotion || req.body.type,
      type: req.body.emotion || req.body.type,
      intensity: req.body.intensity,
      note: req.body.note?.trim(),
      tags: req.body.tags,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const emotion = await Emotion.findOneAndUpdate(
      { _id: id, userId: req.user.id || req.user.userId },
      updateData,
      { new: true }
    );

    if (!emotion) {
      Logger.warning(`⚠️ Emotion not found: ${id}`);
      return res.status(404).json({
        status: 'error',
        message: 'Emotion not found',
        errorCode: 'EMOTION_NOT_FOUND'
      });
    }

    Logger.info(`✅ Emotion updated successfully: ${id}`);
    res.json({
      status: 'success',
      message: 'Emotion updated successfully',
      data: { emotion }
    });

  } catch (error) {
    Logger.error(`❌ Error updating emotion: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update emotion',
      errorCode: 'EMOTION_UPDATE_FAILED'
    });
  }
};

// Helper functions
function getTimeOfDay(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getDayOfWeek(day) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[day];
}

function isWeekend(day) {
  return day === 0 || day === 6;
}