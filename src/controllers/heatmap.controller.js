import heatmapService from '../services/heatmap.service.js';
import { handleAsync } from '../utils/helpers.js';
import { successResponse } from '../utils/response.js';

class HeatmapController {
  getGlobalHeatmap = handleAsync(async (req, res) => {
    const heatmapData = await heatmapService.getGlobalHeatmap(req.query);
    
    successResponse(res, {
      message: 'Global heatmap retrieved successfully',
      data: heatmapData
    });
  });

  getHeatmapStats = handleAsync(async (req, res) => {
    const { timeRange = '24h' } = req.query;
    const stats = await heatmapService.getHeatmapStats(timeRange);
    
    successResponse(res, {
      message: 'Heatmap statistics retrieved successfully',
      data: stats
    });
  });
}

export default new HeatmapController();