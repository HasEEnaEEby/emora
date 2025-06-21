import Analytics from '../models/analytics.model.js';
import Mood from '../models/mood.model.js';
import logger from '../utils/logger.js';

class AnalyticsJob {
  async run() {
    logger.info('Starting analytics job');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);
      
      // Get all users who logged moods yesterday
      const usersWithMoods = await Mood.distinct('userId', {
        createdAt: { $gte: yesterday, $lt: today }
      });
      
      logger.info(`Processing analytics for ${usersWithMoods.length} users`);
      
      let processed = 0;
      for (const userId of usersWithMoods) {
        try {
          await this.generateUserAnalytics(userId, yesterday);
          processed++;
        } catch (error) {
          logger.error(`Failed to generate analytics for user ${userId}:`, error);
        }
      }
      
      logger.info(`Analytics job completed: ${processed}/${usersWithMoods.length} users processed`);
    } catch (error) {
      logger.error('Analytics job failed:', error);
      throw error;
    }
  }

  async generateUserAnalytics(userId, date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Get user's moods for the day
    const moods = await Mood.find({
      userId,
      createdAt: { $gte: date, $lt: nextDay }
    });

    if (moods.length === 0) return;

    // Calculate statistics
    const stats = this.calculateDayStats(moods);
    const insights = this.generateInsights(stats, moods);
    const recommendations = this.generateRecommendations(stats);

    // Update or create analytics entry
    await Analytics.findOneAndUpdate(
      { userId, date },
      {
        userId,
        date,
        stats,
        insights,
        recommendations
      },
      { upsert: true, new: true }
    );
  }

  calculateDayStats(moods) {
    const emotionCounts = {};
    let totalIntensity = 0;

    moods.forEach(mood => {
      emotionCounts[mood.emotion] = (emotionCounts[mood.emotion] || 0) + 1;
      totalIntensity += mood.intensity;
    });

    const emotionBreakdown = Object.entries(emotionCounts).map(([emotion, count]) => ({
      emotion,
      count,
      avgIntensity: moods
        .filter(m => m.emotion === emotion)
        .reduce((sum, m) => sum + m.intensity, 0) / count,
      percentage: Math.round((count / moods.length) * 100)
    }));

    const dominantEmotion = emotionBreakdown.reduce((prev, current) => 
      prev.count > current.count ? prev : current
    );

    return {
      totalMoods: moods.length,
      dominantEmotion,
      emotionBreakdown,
      moodScore: this.calculateMoodScore(emotionBreakdown),
      // Add more analytics as needed
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

  generateInsights(stats) {
    const insights = [];

    if (stats.moodScore >= 80) {
      insights.push({
        type: 'positive_day',
        message: 'You had a great day! Your mood score was excellent.',
        category: 'positive',
        priority: 4
      });
    } else if (stats.moodScore <= 30) {
      insights.push({
        type: 'difficult_day',
        message: 'It seems like you had a challenging day. Remember that tomorrow is a new opportunity.',
        category: 'concern',
        priority: 5
      });
    }

    if (stats.dominantEmotion.emotion === 'anxious' && stats.dominantEmotion.percentage > 50) {
      insights.push({
        type: 'anxiety_concern',
        message: 'You experienced significant anxiety today. Consider trying some relaxation techniques.',
        category: 'concern',
        priority: 4
      });
    }

    return insights;
  }

  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.moodScore < 50) {
      recommendations.push({
        type: 'mood_boost',
        title: 'Mood Boosting Activities',
        description: 'Try some activities that might help improve your mood',
        category: 'activity',
        data: {
          activities: ['Go for a walk', 'Listen to upbeat music', 'Call a friend', 'Practice gratitude']
        }
      });
    }

    if (stats.dominantEmotion.emotion === 'anxious') {
      recommendations.push({
        type: 'anxiety_relief',
        title: 'Anxiety Relief Techniques',
        description: 'These techniques can help manage anxiety',
        category: 'mindfulness',
        data: {
          techniques: ['Deep breathing', 'Progressive muscle relaxation', 'Meditation', 'Journaling']
        }
      });
    }

    return recommendations;
  }
}

export default new AnalyticsJob();