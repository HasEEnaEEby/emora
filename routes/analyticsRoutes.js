const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/filtered-emotions
 * Get filtered emotions with advanced criteria
 */
router.get('/filtered-emotions', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    const filters = req.query;

    // Parse complex filters
    const parsedFilters = {
      coreEmotion: filters.coreEmotion,
      emotions: filters.emotions ? filters.emotions.split(',') : null,
      intensityRange: filters.intensityMin && filters.intensityMax ? {
        min: parseFloat(filters.intensityMin),
        max: parseFloat(filters.intensityMax)
      } : null,
      dateRange: filters.startDate && filters.endDate ? {
        start: new Date(filters.startDate),
        end: new Date(filters.endDate)
      } : null,
      location: filters.latitude && filters.longitude ? {
        latitude: parseFloat(filters.latitude),
        longitude: parseFloat(filters.longitude)
      } : null,
      radius: filters.radius ? parseFloat(filters.radius) : null,
      timeOfDay: filters.timeOfDay ? filters.timeOfDay.split(',').map(Number) : null,
      dayOfWeek: filters.dayOfWeek ? filters.dayOfWeek.split(',').map(Number) : null,
      weather: filters.weather,
      events: filters.events ? filters.events.split(',') : null,
      sentiment: filters.sentiment,
      clustering: filters.clustering === 'true' ? {
        enabled: true,
        algorithm: filters.clusteringAlgorithm || 'kmeans',
        k: filters.k ? parseInt(filters.k) : 5,
        minPoints: filters.minPoints ? parseInt(filters.minPoints) : 3,
        maxDistance: filters.maxDistance ? parseFloat(filters.maxDistance) : 0.1
      } : null,
      limit: filters.limit ? parseInt(filters.limit) : 1000
    };

    const emotions = await analyticsService.getFilteredEmotions(parsedFilters);

    res.json({
      success: true,
      data: emotions,
      count: emotions.length,
      filters: parsedFilters
    });

  } catch (error) {
    console.error('Error getting filtered emotions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get filtered emotions',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/trends
 * Get trend analysis
 */
router.get('/trends', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    const {
      timeRange = 168, // 7 days in hours
      granularity = 'day',
      emotions,
      locations,
      groupBy
    } = req.query;

    const options = {
      timeRange: parseInt(timeRange),
      granularity,
      emotions: emotions ? emotions.split(',') : null,
      locations: locations ? JSON.parse(locations) : null,
      groupBy
    };

    const trends = await analyticsService.getTrendAnalysis(options);

    res.json({
      success: true,
      data: trends,
      count: trends.length,
      options
    });

  } catch (error) {
    console.error('Error getting trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trends',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/predictions
 * Get predictive analytics
 */
router.get('/predictions', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    const {
      region,
      timeHorizon = 24,
      confidence = 0.7,
      factors
    } = req.query;

    const options = {
      region,
      timeHorizon: parseInt(timeHorizon),
      confidence: parseFloat(confidence),
      factors: factors ? JSON.parse(factors) : null
    };

    const predictions = await analyticsService.getPredictions(options);

    res.json({
      success: true,
      data: predictions,
      count: predictions.length,
      options
    });

  } catch (error) {
    console.error('Error getting predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get predictions',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/clustering
 * Get clustering analysis
 */
router.get('/clustering', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    const {
      algorithm = 'kmeans',
      k = 5,
      minPoints = 3,
      maxDistance = 0.1
    } = req.query;

    const options = {
      algorithm,
      k: parseInt(k),
      minPoints: parseInt(minPoints),
      maxDistance: parseFloat(maxDistance)
    };

    const clusters = await analyticsService.getClusteringAnalysis(options);

    res.json({
      success: true,
      data: clusters,
      count: clusters.length,
      options
    });

  } catch (error) {
    console.error('Error getting clustering:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get clustering',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/sentiment
 * Get sentiment analysis
 */
router.get('/sentiment', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    const {
      timeRange = 168,
      emotions,
      locations
    } = req.query;

    const options = {
      timeRange: parseInt(timeRange),
      emotions: emotions ? emotions.split(',') : null,
      locations: locations ? JSON.parse(locations) : null
    };

    const sentiment = await analyticsService.getSentimentAnalysis(options);

    res.json({
      success: true,
      data: sentiment,
      count: sentiment.length,
      options
    });

  } catch (error) {
    console.error('Error getting sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sentiment',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/heatmap
 * Get heatmap data
 */
router.get('/heatmap', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    const {
      bounds,
      resolution = 0.1,
      emotions,
      timeRange = 168
    } = req.query;

    const options = {
      bounds: bounds ? JSON.parse(bounds) : null,
      resolution: parseFloat(resolution),
      emotions: emotions ? emotions.split(',') : null,
      timeRange: parseInt(timeRange)
    };

    const heatmapData = await analyticsService.getHeatmapData(options);

    res.json({
      success: true,
      data: heatmapData,
      count: heatmapData.length,
      options
    });

  } catch (error) {
    console.error('Error getting heatmap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get heatmap',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/comparative
 * Get comparative analysis between regions
 */
router.get('/comparative', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    const { regions } = req.query;

    if (!regions) {
      return res.status(400).json({
        success: false,
        error: 'Regions parameter is required'
      });
    }

    const parsedRegions = JSON.parse(regions);
    const comparativeData = await analyticsService.getComparativeAnalysis(parsedRegions);

    res.json({
      success: true,
      data: comparativeData,
      regions: parsedRegions
    });

  } catch (error) {
    console.error('Error getting comparative analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comparative analysis',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/dashboard
 * Get dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    const dashboardData = await analyticsService.getDashboardData();

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/ai-insights
 * Get AI-generated insights
 */
router.get('/ai-insights', async (req, res) => {
  try {
    const aiInsightsService = req.app.get('aiInsightsService');
    const {
      type,
      region,
      emotionData,
      trendData,
      historicalData,
      predictions,
      regionData,
      contextData
    } = req.query;

    let insight;

    switch (type) {
      case 'regional':
        const parsedEmotionData = JSON.parse(emotionData);
        insight = await aiInsightsService.generateRegionalInsights(region, parsedEmotionData);
        break;

      case 'trend':
        const parsedTrendData = JSON.parse(trendData);
        insight = await aiInsightsService.generateTrendAnalysis(parsedTrendData);
        break;

      case 'predictive':
        const parsedHistoricalData = JSON.parse(historicalData);
        const parsedPredictions = JSON.parse(predictions);
        insight = await aiInsightsService.generatePredictiveInsights(parsedHistoricalData, parsedPredictions);
        break;

      case 'comparative':
        const parsedRegionData = JSON.parse(regionData);
        insight = await aiInsightsService.generateComparativeAnalysis(parsedRegionData);
        break;

      case 'context':
        const parsedEmotionData2 = JSON.parse(emotionData);
        const parsedContextData = JSON.parse(contextData);
        insight = await aiInsightsService.generateEmotionalContext(parsedEmotionData2, parsedContextData);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid insight type'
        });
    }

    res.json({
      success: true,
      insight,
      type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI insights',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/real-time-insight
 * Get real-time AI insight for new emotion
 */
router.get('/real-time-insight', async (req, res) => {
  try {
    const aiInsightsService = req.app.get('aiInsightsService');
    const { emotionData } = req.query;

    const parsedEmotionData = JSON.parse(emotionData);
    const insight = await aiInsightsService.generateRealTimeInsight(parsedEmotionData);

    res.json({
      success: true,
      insight,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating real-time insight:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate real-time insight',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/weekly-summary
 * Get weekly emotional summary
 */
router.get('/weekly-summary', async (req, res) => {
  try {
    const aiInsightsService = req.app.get('aiInsightsService');
    const { weeklyData } = req.query;

    const parsedWeeklyData = JSON.parse(weeklyData);
    const summary = await aiInsightsService.generateWeeklySummary(parsedWeeklyData);

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating weekly summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly summary',
      details: error.message
    });
  }
});

module.exports = router; 