import Mood from '../models/mood.model.js';
import Emotion from '../models/emotion.model.js';
import User from '../models/user.model.js';
import { errorResponse, successResponse } from '../utils/response.js';
import Logger from '../utils/logger.js';

class MoodsController {
  // Log mood (and also save to emotions for compatibility)
  logMood = async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId;
      Logger.info(`🎭 LOGGING MOOD for user ${userId}`);
      Logger.info(`📝 Mood data:`, req.body);

      const { 
        type, 
        emotion, 
        intensity, 
        note, 
        tags, 
        location, 
        context, 
        privacy = 'private',
        source = 'mobile_app'
      } = req.body;

      // Validate required fields
      if (!type && !emotion) {
        return errorResponse(res, 'Mood type or emotion is required', 400);
      }
      if (!intensity || intensity < 1 || intensity > 5) {
        return errorResponse(res, 'Intensity must be between 1 and 5', 400);
      }

      const moodType = type || emotion;

      // Create mood data
      const moodData = {
        userId,
        type: moodType.toLowerCase(),
        emotion: moodType.toLowerCase(),
        intensity: parseInt(intensity),
        note: note || '',
        tags: tags || [],
        location,
        context: context || {},
        privacy,
        source,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      Logger.info(`💾 Saving mood to database:`, moodData);

      // Save to Mood collection
      const mood = new Mood(moodData);
      await mood.save();
      Logger.info(`✅ Mood saved to moods collection: ${mood._id}`);

      // ALSO save to Emotion collection for compatibility
      try {
        const emotion = new Emotion(moodData);
        await emotion.save();
        Logger.info(`✅ Mood also saved to emotions collection: ${emotion._id}`);
      } catch (emotionError) {
        Logger.warning(`⚠️ Failed to save to emotions collection:`, emotionError.message);
        // Don't fail the entire request if emotion save fails
      }

      // Prepare response
      const response = {
        id: mood._id.toString(),
        userId: mood.userId.toString(),
        type: mood.type,
        emotion: mood.emotion,
        intensity: mood.intensity,
        note: mood.note,
        tags: mood.tags,
        location: mood.location,
        privacy: mood.privacy,
        source: mood.source,
        createdAt: mood.createdAt,
        timestamp: mood.createdAt // For compatibility
      };

      successResponse(res, {
        message: 'Mood logged successfully',
        data: {
          mood: response,
          savedToCollections: ['moods', 'emotions']
        }
      }, 201);

      // Log analytics
      Logger.info(`Mood logged: ${mood.type} (intensity: ${mood.intensity}) by user ${userId}`);

    } catch (error) {
      Logger.error('❌ Error logging mood:', error);
      errorResponse(res, 'Failed to log mood', 500, error.message);
    }
  };

  // Get user moods
  getUserMoods = async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId;
      const { 
        limit = 100, 
        offset = 0, 
        startDate, 
        endDate, 
        type, 
        minIntensity, 
        maxIntensity 
      } = req.query;

      Logger.info(`📊 Fetching moods for user ${userId}`);

      // Build query
      const query = { userId };

      // Date filtering
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Type filtering
      if (type) {
        query.type = new RegExp(type, 'i');
      }

      // Intensity filtering
      if (minIntensity || maxIntensity) {
        query.intensity = {};
        if (minIntensity) query.intensity.$gte = parseInt(minIntensity);
        if (maxIntensity) query.intensity.$lte = parseInt(maxIntensity);
      }

      Logger.info(`🔍 Mood query:`, query);

      // Execute query
      const moods = await Mood.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean();

      Logger.info(`✅ Found ${moods.length} moods for user ${userId}`);

      // Get total count
      const totalCount = await Mood.countDocuments(query);

      // Transform data
      const transformedMoods = moods.map(mood => ({
        id: mood._id.toString(),
        userId: mood.userId.toString(),
        type: mood.type,
        emotion: mood.emotion || mood.type,
        intensity: mood.intensity,
        note: mood.note,
        context: mood.note, // For compatibility
        tags: mood.tags || [],
        location: mood.location,
        privacy: mood.privacy,
        isAnonymous: mood.privacy === 'private',
        source: mood.source,
        metadata: mood.metadata,
        createdAt: mood.createdAt,
        timestamp: mood.createdAt, // For compatibility
        updatedAt: mood.updatedAt
      }));

      successResponse(res, {
        message: 'Moods retrieved successfully',
        data: {
          moods: transformedMoods,
          pagination: {
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + moods.length) < totalCount
          }
        }
      });

    } catch (error) {
      Logger.error('❌ Error fetching moods:', error);
      errorResponse(res, 'Failed to retrieve moods', 500, error.message);
    }
  };

  // Get combined moods and emotions
  getCombinedMoodsEmotions = async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId;
      const { limit = 100, offset = 0, startDate, endDate } = req.query;

      Logger.info(`🔄 Fetching combined moods and emotions for user ${userId}`);

      // Build date filter
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      // Get from both collections
      const [moods, emotions] = await Promise.all([
        Mood.find({ userId, ...dateFilter })
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .lean(),
        Emotion.find({ userId, ...dateFilter })
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .lean()
      ]);

      Logger.info(`📊 Found ${moods.length} moods and ${emotions.length} emotions`);

      // Combine and remove duplicates
      const combined = [];
      const seen = new Set();

      // Add moods
      moods.forEach(mood => {
        const key = `${mood.type}_${mood.intensity}_${mood.createdAt.getTime()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({
            id: mood._id.toString(),
            userId: mood.userId.toString(),
            type: mood.type,
            emotion: mood.type,
            intensity: mood.intensity,
            note: mood.note,
            tags: mood.tags || [],
            source: 'moods',
            createdAt: mood.createdAt,
            timestamp: mood.createdAt
          });
        }
      });

      // Add emotions
      emotions.forEach(emotion => {
        const key = `${emotion.type}_${emotion.intensity}_${emotion.createdAt.getTime()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({
            id: emotion._id.toString(),
            userId: emotion.userId.toString(),
            type: emotion.type,
            emotion: emotion.type,
            intensity: emotion.intensity,
            note: emotion.note,
            tags: emotion.tags || [],
            source: 'emotions',
            createdAt: emotion.createdAt,
            timestamp: emotion.createdAt
          });
        }
      });

      // Sort by date (most recent first)
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedResults = combined.slice(startIndex, endIndex);

      Logger.info(`✅ Returning ${paginatedResults.length} combined entries`);

      successResponse(res, {
        message: 'Combined moods and emotions retrieved successfully',
        data: {
          entries: paginatedResults,
          sources: {
            moods: moods.length,
            emotions: emotions.length,
            combined: combined.length
          },
          pagination: {
            total: combined.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: endIndex < combined.length
          }
        }
      });

    } catch (error) {
      Logger.error('❌ Error fetching combined data:', error);
      errorResponse(res, 'Failed to retrieve combined data', 500, error.message);
    }
  };

  // Clear mood history
  clearMoodHistory = async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId;
      
      Logger.info(`🗑️ Clearing mood history for user ${userId}`);

      // Clear from both collections
      const [moodResult, emotionResult] = await Promise.all([
        Mood.deleteMany({ userId }),
        Emotion.deleteMany({ userId })
      ]);

      Logger.info(`✅ Deleted ${moodResult.deletedCount} moods and ${emotionResult.deletedCount} emotions`);

      successResponse(res, {
        message: 'Mood history cleared successfully',
        data: {
          deletedMoods: moodResult.deletedCount,
          deletedEmotions: emotionResult.deletedCount,
          totalDeleted: moodResult.deletedCount + emotionResult.deletedCount
        }
      });

    } catch (error) {
      Logger.error('❌ Error clearing mood history:', error);
      errorResponse(res, 'Failed to clear mood history', 500, error.message);
    }
  };

  // Debug endpoint to check user data
  debugUserMoods = async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId;
      Logger.info(`🔍 DEBUG: Checking moods for user ${userId}`);

      // Get user info
      const user = await User.findById(userId);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Get mood counts
      const moodCount = await Mood.countDocuments({ userId });
      const emotionCount = await Emotion.countDocuments({ userId });

      // Get recent moods
      const recentMoods = await Mood.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      // Get recent emotions
      const recentEmotions = await Emotion.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const debugInfo = {
        user: {
          id: userId,
          username: user.username,
          email: user.email
        },
        counts: {
          moods: moodCount,
          emotions: emotionCount,
          total: moodCount + emotionCount
        },
        recentMoods: recentMoods.map(mood => ({
          id: mood._id,
          type: mood.type,
          intensity: mood.intensity,
          createdAt: mood.createdAt
        })),
        recentEmotions: recentEmotions.map(emotion => ({
          id: emotion._id,
          type: emotion.type,
          intensity: emotion.intensity,
          createdAt: emotion.createdAt
        }))
      };

      successResponse(res, {
        message: 'Debug information retrieved',
        data: debugInfo
      });

    } catch (error) {
      Logger.error('❌ Debug error:', error);
      errorResponse(res, 'Debug failed', 500, error.message);
    }
  };
}

export default new MoodsController();
