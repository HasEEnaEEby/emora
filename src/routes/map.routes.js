import express from 'express';
import mongoose from 'mongoose';
import Emotion from '../models/emotion.model.js';
import { mapToPlutchikCoreEmotion, PLUTCHIK_CORE_EMOTIONS } from '../constants/emotion-mappings.js';
import insightController from '../controllers/insight.controller.js';

const router = express.Router();

// GET /api/map/emotion-data - Get aggregated emotion data for map visualization
router.get('/emotion-data', async (req, res) => {
  try {
    const {
      coreEmotion,
      country,
      region,
      city,
      startDate,
      endDate,
      minIntensity = 1,
      limit = 1000
    } = req.query;

    const filters = {
      coreEmotion,
      country,
      region,
      city,
      startDate,
      endDate,
      minIntensity: parseInt(minIntensity),
      limit: parseInt(limit)
    };

    // Use the existing getEmotionMapData method
    const data = await Emotion.getEmotionMapData(filters);
    
    res.json({
      success: true,
      data,
      count: data.length,
      filters
    });
  } catch (error) {
    console.error('Error fetching emotion map data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion map data'
    });
  }
});

// GET /api/map/emotion-clusters - Get emotion clusters for heatmap
router.get('/emotion-clusters', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      radiusKm = 50,
      minClusterSize = 1 // Lower minimum to show more countries
    } = req.query;

    const filters = {
      startDate,
      endDate,
      radiusKm: parseInt(radiusKm),
      minClusterSize: parseInt(minClusterSize)
    };

    const clusters = await Emotion.getEmotionClusters(filters);
    
    res.json({
      success: true,
      data: clusters,
      count: clusters.length,
      filters
    });
  } catch (error) {
    console.error('Error fetching emotion clusters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion clusters'
    });
  }
});

// GET /api/map/emotion-trends - Get emotion trends over time
router.get('/emotion-trends', async (req, res) => {
  try {
    const {
      country,
      city,
      coreEmotion,
      days = 7
    } = req.query;

    const filters = {
      country,
      city,
      coreEmotion,
      days: parseInt(days)
    };

    const trends = await Emotion.getEmotionTrends(filters);
    
    res.json({
      success: true,
      data: trends,
      count: trends.length,
      filters
    });
  } catch (error) {
    console.error('Error fetching emotion trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion trends'
    });
  }
});

// GET /api/map/heatmap-data - Get heatmap data for visualization
router.get('/heatmap-data', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      coreEmotion,
      minIntensity = 1
    } = req.query;

    const filters = {
      startDate,
      endDate,
      coreEmotion,
      minIntensity: parseInt(minIntensity)
    };

    const heatmapData = await Emotion.getGlobalHeatmapData(filters);
    
    res.json({
      success: true,
      data: heatmapData,
      count: heatmapData.length,
      filters
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap data'
    });
  }
});

// GET /api/map/stats - Get global emotion statistics
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = { privacy: 'public' };
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await Emotion.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalEmotions: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          coreEmotionBreakdown: {
            $push: {
              coreEmotion: '$coreEmotion',
              intensity: '$intensity'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalEmotions: 1,
          avgIntensity: { $round: ['$avgIntensity', 2] },
          coreEmotionBreakdown: 1
        }
      }
    ]);

    // Process core emotion breakdown
    const coreEmotionStats = {};
    if (stats[0]?.coreEmotionBreakdown) {
      stats[0].coreEmotionBreakdown.forEach(item => {
        if (!coreEmotionStats[item.coreEmotion]) {
          coreEmotionStats[item.coreEmotion] = { count: 0, totalIntensity: 0 };
        }
        coreEmotionStats[item.coreEmotion].count++;
        coreEmotionStats[item.coreEmotion].totalIntensity += item.intensity;
      });
    }

    // Calculate averages
    Object.keys(coreEmotionStats).forEach(emotion => {
      coreEmotionStats[emotion].avgIntensity = 
        parseFloat((coreEmotionStats[emotion].totalIntensity / coreEmotionStats[emotion].count).toFixed(2));
    });

    const responseData = {
      totalEmotions: stats[0]?.totalEmotions || 0,
      avgIntensity: parseFloat((stats[0]?.avgIntensity || 0).toString()),
      coreEmotionStats: coreEmotionStats,
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching emotion stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion statistics'
    });
  }
});

