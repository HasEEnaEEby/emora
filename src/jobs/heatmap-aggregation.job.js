import heatmapService from '../services/heatmap.service.js';
import logger from '../utils/logger.js';

class HeatmapAggregationJob {
  async run() {
    logger.info('Starting heatmap aggregation job');
    
    try {
      // Pre-generate and cache popular heatmap combinations
      const timeRanges = ['1h', '6h', '24h', '7d'];
      const resolutions = ['city', 'region', 'country'];
      
      for (const timeRange of timeRanges) {
        for (const resolution of resolutions) {
          await heatmapService.getGlobalHeatmap({
            timeRange,
            resolution
          });
          
          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      logger.info('Heatmap aggregation job completed successfully');
    } catch (error) {
      logger.error('Heatmap aggregation job failed:', error);
      throw error;
    }
  }
}

export default new HeatmapAggregationJob();
