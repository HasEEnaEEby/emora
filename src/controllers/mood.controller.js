import moodService from '../services/mood.service.js';
import { handleAsync } from '../utils/helpers.js';
import { sendError, sendSuccess } from '../utils/response.js';

class MoodController {
  createMood = handleAsync(async (req, res) => {
    const mood = await moodService.createMood(req.user.id, req.body, req);
    
    successResponse(res, {
      message: 'Mood logged successfully',
      data: mood
    }, 201);
  });

  getUserMoods = handleAsync(async (req, res) => {
    const result = await moodService.getUserMoods(req.user.id, req.query);
    
    successResponse(res, {
      message: 'Moods retrieved successfully',
      data: result.moods,
      pagination: result.pagination
    });
  });

  getUserMoodStats = handleAsync(async (req, res) => {
    const { period = '30d' } = req.query;
    const stats = await moodService.getUserMoodStats(req.user.id, period);
    
    successResponse(res, {
      message: 'Mood statistics retrieved successfully',
      data: stats
    });
  });

  getUserMoodHistory = handleAsync(async (req, res) => {
    const { days = 30 } = req.query;
    const history = await moodService.getUserMoodHistory(req.user.id, parseInt(days));
    
    successResponse(res, {
      message: 'Mood history retrieved successfully',
      data: history
    });
  });

  updateMood = handleAsync(async (req, res) => {
    const { moodId } = req.params;
    
    // For now, we don't allow mood updates for data integrity
    // You can implement this if needed
    errorResponse(res, 'Mood updates are not allowed for data integrity', 400);
  });

  deleteMood = handleAsync(async (req, res) => {
    const { moodId } = req.params;
    await moodService.deleteMood(req.user.id, moodId);
    
    successResponse(res, {
      message: 'Mood deleted successfully'
    });
  });

  getMoodById = handleAsync(async (req, res) => {
    const { moodId } = req.params;
    const mood = await Mood.findOne({ _id: moodId, userId: req.user.id });
    
    if (!mood) {
      return errorResponse(res, 'Mood not found', 404);
    }
    
    successResponse(res, {
      message: 'Mood retrieved successfully',
      data: mood
    });
  });
}

export default new MoodController();
