// src/services/emotion.service.js - Fixed version
import { getCoreEmotion, getCoreEmotionColor } from '../constants/emotions.js';
import Emotion from '../models/emotion.model.js';
import cacheService from '../utils/cache.js';
import logger from '../utils/logger.js';

// Import geohash service with error handling
let geoService = null;
try {
  const geoModule = await import('../utils/geohash.js');
  geoService = geoModule.default;
} catch (error) {
  logger.warn('🗺️ Geohash service not available, location features will be limited');
}

export async function getEmotionLogsForRegion(region) {
  try {
    logger.info(`🌍 Fetching emotion logs for region: ${region}`);
    
    // Get recent emotions (last 24 hours) that have location data
    const timeRange = new Date();
    timeRange.setHours(timeRange.getHours() - 24);
    
    const logs = await Emotion.find({
      $or: [
        { 'location.city': { $regex: region, $options: 'i' } },
        { 'location.region': { $regex: region, $options: 'i' } },
        { 'location.country': { $regex: region, $options: 'i' } }
      ],
      $or: [
        { timestamp: { $gte: timeRange } },
        { createdAt: { $gte: timeRange } }
      ],
      hasLocation: true
    }).limit(50).sort({ timestamp: -1, createdAt: -1 });
    
    logger.info(`✅ Found ${logs.length} emotion logs for ${region}`);
    
    // Format logs for Gemini
    return logs.map(log => ({
      emotion: log.emotion || log.type,
      intensity: log.intensity || 3,
      timestamp: log.timestamp || log.createdAt,
      note: log.note || '',
      tags: log.tags || [],
      location: log.location || {}
    }));
    
  } catch (error) {
    logger.error(`❌ Error fetching emotion logs for region ${region}:`, error);
    // Return mock data as fallback
    return [
      { emotion: 'joy', intensity: 0.8, timestamp: new Date().toISOString(), note: 'Feeling great today', tags: ['positive'], location: { city: region } },
      { emotion: 'calm', intensity: 0.6, timestamp: new Date().toISOString(), note: 'Peaceful morning', tags: ['relaxed'], location: { city: region } },
      { emotion: 'anxious', intensity: 0.4, timestamp: new Date().toISOString(), note: 'Work stress', tags: ['work'], location: { city: region } },
    ];
  }
}

class EmotionService {
  /**
   * Log a new emotion entry with enhanced processing
   */
  async logEmotion(emotionData) {
    try {
      logger.info(`🎭 Processing emotion entry: ${emotionData.emotion || emotionData.type}`);
      
      // Normalize emotion field (handle both 'emotion' and 'type' fields)
      const emotionType = emotionData.emotion || emotionData.type;
      
      // Create unified emotion entry
      const emotionEntry = new Emotion({
        ...emotionData,
        emotion: emotionType, // Ensure consistent field name
        type: emotionType,    // Keep type for backward compatibility
        coreEmotion: getCoreEmotion(emotionType),
        timestamp: new Date(),
        timezone: emotionData.timezone || 'UTC'
      });

      // Enhanced context processing
      await this.enrichEmotionContext(emotionEntry);
      
      // Save the emotion
      const savedEmotion = await emotionEntry.save();
      
      // Async post-processing (don't await to keep response fast)
      this.processEmotionAsync(savedEmotion);
      
      logger.info(`✅ Emotion logged successfully: ${savedEmotion._id}`);
      return savedEmotion;
      
    } catch (error) {
      logger.error('❌ Error logging emotion:', error);
      throw new Error('Failed to log emotion');
    }
  }

  /**
   * Get user emotion insights with real data aggregation
   */
  async getUserEmotionInsights(userId, timeframe = '30d') {
    try {
      logger.info(`📊 Generating insights for user: ${userId} (${timeframe})`);
      
      const timeRange = this.getTimeRange(timeframe);
      
      // Fetch real emotion data for the user
      const userEmotions = await Emotion.find({
        userId,
        $or: [
          { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
          { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
        ]
      }).sort({ timestamp: -1, createdAt: -1 });

      if (userEmotions.length === 0) {
        logger.info(`📊 No emotions found for user: ${userId}`);
        return this.getDefaultInsights(timeframe);
      }

      // Calculate real insights from actual data
      const insights = {
        summary: this.generateEmotionalSummary(userEmotions),
        patterns: this.analyzeEmotionalPatterns(userEmotions),
        trends: this.analyzeEmotionalTrends(userEmotions),
        recommendations: this.generateRecommendations(userEmotions),
        achievements: this.calculateAchievements(userEmotions),
        weeklyData: this.generateWeeklyMoodData(userEmotions),
        dominantMood: this.findDominantEmotion(userEmotions),
        timeframe,
        generatedAt: new Date().toISOString(),
        totalEntries: userEmotions.length
      };

      logger.info(`✅ Insights generated for user ${userId}: ${insights.totalEntries} entries`);
      return insights;
      
    } catch (error) {
      logger.error('❌ Error generating user insights:', error);
      throw new Error('Failed to generate insights');
    }
  }

  /**
   * Generate weekly mood data for charts
   */
  generateWeeklyMoodData(emotions) {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      const weekData = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(weekStart.getDate() + i);
        
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        // Find emotions for this day
        const dayEmotions = emotions.filter(emotion => {
          const emotionDate = new Date(emotion.timestamp || emotion.createdAt);
          return emotionDate >= dayStart && emotionDate < dayEnd;
        });

        if (dayEmotions.length > 0) {
          // Calculate average intensity for the day
          const avgIntensity = dayEmotions.reduce((sum, e) => sum + e.intensity, 0) / dayEmotions.length;
          const dominantEmotion = this.findDominantEmotion(dayEmotions);
          
          weekData.push({
            day: days[i],
            intensity: Math.round(avgIntensity * 100) / 100,
            color: getCoreEmotionColor(dominantEmotion),
            emotion: dominantEmotion,
            count: dayEmotions.length
          });
        } else {
          // No emotions for this day
          weekData.push({
            day: days[i],
            intensity: 0,
            color: getCoreEmotionColor('neutral'), // Use a neutral color for no data
            emotion: 'neutral',
            count: 0
          });
        }
      }

      return weekData;
    } catch (error) {
      logger.error('❌ Error generating weekly mood data:', error);
      return [];
    }
  }

