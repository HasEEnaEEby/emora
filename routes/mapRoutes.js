const express = require('express');
const router = express.Router();
const { Emotion } = require('../models/Emotion');
const { User } = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { validateEmotionData } = require('../middleware/validation');

// ============================================================================
// EMOTION DATA ENDPOINTS
// ============================================================================

/**
 * GET /api/map/emotion-data
 * Fetch emotion data points with filtering and clustering
 */
router.get('/emotion-data', async (req, res) => {
  try {
    const {
      coreEmotion,
      country,
      region,
      city,
      startDate,
      endDate,
      minIntensity,
      limit = 1000,
      page = 1
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (coreEmotion) filter.coreEmotion = coreEmotion;
    if (country) filter.country = country;
    if (region) filter.region = region;
    if (city) filter.city = city;
    if (minIntensity) filter.intensity = { $gte: parseFloat(minIntensity) };
    
    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Aggregate to get emotion points with clustering
    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: {
            coordinates: {
              $concat: [
                { $toString: { $round: ["$latitude", 2] } },
                ",",
                { $toString: { $round: ["$longitude", 2] } }
              ]
            },
            coreEmotion: "$coreEmotion",
            city: "$city",
            country: "$country"
          },
          coordinates: { $first: { latitude: "$latitude", longitude: "$longitude" } },
          coreEmotion: { $first: "$coreEmotion" },
          emotionTypes: { $addToSet: "$emotionTypes" },
          count: { $sum: 1 },
          avgIntensity: { $avg: "$intensity" },
          maxIntensity: { $max: "$intensity" },
          city: { $first: "$city" },
          country: { $first: "$country" },
          latestTimestamp: { $max: "$timestamp" },
          clusterId: {
            $concat: [
              { $ifNull: ["$city", "unknown"] },
              "-",
              "$coreEmotion",
              "-",
              { $dateToString: { format: "%Y-%m-%dT%H", date: "$timestamp" } }
            ]
          }
        }
      },
      {
        $project: {
          _id: 1,
          coordinates: 1,
          coreEmotion: 1,
          emotionTypes: { $reduce: { input: "$emotionTypes", initialValue: [], in: { $concatArrays: ["$$value", "$$this"] } } },
          count: 1,
          avgIntensity: { $round: ["$avgIntensity", 2] },
          maxIntensity: { $round: ["$maxIntensity", 2] },
          city: 1,
          country: 1,
          latestTimestamp: 1,
          clusterId: 1
        }
      },
      { $sort: { latestTimestamp: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ];

    const emotionPoints = await Emotion.aggregate(pipeline);
    const totalCount = await Emotion.countDocuments(filter);

    // Transform to match frontend model
    const transformedPoints = emotionPoints.map(point => ({
      _id: point._id,
      coordinates: [point.coordinates.longitude, point.coordinates.latitude],
      coreEmotion: point.coreEmotion,
      emotionTypes: [...new Set(point.emotionTypes)], // Remove duplicates
      count: point.count,
      avgIntensity: point.avgIntensity,
      maxIntensity: point.maxIntensity,
      city: point.city,
      country: point.country,
      latestTimestamp: point.latestTimestamp,
      clusterId: point.clusterId
    }));

    res.json({
      success: true,
      data: transformedPoints,
      count: transformedPoints.length,
      totalCount,
      filters: req.query,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching emotion data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion data',
      details: error.message
    });
  }
});

/**
 * GET /api/map/emotion-clusters
 * Fetch clustered emotion data for map visualization
 */
