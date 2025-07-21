// src/services/analytics.service.js - Fixed version
import { getCoreEmotion, getEmotionColor } from '../constants/emotions.js';
import Mood from '../models/mood.model.js';
import logger from '../utils/logger.js';

// Import cache service with error handling
let cacheService = null;
try {
  const cacheModule = await import('../utils/cache.js');
  cacheService = cacheModule.default;
} catch (error) {
  logger.warn('. Cache service not available, using in-memory fallback');
}

class AnalyticsService {
  async getUserAnalytics(userId, options = {}) {
    const {
      period = '30d',
      includeInsights = true,
      includeRecommendations = true
    } = options;

    const cacheKey = `user_analytics:${userId}:${period}`;
    
    try {
      // Check cache first
      if (cacheService?.get) {
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;
      }

      const timeFilter = this.getTimeFilter(period);
      const startDate = timeFilter.createdAt.$gte;

      // Get user's mood data
      const moods = await Mood.find({
        userId,
        ...timeFilter
      }).sort({ createdAt: -1 });

      if (moods.length === 0) {
        return {
          period,
          totalMoods: 0,
          analytics: null,
          insights: [],
          recommendations: []
        };
      }

      // Calculate analytics
      const analytics = await this.calculateUserAnalytics(moods, period);
      
      let insights = [];
      let recommendations = [];

      if (includeInsights) {
        insights = this.generateUserInsights(analytics, moods);
      }

      if (includeRecommendations) {
        recommendations = await this.generateUserRecommendations(analytics, userId);
      }

      const result = {
        period,
        totalMoods: moods.length,
        analytics,
        insights,
        recommendations,
        lastUpdated: new Date()
      };

      // Cache for 15 minutes
      if (cacheService?.set) {
        await cacheService.set(cacheKey, result, 900);
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  async calculateUserAnalytics(moods, period) {
    const emotionCounts = {};
    const intensitySum = {};
    const locationCounts = {};
    const timePatterns = {};
    const dailyData = {};
    const coreEmotionCounts = {};

    // Process each mood
    moods.forEach(mood => {
      const emotion = mood.emotion;
      const coreEmotion = getCoreEmotion(emotion); // Use getCoreEmotion instead of getEmotionCategory
      const date = mood.createdAt.toISOString().split('T')[0];
      const timeOfDay = mood.context.timeOfDay;
      const location = `${mood.location.city}, ${mood.location.country}`;

      // Emotion stats
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      intensitySum[emotion] = (intensitySum[emotion] || 0) + mood.intensity;

      // Core emotion stats (Inside Out style)
      coreEmotionCounts[coreEmotion] = (coreEmotionCounts[coreEmotion] || 0) + 1;

      // Location stats
      locationCounts[location] = (locationCounts[location] || 0) + 1;

      // Time patterns
      timePatterns[timeOfDay] = (timePatterns[timeOfDay] || 0) + 1;

      // Daily data
      if (!dailyData[date]) {
        dailyData[date] = {
          moods: [],
          count: 0,
          totalIntensity: 0
        };
      }
      dailyData[date].moods.push({
        emotion,
        coreEmotion,
        intensity: mood.intensity,
        time: mood.createdAt
      });
      dailyData[date].count++;
      dailyData[date].totalIntensity += mood.intensity;
    });

    // Calculate emotion breakdown
    const emotionBreakdown = Object.entries(emotionCounts).map(([emotion, count]) => ({
      emotion,
      count,
      percentage: Math.round((count / moods.length) * 100),
      avgIntensity: Math.round((intensitySum[emotion] / count) * 100) / 100,
      color: getEmotionColor(emotion),
      coreEmotion: getCoreEmotion(emotion), // Use getCoreEmotion instead of getEmotionCategory
      category: this.getEmotionCategory(getCoreEmotion(emotion)) // Helper method for category
    })).sort((a, b) => b.count - a.count);

    // Calculate core emotion breakdown (Inside Out style)
    const coreEmotionBreakdown = Object.entries(coreEmotionCounts).map(([coreEmotion, count]) => ({
      coreEmotion,
      count,
      percentage: Math.round((count / moods.length) * 100),
      category: this.getEmotionCategory(coreEmotion)
    })).sort((a, b) => b.count - a.count);

    // Calculate mood score
    const moodScore = this.calculateMoodScore(emotionBreakdown);

    // Process daily data
    const dailyStats = Object.entries(dailyData).map(([date, data]) => ({
      date,
      count: data.count,
      avgIntensity: Math.round((data.totalIntensity / data.count) * 100) / 100,
      moods: data.moods
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Find patterns
    const mostActiveTime = Object.entries(timePatterns)
      .sort((a, b) => b[1] - a[1])[0];
    
    const mostCommonLocation = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])[0];

    // Calculate streaks
    const streaks = this.calculateEmotionStreaks(dailyStats);

    return {
      emotionBreakdown,
      coreEmotionBreakdown, // Add Inside Out breakdown
      moodScore,
      dailyStats,
      patterns: {
        mostActiveTime: mostActiveTime ? mostActiveTime[0] : null,
        mostCommonLocation: mostCommonLocation ? mostCommonLocation[0] : null,
        timeDistribution: timePatterns,
        locationDistribution: locationCounts
      },
      streaks,
      summary: {
        dominantEmotion: emotionBreakdown[0],
        dominantCoreEmotion: coreEmotionBreakdown[0], // Add dominant core emotion
        averageIntensity: Math.round((moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length) * 100) / 100,
        totalDays: Object.keys(dailyData).length,
        avgMoodsPerDay: Math.round((moods.length / Object.keys(dailyData).length) * 100) / 100
      }
    };
  }

  // Helper method to categorize emotions as positive/negative/neutral
  getEmotionCategory(coreEmotion) {
    const categories = {
      'joy': 'positive',
      'sadness': 'negative',
      'anger': 'negative',
      'fear': 'negative',
      'disgust': 'negative'
    };
    return categories[coreEmotion] || 'neutral';
  }

  calculateMoodScore(emotionBreakdown) {
    // Updated to work with core emotions
    const emotionWeights = {
      // Joy family
      'happy': 90, 'joyful': 90, 'excited': 85, 'cheerful': 85, 'delighted': 90,
      'content': 80, 'satisfied': 80, 'grateful': 85, 'proud': 85,
      
      // Neutral emotions
      'calm': 70, 'peaceful': 75, 'relaxed': 75, 'bored': 50, 'tired': 45,
      
      // Negative emotions - Sadness
      'sad': 20, 'depressed': 15, 'lonely': 25, 'heartbroken': 10, 'melancholy': 30,
      
      // Negative emotions - Anger
      'angry': 15, 'furious': 10, 'frustrated': 25, 'annoyed': 35, 'irritated': 30,
      
      // Negative emotions - Fear
      'anxious': 25, 'worried': 30, 'scared': 20, 'nervous': 35, 'stressed': 20,
      
      // Negative emotions - Disgust
      'disgusted': 20, 'revolted': 15, 'appalled': 20
    };

    let score = 0;
    let totalCount = 0;

    emotionBreakdown.forEach(item => {
      const weight = emotionWeights[item.emotion] || 50;
      score += weight * item.count;
      totalCount += item.count;
    });

    return totalCount > 0 ? Math.round(score / totalCount) : 50;
  }

  calculateEmotionStreaks(dailyStats) {
    if (dailyStats.length === 0) return { current: null, longest: null };

    const streaks = [];
    let currentStreak = {
      emotion: null,
      coreEmotion: null,
      days: 0,
      startDate: null,
      endDate: null
    };

    for (const day of dailyStats) {
      const dominantEmotion = day.moods.reduce((prev, current) => 
        day.moods.filter(m => m.emotion === current.emotion).length >
        day.moods.filter(m => m.emotion === prev.emotion).length ? current : prev
      );

      if (currentStreak.emotion === dominantEmotion.emotion) {
        currentStreak.days++;
        currentStreak.endDate = day.date;
      } else {
        if (currentStreak.days > 0) {
          streaks.push({ ...currentStreak });
        }
        currentStreak = {
          emotion: dominantEmotion.emotion,
          coreEmotion: dominantEmotion.coreEmotion,
          days: 1,
          startDate: day.date,
          endDate: day.date
        };
      }
    }

    // Add the last streak
    if (currentStreak.days > 0) {
      streaks.push({ ...currentStreak });
    }

    const longest = streaks.reduce((prev, current) => 
      current.days > prev.days ? current : prev, { days: 0 });

    const current = streaks[streaks.length - 1] || null;

    return { current, longest };
  }

  generateUserInsights(analytics, moods) {
    const insights = [];

    // Mood score insights
    if (analytics.moodScore >= 80) {
      insights.push({
        type: 'excellent_mood',
        message: `Great job! Your mood score of ${analytics.moodScore} shows you're doing really well.`,
        category: 'positive',
        priority: 4
      });
    } else if (analytics.moodScore <= 30) {
      insights.push({
        type: 'low_mood',
        message: `Your mood score of ${analytics.moodScore} suggests you might be going through a tough time. Consider reaching out for support.`,
        category: 'concern',
        priority: 5
      });
    }

    // Core emotion insights (Inside Out style)
    if (analytics.coreEmotionBreakdown && analytics.coreEmotionBreakdown[0]) {
      const dominantCore = analytics.coreEmotionBreakdown[0];
      if (dominantCore.percentage > 60) {
        const messages = {
          'joy': `Joy is your dominant emotion (${dominantCore.percentage}%)! You're experiencing a lot of positive moments.`,
          'sadness': `Sadness has been dominant (${dominantCore.percentage}%). Remember that sadness helps us process and can lead to growth.`,
          'anger': `Anger has been prominent (${dominantCore.percentage}%). Consider healthy ways to channel this energy.`,
          'fear': `Fear has been dominant (${dominantCore.percentage}%). You might be facing challenges - that's completely normal.`,
          'disgust': `You've been experiencing a lot of disgust (${dominantCore.percentage}%). This might indicate you're maintaining high standards.`
        };
        
        insights.push({
          type: 'core_emotion_dominant',
          message: messages[dominantCore.coreEmotion] || `${dominantCore.coreEmotion} has been your dominant emotion.`,
          category: dominantCore.coreEmotion === 'joy' ? 'positive' : 'neutral',
          priority: 4
        });
      }
    }

    // Streak insights
    if (analytics.streaks.current && analytics.streaks.current.days >= 7) {
      const emotion = analytics.streaks.current.emotion;
      const category = this.getEmotionCategory(analytics.streaks.current.coreEmotion);
      
      if (category === 'positive') {
        insights.push({
          type: 'positive_streak',
          message: `Amazing! You've been feeling ${emotion} for ${analytics.streaks.current.days} days in a row.`,
          category: 'achievement',
          priority: 4
        });
      } else if (category === 'negative') {
        insights.push({
          type: 'negative_streak',
          message: `You've been feeling ${emotion} for ${analytics.streaks.current.days} days. It might help to try some mood-boosting activities.`,
          category: 'concern',
          priority: 4
        });
      }
    }

    // Pattern insights
    if (analytics.patterns.mostActiveTime) {
      insights.push({
        type: 'time_pattern',
        message: `You log most of your moods in the ${analytics.patterns.mostActiveTime}. This could be a good time for self-reflection.`,
        category: 'neutral',
        priority: 2
      });
    }

    // Consistency insight
    if (analytics.summary.avgMoodsPerDay >= 3) {
      insights.push({
        type: 'consistency',
        message: `You're doing great at tracking your emotions consistently! You log an average of ${analytics.summary.avgMoodsPerDay} moods per day.`,
        category: 'achievement',
        priority: 3
      });
    }

    // Emotional variety insight
    const emotionVariety = analytics.emotionBreakdown.length;
    if (emotionVariety >= 10) {
      insights.push({
        type: 'emotional_variety',
        message: `You've experienced ${emotionVariety} different emotions. This shows healthy emotional awareness and range.`,
        category: 'positive',
        priority: 3
      });
    }

    return insights.sort((a, b) => b.priority - a.priority);
  }

  async generateUserRecommendations(analytics, userId) {
    const recommendations = [];

    // Mood score based recommendations
    if (analytics.moodScore < 50) {
      recommendations.push({
        type: 'mood_improvement',
        title: 'Mood Boosting Activities',
        description: 'Try these activities to help improve your overall mood',
        category: 'activity',
        priority: 5,
        data: {
          activities: [
            'Take a 10-minute walk outside',
            'Listen to your favorite upbeat music',
            'Practice 5 minutes of deep breathing',
            'Write down 3 things you\'re grateful for',
            'Call or text a friend'
          ]
        }
      });
    }

    // Core emotion specific recommendations
    if (analytics.coreEmotionBreakdown && analytics.coreEmotionBreakdown[0]) {
      const dominant = analytics.coreEmotionBreakdown[0];
      
      if (dominant.coreEmotion === 'sadness' && dominant.percentage > 40) {
        recommendations.push({
          type: 'sadness_support',
          title: 'Processing Sadness',
          description: 'Sadness is a natural emotion. These activities can help you process it healthily.',
          category: 'mindfulness',
          priority: 4,
          data: {
            activities: [
              'Journal about your feelings',
              'Listen to music that matches your mood',
              'Reach out to a trusted friend',
              'Practice self-compassion meditation',
              'Allow yourself to feel without judgment'
            ]
          }
        });
      }
      
      if (dominant.coreEmotion === 'anger' && dominant.percentage > 30) {
        recommendations.push({
          type: 'anger_management',
          title: 'Healthy Anger Expression',
          description: 'Channel your anger energy in positive ways',
          category: 'activity',
          priority: 4,
          data: {
            techniques: [
              'Physical exercise or sports',
              'Write in a journal',
              'Practice deep breathing',
              'Go for a brisk walk',
              'Talk to someone you trust'
            ]
          }
        });
      }
      
      if (dominant.coreEmotion === 'fear' && dominant.percentage > 30) {
        recommendations.push({
          type: 'fear_management',
          title: 'Building Confidence',
          description: 'These techniques can help you feel more secure and confident',
          category: 'mindfulness',
          priority: 4,
          data: {
            techniques: [
              'Practice grounding exercises (5-4-3-2-1)',
              'Break big challenges into smaller steps',
              'Create a daily routine for stability',
              'Practice positive self-talk',
              'Connect with supportive people'
            ]
          }
        });
      }
    }

    // Anxiety specific recommendations (legacy support)
    const anxietyPercentage = analytics.emotionBreakdown.find(e => e.emotion === 'anxious')?.percentage || 0;
    if (anxietyPercentage > 30) {
      recommendations.push({
        type: 'anxiety_management',
        title: 'Anxiety Relief Techniques',
        description: 'These techniques can help manage anxiety when it arises',
        category: 'mindfulness',
        priority: 4,
        data: {
          techniques: [
            '4-7-8 breathing exercise',
            'Progressive muscle relaxation',
            'Grounding technique (5-4-3-2-1)',
            'Mindful meditation',
            'Journal your thoughts'
          ]
        }
      });
    }

    // Music recommendations based on dominant emotion
    const dominantEmotion = analytics.emotionBreakdown[0];
    if (dominantEmotion) {
      recommendations.push({
        type: 'music',
        title: `Music for ${dominantEmotion.emotion} mood`,
        description: `Curated playlist to complement or shift your ${dominantEmotion.emotion} mood`,
        category: 'music',
        priority: 3,
        data: {
          emotion: dominantEmotion.emotion,
          coreEmotion: dominantEmotion.coreEmotion,
          playlistType: dominantEmotion.category === 'negative' ? 'uplifting' : 'matching'
        }
      });
    }

    // Consistency recommendations
    if (analytics.summary.avgMoodsPerDay < 2) {
      recommendations.push({
        type: 'tracking_consistency',
        title: 'Improve Mood Tracking',
        description: 'Regular mood tracking can provide better insights into your emotional patterns',
        category: 'habit',
        priority: 2,
        data: {
          suggestions: [
            'Set a daily reminder to log your mood',
            'Track your mood at the same times each day',
            'Use mood tracking as part of your morning or evening routine'
          ]
        }
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  getTimeFilter(period) {
    const now = new Date();
    let startDate;

    switch (period) {
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
}

export default new AnalyticsService();