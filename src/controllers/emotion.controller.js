import { CORE_EMOTIONS, EMOTION_NAMES } from '../constants/emotions.js';
import UnifiedEmotion from '../models/emotion.model.js';
import logger from '../utils/logger.js';
import { createErrorResponse, createResponse } from '../utils/response.js';

class EmotionController {
  // Log a new emotion entry
  logEmotion = async (req, res) => {
    try {
      const {
        emotion,
        intensity,
        legacyIntensity,
        location,
        context,
        memory,
        privacyLevel = 'private',
        note,
        timezone = 'UTC'
      } = req.body;

      let userId = req.user?.userId || req.user?.id || null;
      
      // Convert numeric userId to string if needed
      if (userId && typeof userId === 'number') {
        userId = userId.toString();
      }

      const emotionData = {
        userId,
        emotion,
        intensity: intensity || (legacyIntensity ? (legacyIntensity - 1) / 4 : 0.5),
        legacyIntensity: legacyIntensity || (intensity ? Math.round((intensity * 4) + 1) : 3),
        location,
        context: context || {},
        memory: memory || {},
        privacyLevel,
        note,
        timezone,
        timestamp: new Date(),
        source: 'api',
        isAnonymous: !userId
      };

      if (privacyLevel === 'public') {
        emotionData.globalSharing = {
          isShared: true,
          anonymousId: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sharedAt: new Date()
        };
      }

      const savedEmotion = await UnifiedEmotion.create(emotionData);

      if (req.io) {
        req.io.emit('emotion_logged', {
          emotion: savedEmotion.toInsideOutFormat(),
          privacy: privacyLevel,
          timestamp: new Date()
        });
      }

      res.status(201).json(createResponse(
        'Emotion logged successfully',
        savedEmotion
      ));

    } catch (error) {
      logger.error('Error logging emotion:', error);
      res.status(500).json(createErrorResponse(
        'Failed to log emotion',
        error.message
      ));
    }
  };