router.get('/emotion-clusters', async (req, res) => {
  try {
    const {
      coreEmotion,
      country,
      region,
      city,
      startDate,
      endDate,
      minIntensity,
      limit = 100
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (coreEmotion) filter.coreEmotion = coreEmotion;
    if (country) filter.country = country;
    if (region) filter.region = region;
    if (city) filter.city = city;
    if (minIntensity) filter.intensity = { $gte: parseFloat(minIntensity) };
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Advanced clustering algorithm
    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: {
            clusterId: {
              $concat: [
                { $ifNull: ["$city", "unknown"] },
                "-",
                "$coreEmotion",
                "-",
                { $dateToString: { format: "%Y-%m-%dT%H", date: "$timestamp" } }
              ]
            }
          },
          center: {
            latitude: { $avg: "$latitude" },
            longitude: { $avg: "$longitude" }
          },
          coreEmotion: { $first: "$coreEmotion" },
          emotionTypes: { $addToSet: "$emotionTypes" },
          count: { $sum: 1 },
          avgIntensity: { $avg: "$intensity" },
          city: { $first: "$city" },
          country: { $first: "$country" },
          latestTimestamp: { $max: "$timestamp" },
          size: { $sum: 1 } // Size based on count
        }
      },
      {
        $project: {
          clusterId: "$_id.clusterId",
          center: 1,
          coreEmotion: 1,
          emotionTypes: { $reduce: { input: "$emotionTypes", initialValue: [], in: { $concatArrays: ["$$value", "$$this"] } } },
          count: 1,
          avgIntensity: { $round: ["$avgIntensity", 2] },
          city: 1,
          country: 1,
          latestTimestamp: 1,
          size: { $multiply: ["$size", 2] } // Scale size for visualization
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ];

    const clusters = await Emotion.aggregate(pipeline);

    // Transform to match frontend model
    const transformedClusters = clusters.map(cluster => ({
      clusterId: cluster.clusterId,
      coordinates: [cluster.center.longitude, cluster.center.latitude],
      coreEmotion: cluster.coreEmotion,
      emotionTypes: [...new Set(cluster.emotionTypes)],
      count: cluster.count,
      avgIntensity: cluster.avgIntensity,
      city: cluster.city,
      country: cluster.country,
      latestTimestamp: cluster.latestTimestamp,
      size: cluster.size
    }));

    res.json({
      success: true,
      data: transformedClusters,
      count: transformedClusters.length,
      filters: req.query
    });

  } catch (error) {
    console.error('Error fetching emotion clusters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion clusters',
      details: error.message
    });
  }
});

/**
 * GET /api/map/stats
 * Fetch global emotion statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const {
      coreEmotion,
      country,
      region,
      city,
      startDate,
      endDate
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (coreEmotion) filter.coreEmotion = coreEmotion;
    if (country) filter.country = country;
    if (region) filter.region = region;
    if (city) filter.city = city;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Get global stats
    const globalStats = await Emotion.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEmotions: { $sum: 1 },
          avgIntensity: { $avg: "$intensity" },
          coreEmotionStats: {
            $push: {
              coreEmotion: "$coreEmotion",
              intensity: "$intensity"
            }
          }
        }
      }
    ]);

    // Get core emotion breakdown
    const coreEmotionBreakdown = await Emotion.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$coreEmotion",
          count: { $sum: 1 },
          avgIntensity: { $avg: "$intensity" }
        }
      },
      {
        $project: {
          coreEmotion: "$_id",
          count: 1,
          avgIntensity: { $round: ["$avgIntensity", 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Transform to match frontend model
    const stats = globalStats[0] || { totalEmotions: 0, avgIntensity: 0, coreEmotionStats: [] };
    
    const coreEmotionStatsMap = {};
    coreEmotionBreakdown.forEach(stat => {
      coreEmotionStatsMap[stat.coreEmotion] = {
        coreEmotion: stat.coreEmotion,
        count: stat.count,
        avgIntensity: stat.avgIntensity
      };
    });

    const response = {
      totalEmotions: stats.totalEmotions,
      avgIntensity: Math.round(stats.avgIntensity * 100) / 100,
      coreEmotionStats: coreEmotionStatsMap,
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: response,
      filters: req.query
    });

  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global stats',
      details: error.message
    });
  }
});

/**
 * GET /api/map/emotion-trends
 * Fetch emotion trends over time
 */
router.get('/emotion-trends', async (req, res) => {
  try {
    const {
      coreEmotion,
      country,
      region,
      city,
      startDate,
      endDate,
      timeGroup = 'day' // day, week, month
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (coreEmotion) filter.coreEmotion = coreEmotion;
    if (country) filter.country = country;
    if (region) filter.region = region;
    if (city) filter.city = city;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Determine date format based on timeGroup
    let dateFormat;
    switch (timeGroup) {
      case 'hour':
        dateFormat = "%Y-%m-%dT%H";
        break;
      case 'week':
        dateFormat = "%Y-W%U";
        break;
      case 'month':
        dateFormat = "%Y-%m";
        break;
      default: // day
        dateFormat = "%Y-%m-%d";
    }

    const trends = await Emotion.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: "$timestamp" } },
            coreEmotion: "$coreEmotion",
            city: "$city",
            country: "$country"
          },
          count: { $sum: 1 },
          avgIntensity: { $avg: "$intensity" }
        }
      },
      {
        $project: {
          date: "$_id.date",
          coreEmotion: "$_id.coreEmotion",
          city: "$_id.city",
          country: "$_id.country",
          count: 1,
          avgIntensity: { $round: ["$avgIntensity", 2] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json({
      success: true,
      data: trends,
      count: trends.length,
      timeGroup,
      filters: req.query
    });

  } catch (error) {
    console.error('Error fetching emotion trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion trends',
      details: error.message
    });
  }
});

