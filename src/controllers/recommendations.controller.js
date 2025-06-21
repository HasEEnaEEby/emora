import recommendationsService from '../services/recommendation.service.js';
import { handleAsync } from '../utils/helpers.js';
import { successResponse } from '../utils/response.js';

class RecommendationsController {
  getRecommendations = handleAsync(async (req, res) => {
    const recommendations = await recommendationsService.getUserRecommendations(
      req.user.id, 
      req.query
    );
    
    successResponse(res, {
      message: 'Recommendations retrieved successfully',
      data: recommendations
    });
  });

  getMusicRecommendations = handleAsync(async (req, res) => {
    const musicRecs = await recommendationsService.getMusicRecommendations(
      req.user.id,
      req.query
    );
    
    successResponse(res, {
      message: 'Music recommendations retrieved successfully',
      data: musicRecs
    });
  });

  getActivityRecommendations = handleAsync(async (req, res) => {
    const activityRecs = await recommendationsService.getActivityRecommendations(
      req.user.id,
      req.query
    );
    
    successResponse(res, {
      message: 'Activity recommendations retrieved successfully',
      data: activityRecs
    });
  });

  getMindfulnessRecommendations = handleAsync(async (req, res) => {
    const mindfulnessRecs = await recommendationsService.getMindfulnessRecommendations(
      req.user.id,
      req.query
    );
    
    successResponse(res, {
      message: 'Mindfulness recommendations retrieved successfully',
      data: mindfulnessRecs
    });
  });
}

export default new RecommendationsController();