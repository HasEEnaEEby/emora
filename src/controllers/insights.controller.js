import insightsService from '../services/insights.service.js';
import logger from '../utils/logger.js';
import { createErrorResponse, createResponse } from '../utils/response.js';

class InsightsController {
  // Get comprehensive user insights
  getUserInsights = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 30 } = req.query;

      const insights = await insightsService.getUserInsights(userId, parseInt(days));

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

  // Get emotion statistics
  getEmotionStats = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const stats = await insightsService.getEmotionStatistics(userId, startDate);

      res.json(createResponse(
        'Emotion statistics retrieved successfully',
        stats
      ));

    } catch (error) {
      logger.error('Error getting emotion stats:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get emotion statistics',
        error.message
      ));
    }
  };

  // Get weekly patterns
  getWeeklyPatterns = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const patterns = await insightsService.getWeeklyPatterns(userId, startDate);

      res.json(createResponse(
        'Weekly patterns retrieved successfully',
        patterns
      ));

    } catch (error) {
      logger.error('Error getting weekly patterns:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get weekly patterns',
        error.message
      ));
    }
  };

  // Get daily patterns
  getDailyPatterns = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const patterns = await insightsService.getDailyPatterns(userId, startDate);

      res.json(createResponse(
        'Daily patterns retrieved successfully',
        patterns
      ));

    } catch (error) {
      logger.error('Error getting daily patterns:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get daily patterns',
        error.message
      ));
    }
  };

  // Get mood streak
  getMoodStreak = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;

      const streak = await insightsService.getMoodStreak(userId);

      res.json(createResponse(
        'Mood streak retrieved successfully',
        streak
      ));

    } catch (error) {
      logger.error('Error getting mood streak:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get mood streak',
        error.message
      ));
    }
  };

  // Get top emotions
  getTopEmotions = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 30, limit = 5 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const emotions = await insightsService.getTopEmotions(userId, startDate, parseInt(limit));

      res.json(createResponse(
        'Top emotions retrieved successfully',
        { emotions }
      ));

    } catch (error) {
      logger.error('Error getting top emotions:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get top emotions',
        error.message
      ));
    }
  };

  // Get recent trends
  getRecentTrends = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const trends = await insightsService.getRecentTrends(userId, startDate);

      res.json(createResponse(
        'Recent trends retrieved successfully',
        trends
      ));

    } catch (error) {
      logger.error('Error getting recent trends:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get recent trends',
        error.message
      ));
    }
  };

  // Get recommendations
  getRecommendations = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const recommendations = await insightsService.generateRecommendations(userId, startDate);

      res.json(createResponse(
        'Recommendations retrieved successfully',
        { recommendations }
      ));

    } catch (error) {
      logger.error('Error getting recommendations:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get recommendations',
        error.message
      ));
    }
  };

  // Get vent statistics
  getVentStats = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const stats = await insightsService.getVentStatistics(userId, startDate);

      res.json(createResponse(
        'Vent statistics retrieved successfully',
        stats
      ));

    } catch (error) {
      logger.error('Error getting vent stats:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get vent statistics',
        error.message
      ));
    }
  };

  // Get daily recap
  getDailyRecap = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { date } = req.query;

      const targetDate = date ? new Date(date) : new Date();
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);

      // Get today's emotions
      const emotions = await insightsService.getEmotionStatistics(userId, startDate);
      
      // Get today's vents
      const vents = await insightsService.getVentStatistics(userId, startDate);
      
      // Get streak info
      const streak = await insightsService.getMoodStreak(userId);

      const recap = {
        date: targetDate.toISOString().split('T')[0],
        emotions: {
          count: emotions.totalEntries,
          averageIntensity: emotions.averageIntensity,
          distribution: emotions.distribution
        },
        vents: {
          count: vents.totalVents,
          reactions: vents.totalReactions,
          replies: vents.totalReplies
        },
        streak: {
          current: streak.currentStreak,
          longest: streak.longestStreak
        },
        summary: this.generateDailySummary(emotions, vents, streak)
      };

      res.json(createResponse(
        'Daily recap retrieved successfully',
        recap
      ));

    } catch (error) {
      logger.error('Error getting daily recap:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get daily recap',
        error.message
      ));
    }
  };

  // Generate daily summary
  generateDailySummary(emotions, vents, streak) {
    const summaries = [];

    if (emotions.totalEntries === 0) {
      summaries.push("You haven't logged any emotions today. Consider taking a moment to check in with yourself.");
    } else if (emotions.totalEntries === 1) {
      summaries.push("You logged one emotion today. Great job staying mindful!");
    } else {
      summaries.push(`You logged ${emotions.totalEntries} emotions today. You're building great self-awareness!`);
    }

    if (emotions.averageIntensity > 0.7) {
      summaries.push("Your emotions were quite intense today. Remember to practice self-care.");
    } else if (emotions.averageIntensity < 0.3) {
      summaries.push("Your emotions were relatively calm today. That's wonderful!");
    }

    if (vents.totalVents > 0) {
      summaries.push(`You shared ${vents.totalVents} vent(s) today and received ${vents.totalReactions} reactions. You're not alone!`);
    }

    if (streak.currentStreak > 1) {
      summaries.push(`You're on a ${streak.currentStreak}-day logging streak! Keep up the great work!`);
    }

    return summaries;
  }

  // Get global insights (admin only)
  getGlobalInsights = async (req, res) => {
    try {
      // Check if user is admin (you can implement your own admin check)
      if (!req.user.isAdmin) {
        return res.status(403).json(createErrorResponse('Admin access required'));
      }

      const { days = 7 } = req.query;

      const insights = await insightsService.getGlobalInsights(parseInt(days));

      res.json(createResponse(
        'Global insights retrieved successfully',
        insights
      ));

    } catch (error) {
      logger.error('Error getting global insights:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get global insights',
        error.message
      ));
    }
  };
}

export default new InsightsController(); 