import { getEmotionCategory, getEmotionColor } from '../constants/emotions.js';
import Mood from '../models/mood.model.js';
import cacheService from '../utils/cache.js';
import logger from '../utils/logger.js';

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
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

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
      await cacheService.set(cacheKey, result, 900);
      
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

    // Process each mood
    moods.forEach(mood => {
      const emotion = mood.emotion;
      const date = mood.createdAt.toISOString().split('T')[0];
      const timeOfDay = mood.context.timeOfDay;
      const location = `${mood.location.city}, ${mood.location.country}`;

      // Emotion stats
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      intensitySum[emotion] = (intensitySum[emotion] || 0) + mood.intensity;

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
      category: getEmotionCategory(emotion)
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
        averageIntensity: Math.round((moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length) * 100) / 100,
        totalDays: Object.keys(dailyData).length,
        avgMoodsPerDay: Math.round((moods.length / Object.keys(dailyData).length) * 100) / 100
      }
    };
  }

  calculateMoodScore(emotionBreakdown) {
    const emotionWeights = {
      happy: 90,
      excited: 85,
      calm: 80,
      bored: 50,
      anxious: 30,
      sad: 20,
      angry: 10
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
      days: 0,
      startDate: null,
      endDate: null
    };

    for (const day of dailyStats) {
      const dominantEmotion = day.moods.reduce((prev, current) => 
        day.moods.filter(m => m.emotion === current.emotion).length >
        day.moods.filter(m => m.emotion === prev.emotion).length ? current : prev
      ).emotion;

      if (currentStreak.emotion === dominantEmotion) {
        currentStreak.days++;
        currentStreak.endDate = day.date;
      } else {
        if (currentStreak.days > 0) {
          streaks.push({ ...currentStreak });
        }
        currentStreak = {
          emotion: dominantEmotion,
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

    // Streak insights
    if (analytics.streaks.current && analytics.streaks.current.days >= 7) {
      const emotion = analytics.streaks.current.emotion;
      const category = getEmotionCategory(emotion);
      
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

    // Anxiety specific recommendations
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