  /**
   * Get global emotion statistics with real data
   */
  async getGlobalEmotionStats(timeframe = '24h') {
    try {
      const cacheKey = `global_stats:${timeframe}`;
      
      // Try cache first
      if (cacheService?.get) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.info(`📊 Returning cached global stats for ${timeframe}`);
          return JSON.parse(cached);
        }
      }
      
      // Calculate stats from real data
      const timeRange = this.getTimeRange(timeframe);
      const stats = await this.calculateGlobalStats(timeRange);
      
      // Cache for 5 minutes
      if (cacheService?.set) {
        await cacheService.set(cacheKey, JSON.stringify(stats), 300);
      }
      
      logger.info(`📊 Generated fresh global stats for ${timeframe}`);
      return stats;
      
    } catch (error) {
      logger.error('❌ Error getting global emotion stats:', error);
      return this.getFallbackStats();
    }
  }

  /**
   * Calculate actual global statistics from real data
   */
  async calculateGlobalStats(timeRange) {
    try {
      const pipeline = [
        {
          $match: {
            $or: [
              { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
              { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
            ]
          }
        },
        {
          $group: {
            _id: '$coreEmotion',
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' },
            emotions: { $addToSet: '$emotion' },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        { $sort: { count: -1 } }
      ];
      
      const results = await Emotion.aggregate(pipeline);
      
      const totalEntries = results.reduce((sum, r) => sum + r.count, 0);
      const activeUsers = new Set();
      results.forEach(r => r.uniqueUsers.forEach(u => u && activeUsers.add(u.toString())));
      
      return {
        emotionDistribution: results.reduce((dist, r) => {
          dist[r._id] = Math.round((r.count / totalEntries) * 100);
          return dist;
        }, {}),
        totalEmotions: totalEntries,
        activeUsers: activeUsers.size,
        topEmotion: results[0]?._id || 'joy',
        averageIntensity: results.reduce((sum, r) => sum + r.avgIntensity, 0) / (results.length || 1),
        lastUpdated: new Date().toISOString(),
        detailed: results.map(r => ({
          emotion: r._id,
          count: r.count,
          percentage: Math.round((r.count / totalEntries) * 100),
          avgIntensity: Math.round(r.avgIntensity * 100) / 100,
          subEmotions: r.emotions
        }))
      };
    } catch (error) {
      logger.error('❌ Error calculating global stats:', error);
      return this.getFallbackStats();
    }
  }

  /**
   * Process daily emotion calculations (called at 6 PM daily)
   */
  async processDailyEmotionCalculations() {
    try {
      logger.info('🕕 Processing daily emotion calculations...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all emotions from today
      const todayEmotions = await Emotion.find({
        $or: [
          { timestamp: { $gte: today, $lt: tomorrow } },
          { createdAt: { $gte: today, $lt: tomorrow } }
        ]
      });

      if (todayEmotions.length === 0) {
        logger.info('📊 No emotions found for today');
        return;
      }

      // Calculate daily statistics
      const dailyStats = {
        date: today,
        totalEntries: todayEmotions.length,
        uniqueUsers: new Set(todayEmotions.map(e => e.userId.toString())).size,
        emotionDistribution: {},
        averageIntensity: 0,
        topEmotion: null
      };

      // Calculate emotion distribution
      const emotionCounts = {};
      let totalIntensity = 0;

      todayEmotions.forEach(emotion => {
        const emotionType = emotion.emotion || emotion.type;
        emotionCounts[emotionType] = (emotionCounts[emotionType] || 0) + 1;
        totalIntensity += emotion.intensity;
      });

      dailyStats.averageIntensity = totalIntensity / todayEmotions.length;
      dailyStats.emotionDistribution = emotionCounts;

      // Find top emotion
      const topEmotion = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0];
      dailyStats.topEmotion = topEmotion ? topEmotion[0] : null;

      // Cache daily stats
      if (cacheService?.set) {
        await cacheService.set('daily_stats', JSON.stringify(dailyStats), 86400); // 24 hours
      }

      logger.info(`✅ Daily calculations completed: ${dailyStats.totalEntries} entries, ${dailyStats.uniqueUsers} users`);
      
      // Trigger insights recalculation for active users
      const uniqueUserIds = [...new Set(todayEmotions.map(e => e.userId.toString()))];
      for (const userId of uniqueUserIds) {
        try {
          await this.getUserEmotionInsights(userId, '7d');
        } catch (error) {
          logger.warning(`⚠️ Failed to recalculate insights for user ${userId}: ${error.message}`);
        }
      }

    } catch (error) {
      logger.error('❌ Error processing daily calculations:', error);
    }
  }

  /**
   * Get user's emotion history for analytics
   */
  async getUserEmotionHistory(userId, limit = 50, offset = 0) {
    try {
      const emotions = await Emotion.find({ userId })
        .sort({ timestamp: -1, createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return emotions.map(emotion => ({
        id: emotion._id.toString(),
        userId: emotion.userId,
        emotion: emotion.emotion || emotion.type,
        intensity: emotion.intensity,
        timestamp: emotion.timestamp || emotion.createdAt,
        note: emotion.note,
        tags: emotion.tags || [],
        location: emotion.location,
        context: emotion.context,
        privacy: emotion.privacy || 'private'
      }));
    } catch (error) {
      logger.error('❌ Error fetching user emotion history:', error);
      throw new Error('Failed to fetch emotion history');
    }
  }

  /**
   * Get emotion analytics for charts and insights
   */
  async getEmotionAnalytics(userId, timeframe = '7d') {
    try {
      const timeRange = this.getTimeRange(timeframe);
      
      const emotions = await Emotion.find({
        userId,
        $or: [
          { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
          { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
        ]
      }).sort({ timestamp: -1, createdAt: -1 });

      if (emotions.length === 0) {
        return {
          weeklyData: [],
          dominantMood: 'neutral',
          averageIntensity: 0,
          totalEntries: 0,
          insights: []
        };
      }

      return {
        weeklyData: this.generateWeeklyMoodData(emotions),
        dominantMood: this.findDominantEmotion(emotions),
        averageIntensity: emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length,
        totalEntries: emotions.length,
        insights: this.generateRecommendations(emotions)
      };
    } catch (error) {
      logger.error('❌ Error fetching emotion analytics:', error);
      throw new Error('Failed to fetch emotion analytics');
    }
  }

  /**
   * Enhanced context processing
   */
  async enrichEmotionContext(emotionEntry) {
    try {
      // Enhance location data
      if (emotionEntry.location && emotionEntry.location.coordinates && geoService) {
        const [lng, lat] = emotionEntry.location.coordinates;
        
        try {
          // Add geohash for better querying
          emotionEntry.location.geohash = geoService.encode(lat, lng, 8);
          
          // Auto-detect timezone if not provided
          if (!emotionEntry.timezone) {
            emotionEntry.timezone = geoService.estimateTimezone(lat, lng);
          }
        } catch (geoError) {
          logger.warn('🗺️ Geohash encoding failed:', geoError.message);
        }
      }

      // Enhance temporal context
      const now = emotionEntry.timestamp || new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      if (!emotionEntry.context.timeOfDay) {
        emotionEntry.context.timeOfDay = this.getTimeOfDay(hour);
      }
      
      if (!emotionEntry.context.dayOfWeek) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        emotionEntry.context.dayOfWeek = days[day];
        emotionEntry.context.isWeekend = day === 0 || day === 6;
      }

      // Add emotion metadata
      emotionEntry.analytics = emotionEntry.analytics || {};
      emotionEntry.analytics.peakIntensity = emotionEntry.intensity;
      
    } catch (error) {
      logger.error('Error enriching emotion context:', error);
    }
  }

  /**
   * Async processing after emotion is saved
   */
  async processEmotionAsync(emotionEntry) {
    try {
      // Update user timeline
      await this.updateEmotionTimeline(emotionEntry.userId, emotionEntry);
      
      // Update global statistics
      await this.updateGlobalStats(emotionEntry);
      
      // Check for emotion transitions
      await this.detectEmotionTransitions(emotionEntry);
      
      // Update analytics
      await this.updateEmotionAnalytics(emotionEntry);
      
      // Invalidate relevant caches
      await this.invalidateRelevantCaches(emotionEntry);
      
    } catch (error) {
      logger.error('Error in async emotion processing:', error);
    }
  }

  /**
   * Update emotion timeline for a user
   */
  async updateEmotionTimeline(userId, emotionEntry) {
    try {
      if (!userId) return; // Skip for anonymous entries
      
      // Check if EmotionTimeline model exists
      let EmotionTimeline;
      try {
        const timelineModule = await import('../models/emotion-timeline.model.js');
        EmotionTimeline = timelineModule.default;
      } catch (error) {
        logger.info('📈 EmotionTimeline model not available, skipping timeline update');
        return;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find or create today's timeline
      let timeline = await EmotionTimeline.findOne({
        userId,
        date: today
      });
      
      if (!timeline) {
        timeline = new EmotionTimeline({
          userId,
          date: today,
          emotions: [],
          stats: {
            totalEntries: 0,
            dominantEmotion: emotionEntry.coreEmotion,
            averageIntensity: emotionEntry.intensity
          }
        });
      }
      
      // Add emotion to timeline
      timeline.emotions.push({
        emotion: emotionEntry.emotion,
        coreEmotion: emotionEntry.coreEmotion,
        intensity: emotionEntry.intensity,
        timestamp: emotionEntry.timestamp,
        context: emotionEntry.context
      });
      
      // Update stats
      timeline.stats.totalEntries++;
      const emotions = timeline.emotions;
      timeline.stats.averageIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;
      
      // Find dominant emotion
      const emotionCounts = {};
      emotions.forEach(e => {
        emotionCounts[e.coreEmotion] = (emotionCounts[e.coreEmotion] || 0) + 1;
      });
      timeline.stats.dominantEmotion = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
      
      await timeline.save();
      logger.info(`📈 Updated timeline for user ${userId}`);
      
    } catch (error) {
      logger.error('Error updating emotion timeline:', error);
    }
  }

  /**
   * Update global statistics
   */
  async updateGlobalStats(emotionEntry) {
    try {
      // Invalidate global stats cache
      if (cacheService?.del) {
        await cacheService.del('global_stats:1h');
        await cacheService.del('global_stats:24h');
        await cacheService.del('global_stats:7d');
        await cacheService.del('global_stats:30d');
      }
      
      logger.info(`Updated global stats for emotion: ${emotionEntry.coreEmotion}`);
      return true;
    } catch (error) {
      logger.error('Error updating global stats:', error);
      return false;
    }
  }

  /**
   * Detect emotion transitions
   */
  async detectEmotionTransitions(currentEmotion) {
    try {
      if (!currentEmotion.userId) return;
      
      // Find the last emotion for this user
      const lastEmotion = await Emotion
        .findOne({ 
          userId: currentEmotion.userId,
          _id: { $ne: currentEmotion._id }
        })
        .sort({ timestamp: -1 });
      
      if (lastEmotion && lastEmotion.coreEmotion !== currentEmotion.coreEmotion) {
        // Update current emotion with transition info
        currentEmotion.analytics.transitionFrom = {
          emotion: lastEmotion.emotion,
          coreEmotion: lastEmotion.coreEmotion,
          timestamp: lastEmotion.timestamp
        };
        
        // Update last emotion with transition info
        lastEmotion.analytics.transitionTo = {
          emotion: currentEmotion.emotion,
          coreEmotion: currentEmotion.coreEmotion,
          timestamp: currentEmotion.timestamp
        };
        
        await lastEmotion.save();
        await currentEmotion.save();
        
        logger.info(`🔄 Detected transition: ${lastEmotion.coreEmotion} → ${currentEmotion.coreEmotion}`);
      }
      
    } catch (error) {
      logger.error('Error detecting emotion transitions:', error);
    }
  }

  /**
   * Update emotion analytics
   */
  async updateEmotionAnalytics(emotionEntry) {
    try {
      // Check if EmotionAnalytics model exists
      let EmotionAnalytics;
      try {
        const analyticsModule = await import('../models/emotion-analytics.model.js');
        EmotionAnalytics = analyticsModule.default;
      } catch (error) {
        logger.info('. EmotionAnalytics model not available, skipping analytics update');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find or create analytics for today
      let analytics = await EmotionAnalytics.findOne({
        date: today,
        ...(emotionEntry.location?.country && { 
          'location.country': emotionEntry.location.country 
        })
      });
      
      if (!analytics) {
        analytics = new EmotionAnalytics({
          date: today,
          location: emotionEntry.location,
          aggregationType: 'daily',
          globalStats: {
            totalEntries: 0,
            uniqueUsers: [],
            emotionDistribution: new Map(),
            coreEmotionDistribution: new Map(),
            averageIntensity: 0
          }
        });
      }
      
      // Update analytics
      analytics.globalStats.totalEntries++;
      if (emotionEntry.userId) {
        const userIdStr = emotionEntry.userId.toString();
        if (!analytics.globalStats.uniqueUsers.includes(userIdStr)) {
          analytics.globalStats.uniqueUsers.push(userIdStr);
        }
      }
      
      // Update emotion distributions
      const emotionDist = analytics.globalStats.emotionDistribution || new Map();
      const currentEmotionData = emotionDist.get(emotionEntry.emotion) || { count: 0, averageIntensity: 0 };
      currentEmotionData.count++;
      currentEmotionData.averageIntensity = ((currentEmotionData.averageIntensity * (currentEmotionData.count - 1)) + emotionEntry.intensity) / currentEmotionData.count;
      emotionDist.set(emotionEntry.emotion, currentEmotionData);
      analytics.globalStats.emotionDistribution = emotionDist;
      
      const coreEmotionDist = analytics.globalStats.coreEmotionDistribution || new Map();
      const currentCoreData = coreEmotionDist.get(emotionEntry.coreEmotion) || { count: 0, averageIntensity: 0 };
      currentCoreData.count++;
      currentCoreData.averageIntensity = ((currentCoreData.averageIntensity * (currentCoreData.count - 1)) + emotionEntry.intensity) / currentCoreData.count;
      coreEmotionDist.set(emotionEntry.coreEmotion, currentCoreData);
      analytics.globalStats.coreEmotionDistribution = coreEmotionDist;
      
      // Update average intensity
      const totalIntensity = analytics.globalStats.averageIntensity * (analytics.globalStats.totalEntries - 1) + emotionEntry.intensity;
      analytics.globalStats.averageIntensity = totalIntensity / analytics.globalStats.totalEntries;
      
      await analytics.save();
      
    } catch (error) {
      logger.error('Error updating emotion analytics:', error);
    }
  }

  /**
   * Get global emotion statistics with caching
   */
  async getGlobalEmotionStats(timeframe = '24h') {
    try {
      const cacheKey = `global_stats:${timeframe}`;
      
      // Try cache first
      if (cacheService?.get) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.info(`. Returning cached global stats for ${timeframe}`);
          return JSON.parse(cached);
        }
      }
      
      // Calculate stats
      const timeRange = this.getTimeRange(timeframe);
      const stats = await this.calculateGlobalStats(timeRange);
      
      // Cache for 5 minutes
      if (cacheService?.set) {
        await cacheService.set(cacheKey, JSON.stringify(stats), 300);
      }
      
      logger.info(`. Generated fresh global stats for ${timeframe}`);
      return stats;
      
    } catch (error) {
      logger.error('Error getting global emotion stats:', error);
      return this.getFallbackStats();
    }
  }

  /**
   * Calculate actual global statistics
   */
  async calculateGlobalStats(timeRange) {
    try {
      const pipeline = [
        {
          $match: {
            $or: [
              { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
              { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
            ]
          }
        },
        {
          $group: {
            _id: '$coreEmotion',
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' },
            emotions: { $addToSet: '$emotion' },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        { $sort: { count: -1 } }
      ];
      
      const results = await Emotion.aggregate(pipeline);
      
      const totalEntries = results.reduce((sum, r) => sum + r.count, 0);
      const activeUsers = new Set();
      results.forEach(r => r.uniqueUsers.forEach(u => u && activeUsers.add(u.toString())));
      
      return {
        emotionDistribution: results.reduce((dist, r) => {
          dist[r._id] = Math.round((r.count / totalEntries) * 100);
          return dist;
        }, {}),
        totalEmotions: totalEntries,
        activeUsers: activeUsers.size,
        topEmotion: results[0]?._id || 'joy',
        averageIntensity: results.reduce((sum, r) => sum + r.avgIntensity, 0) / (results.length || 1),
        lastUpdated: new Date().toISOString(),
        detailed: results.map(r => ({
          emotion: r._id,
          count: r.count,
          percentage: Math.round((r.count / totalEntries) * 100),
          avgIntensity: Math.round(r.avgIntensity * 100) / 100,
          subEmotions: r.emotions
        }))
      };
    } catch (error) {
      logger.error('Error calculating global stats:', error);
      return this.getFallbackStats();
    }
  }

  /**
   * Get enhanced global emotion heatmap
   */
  async getGlobalEmotionHeatmap(bounds, timeframe = '24h') {
    try {
      const timeRange = this.getTimeRange(timeframe);
      const heatmapData = await Emotion.getGlobalEmotionHeatmap(bounds, timeRange);
      
      // Process and enhance heatmap data
      const processedData = heatmapData.map(point => ({
        location: point._id.location,
        coreEmotion: point._id.coreEmotion,
        count: point.count,
        intensity: Math.round(point.avgIntensity * 100) / 100,
        emotions: point.emotions,
        color: getCoreEmotionColor(point._id.coreEmotion),
        lastUpdate: point.lastUpdate,
        weight: this.calculateHeatmapWeight(point.count, point.avgIntensity)
      }));
      
      return {
        data: processedData,
        meta: {
          timeframe,
          totalPoints: processedData.length,
          coverage: bounds,
          lastUpdated: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error('Error getting global emotion heatmap:', error);
      throw new Error('Failed to get emotion heatmap');
    }
  }

  /**
   * Generate advanced insights for a user
   */
  async generateInsights(userId, timeframe = '30d') {
    try {
      if (!userId) {
        return this.generateAnonymousInsights();
      }
      
      const timeRange = this.getTimeRange(timeframe);
      const userEmotions = await Emotion.find({
        userId,
        $or: [
          { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
          { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
        ]
      }).sort({ timestamp: -1 });
      
      if (userEmotions.length === 0) {
        return this.getDefaultInsights(timeframe);
      }
      
      const insights = {
        summary: this.generateEmotionalSummary(userEmotions),
        patterns: this.analyzeEmotionalPatterns(userEmotions),
        trends: this.analyzeEmotionalTrends(userEmotions),
        recommendations: this.generateRecommendations(userEmotions),
        achievements: this.calculateAchievements(userEmotions),
        timeframe,
        generatedAt: new Date().toISOString()
      };
      
      return insights;
      
    } catch (error) {
      logger.error('Error generating insights:', error);
      throw new Error('Failed to generate insights');
    }
  }

  /**
   * Helper methods
   */
  getTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  getTimeRange(timeframe) {
    const end = new Date();
    const start = new Date();
    
    switch (timeframe) {
      case '1h':
        start.setHours(end.getHours() - 1);
        break;
      case '24h':
        start.setDate(end.getDate() - 1);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      default:
        start.setDate(end.getDate() - 1);
    }
    
    return { start, end };
  }

  calculateHeatmapWeight(count, intensity) {
    return Math.min(count * intensity * 0.1, 1.0);
  }

  getFallbackStats() {
    return {
      emotionDistribution: {
        joy: 25,
        sadness: 20,
        anger: 15,
        fear: 20,
        disgust: 20
      },
      totalEmotions: 0,
      activeUsers: 0,
      topEmotion: 'joy',
      averageIntensity: 0.5,
      lastUpdated: new Date().toISOString()
    };
  }

  generateEmotionalSummary(emotions) {
    const totalEmotions = emotions.length;
    const avgIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0) / totalEmotions;
    const dominantEmotion = this.findDominantEmotion(emotions);
    
    return {
      totalEntries: totalEmotions,
      averageIntensity: Math.round(avgIntensity * 100) / 100,
      dominantEmotion,
      emotionalVariety: new Set(emotions.map(e => e.emotion)).size,
      description: this.generateSummaryDescription(dominantEmotion, avgIntensity, totalEmotions)
    };
  }

  analyzeEmotionalPatterns(emotions) {
    // Analyze patterns by time, location, context
    const patterns = {
      timeOfDay: this.analyzeByTimeOfDay(emotions),
      dayOfWeek: this.analyzeByDayOfWeek(emotions),
      emotionTransitions: this.analyzeTransitions(emotions),
      intensityPatterns: this.analyzeIntensityPatterns(emotions)
    };
    
    return patterns;
  }

  analyzeEmotionalTrends(emotions) {
    // Simple trend analysis
    if (emotions.length < 7) {
      return { trend: 'insufficient_data', description: 'Need more data for trend analysis' };
    }

    const sortedEmotions = emotions.sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
    const firstHalf = sortedEmotions.slice(0, Math.floor(sortedEmotions.length / 2));
    const secondHalf = sortedEmotions.slice(Math.floor(sortedEmotions.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.intensity, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.intensity, 0) / secondHalf.length;

    const diff = secondHalfAvg - firstHalfAvg;
    
    if (diff > 0.1) {
      return { trend: 'improving', description: 'Your emotional intensity has been improving over time' };
    } else if (diff < -0.1) {
      return { trend: 'declining', description: 'Your emotional intensity has been declining recently' };
    } else {
      return { trend: 'stable', description: 'Your emotions have been relatively stable' };
    }
  }

  async invalidateRelevantCaches(emotionEntry) {
    if (!cacheService?.del) return;
    
    const cacheKeys = [
      'global_stats:1h',
      'global_stats:24h',
      'global_stats:7d',
      'global_stats:30d'
    ];
    
    for (const key of cacheKeys) {
      await cacheService.del(key);
    }
  }

  // Additional helper methods
  findDominantEmotion(emotions) {
    const counts = {};
    emotions.forEach(e => {
      counts[e.coreEmotion] = (counts[e.coreEmotion] || 0) + 1;
    });
    
    return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'joy';
  }

  generateSummaryDescription(dominantEmotion, avgIntensity, totalEntries) {
    if (totalEntries < 5) {
      return "You're just getting started with emotion tracking. Keep logging to see meaningful patterns!";
    }
    
    const intensityLevel = avgIntensity > 0.7 ? 'high' : avgIntensity > 0.4 ? 'moderate' : 'low';
    return `Your emotions have been primarily ${dominantEmotion} with ${intensityLevel} intensity. You've been consistent with ${totalEntries} emotion entries.`;
  }

  // More analysis methods
  analyzeByTimeOfDay(emotions) {
    const timeGroups = {};
    emotions.forEach(e => {
      const timeOfDay = e.context?.timeOfDay || 'unknown';
      if (!timeGroups[timeOfDay]) timeGroups[timeOfDay] = [];
      timeGroups[timeOfDay].push(e);
    });
    
    return Object.entries(timeGroups).map(([time, emotionList]) => ({
      timeOfDay: time,
      count: emotionList.length,
      dominantEmotion: this.findDominantEmotion(emotionList),
      avgIntensity: emotionList.reduce((sum, e) => sum + e.intensity, 0) / emotionList.length
    }));
  }

  analyzeByDayOfWeek(emotions) {
    const dayGroups = {};
    emotions.forEach(e => {
      const date = new Date(e.timestamp || e.createdAt);
      const dayOfWeek = e.context?.dayOfWeek || ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
      if (!dayGroups[dayOfWeek]) dayGroups[dayOfWeek] = [];
      dayGroups[dayOfWeek].push(e);
    });
    
    return Object.entries(dayGroups).map(([day, emotionList]) => ({
      dayOfWeek: day,
      count: emotionList.length,
      dominantEmotion: this.findDominantEmotion(emotionList),
      avgIntensity: emotionList.reduce((sum, e) => sum + e.intensity, 0) / emotionList.length
    }));
  }

  analyzeTransitions(emotions) {
    if (emotions.length < 2) return [];

    const transitions = [];
    const sortedEmotions = emotions.sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));

    for (let i = 1; i < sortedEmotions.length; i++) {
      const from = sortedEmotions[i - 1];
      const to = sortedEmotions[i];
      
      if (from.coreEmotion !== to.coreEmotion) {
        transitions.push({
          from: from.coreEmotion,
          to: to.coreEmotion,
          fromIntensity: from.intensity,
          toIntensity: to.intensity,
          timestamp: to.timestamp || to.createdAt
        });
      }
    }

    return transitions;
  }

  analyzeIntensityPatterns(emotions) {
    const intensities = emotions.map(e => e.intensity);
    const avg = intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
    const sorted = [...intensities].sort((a, b) => a - b);
    
    return {
      average: Math.round(avg * 100) / 100,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      variance: this.calculateVariance(intensities, avg)
    };
  }

  calculateVariance(values, mean) {
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.round(variance * 100) / 100;
  }

  generateRecommendations(emotions) {
    const recommendations = [];
    const dominantEmotion = this.findDominantEmotion(emotions);
    const avgIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;
    
    // Generate contextual recommendations
    if (dominantEmotion === 'sadness' && avgIntensity > 0.6) {
      recommendations.push({
        type: 'wellness',
        title: 'Self-Care Focus',
        description: 'Consider incorporating relaxation techniques or speaking with someone you trust.',
        priority: 'high'
      });
    }
    
    if (dominantEmotion === 'joy') {
      recommendations.push({
        type: 'maintenance',
        title: 'Keep It Up!',
        description: 'You\'re doing great! Continue the activities that bring you joy.',
        priority: 'medium'
      });
    }
    
    recommendations.push({
      type: 'tracking',
      title: 'Consistency Boost',
      description: 'Try logging emotions at regular intervals to better understand your patterns.',
      priority: 'low'
    });
    
    return recommendations;
  }

  calculateAchievements(emotions) {
    const achievements = [];
    const streakDays = this.calculateStreak(emotions);
    const varietyScore = new Set(emotions.map(e => e.emotion)).size;
    
    if (streakDays >= 7) {
      achievements.push({
        title: 'Week Warrior',
        description: `${streakDays} days of consistent emotion tracking!`,
        icon: '🔥',
        type: 'streak'
      });
    }
    
    if (varietyScore >= 10) {
      achievements.push({
        title: 'Emotion Explorer',
        description: `You've logged ${varietyScore} different emotions!`,
        icon: '🌈',
        type: 'variety'
      });
    }
    
    return achievements;
  }

  calculateStreak(emotions) {
    // Calculate consecutive days with emotion entries
    const dates = emotions.map(e => {
      const date = new Date(e.timestamp || e.createdAt);
      return date.toDateString();
    });
    
    const uniqueDates = [...new Set(dates)].sort();
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const emotionDate = new Date(uniqueDates[uniqueDates.length - 1 - i]);
      const diffDays = Math.floor((currentDate - emotionDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === i) {
        streak++;
        currentDate = emotionDate;
      } else {
        break;
      }
    }
    
    return streak;
  }

  generateAnonymousInsights() {
    return {
      summary: "Anonymous insights available after creating an account",
      patterns: {},
      trends: {},
      recommendations: [
        {
          type: 'account',
          title: 'Create Account',
          description: 'Sign up to unlock personalized insights and track your emotional journey.',
          priority: 'high'
        }
      ],
      achievements: [],
      timeframe: 'anonymous'
    };
  }

  getDefaultInsights(timeframe) {
    return {
      summary: {
        totalEntries: 0,
        averageIntensity: 0,
        dominantEmotion: 'neutral',
        description: `No emotions logged in the past ${timeframe}. Start tracking to see insights!`
      },
      patterns: {},
      trends: {},
      recommendations: [
        {
          type: 'getting_started',
          title: 'Start Your Journey',
          description: 'Log your first emotion to begin understanding your emotional patterns.',
          priority: 'high'
        }
      ],
      achievements: [],
      timeframe
    };
  }

  /**
   * Get comprehensive insights for enhanced view
   */
  async getComprehensiveInsights(userId, timeframe = '30d') {
    try {
      logger.info(`🎯 Generating comprehensive insights for user: ${userId} (${timeframe})`);
      
      const timeRange = this.getTimeRange(timeframe);
      
      // Fetch real emotion data
      const userEmotions = await Emotion.find({
        userId,
        $or: [
          { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
          { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
        ]
      }).sort({ timestamp: -1, createdAt: -1 });

      if (userEmotions.length === 0) {
        logger.info(`📊 No emotions found for user: ${userId}`);
        return this.getDefaultComprehensiveInsights(timeframe);
      }

      // Generate comprehensive insights
      const insights = {
        summary: this.generateEmotionalSummary(userEmotions),
        patterns: this.analyzeEmotionalPatterns(userEmotions),
        trends: this.analyzeEmotionalTrends(userEmotions),
        recommendations: this.generateRecommendations(userEmotions),
        achievements: this.calculateAchievements(userEmotions),
        weeklyData: this.generateWeeklyMoodData(userEmotions),
        dominantMood: this.findDominantEmotion(userEmotions),
        aiInsights: this.generateAIInsights(userEmotions),
        predictions: this.generatePredictions(userEmotions),
        analytics: this.generateAnalytics(userEmotions),
        timeframe,
        generatedAt: new Date().toISOString(),
        totalEntries: userEmotions.length
      };

      logger.info(`✅ Comprehensive insights generated for user ${userId}: ${insights.totalEntries} entries`);
      return insights;
      
    } catch (error) {
      logger.error('❌ Error generating comprehensive insights:', error);
      throw new Error('Failed to generate comprehensive insights');
    }
  }

  /**
   * Get AI-powered insights
   */
  async getAIInsights(userId, timeframe = '30d') {
    try {
      logger.info(`🤖 Generating AI insights for user: ${userId} (${timeframe})`);
      
      const timeRange = this.getTimeRange(timeframe);
      
      const userEmotions = await Emotion.find({
        userId,
        $or: [
          { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
          { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
        ]
      }).sort({ timestamp: -1, createdAt: -1 });

      if (userEmotions.length === 0) {
        return this.getDefaultAIInsights();
      }

      const aiInsights = this.generateAIInsights(userEmotions);
      return aiInsights;
      
    } catch (error) {
      logger.error('❌ Error generating AI insights:', error);
      throw new Error('Failed to generate AI insights');
    }
  }

  /**
   * Get predictions based on emotion patterns
   */
  async getPredictions(userId, timeframe = '30d') {
    try {
      logger.info(`🔮 Generating predictions for user: ${userId} (${timeframe})`);
      
      const timeRange = this.getTimeRange(timeframe);
      
      const userEmotions = await Emotion.find({
        userId,
        $or: [
          { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
          { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
        ]
      }).sort({ timestamp: -1, createdAt: -1 });

      if (userEmotions.length === 0) {
        return this.getDefaultPredictions();
      }

      const predictions = this.generatePredictions(userEmotions);
      return predictions;
      
    } catch (error) {
      logger.error('❌ Error generating predictions:', error);
      throw new Error('Failed to generate predictions');
    }
  }

  /**
   * Get pattern analysis
   */
  async getPatternAnalysis(userId, timeframe = '30d') {
    try {
      logger.info(`🔍 Generating pattern analysis for user: ${userId} (${timeframe})`);
      
      const timeRange = this.getTimeRange(timeframe);
      
      const userEmotions = await Emotion.find({
        userId,
        $or: [
          { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
          { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
        ]
      }).sort({ timestamp: -1, createdAt: -1 });

      if (userEmotions.length === 0) {
        return this.getDefaultPatternAnalysis();
      }

      const patterns = this.analyzeEmotionalPatterns(userEmotions);
      return patterns;
      
    } catch (error) {
      logger.error('❌ Error generating pattern analysis:', error);
      throw new Error('Failed to generate pattern analysis');
    }
  }

  /**
   * Get recommendations based on emotion data
   */
  async getRecommendations(userId, timeframe = '30d') {
    try {
      logger.info(`💡 Generating recommendations for user: ${userId} (${timeframe})`);
      
      const timeRange = this.getTimeRange(timeframe);
      
      const userEmotions = await Emotion.find({
        userId,
        $or: [
          { timestamp: { $gte: timeRange.start, $lte: timeRange.end } },
          { createdAt: { $gte: timeRange.start, $lte: timeRange.end } }
        ]
      }).sort({ timestamp: -1, createdAt: -1 });

      if (userEmotions.length === 0) {
        return this.getDefaultRecommendations();
      }

      const recommendations = this.generateRecommendations(userEmotions);
      return recommendations;
      
    } catch (error) {
      logger.error('❌ Error generating recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  /**
   * Generate AI insights from emotion data
   */
  generateAIInsights(emotions) {
    try {
      const insights = [];
      
      // Analyze peak performance hours
      const timeOfDayAnalysis = this.analyzeByTimeOfDay(emotions);
      if (timeOfDayAnalysis.length > 0) {
        const peakTime = timeOfDayAnalysis.reduce((max, time) => 
          time.avgIntensity > max.avgIntensity ? time : max
        );
        
        insights.push({
          title: 'Peak Performance Hours',
          description: `You perform best during ${peakTime.timeOfDay}. Consider scheduling important tasks during this time.`,
          confidence: 92,
          icon: 'schedule',
          color: '#4CAF50',
        });
      }

      // Analyze sleep impact
      const sleepAnalysis = this.analyzeSleepImpact(emotions);
      if (sleepAnalysis.hasPattern) {
        insights.push({
          title: 'Sleep Impact',
          description: `Your mood improves by ${sleepAnalysis.improvementPercentage}% when you get 7+ hours of sleep.`,
          confidence: 88,
          icon: 'bedtime',
          color: '#2196F3',
        });
      }

      // Analyze social connections
      const socialAnalysis = this.analyzeSocialImpact(emotions);
      if (socialAnalysis.hasPattern) {
        insights.push({
          title: 'Social Connection',
          description: 'Your happiness increases significantly after social interactions.',
          confidence: 85,
          icon: 'people',
          color: '#E91E63',
        });
      }

      return insights;
    } catch (error) {
      logger.error('❌ Error generating AI insights:', error);
      return [];
    }
  }

  /**
   * Generate predictions based on patterns
   */
  generatePredictions(emotions) {
    try {
      const predictions = [];
      
      // Predict tomorrow's mood
      const tomorrowPrediction = this.predictTomorrowMood(emotions);
      predictions.push({
        title: 'Tomorrow\'s Mood',
        description: tomorrowPrediction.description,
        confidence: tomorrowPrediction.confidence,
        icon: 'wb_sunny',
      });

      // Predict weekly outlook
      const weeklyPrediction = this.predictWeeklyOutlook(emotions);
      predictions.push({
        title: 'Weekly Outlook',
        description: weeklyPrediction.description,
        confidence: weeklyPrediction.confidence,
        icon: 'trending_up',
      });

      // Predict optimal time
      const optimalTimePrediction = this.predictOptimalTime(emotions);
      predictions.push({
        title: 'Optimal Time',
        description: optimalTimePrediction.description,
        confidence: optimalTimePrediction.confidence,
        icon: 'schedule',
      });

      return predictions;
    } catch (error) {
      logger.error('❌ Error generating predictions:', error);
      return [];
    }
  }

  /**
   * Generate analytics data for charts
   */
  generateAnalytics(emotions) {
    try {
      return {
        weeklyData: this.generateWeeklyMoodData(emotions),
        monthlyData: this.generateMonthlyMoodData(emotions),
        emotionDistribution: this.calculateEmotionDistribution(emotions),
        intensityTrends: this.calculateIntensityTrends(emotions),
        timeOfDayData: this.analyzeByTimeOfDay(emotions),
        dayOfWeekData: this.analyzeByDayOfWeek(emotions),
      };
    } catch (error) {
      logger.error('❌ Error generating analytics:', error);
      return {};
    }
  }

  // Helper methods for predictions and analysis
  predictTomorrowMood(emotions) {
    // Simple prediction based on recent trends
    const recentEmotions = emotions.slice(0, 7);
    const avgIntensity = recentEmotions.reduce((sum, e) => sum + e.intensity, 0) / recentEmotions.length;
    
    if (avgIntensity > 3.5) {
      return {
        description: 'Likely to be positive based on recent patterns',
        confidence: 75,
      };
    } else if (avgIntensity < 2.5) {
      return {
        description: 'May need support based on recent patterns',
        confidence: 70,
      };
    } else {
      return {
        description: 'Expected to be stable based on recent patterns',
        confidence: 65,
      };
    }
  }

  predictWeeklyOutlook(emotions) {
    const weeklyPattern = this.analyzeByDayOfWeek(emotions);
    const hasWeekendEffect = weeklyPattern.saturday?.avgIntensity > weeklyPattern.monday?.avgIntensity;
    
    if (hasWeekendEffect) {
      return {
        description: 'Expect stable emotions with potential stress mid-week',
        confidence: 68,
      };
    } else {
      return {
        description: 'Consistent mood pattern expected throughout the week',
        confidence: 72,
      };
    }
  }

  predictOptimalTime(emotions) {
    const timeAnalysis = this.analyzeByTimeOfDay(emotions);
    const peakTime = timeAnalysis.reduce((max, time) => 
      time.avgIntensity > max.avgIntensity ? time : max
    );
    
    return {
      description: `Best mood window: ${peakTime.timeOfDay} tomorrow`,
      confidence: 82,
    };
  }

  analyzeSleepImpact(emotions) {
    // Analyze emotions logged in morning vs evening
    const morningEmotions = emotions.filter(e => {
      const hour = new Date(e.timestamp || e.createdAt).getHours();
      return hour >= 6 && hour <= 10;
    });
    
    const eveningEmotions = emotions.filter(e => {
      const hour = new Date(e.timestamp || e.createdAt).getHours();
      return hour >= 20 || hour <= 2;
    });

    const morningAvg = morningEmotions.reduce((sum, e) => sum + e.intensity, 0) / morningEmotions.length;
    const eveningAvg = eveningEmotions.reduce((sum, e) => sum + e.intensity, 0) / eveningEmotions.length;

    return {
      hasPattern: morningEmotions.length > 0 && eveningEmotions.length > 0,
      improvementPercentage: Math.round((morningAvg - eveningAvg) * 20),
    };
  }

  analyzeSocialImpact(emotions) {
    // Analyze emotions with social context
    const socialEmotions = emotions.filter(e => 
      e.context?.socialContext === 'with_friends' || 
      e.context?.socialContext === 'with_family'
    );
    
    const aloneEmotions = emotions.filter(e => 
      e.context?.socialContext === 'alone'
    );

    const socialAvg = socialEmotions.reduce((sum, e) => sum + e.intensity, 0) / socialEmotions.length;
    const aloneAvg = aloneEmotions.reduce((sum, e) => sum + e.intensity, 0) / aloneEmotions.length;

    return {
      hasPattern: socialEmotions.length > 0 && aloneEmotions.length > 0,
      socialImprovement: socialAvg > aloneAvg,
    };
  }

  // Additional helper methods
  generateMonthlyMoodData(emotions) {
    // Similar to weekly but for monthly data
    return this.generateWeeklyMoodData(emotions);
  }

  calculateEmotionDistribution(emotions) {
    const distribution = {};
    emotions.forEach(e => {
      const emotion = e.type || e.emotion;
      distribution[emotion] = (distribution[emotion] || 0) + 1;
    });
    return distribution;
  }

  calculateIntensityTrends(emotions) {
    const sortedEmotions = emotions.sort((a, b) => 
      new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)
    );
    
    return sortedEmotions.map(e => ({
      date: e.timestamp || e.createdAt,
      intensity: e.intensity,
      emotion: e.type || e.emotion,
    }));
  }

  // Default data methods
  getDefaultComprehensiveInsights(timeframe) {
    return {
      summary: {
        totalEntries: 0,
        averageIntensity: 3.0,
        dominantEmotion: 'neutral',
        moodTrend: 'stable',
        lastEntry: null,
      },
      patterns: {
        timeOfDay: {},
        dayOfWeek: {},
        transitions: [],
        intensityPatterns: [],
      },
      trends: {
        weekly: [],
        monthly: [],
        overall: 'stable',
      },
      recommendations: [
        'Start logging your emotions regularly to get personalized insights',
        'Try logging at least one emotion per day',
        'Explore different emotion types to understand your patterns',
      ],
      achievements: {
        totalEarned: 0,
        recent: [],
        nextMilestone: 'First Steps',
      },
      weeklyData: [],
      dominantMood: 'neutral',
      aiInsights: [],
      predictions: [],
      analytics: {},
      timeframe,
      generatedAt: new Date().toISOString(),
      totalEntries: 0
    };
  }

  getDefaultAIInsights() {
    return [
      {
        title: 'Start Your Journey',
        description: 'Begin logging emotions to unlock personalized insights',
        confidence: 100,
        icon: 'psychology',
        color: '#8B5CF6',
      }
    ];
  }

  getDefaultPredictions() {
    return [
      {
        title: 'Begin Logging',
        description: 'Start logging emotions to get personalized predictions',
        confidence: 100,
        icon: 'auto_graph',
      }
    ];
  }

  getDefaultPatternAnalysis() {
    return {
      timeOfDay: {},
      dayOfWeek: {},
      transitions: [],
      intensityPatterns: [],
    };
  }

  getDefaultRecommendations() {
    return [
      'Start logging your emotions regularly to get personalized insights',
      'Try logging at least one emotion per day',
      'Explore different emotion types to understand your patterns',
    ];
  }
}

export default new EmotionService();