  // Get emotion constants
  getEmotionConstants = async (req, res) => {
    try {
      const constants = {
        emotions: EMOTION_NAMES,
        coreEmotions: CORE_EMOTIONS,
        reactionTypes: ['hug', 'support', 'rainbow', 'heart', 'strength', 'listening'],
        privacyLevels: ['private', 'friends', 'public'],
        contexts: {
          weather: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'],
          timeOfDay: ['morning', 'afternoon', 'evening', 'night'],
          socialContext: ['alone', 'with_friends', 'with_family', 'with_partner', 'with_colleagues', 'in_public'],
          activity: ['working', 'studying', 'exercising', 'relaxing', 'socializing', 'commuting', 'sleeping', 'eating', 'venting', 'other']
        },
        intensityRange: { min: 0.0, max: 1.0 },
        legacyIntensityRange: { min: 1, max: 5 }
      };

      res.json(createResponse(
        'Emotion constants retrieved successfully',
        constants
      ));

    } catch (error) {
      logger.error('Error getting emotion constants:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get emotion constants',
        error.message
      ));
    }
  };

  // Get user's emotion timeline
  getEmotionTimeline = async (req, res) => {
    try {
      const { timeframe = '7d', page = 1, limit = 50 } = req.query;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      // Calculate time range
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '24h':
          startDate = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      }

      const skip = (page - 1) * limit;

      const emotions = await UnifiedEmotion.find({
        userId,
        createdAt: { $gte: startDate }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

      const total = await UnifiedEmotion.countDocuments({
        userId,
        createdAt: { $gte: startDate }
      });

      const timeline = {
        emotions: emotions.map(emotion => ({
          ...emotion.toJSON(),
          insideOutFormat: emotion.toInsideOutFormat()
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        timeframe
      };

      res.json(createResponse(
        'Emotion timeline retrieved successfully',
        timeline
      ));

    } catch (error) {
      logger.error('Error getting emotion timeline:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get emotion timeline',
        error.message
      ));
    }
  };

  // Get global emotion statistics
  getGlobalStats = async (req, res) => {
    try {
      const { timeframe = '7d' } = req.query;

      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '24h':
          startDate = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      }

      const [emotionStats, totalCount] = await Promise.all([
        UnifiedEmotion.getEmotionStats({
          createdAt: { $gte: startDate }
        }),
        UnifiedEmotion.countDocuments({
          createdAt: { $gte: startDate }
        })
      ]);

      const avgIntensity = emotionStats.length > 0 
        ? emotionStats.reduce((sum, stat) => sum + stat.avgIntensity, 0) / emotionStats.length
        : 0;

      const stats = {
        totalEmotions: totalCount,
        topEmotions: emotionStats.slice(0, 10),
        averageIntensity: Math.round(avgIntensity * 100) / 100,
        timeframe,
        lastUpdated: new Date()
      };

      res.json(createResponse(
        'Global emotion statistics retrieved successfully',
        stats
      ));

    } catch (error) {
      logger.error('Error getting global stats:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get global statistics',
        error.message
      ));
    }
  };

  // Get global emotion heatmap
  getGlobalHeatmap = async (req, res) => {
    try {
      const { 
        bounds, 
        timeframe = '7d'
      } = req.query;

      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '1h':
          startDate = new Date(now - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      }

      const timeRange = { startDate, endDate: now };
      let parsedBounds = null;

      if (bounds) {
        try {
          parsedBounds = JSON.parse(bounds);
        } catch (e) {
          logger.warn('Invalid bounds format:', bounds);
        }
      }

      const heatmapData = await UnifiedEmotion.getGlobalEmotionHeatmap(parsedBounds, timeRange);

      const heatmap = {
        data: heatmapData,
        bounds: parsedBounds,
        timeframe,
        metadata: {
          totalPoints: heatmapData.length,
          lastUpdated: new Date(),
          coverage: parsedBounds ? 'bounded' : 'global'
        }
      };

      res.json(createResponse(
        'Global emotion heatmap retrieved successfully',
        heatmap
      ));

    } catch (error) {
      logger.error('Error getting global heatmap:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get global heatmap',
        error.message
      ));
    }
  };

  // Get public emotion feed
  getEmotionFeed = async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        friendsOnly = false
      } = req.query;

      const userId = req.user?.userId || req.user?.id;
      const skip = (page - 1) * limit;

      let matchQuery = {
        privacyLevel: { $in: ['public'] }
      };

      const emotions = await UnifiedEmotion.find(matchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await UnifiedEmotion.countDocuments(matchQuery);

      const feed = {
        emotions: emotions.map(emotion => ({
          ...emotion.toJSON(),
          insideOutFormat: emotion.toInsideOutFormat()
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

      res.json(createResponse(
        'Emotion feed retrieved successfully',
        feed.emotions,
        feed.pagination
      ));

    } catch (error) {
      logger.error('Error getting emotion feed:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get emotion feed',
        error.message
      ));
    }
  };

  // Get user emotion statistics
  getUserEmotionStats = async (req, res) => {
    try {
      const { timeframe = '7d' } = req.query;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '7d':
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      }

      const emotionStats = await UnifiedEmotion.getEmotionStats({
        userId,
        createdAt: { $gte: startDate }
      });

      const totalEmotions = await UnifiedEmotion.countDocuments({
        userId,
        createdAt: { $gte: startDate }
      });

      const avgIntensity = emotionStats.length > 0 
        ? emotionStats.reduce((sum, stat) => sum + stat.avgIntensity, 0) / emotionStats.length
        : 0;

      const stats = {
        totalEmotions,
        topEmotions: emotionStats.slice(0, 10),
        averageIntensity: Math.round(avgIntensity * 100) / 100,
        timeframe
      };

      res.json(createResponse(
        'User emotion statistics retrieved successfully',
        stats
      ));

    } catch (error) {
      logger.error('Error getting user stats:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get user statistics',
        error.message
      ));
    }
  };

  // Get user insights
  getUserInsights = async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      const now = new Date();
      const startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);

      const emotions = await UnifiedEmotion.find({
        userId,
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 });

      if (emotions.length === 0) {
        return res.json(createResponse(
          'No emotion data available for insights',
          {
            patterns: [],
            recommendations: [],
            moodScore: 50,
            timeframe
          }
        ));
      }

      const insights = {
        patterns: [],
        recommendations: [],
        moodScore: 50,
        timeframe,
        totalEmotions: emotions.length,
        lastUpdated: new Date()
      };

      res.json(createResponse(
        'User insights retrieved successfully',
        insights
      ));

    } catch (error) {
      logger.error('Error getting user insights:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get user insights',
        error.message
      ));
    }
  };

  // Search user's emotions
  searchEmotions = async (req, res) => {
    try {
      const { 
        q, 
        emotion, 
        coreEmotion, 
        minIntensity, 
        maxIntensity,
        startDate,
        endDate,
        page = 1, 
        limit = 20 
      } = req.query;

      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      let query = { userId };

      if (q) {
        query.$or = [
          { note: { $regex: q, $options: 'i' } },
          { 'memory.description': { $regex: q, $options: 'i' } },
          { 'context.trigger': { $regex: q, $options: 'i' } }
        ];
      }

      if (emotion) query.emotion = emotion;
      if (coreEmotion) query.coreEmotion = coreEmotion;

      if (minIntensity || maxIntensity) {
        query.intensity = {};
        if (minIntensity) query.intensity.$gte = parseFloat(minIntensity);
        if (maxIntensity) query.intensity.$lte = parseFloat(maxIntensity);
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [emotions, total] = await Promise.all([
        UnifiedEmotion.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        UnifiedEmotion.countDocuments(query)
      ]);

      const results = {
        emotions: emotions.map(emotion => ({
          ...emotion.toJSON(),
          insideOutFormat: emotion.toInsideOutFormat()
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

      res.json(createResponse(
        'Emotion search completed successfully',
        results.emotions,
        results.pagination
      ));

    } catch (error) {
      logger.error('Error searching emotions:', error);
      res.status(500).json(createErrorResponse(
        'Failed to search emotions',
        error.message
      ));
    }
  };

  // Update emotion entry
  updateEmotion = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId || req.user?.id;
      const updates = req.body;

      if (!userId) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      const emotion = await UnifiedEmotion.findOne({ _id: id, userId });
      if (!emotion) {
        return res.status(404).json(createErrorResponse('Emotion not found or access denied'));
      }

      const allowedUpdates = [
        'emotion', 'intensity', 'legacyIntensity', 'note', 
        'privacyLevel', 'context', 'memory', 'location'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          emotion[field] = updates[field];
        }
      });

      await emotion.save();

      res.json(createResponse(
        'Emotion updated successfully',
        emotion
      ));

    } catch (error) {
      logger.error('Error updating emotion:', error);
      res.status(500).json(createErrorResponse(
        'Failed to update emotion',
        error.message
      ));
    }
  };

  // Delete emotion entry
  deleteEmotion = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      const emotion = await UnifiedEmotion.findOneAndDelete({ _id: id, userId });
      if (!emotion) {
        return res.status(404).json(createErrorResponse('Emotion not found or access denied'));
      }

      res.json(createResponse(
        'Emotion deleted successfully',
        { id, deletedAt: new Date() }
      ));

    } catch (error) {
      logger.error('Error deleting emotion:', error);
      res.status(500).json(createErrorResponse(
        'Failed to delete emotion',
        error.message
      ));
    }
  };

  // Send comfort reaction (placeholder for social features)
  sendComfortReaction = async (req, res) => {
    try {
      const { emotionId } = req.params;
      const { reactionType, message } = req.body;
      const fromUserId = req.user?.userId || req.user?.id;

      if (!fromUserId) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      // Placeholder implementation - you can enhance this later
      const reaction = {
        id: Date.now(),
        emotionId,
        fromUserId,
        reactionType,
        message,
        createdAt: new Date()
      };

      res.status(201).json(createResponse(
        'Comfort reaction sent successfully',
        reaction
      ));

    } catch (error) {
      logger.error('Error sending comfort reaction:', error);
      res.status(500).json(createErrorResponse(
        'Failed to send comfort reaction',
        error.message
      ));
    }
  };
}

export default new EmotionController();