/**
 * POST /api/map/submit-emotion
 * Submit user emotion to the global map
 */
router.post('/submit-emotion', authenticateToken, validateEmotionData, async (req, res) => {
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

    const [longitude, latitude] = coordinates;

    // Create new emotion entry
    const emotion = new Emotion({
      userId: req.user.id,
      latitude,
      longitude,
      coreEmotion,
      emotionTypes: Array.isArray(emotionTypes) ? emotionTypes : [emotionTypes],
      intensity: parseFloat(intensity),
      city,
      country,
      context,
      timestamp: new Date()
    });

    await emotion.save();

    // Emit real-time update via WebSocket
    if (req.app.get('io')) {
      req.app.get('io').emit('newEmotion', {
        type: 'newEmotion',
        data: {
          id: emotion._id,
          coordinates: [longitude, latitude],
          coreEmotion,
          emotionTypes: emotion.emotionTypes,
          intensity: emotion.intensity,
          city,
          country,
          timestamp: emotion.timestamp
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Emotion submitted successfully',
      data: {
        id: emotion._id,
        timestamp: emotion.timestamp
      }
    });

  } catch (error) {
    console.error('Error submitting emotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit emotion',
      details: error.message
    });
  }
});

/**
 * GET /api/map/heatmap
 * Get heatmap data for visualization
 */
router.get('/heatmap', async (req, res) => {
  try {
    const {
      coreEmotion,
      startDate,
      endDate,
      resolution = 0.1 // Grid resolution in degrees
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (coreEmotion) filter.coreEmotion = coreEmotion;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Generate heatmap data using grid aggregation
    const heatmapData = await Emotion.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            lat: { $round: [{ $divide: ["$latitude", resolution] }, 0] },
            lng: { $round: [{ $divide: ["$longitude", resolution] }, 0] }
          },
          count: { $sum: 1 },
          avgIntensity: { $avg: "$intensity" },
          dominantEmotion: { $first: "$coreEmotion" }
        }
      },
      {
        $project: {
          coordinates: [
            { $multiply: ["$_id.lng", resolution] },
            { $multiply: ["$_id.lat", resolution] }
          ],
          count: 1,
          avgIntensity: { $round: ["$avgIntensity", 2] },
          dominantEmotion: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: heatmapData,
      count: heatmapData.length,
      resolution: parseFloat(resolution),
      filters: req.query
    });

  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap data',
      details: error.message
    });
  }
});

/**
 * GET /api/map/insights
 * Get AI-generated insights for a region
 */
router.get('/insights', async (req, res) => {
  try {
    const {
      region,
      coreEmotion,
      startDate,
      endDate
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (region) {
      filter.$or = [
        { city: { $regex: region, $options: 'i' } },
        { country: { $regex: region, $options: 'i' } }
      ];
    }
    
    if (coreEmotion) filter.coreEmotion = coreEmotion;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Get regional statistics
    const regionalStats = await Emotion.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEmotions: { $sum: 1 },
          avgIntensity: { $avg: "$intensity" },
          emotionBreakdown: {
            $push: {
              coreEmotion: "$coreEmotion",
              intensity: "$intensity"
            }
          },
          recentTrend: {
            $push: {
              timestamp: "$timestamp",
              intensity: "$intensity"
            }
          }
        }
      }
    ]);

    if (regionalStats.length === 0) {
      return res.json({
        success: true,
        insight: `No emotion data available for ${region || 'this region'}.`
      });
    }

    const stats = regionalStats[0];
    
    // Calculate dominant emotion
    const emotionCounts = {};
    stats.emotionBreakdown.forEach(emotion => {
      emotionCounts[emotion.coreEmotion] = (emotionCounts[emotion.coreEmotion] || 0) + 1;
    });
    
    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    // Calculate recent trend
    const recentEmotions = stats.recentTrend
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    
    const recentAvgIntensity = recentEmotions.reduce((sum, e) => sum + e.intensity, 0) / recentEmotions.length;
    const trendDirection = recentAvgIntensity > stats.avgIntensity ? 'increasing' : 'decreasing';

    // Generate AI insight
    const insight = generateRegionalInsight({
      region,
      totalEmotions: stats.totalEmotions,
      avgIntensity: Math.round(stats.avgIntensity * 100) / 100,
      dominantEmotion,
      trendDirection,
      recentAvgIntensity: Math.round(recentAvgIntensity * 100) / 100
    });

    res.json({
      success: true,
      insight,
      data: {
        region,
        totalEmotions: stats.totalEmotions,
        avgIntensity: stats.avgIntensity,
        dominantEmotion,
        trendDirection,
        recentAvgIntensity
      }
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
      details: error.message
    });
  }
});

