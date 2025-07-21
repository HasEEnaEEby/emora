// src/services/mood.service.js - Updated with enhanced location features
import { getEmotionColor } from '../constants/emotions.js';
import Mood from '../models/mood.model.js';
import User from '../models/user.model.js';
import cacheService from '../utils/cache.js';
import logger from '../utils/logger.js';
import locationService from './location.service.js';

class MoodService {
  // . ENHANCED: Your existing createMood method with better location handling
  async createMood(userId, moodData, req) {
    try {
      // Get user's location preferences
      const user = await User.findById(userId).select('preferences location');
      
      // Process location based on user consent
      let location = moodData.location;
      if (!location && req) {
        // Check if user has given location consent
        const consentLevel = user?.preferences?.locationShareLevel || 'none';
        if (consentLevel !== 'none') {
          location = await locationService.getLocationFromRequest(req, consentLevel);
        } else {
          location = locationService.getDefaultLocation();
        }
      }

      // . NEW: Enhanced mood data with better context
      const mood = new Mood({
        userId,
        emotion: moodData.emotion,
        intensity: moodData.intensity || 3,
        
        // . Enhanced location with consent tracking
        location: location || locationService.getDefaultLocation(),
        
        // . Enhanced context
        context: {
          weather: moodData.context?.weather || 'unknown',
          temperature: moodData.context?.temperature,
          activityType: moodData.context?.activityType || 'other',
          socialContext: moodData.context?.socialContext || 'alone',
          sleepQuality: moodData.context?.sleepQuality,
          exerciseToday: moodData.context?.exerciseToday || false,
          stressLevel: moodData.context?.stressLevel
        },
        
        // . Enhanced mood details
        triggers: moodData.triggers || [],
        coping_strategies: moodData.coping_strategies || [],
        
        tags: moodData.tags || [],
        note: moodData.note || '',
        isAnonymous: moodData.isAnonymous !== false, // Default to true
        privacy: moodData.privacy || 'private',
        source: moodData.source || 'web'
      });

      await mood.save();

      // . NEW: Get location-based suggestions if location available
      let locationSuggestions = [];
      if (location && location.hasUserConsent && location.coordinates) {
        try {
          const insights = await locationService.getLocationBasedInsights(
            userId, 
            location.coordinates, 
            25 // 25km radius
          );
          locationSuggestions = insights.insights || [];
        } catch (error) {
          logger.warn('Failed to get location insights:', error);
        }
      }

      // Invalidate relevant caches
      await this.invalidateUserCaches(userId);
      await this.invalidateGlobalCaches();

      // Emit real-time update with location-aware data
      if (req && req.io) {
        const sharedLocationData = locationService.getSharedLocationData(
          mood.location, 
          user?.preferences?.locationShareLevel || 'city_only'
        );
        
        req.io.emit('mood:created', {
          location: sharedLocationData,
          emotion: mood.emotion,
          intensity: mood.intensity,
          timestamp: mood.createdAt,
          suggestions: locationSuggestions
        });
      }

      logger.info(`Mood created for user ${userId}: ${mood.emotion} with location consent: ${location?.hasUserConsent || false}`);
      
      return {
        mood,
        locationSuggestions
      };
      
    } catch (error) {
      logger.error('Error creating mood:', error);
      throw error;
    }
  }

  // . Your existing getUserMoods method (unchanged)
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

