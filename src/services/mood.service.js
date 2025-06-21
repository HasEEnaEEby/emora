import { getEmotionCategory, getEmotionColor } from '../constants/emotions.js';
import Mood from '../models/mood.model.js';
import cacheService from '../utils/cache.js';
import logger from '../utils/logger.js';
import locationService from './location.service.js';

class MoodService {
  async createMood(userId, moodData, req) {
    try {
      // Get user location if not provided
      let location = moodData.location;
      if (!location && req) {
        location = await locationService.getLocationFromRequest(req);
      }

      const mood = new Mood({
        userId,
        emotion: moodData.emotion,
        intensity: moodData.intensity || 3,
        location,
        tags: moodData.tags || [],
        note: moodData.note || '',
        isAnonymous: moodData.isAnonymous !== false, // Default to true
        source: moodData.source || 'web'
      });

      await mood.save();

      // Invalidate relevant caches
      await this.invalidateUserCaches(userId);
      await this.invalidateGlobalCaches();

      // Emit real-time update
      if (req && req.io) {
        req.io.emit('mood:created', {
          location: mood.location,
          emotion: mood.emotion,
          intensity: mood.intensity,
          timestamp: mood.createdAt
        });
      }

      logger.info(`Mood created for user ${userId}: ${mood.emotion}`);
      return mood;
    } catch (error) {
      logger.error('Error creating mood:', error);
      throw error;
    }
  }

  async getUserMoods(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      emotion,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    try {
      const filter = { userId };
      
      if (emotion) filter.emotion = emotion;
      
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const moods = await Mood.find(filter)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Mood.countDocuments(filter);

      return {
        moods,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching user moods:', error);
      throw error;
    }
  }

  async getUserMoodStats(userId, period = '30d') {
    const cacheKey = `user_mood_stats:${userId}:${period}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const timeFilter = this.getTimeFilter(period);
      const filter = { userId, ...timeFilter };

      const pipeline = [
        { $match: filter },
        {
          $facet: {
            emotionBreakdown: [
              {
                $group: {
                  _id: '$emotion',
                  count: { $sum: 1 },
                  avgIntensity: { $avg: '$intensity' }
                }
              },
              { $sort: { count: -1 } }
            ],
            timePatterns: [
              {
                $group: {
                  _id: '$context.timeOfDay',
                  count: { $sum: 1 },
                  emotions: { $push: '$emotion' }
                }
              }
            ],
            dailyStats: [
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                  },
                  count: { $sum: 1 },
                  avgIntensity: { $avg: '$intensity' },
                  emotions: { $push: '$emotion' }
                }
              },
              { $sort: { '_id': 1 } }
            ],
            overallStats: [
              {
                $group: {
                  _id: null,
                  totalMoods: { $sum: 1 },
                  avgIntensity: { $avg: '$intensity' },
                  uniqueEmotions: { $addToSet: '$emotion' }
                }
              }
            ]
          }
        }
      ];

      const [result] = await Mood.aggregate(pipeline);
      
      const stats = {
        period,
        emotionBreakdown: result.emotionBreakdown.map(item => ({
          emotion: item._id,
          count: item.count,
          avgIntensity: Math.round(item.avgIntensity * 100) / 100,
          color: getEmotionColor(item._id),
          category: getEmotionCategory(item._id)
        })),
        timePatterns: result.timePatterns,
        dailyStats: result.dailyStats,
        overall: result.overallStats[0] || {
          totalMoods: 0,
          avgIntensity: 0,
          uniqueEmotions: []
        },
        dominantEmotion: result.emotionBreakdown[0] || null,
        moodScore: this.calculateMoodScore(result.emotionBreakdown)
      };

      // Cache for 10 minutes
      await cacheService.set(cacheKey, stats, 600);
      
      return stats;
    } catch (error) {
      logger.error('Error getting user mood stats:', error);
      throw error;
    }
  }

  async deleteMood(userId, moodId) {
    try {
      const mood = await Mood.findOneAndDelete({ 
        _id: moodId, 
        userId 
      });

      if (!mood) {
        throw new Error('Mood not found or unauthorized');
      }

      // Invalidate caches
      await this.invalidateUserCaches(userId);
      await this.invalidateGlobalCaches();

      logger.info(`Mood deleted: ${moodId} for user ${userId}`);
      return mood;
    } catch (error) {
      logger.error('Error deleting mood:', error);
      throw error;
    }
  }

  async getUserMoodHistory(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const pipeline = [
        {
          $match: {
            userId: mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            moods: {
              $push: {
                emotion: '$emotion',
                intensity: '$intensity',
                time: '$createdAt'
              }
            },
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' }
          }
        },
        { $sort: { '_id': 1 } }
      ];

      const history = await Mood.aggregate(pipeline);
      
      return history.map(day => ({
        date: day._id,
        moods: day.moods,
        count: day.count,
        avgIntensity: Math.round(day.avgIntensity * 100) / 100
      }));
    } catch (error) {
      logger.error('Error getting user mood history:', error);
      throw error;
    }
  }

  getTimeFilter(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { createdAt: { $gte: startDate } };
  }

  calculateMoodScore(emotionBreakdown) {
    if (!emotionBreakdown || emotionBreakdown.length === 0) return 50;

    let score = 0;
    let totalCount = 0;

    const emotionWeights = {
      happy: 90,
      excited: 85,
      calm: 80,
      bored: 50,
      anxious: 30,
      sad: 20,
      angry: 10
    };

    emotionBreakdown.forEach(item => {
      const weight = emotionWeights[item._id] || 50;
      score += weight * item.count;
      totalCount += item.count;
    });

    return totalCount > 0 ? Math.round(score / totalCount) : 50;
  }

  async invalidateUserCaches(userId) {
    const patterns = [
      `user_mood_stats:${userId}:*`,
      `user_analytics:${userId}:*`
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }
  }

  async invalidateGlobalCaches() {
    const patterns = [
      'heatmap:*',
      'global_stats:*'
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }
  }
}

export default new MoodService();