/**
 * GET /api/map/predictions
 * Get emotion predictions for a region
 */
router.get('/predictions', async (req, res) => {
  try {
    const {
      region,
      hoursAhead = 24
    } = req.query;

    // Build filter query for historical data
    const filter = {};
    
    if (region) {
      filter.$or = [
        { city: { $regex: region, $options: 'i' } },
        { country: { $regex: region, $options: 'i' } }
      ];
    }

    // Get historical data for prediction
    const historicalData = await Emotion.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            hour: { $hour: "$timestamp" },
            dayOfWeek: { $dayOfWeek: "$timestamp" }
          },
          avgIntensity: { $avg: "$intensity" },
          emotionCount: { $sum: 1 },
          dominantEmotion: { $first: "$coreEmotion" }
        }
      },
      { $sort: { "_id.hour": 1, "_id.dayOfWeek": 1 } }
    ]);

    // Simple prediction algorithm (can be enhanced with ML)
    const predictions = generatePredictions(historicalData, parseInt(hoursAhead));

    res.json({
      success: true,
      data: {
        region,
        predictions,
        hoursAhead: parseInt(hoursAhead),
        confidence: 0.75 // Placeholder confidence score
      }
    });

  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate predictions',
      details: error.message
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate AI insight for a region
 */
function generateRegionalInsight(data) {
  const { region, totalEmotions, avgIntensity, dominantEmotion, trendDirection, recentAvgIntensity } = data;
  
  const regionName = region || 'this region';
  const intensityLevel = avgIntensity >= 4 ? 'high' : avgIntensity >= 2.5 ? 'moderate' : 'low';
  const trendDescription = trendDirection === 'increasing' ? 'rising' : 'declining';
  
  return `${regionName} shows ${intensityLevel} emotional activity with ${totalEmotions} recorded emotions. The dominant emotion is ${dominantEmotion} with an average intensity of ${avgIntensity}/5. Recent trends indicate ${trendDescription} emotional intensity (${recentAvgIntensity}/5). This suggests ${getEmotionContext(dominantEmotion, avgIntensity)}.`;
}

/**
 * Get emotional context based on dominant emotion and intensity
 */
function getEmotionContext(emotion, intensity) {
  const contexts = {
    joy: intensity >= 4 ? 'high levels of happiness and positive energy' : 'moderate contentment',
    trust: intensity >= 4 ? 'strong feelings of security and community' : 'general sense of safety',
    fear: intensity >= 4 ? 'heightened anxiety and concern' : 'mild apprehension',
    surprise: intensity >= 4 ? 'significant unexpected events or changes' : 'moderate curiosity',
    sadness: intensity >= 4 ? 'collective grief or disappointment' : 'melancholy mood',
    disgust: intensity >= 4 ? 'strong disapproval or aversion' : 'mild dissatisfaction',
    anger: intensity >= 4 ? 'frustration or collective outrage' : 'mild irritation',
    anticipation: intensity >= 4 ? 'excitement about future events' : 'moderate hopefulness'
  };
  
  return contexts[emotion] || 'mixed emotional states';
}

/**
 * Generate predictions based on historical data
 */
function generatePredictions(historicalData, hoursAhead) {
  const predictions = [];
  const now = new Date();
  
  for (let i = 1; i <= hoursAhead; i++) {
    const futureTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
    const hour = futureTime.getHours();
    const dayOfWeek = futureTime.getDay();
    
    // Find matching historical data
    const matchingData = historicalData.find(data => 
      data._id.hour === hour && data._id.dayOfWeek === dayOfWeek
    );
    
    if (matchingData) {
      predictions.push({
        timestamp: futureTime.toISOString(),
        predictedIntensity: Math.round(matchingData.avgIntensity * 100) / 100,
        predictedEmotion: matchingData.dominantEmotion,
        confidence: 0.8
      });
    } else {
      // Fallback prediction
      const avgIntensity = historicalData.reduce((sum, data) => sum + data.avgIntensity, 0) / historicalData.length;
      predictions.push({
        timestamp: futureTime.toISOString(),
        predictedIntensity: Math.round(avgIntensity * 100) / 100,
        predictedEmotion: 'neutral',
        confidence: 0.5
      });
    }
  }
  
  return predictions;
}

module.exports = router; 