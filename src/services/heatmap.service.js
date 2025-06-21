import config from '../config/index.js';
import { getEmotionColor } from '../constants/emotions.js';
import Mood from '../models/mood.model.js';
import cacheService from '../utils/cache.js';
import logger from '../utils/logger.js';

class HeatmapService {
  async getGlobalHeatmap(options = {}) {
    const {
      timeRange = '24h',
      resolution = 'city',
      emotion = null,
      minIntensity = 1,
      maxIntensity = 5
    } = options;

    const cacheKey = `heatmap:${timeRange}:${resolution}:${emotion}:${minIntensity}-${maxIntensity}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Heatmap cache hit: ${cacheKey}`);
        return cached;
      }

      const timeFilter = this.getTimeFilter(timeRange);
      const matchFilter = {
        ...timeFilter,
        intensity: { $gte: minIntensity, $lte: maxIntensity }
      };

      if (emotion) {
        matchFilter.emotion = emotion;
      }

      const pipeline = this.buildHeatmapPipeline(matchFilter, resolution);
      const rawResult = await Mood.aggregate(pipeline);
      
      const heatmapData = this.processHeatmapData(rawResult, resolution);
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, heatmapData, config.CACHE_TTL);
      
      logger.info(`Heatmap generated: ${rawResult.length} locations`);
      return heatmapData;
    } catch (error) {
      logger.error('Error generating heatmap:', error);
      throw error;
    }
  }

  buildHeatmapPipeline(matchFilter, resolution) {
    const groupBy = this.getGroupByField(resolution);
    
    return [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            emotion: '$emotion',
            ...groupBy
          },
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          coordinates: { $first: '$location.coordinates' }
        }
      },
      {
        $group: {
          _id: {
            city: '$_id.city',
            region: '$_id.region',
            country: '$_id.country',
            coordinates: '$coordinates'
          },
          emotions: {
            $push: {
              emotion: '$_id.emotion',
              count: '$count',
              avgIntensity: '$avgIntensity'
            }
          },
          totalCount: { $sum: '$count' },
          totalIntensity: { $sum: { $multiply: ['$count', '$avgIntensity'] } }
        }
      },
      {
        $addFields: {
          avgIntensity: { $divide: ['$totalIntensity', '$totalCount'] },
          dominantEmotion: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$emotions',
                  as: 'emotion',
                  cond: {
                    $eq: [
                      '$emotion.count',
                      { $max: '$emotions.count' }
                    ]
                  }
                }
              },
              0
            ]
          }
        }
      },
      { $match: { totalCount: { $gte: 2 } } }, // Minimum 2 moods for privacy
      { $sort: { totalCount: -1 } },
      { $limit: 1000 } // Limit for performance
    ];
  }

  getGroupByField(resolution) {
    switch (resolution) {
      case 'country':
        return {
          country: '$location.country',
          coordinates: '$location.coordinates'
        };
      case 'region':
        return {
          region: '$location.region',
          country: '$location.country',
          coordinates: '$location.coordinates'
        };
      case 'city':
      default:
        return {
          city: '$location.city',
          region: '$location.region',
          country: '$location.country',
          coordinates: '$location.coordinates'
        };
    }
  }

  processHeatmapData(rawData, resolution) {
    return rawData.map(location => {
      const dominantEmotion = location.dominantEmotion;
      
      return {
        id: this.generateLocationId(location._id, resolution),
        coordinates: this.sanitizeCoordinates(location._id.coordinates),
        location: {
          city: location._id.city,
          region: location._id.region,
          country: location._id.country
        },
        dominantEmotion: {
          emotion: dominantEmotion.emotion,
          count: dominantEmotion.count,
          intensity: Math.round(dominantEmotion.avgIntensity * 100) / 100
        },
        color: getEmotionColor(dominantEmotion.emotion),
        intensity: this.calculateHeatmapIntensity(location.totalCount, dominantEmotion.avgIntensity),
        totalMoods: location.totalCount,
        avgIntensity: Math.round(location.avgIntensity * 100) / 100,
        emotionBreakdown: location.emotions.map(e => ({
          emotion: e.emotion,
          count: e.count,
          percentage: Math.round((e.count / location.totalCount) * 100),
          avgIntensity: Math.round(e.avgIntensity * 100) / 100,
          color: getEmotionColor(e.emotion)
        })).sort((a, b) => b.count - a.count)
      };
    });
  }

  generateLocationId(locationData, resolution) {
    switch (resolution) {
      case 'country':
        return `${locationData.country}`.replace(/\s+/g, '_').toLowerCase();
      case 'region':
        return `${locationData.country}_${locationData.region}`.replace(/\s+/g, '_').toLowerCase();
      case 'city':
      default:
        return `${locationData.country}_${locationData.region}_${locationData.city}`.replace(/\s+/g, '_').toLowerCase();
    }
  }

  sanitizeCoordinates(coordinates) {
    if (!coordinates || coordinates.length !== 2) return [0, 0];
    
    // Reduce precision for privacy
    return [
      Math.round(coordinates[0] / config.LOCATION_PRECISION) * config.LOCATION_PRECISION,
      Math.round(coordinates[1] / config.LOCATION_PRECISION) * config.LOCATION_PRECISION
    ];
  }

  calculateHeatmapIntensity(count, avgIntensity) {
    // Normalize intensity based on count and average intensity
    const countWeight = Math.min(count / 10, 1); // Cap at 10 moods
    const intensityWeight = avgIntensity / 5; // Scale 1-5 to 0-1
    
    return Math.round((countWeight * 0.6 + intensityWeight * 0.4) * 100) / 100;
  }

  getTimeFilter(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { createdAt: { $gte: startDate } };
  }

  async getHeatmapStats(timeRange = '24h') {
    const cacheKey = `heatmap_stats:${timeRange}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const timeFilter = this.getTimeFilter(timeRange);
      
      const pipeline = [
        { $match: timeFilter },
        {
          $facet: {
            totalStats: [
              {
                $group: {
                  _id: null,
                  totalMoods: { $sum: 1 },
                  uniqueLocations: { $addToSet: { city: '$location.city', country: '$location.country' } },
                  avgIntensity: { $avg: '$intensity' }
                }
              }
            ],
            emotionStats: [
              {
                $group: {
                  _id: '$emotion',
                  count: { $sum: 1 },
                  avgIntensity: { $avg: '$intensity' }
                }
              },
              { $sort: { count: -1 } }
            ],
            locationStats: [
              {
                $group: {
                  _id: '$location.country',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ];

      const [result] = await Mood.aggregate(pipeline);
      
      const stats = {
        total: result.totalStats[0] || { totalMoods: 0, uniqueLocations: [], avgIntensity: 0 },
        emotions: result.emotionStats.map(item => ({
          emotion: item._id,
          count: item.count,
          avgIntensity: Math.round(item.avgIntensity * 100) / 100,
          color: getEmotionColor(item._id)
        })),
        topCountries: result.locationStats,
        timeRange,
        lastUpdated: new Date()
      };

      await cacheService.set(cacheKey, stats, 300); // 5 minutes cache
      return stats;
    } catch (error) {
      logger.error('Error getting heatmap stats:', error);
      throw error;
    }
  }
}

export default new HeatmapService();
