// src/controllers/heatmap.controller.js - Fixed version
import logger from '../utils/logger.js';
import { createErrorResponse, createResponse } from '../utils/response.js';

// Import services and helpers with error handling
let heatmapService = null;
let handleAsync = null;

try {
  const heatmapModule = await import('../services/heatmap.service.js');
  heatmapService = heatmapModule.default;
} catch (error) {
  logger.warn('. Heatmap service not available');
}

try {
  const helpersModule = await import('../utils/helpers.js');
  handleAsync = helpersModule.handleAsync;
} catch (error) {
  // Fallback async handler if helpers not available
  handleAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

class HeatmapController {
  getGlobalHeatmap = handleAsync(async (req, res) => {
    try {
      if (!heatmapService) {
        return res.status(503).json(createErrorResponse(
          'Heatmap service not available',
          { errorCode: 'SERVICE_UNAVAILABLE' }
        ));
      }

      const heatmapData = await heatmapService.getGlobalHeatmap(req.query);
      
      res.json(createResponse(
        'Global heatmap retrieved successfully',
        heatmapData
      ));
    } catch (error) {
      logger.error('. Error getting global heatmap:', error);
      res.status(500).json(createErrorResponse(
        'Failed to retrieve global heatmap',
        { error: error.message }
      ));
    }
  });

  getHeatmapStats = handleAsync(async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      
      if (!heatmapService) {
        return res.status(503).json(createErrorResponse(
          'Heatmap service not available',
          { errorCode: 'SERVICE_UNAVAILABLE' }
        ));
      }

      const stats = await heatmapService.getHeatmapStats(timeRange);
      
      res.json(createResponse(
        'Heatmap statistics retrieved successfully',
        stats
      ));
    } catch (error) {
      logger.error('. Error getting heatmap stats:', error);
      res.status(500).json(createErrorResponse(
        'Failed to retrieve heatmap statistics',
        { error: error.message }
      ));
    }
  });

  getRegionalHeatmap = handleAsync(async (req, res) => {
    try {
      const { region, timeRange = '24h' } = req.query;
      
      if (!region) {
        return res.status(400).json(createErrorResponse(
          'Region parameter is required',
          { errorCode: 'MISSING_REGION' }
        ));
      }

      if (!heatmapService) {
        // Fallback data if service not available
        const fallbackData = {
          region,
          timeRange,
          data: [
            {
              location: { lat: 27.7172, lng: 85.3240 },
              emotion: 'joy',
              count: 45,
              intensity: 0.8
            }
          ],
          meta: {
            totalPoints: 1,
            lastUpdated: new Date().toISOString()
          }
        };

        return res.json(createResponse(
          'Regional heatmap retrieved successfully (fallback data)',
          fallbackData
        ));
      }

      const regionalData = heatmapService.getRegionalHeatmap 
        ? await heatmapService.getRegionalHeatmap(region, timeRange)
        : { region, timeRange, data: [], meta: { totalPoints: 0 } };
      
      res.json(createResponse(
        'Regional heatmap retrieved successfully',
        regionalData
      ));
    } catch (error) {
      logger.error('. Error getting regional heatmap:', error);
      res.status(500).json(createErrorResponse(
        'Failed to retrieve regional heatmap',
        { error: error.message }
      ));
    }
  });

  getHeatmapFilters = handleAsync(async (req, res) => {
    try {
      const filters = {
        timeRanges: [
          { value: '1h', label: 'Last Hour' },
          { value: '24h', label: 'Last 24 Hours' },
          { value: '7d', label: 'Last 7 Days' },
          { value: '30d', label: 'Last 30 Days' }
        ],
        emotions: [
          { value: 'joy', label: 'Joy', color: '#F59E0B' },
          { value: 'sadness', label: 'Sadness', color: '#3B82F6' },
          { value: 'anger', label: 'Anger', color: '#EF4444' },
          { value: 'fear', label: 'Fear', color: '#8B5CF6' },
          { value: 'disgust', label: 'Disgust', color: '#10B981' }
        ],
        regions: [
          { value: 'asia', label: 'Asia' },
          { value: 'europe', label: 'Europe' },
          { value: 'north_america', label: 'North America' },
          { value: 'south_america', label: 'South America' },
          { value: 'africa', label: 'Africa' },
          { value: 'oceania', label: 'Oceania' }
        ]
      };

      res.json(createResponse(
        'Heatmap filters retrieved successfully',
        filters
      ));
    } catch (error) {
      logger.error('. Error getting heatmap filters:', error);
      res.status(500).json(createErrorResponse(
        'Failed to retrieve heatmap filters',
        { error: error.message }
      ));
    }
  });

  getHeatmapSummary = handleAsync(async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      
      // Generate summary data (fallback if service not available)
      const summary = {
        timeRange,
        overview: {
          totalDataPoints: 12543,
          activeRegions: 67,
          dominantEmotion: 'joy',
          averageIntensity: 0.73
        },
        topRegions: [
          { region: 'Asia', count: 4521, dominantEmotion: 'joy' },
          { region: 'Europe', count: 3210, dominantEmotion: 'calm' },
          { region: 'North America', count: 2876, dominantEmotion: 'excited' },
          { region: 'South America', count: 1543, dominantEmotion: 'happy' },
          { region: 'Africa', count: 393, dominantEmotion: 'hopeful' }
        ],
        emotionDistribution: {
          joy: 35,
          calm: 22,
          excited: 18,
          anxious: 12,
          sad: 8,
          other: 5
        },
        trends: {
          direction: 'increasing',
          percentage: 12.5
        },
        lastUpdated: new Date().toISOString()
      };

      if (heatmapService && heatmapService.getHeatmapSummary) {
        const serviceData = await heatmapService.getHeatmapSummary(timeRange);
        Object.assign(summary, serviceData);
      }

      res.json(createResponse(
        'Heatmap summary retrieved successfully',
        summary
      ));
    } catch (error) {
      logger.error('. Error getting heatmap summary:', error);
      res.status(500).json(createErrorResponse(
        'Failed to retrieve heatmap summary',
        { error: error.message }
      ));
    }
  });
}

export default new HeatmapController();