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
 * GET /api/map/insights - FIXED VERSION
 * Get AI-generated insights for a region
 */
router.get('/insights', async (req, res) => {
  try {
    let { region, coreEmotion, startDate, endDate } = req.query;

    // ✅ CRITICAL FIX: Ensure region is a string
    if (!region) {
      return res.status(400).json({
        success: false,
        error: 'Region parameter is required'
      });
    }

    // ✅ ENSURE IT'S A STRING AND CLEAN IT
    region = String(region).trim();
    if (region.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Region parameter cannot be empty'
      });
    }

    console.log(`🔍 Searching for region: "${region}" (type: ${typeof region})`);

    // Build filter query with SAFE regex (robust version)
    const filter = {};
    const regionParts = region.split(',');
    const cityPart = regionParts[0]?.trim();
    const countryPart = regionParts[1]?.trim();
    const orQuery = [];
    // Always add the full region string
    if (region && region.length > 0) {
      orQuery.push({ city: { $regex: region, $options: 'i' } });
      orQuery.push({ country: { $regex: region, $options: 'i' } });
    }
    // Add city part if present and non-empty
    if (cityPart && cityPart.length > 0 && cityPart !== region) {
      orQuery.push({ city: { $regex: cityPart, $options: 'i' } });
      orQuery.push({ country: { $regex: cityPart, $options: 'i' } });
    }
    // Add country part if present and non-empty
    if (countryPart && countryPart.length > 0 && countryPart !== region) {
      orQuery.push({ country: { $regex: countryPart, $options: 'i' } });
    }
    // Add just country/city if region has a comma
    if (region.includes(',')) {
      const justCountry = region.replace(/^.*?,\s*/, '');
      if (justCountry && justCountry.length > 0 && justCountry !== region) {
        orQuery.push({ country: { $regex: justCountry, $options: 'i' } });
      }
      const justCity = region.replace(/,\s*.*$/, '');
      if (justCity && justCity.length > 0 && justCity !== region) {
        orQuery.push({ city: { $regex: justCity, $options: 'i' } });
      }
    }
    // Fallback: if orQuery is empty, just match public
    if (orQuery.length === 0) {
      orQuery.push({ country: { $exists: true } });
    }
    filter.$or = orQuery;

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
        insight: `No emotion data available for ${region}.`
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

module.exports = router;