  // . ENHANCED: Your existing getUserMoodStats with location insights
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
            // . NEW: Activity patterns
            activityPatterns: [
              {
                $group: {
                  _id: '$context.activityType',
                  count: { $sum: 1 },
                  avgIntensity: { $avg: '$intensity' },
                  emotions: { $push: '$emotion' }
                }
              },
              { $sort: { count: -1 } }
            ],
            // . NEW: Location patterns (if consent given)
            locationPatterns: [
              {
                $match: { 'location.hasUserConsent': true }
              },
              {
                $group: {
                  _id: '$location.city',
                  count: { $sum: 1 },
                  avgIntensity: { $avg: '$intensity' },
                  emotions: { $push: '$emotion' }
                }
              },
              { $sort: { avgIntensity: -1 } }
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
                  uniqueEmotions: { $addToSet: '$emotion' },
                  // . NEW: Enhanced stats
                  hasLocationData: { 
                    $sum: { $cond: [{ $eq: ['$location.hasUserConsent', true] }, 1, 0] }
                  },
                  triggersUsed: { $addToSet: '$triggers' },
                  copingStrategiesUsed: { $addToSet: '$coping_strategies' }
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
          category: this.getEmotionCategory(item._id)
        })),
        timePatterns: result.timePatterns,
        // . NEW: Enhanced patterns
        activityPatterns: result.activityPatterns,
        locationPatterns: result.locationPatterns,
        dailyStats: result.dailyStats,
        overall: result.overallStats[0] || {
          totalMoods: 0,
          avgIntensity: 0,
          uniqueEmotions: [],
          hasLocationData: 0,
          triggersUsed: [],
          copingStrategiesUsed: []
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

  // . NEW: Get location-based mood insights
  async getLocationBasedMoodInsights(userId, coordinates, radiusKm = 50) {
    const cacheKey = `location_mood_insights:${userId}:${coordinates?.join(',') || 'none'}:${radiusKm}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      if (!coordinates || coordinates.length !== 2) {
        return { insights: [], message: 'Enable location sharing to see local mood insights' };
      }

      const [longitude, latitude] = coordinates;
      const radiusInRadians = radiusKm / 6371;

      // Get user's recent mood patterns
      const userMoods = await Mood.find({
        userId: userId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).select('emotion intensity triggers coping_strategies');

      // Get community patterns in the area
      const communityPatterns = await Mood.aggregate([
        {
          $match: {
            'location.hasUserConsent': true,
            'location.coordinates': {
              $geoWithin: {
                $centerSphere: [[longitude, latitude], radiusInRadians]
              }
            },
            userId: { $ne: userId },
            privacy: { $in: ['public', 'local_community'] },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$emotion',
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' },
            successfulCoping: { $addToSet: '$coping_strategies' },
            commonTriggers: { $addToSet: '$triggers' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const insights = this.generatePersonalizedLocationInsights(userMoods, communityPatterns);
      
      const result = {
        insights,
        communitySize: communityPatterns.reduce((sum, p) => sum + p.count, 0),
        radiusKm
      };

      await cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
      return result;

    } catch (error) {
      logger.error('Error getting location-based mood insights:', error);
      return { insights: [], message: 'Unable to get location insights at this time' };
    }
  }

  // . NEW: Generate personalized insights from location data
  generatePersonalizedLocationInsights(userMoods, communityPatterns) {
    const insights = [];

    if (userMoods.length === 0) {
      return [{
        type: 'onboarding',
        message: 'Start logging your moods to see personalized insights based on your location!',
        priority: 'medium'
      }];
    }

    // Analyze user's dominant emotions
    const userEmotionCounts = {};
    userMoods.forEach(mood => {
      userEmotionCounts[mood.emotion] = (userEmotionCounts[mood.emotion] || 0) + 1;
    });

    const userTopEmotion = Object.keys(userEmotionCounts).reduce((a, b) => 
      userEmotionCounts[a] > userEmotionCounts[b] ? a : b
    );

    // Find community patterns for user's top emotion
    const communityPattern = communityPatterns.find(p => p._id === userTopEmotion);

    if (communityPattern) {
      insights.push({
        type: 'community_validation',
        message: `You're not alone - ${communityPattern.count} people in your area have also been experiencing ${userTopEmotion} recently.`,
        data: {
          emotion: userTopEmotion,
          communityCount: communityPattern.count,
          avgIntensity: communityPattern.avgIntensity
        },
        priority: 'high'
      });

      // Suggest successful coping strategies from the community
      if (communityPattern.successfulCoping && communityPattern.successfulCoping.length > 0) {
        const copingStrategies = communityPattern.successfulCoping.flat().filter(Boolean);
        if (copingStrategies.length > 0) {
          insights.push({
            type: 'local_coping_suggestions',
            message: `People in your area have found these strategies helpful for ${userTopEmotion}: ${copingStrategies.slice(0, 3).join(', ')}`,
            data: {
              strategies: copingStrategies,
              emotion: userTopEmotion
            },
            priority: 'medium'
          });
        }
      }
    }

    // Community mood trends
    if (communityPatterns.length > 0) {
      const topCommunityEmotion = communityPatterns[0];
      if (topCommunityEmotion._id !== userTopEmotion) {
        insights.push({
          type: 'community_trend',
          message: `The most common emotion in your area is ${topCommunityEmotion._id}. Consider connecting with others who might be having similar experiences.`,
          data: {
            emotion: topCommunityEmotion._id,
            count: topCommunityEmotion.count
          },
          priority: 'low'
        });
      }
    }

    return insights;
  }

  // . Your existing methods (unchanged)
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

  // . Your existing methods with minor enhancements
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
      happy: 90, excited: 85, calm: 80, grateful: 85, content: 75,
      bored: 50, confused: 45,
      anxious: 30, sad: 20, angry: 10, overwhelmed: 25, stressed: 30
    };

    emotionBreakdown.forEach(item => {
      const weight = emotionWeights[item._id] || 50;
      score += weight * item.count;
      totalCount += item.count;
    });

    return totalCount > 0 ? Math.round(score / totalCount) : 50;
  }

  getEmotionCategory(emotion) {
    const categories = {
      happy: 'positive', excited: 'positive', calm: 'positive', grateful: 'positive', content: 'positive',
      sad: 'negative', angry: 'negative', anxious: 'negative', overwhelmed: 'negative', stressed: 'negative',
      bored: 'neutral', confused: 'neutral'
    };
    return categories[emotion] || 'neutral';
  }

  async invalidateUserCaches(userId) {
    const patterns = [
      `user_mood_stats:${userId}:*`,
      `user_analytics:${userId}:*`,
      `location_mood_insights:${userId}:*`
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }
  }

  async invalidateGlobalCaches() {
    const patterns = [
      'heatmap:*',
      'global_stats:*',
      'location_insights:*'
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }
  }
}

export default new MoodService();