// GET /api/map/insights - Get AI-powered region insights
router.get('/insights', insightController.getRegionInsights);

// GET /api/map/insights/global - Get global AI insights
router.get('/insights/global', insightController.getGlobalInsights);

// GET /api/map/trends - Get emotion trends with AI analysis
router.get('/trends', insightController.getEmotionTrends);

// GET /api/map/core-emotions - Get available core emotions
router.get('/core-emotions', async (req, res) => {
  try {
    const coreEmotions = await Emotion.aggregate([
      { $match: { privacy: 'public' } },
      {
        $group: {
          _id: '$coreEmotion',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: coreEmotions.map(emotion => ({
        coreEmotion: emotion._id,
        count: emotion.count,
        avgIntensity: parseFloat(emotion.avgIntensity.toFixed(2))
      }))
    });
  } catch (error) {
    console.error('Error fetching core emotions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch core emotions'
    });
  }
});

// GET /api/map/emotion-insights/:emotionId - Get detailed insights for an emotion
router.get('/emotion-insights/:emotionId', async (req, res) => {
  try {
    const { emotionId } = req.params;
    
    const emotion = await Emotion.findById(emotionId)
      .populate('userId', 'username avatar')
      .lean();

    if (!emotion) {
      return res.status(404).json({
        success: false,
        error: 'Emotion not found'
      });
    }

    // Get similar emotions in the same area
    const similarEmotions = await Emotion.find({
      'location.city': emotion.location?.city,
      'location.country': emotion.location?.country,
      coreEmotion: emotion.coreEmotion,
      _id: { $ne: emotion._id }
    })
    .limit(5)
    .select('type intensity createdAt')
    .lean();

    const insights = {
      emotion,
      similarEmotions,
      locationStats: {
        city: emotion.location?.city,
        country: emotion.location?.country,
        totalEmotions: similarEmotions.length + 1
      }
    };

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error fetching emotion insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion insights'
    });
  }
});

// POST /api/map/submit-emotion - Submit new emotion for global map
router.post('/submit-emotion', async (req, res) => {
  try {
    const {
      coordinates,
      coreEmotion,
      emotionTypes,
      intensity,
      city,
      country,
      context
    } = req.body;

    // Validate required fields
    if (!coordinates || !coreEmotion || !intensity || !city || !country) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: coordinates, coreEmotion, intensity, city, country'
      });
    }

    // Create new emotion record
    const newEmotion = new Emotion({
      userId: new mongoose.Types.ObjectId(), // Generate ObjectId
      type: 'joy', // Use a valid type from enum, will be overridden by coreEmotion
      coreEmotion,
      intensity: parseFloat(intensity),
      note: context || '',
      tags: emotionTypes || [],
      location: {
        type: 'Point',
        coordinates: coordinates, // [lng, lat] format
        city,
        country,
        source: 'test' // Use valid enum value
      },
      privacy: 'public',
      isAnonymous: true,
      metadata: {
        source: 'api',
        version: '1.0.0'
      }
    });

    await newEmotion.save();

    // Emit real-time update via WebSocket
    if (req.io) {
      req.io.emit('newEmotion', {
        id: newEmotion._id,
        coreEmotion: newEmotion.coreEmotion,
        city: newEmotion.city,
        country: newEmotion.country,
        intensity: newEmotion.intensity,
        timestamp: newEmotion.timestamp
      });
    }

    res.json({
      success: true,
      message: 'Emotion submitted successfully',
      data: {
        id: newEmotion._id,
        coreEmotion: newEmotion.coreEmotion,
        city: newEmotion.city,
        country: newEmotion.country,
        intensity: newEmotion.intensity
      }
    });
  } catch (error) {
    console.error('Error submitting emotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit emotion'
    });
  }
});

