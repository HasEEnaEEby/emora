import analyticsService from '../services/analytics.service.js';
import { handleAsync } from '../utils/helpers.js';
import { successResponse } from '../utils/response.js';

class AnalyticsController {
  getUserAnalytics = handleAsync(async (req, res) => {
    const analytics = await analyticsService.getUserAnalytics(req.user.id, req.query);
    
    successResponse(res, {
      message: 'User analytics retrieved successfully',
      data: analytics
    });
  });

  getUserInsights = handleAsync(async (req, res) => {
    const analytics = await analyticsService.getUserAnalytics(req.user.id, {
      ...req.query,
      includeRecommendations: false
    });
    
    successResponse(res, {
      message: 'User insights retrieved successfully',
      data: {
        insights: analytics.insights,
        moodScore: analytics.analytics?.moodScore,
        period: analytics.period
      }
    });
  });

  getUserRecommendations = handleAsync(async (req, res) => {
    const analytics = await analyticsService.getUserAnalytics(req.user.id, {
      ...req.query,
      includeInsights: false
    });
    
    successResponse(res, {
      message: 'User recommendations retrieved successfully',
      data: {
        recommendations: analytics.recommendations,
        moodScore: analytics.analytics?.moodScore,
        period: analytics.period
      }
    });
  });
}

export default new AnalyticsController();
