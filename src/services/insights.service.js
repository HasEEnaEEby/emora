import Emotion from '../models/emotion.model.js';
import User from '../models/user.model.js';
import Vent from '../models/vent.model.js';
import logger from '../utils/logger.js';

class InsightsService {
  // Get comprehensive user insights
  async getUserInsights(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        emotionStats,
        weeklyPatterns,
        dailyPatterns,
        moodStreak,
        topEmotions,
        recentTrends,
        ventStats,
        recommendations
      ] = await Promise.all([
        this.getEmotionStatistics(userId, startDate),
        this.getWeeklyPatterns(userId, startDate),
        this.getDailyPatterns(userId, startDate),
        this.getMoodStreak(userId),
        this.getTopEmotions(userId, startDate),
        this.getRecentTrends(userId, startDate),
        this.getVentStatistics(userId, startDate),
        this.generateRecommendations(userId, startDate)
      ]);

      return {
        overview: {
          totalEntries: emotionStats.totalEntries,
          averageIntensity: emotionStats.averageIntensity,
          mostFrequentEmotion: topEmotions[0]?.emotion || null,
          currentStreak: moodStreak.currentStreak,
          longestStreak: moodStreak.longestStreak
        },
        patterns: {
          weekly: weeklyPatterns,
          daily: dailyPatterns,
          trends: recentTrends
        },
        emotions: {
          distribution: emotionStats.distribution,
          topEmotions,
          intensityTrends: emotionStats.intensityTrends
        },
        social: {
          vents: ventStats,
          checkIns: await this.getCheckInStats(userId, startDate)
        },
        recommendations
      };
    } catch (error) {
      logger.error('Error getting user insights:', error);
      throw error;
    }
  }

  // Get emotion statistics
  async getEmotionStatistics(userId, startDate) {
    const emotions = await Emotion.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    const totalEntries = emotions.length;
    const averageIntensity = totalEntries > 0 
      ? emotions.reduce((sum, e) => sum + e.intensity, 0) / totalEntries 
      : 0;

    // Emotion distribution
    const distribution = {};
    emotions.forEach(emotion => {
      distribution[emotion.emotion] = (distribution[emotion.emotion] || 0) + 1;
    });

    // Intensity trends by emotion
    const intensityTrends = {};
    emotions.forEach(emotion => {
      if (!intensityTrends[emotion.emotion]) {
        intensityTrends[emotion.emotion] = [];
      }
      intensityTrends[emotion.emotion].push({
        intensity: emotion.intensity,
        date: emotion.createdAt
      });
    });

    return {
      totalEntries,
      averageIntensity,
      distribution,
      intensityTrends
    };
  }

  // Get weekly patterns
  async getWeeklyPatterns(userId, startDate) {
    const emotions = await Emotion.find({
      userId,
      createdAt: { $gte: startDate }
    });

    const weeklyData = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    daysOfWeek.forEach(day => {
      weeklyData[day] = {
        count: 0,
        averageIntensity: 0,
        emotions: {}
      };
    });

    emotions.forEach(emotion => {
      const day = daysOfWeek[emotion.createdAt.getDay()];
      weeklyData[day].count++;
      weeklyData[day].averageIntensity += emotion.intensity;
      
      if (!weeklyData[day].emotions[emotion.emotion]) {
        weeklyData[day].emotions[emotion.emotion] = 0;
      }
      weeklyData[day].emotions[emotion.emotion]++;
    });

    // Calculate averages
    daysOfWeek.forEach(day => {
      if (weeklyData[day].count > 0) {
        weeklyData[day].averageIntensity /= weeklyData[day].count;
      }
    });

    return weeklyData;
  }

  // Get daily patterns
  async getDailyPatterns(userId, startDate) {
    const emotions = await Emotion.find({
      userId,
      createdAt: { $gte: startDate }
    });

    const hourlyData = {};
    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour] = {
        count: 0,
        averageIntensity: 0,
        emotions: {}
      };
    }

    emotions.forEach(emotion => {
      const hour = emotion.createdAt.getHours();
      hourlyData[hour].count++;
      hourlyData[hour].averageIntensity += emotion.intensity;
      
      if (!hourlyData[hour].emotions[emotion.emotion]) {
        hourlyData[hour].emotions[emotion.emotion] = 0;
      }
      hourlyData[hour].emotions[emotion.emotion]++;
    });

    // Calculate averages
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyData[hour].count > 0) {
        hourlyData[hour].averageIntensity /= hourlyData[hour].count;
      }
    }

    return hourlyData;
  }

  // Get mood streak
  async getMoodStreak(userId) {
    const emotions = await Emotion.find({
      userId
    }).sort({ createdAt: -1 });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = null;

    for (let i = 0; i < emotions.length; i++) {
      const emotion = emotions[i];
      const emotionDate = emotion.createdAt.toDateString();
      
      if (lastDate === null) {
        lastDate = emotionDate;
        tempStreak = 1;
        currentStreak = 1;
      } else {
        const daysDiff = Math.floor((new Date(lastDate) - new Date(emotionDate)) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
          if (i === 0) currentStreak = tempStreak;
        } else if (daysDiff > 1) {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
          if (i === 0) currentStreak = 1;
        }
      }
      
      lastDate = emotionDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      longestStreak,
      totalEntries: emotions.length
    };
  }

  // Get top emotions
  async getTopEmotions(userId, startDate, limit = 5) {
    const emotions = await Emotion.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$emotion',
          count: { $sum: 1 },
          averageIntensity: { $avg: '$intensity' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      }
    ]);

    return emotions.map(emotion => ({
      emotion: emotion._id,
      count: emotion.count,
      averageIntensity: emotion.averageIntensity
    }));
  }

  // Get recent trends
  async getRecentTrends(userId, startDate) {
    const emotions = await Emotion.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Group by week
    const weeklyTrends = {};
    emotions.forEach(emotion => {
      const weekStart = this.getWeekStart(emotion.createdAt);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyTrends[weekKey]) {
        weeklyTrends[weekKey] = {
          emotions: [],
          averageIntensity: 0,
          count: 0
        };
      }
      
      weeklyTrends[weekKey].emotions.push(emotion.emotion);
      weeklyTrends[weekKey].averageIntensity += emotion.intensity;
      weeklyTrends[weekKey].count++;
    });

    // Calculate averages and get dominant emotions
    Object.keys(weeklyTrends).forEach(week => {
      weeklyTrends[week].averageIntensity /= weeklyTrends[week].count;
      weeklyTrends[week].dominantEmotion = this.getMostFrequent(weeklyTrends[week].emotions);
    });

    return weeklyTrends;
  }

  // Get vent statistics
  async getVentStatistics(userId, startDate) {
    const vents = await Vent.find({
      userId,
      createdAt: { $gte: startDate }
    });

    const totalVents = vents.length;
    const totalReactions = vents.reduce((sum, vent) => sum + vent.analytics.reactionCount, 0);
    const totalReplies = vents.reduce((sum, vent) => sum + vent.analytics.replyCount, 0);
    const averageReactions = totalVents > 0 ? totalReactions / totalVents : 0;
    const averageReplies = totalVents > 0 ? totalReplies / totalVents : 0;

    // Emotion distribution in vents
    const ventEmotions = {};
    vents.forEach(vent => {
      if (vent.emotion) {
        ventEmotions[vent.emotion] = (ventEmotions[vent.emotion] || 0) + 1;
      }
    });

    return {
      totalVents,
      totalReactions,
      totalReplies,
      averageReactions,
      averageReplies,
      emotionDistribution: ventEmotions
    };
  }

  // Get check-in statistics
  async getCheckInStats(userId, startDate) {
    // This would integrate with the friend system
    // For now, return placeholder data
    return {
      sent: 0,
      received: 0,
      lastCheckIn: null
    };
  }

  // Generate personalized recommendations
  async generateRecommendations(userId, startDate) {
    const emotions = await Emotion.find({
      userId,
      createdAt: { $gte: startDate }
    });

    const recommendations = [];

    // Analyze patterns and generate recommendations
    const negativeEmotions = emotions.filter(e => 
      ['sadness', 'anger', 'fear', 'anxiety', 'stress', 'lonely'].includes(e.emotion)
    );

    const positiveEmotions = emotions.filter(e => 
      ['joy', 'grateful', 'calm', 'peaceful', 'motivated'].includes(e.emotion)
    );

    // Recommendation based on negative emotion frequency
    if (negativeEmotions.length > emotions.length * 0.6) {
      recommendations.push({
        type: 'wellness',
        title: 'Consider Wellness Activities',
        description: 'You\'ve been experiencing more challenging emotions lately. Consider trying meditation, exercise, or talking to a friend.',
        priority: 'high'
      });
    }

    // Recommendation based on logging consistency
    const daysWithEntries = new Set(emotions.map(e => e.createdAt.toDateString())).size;
    const totalDays = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
    
    if (daysWithEntries < totalDays * 0.5) {
      recommendations.push({
        type: 'consistency',
        title: 'Build a Logging Habit',
        description: 'Regular mood tracking can help you understand your patterns better. Try logging at the same time each day.',
        priority: 'medium'
      });
    }

    // Recommendation based on time patterns
    const morningEmotions = emotions.filter(e => e.createdAt.getHours() < 12);
    const eveningEmotions = emotions.filter(e => e.createdAt.getHours() >= 18);

    if (morningEmotions.length > 0 && eveningEmotions.length > 0) {
      const morningAvg = morningEmotions.reduce((sum, e) => sum + e.intensity, 0) / morningEmotions.length;
      const eveningAvg = eveningEmotions.reduce((sum, e) => sum + e.intensity, 0) / eveningEmotions.length;

      if (eveningAvg < morningAvg * 0.7) {
        recommendations.push({
          type: 'routine',
          title: 'Evening Energy Dip',
          description: 'Your mood tends to drop in the evening. Consider adding energizing activities to your evening routine.',
          priority: 'medium'
        });
      }
    }

    return recommendations;
  }

  // Helper methods
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  getMostFrequent(arr) {
    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  // Get global insights (for admin/analytics)
  async getGlobalInsights(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalUsers,
        activeUsers,
        totalEmotions,
        emotionDistribution,
        ventStats,
        userGrowth
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ lastActive: { $gte: startDate } }),
        Emotion.countDocuments({ createdAt: { $gte: startDate } }),
        this.getGlobalEmotionDistribution(startDate),
        this.getGlobalVentStats(startDate),
        this.getUserGrowth(startDate)
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          growth: userGrowth
        },
        emotions: {
          total: totalEmotions,
          distribution: emotionDistribution,
          averagePerUser: activeUsers > 0 ? totalEmotions / activeUsers : 0
        },
        social: {
          vents: ventStats
        }
      };
    } catch (error) {
      logger.error('Error getting global insights:', error);
      throw error;
    }
  }

  async getGlobalEmotionDistribution(startDate) {
    return await Emotion.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$emotion',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  }

  async getGlobalVentStats(startDate) {
    const vents = await Vent.find({
      createdAt: { $gte: startDate },
      'privacy.isPublic': true
    });

    return {
      total: vents.length,
      totalReactions: vents.reduce((sum, v) => sum + v.analytics.reactionCount, 0),
      totalReplies: vents.reduce((sum, v) => sum + v.analytics.replyCount, 0),
      averageReactions: vents.length > 0 ? vents.reduce((sum, v) => sum + v.analytics.reactionCount, 0) / vents.length : 0
    };
  }

  async getUserGrowth(startDate) {
    return await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
  }
}

export default new InsightsService(); 