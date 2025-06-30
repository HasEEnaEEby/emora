// src/services/emotion.service.js - Fixed version
import { getCoreEmotion, getCoreEmotionColor } from '../constants/emotions.js';
import UnifiedEmotion from '../models/emotion.model.js';
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

class EmotionService {
  /**
   * Log a new emotion entry with enhanced processing
   */
  async logEmotion(emotionData) {
    try {
      logger.info(`🎭 Processing emotion entry: ${emotionData.emotion}`);
      
      // Create unified emotion entry
      const emotionEntry = new UnifiedEmotion({
        ...emotionData,
        coreEmotion: getCoreEmotion(emotionData.emotion),
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
   * Enrich emotion context with additional data
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
      const lastEmotion = await UnifiedEmotion
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
        logger.info('📊 EmotionAnalytics model not available, skipping analytics update');
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
          logger.info(`📊 Returning cached global stats for ${timeframe}`);
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
      
      logger.info(`📊 Generated fresh global stats for ${timeframe}`);
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
      
      const results = await UnifiedEmotion.aggregate(pipeline);
      
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
      const heatmapData = await UnifiedEmotion.getGlobalEmotionHeatmap(bounds, timeRange);
      
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
      const userEmotions = await UnifiedEmotion.find({
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
}

export default new EmotionService();