// GET /api/map/insights - Get AI insights and predictions
router.get('/insights', async (req, res) => {
  try {
    const {
      region,
      country,
      city,
      days = 7,
      coreEmotion
    } = req.query;

    const filters = {
      privacy: 'public'
    };

    // Add location filters
    if (region) filters['location.region'] = { $regex: region, $options: 'i' };
    if (country) filters['location.country'] = { $regex: country, $options: 'i' };
    if (city) filters['location.city'] = { $regex: city, $options: 'i' };
    if (coreEmotion) filters.coreEmotion = coreEmotion;

    // Add time filter
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    filters.createdAt = { $gte: startDate };

    // Get emotion data for analysis
    const emotions = await Emotion.find(filters).sort({ createdAt: -1 }).limit(1000);

    // Calculate insights
    const insights = {
      totalEmotions: emotions.length,
      dominantEmotion: null,
      avgIntensity: 0,
      trend: 'stable',
      predictions: [],
      recommendations: []
    };

    if (emotions.length > 0) {
      // Calculate dominant emotion
      const emotionCounts = {};
      emotions.forEach(emotion => {
        emotionCounts[emotion.coreEmotion] = (emotionCounts[emotion.coreEmotion] || 0) + 1;
      });
      
      const dominantEmotion = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
      
      insights.dominantEmotion = dominantEmotion;
      insights.avgIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;

      // Simple trend analysis
      const recentEmotions = emotions.slice(0, Math.floor(emotions.length / 2));
      const olderEmotions = emotions.slice(Math.floor(emotions.length / 2));
      
      const recentAvg = recentEmotions.reduce((sum, e) => sum + e.intensity, 0) / recentEmotions.length;
      const olderAvg = olderEmotions.reduce((sum, e) => sum + e.intensity, 0) / olderEmotions.length;
      
      if (recentAvg > olderAvg + 0.5) insights.trend = 'increasing';
      else if (recentAvg < olderAvg - 0.5) insights.trend = 'decreasing';
      else insights.trend = 'stable';

      // Generate recommendations
      if (insights.dominantEmotion === 'fear' || insights.dominantEmotion === 'sadness') {
        insights.recommendations.push('Consider activities that promote joy and trust');
      } else if (insights.dominantEmotion === 'joy' || insights.dominantEmotion === 'trust') {
        insights.recommendations.push('Great emotional state! Consider sharing positive experiences');
      }
    }

    res.json({
      success: true,
      data: insights,
      filters: { region, country, city, days, coreEmotion }
    });

  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights'
    });
  }
});

// GET /api/map/test-region - Test region matching
router.get('/test-region', async (req, res) => {
  const { region } = req.query;
  
  if (!region) {
    return res.status(400).json({
      success: false,
      error: 'Region parameter is required'
    });
  }

  try {
    console.log(`🔍 Testing region: "${region}"`);
    
    // Test different matching strategies
    const queries = [
      { 'location.country': { $regex: region, $options: 'i' } },
      { 'location.city': { $regex: region, $options: 'i' } },
      { 'location.country': { $regex: region.split(',')[1]?.trim(), $options: 'i' } },
      { 'location.city': { $regex: region.split(',')[0]?.trim(), $options: 'i' } },
      { 'location.country': { $regex: region.replace(/^.*,\s*/, ''), $options: 'i' } },
      { 'location.city': { $regex: region.replace(/,\s*.*$/, ''), $options: 'i' } }
    ];

    const results = [];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const emotions = await Emotion.find({
        ...query,
        privacy: 'public'
      }).lean();
      
      results.push({
        query: i + 1,
        queryType: Object.keys(query)[0],
        queryValue: Object.values(query)[0],
        found: emotions.length,
        sampleLocations: emotions.slice(0, 3).map(e => `${e.location?.city}, ${e.location?.country}`)
      });
    }

    // Get all available regions for reference
    const allRegions = await Emotion.aggregate([
      { $match: { privacy: 'public' } },
      {
        $group: {
          _id: {
            country: '$location.country',
            city: '$location.city'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      testRegion: region,
      results,
      availableRegions: allRegions.map(r => ({
        city: r._id.city,
        country: r._id.country,
        count: r.count
      }))
    });

  } catch (error) {
    console.error('Error testing region:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test region matching'
    });
  }
});

export default router; 