const { Emotion } = require('../models/Emotion');

class AnalyticsService {
  constructor() {
    this.clusteringAlgorithms = {
      kmeans: this.kMeansClustering,
      dbscan: this.dbscanClustering,
      hierarchical: this.hierarchicalClustering
    };
  }

  /**
   * Advanced filtering with multiple criteria
   */
  async getFilteredEmotions(filters) {
    const {
      coreEmotion,
      emotions,
      intensityRange,
      dateRange,
      location,
      radius,
      timeOfDay,
      dayOfWeek,
      weather,
      events,
      sentiment,
      clustering,
      limit = 1000
    } = filters;

    // Build complex filter query
    const filter = {};

    // Core emotion filter
    if (coreEmotion) {
      filter.coreEmotion = coreEmotion;
    }

    // Multiple emotions filter
    if (emotions && emotions.length > 0) {
      filter.coreEmotion = { $in: emotions };
    }

    // Intensity range filter
    if (intensityRange) {
      filter.intensity = {
        $gte: intensityRange.min || 0,
        $lte: intensityRange.max || 5
      };
    }

    // Date range filter
    if (dateRange) {
      filter.timestamp = {};
      if (dateRange.start) filter.timestamp.$gte = new Date(dateRange.start);
      if (dateRange.end) filter.timestamp.$lte = new Date(dateRange.end);
    }

    // Location-based filter with radius
    if (location && radius) {
      const { latitude, longitude } = location;
      const radiusInDegrees = radius / 111; // Approximate conversion

      filter.$and = [
        { latitude: { $gte: latitude - radiusInDegrees, $lte: latitude + radiusInDegrees } },
        { longitude: { $gte: longitude - radiusInDegrees, $lte: longitude + radiusInDegrees } }
      ];
    }

    // Time-based filters
    if (timeOfDay || dayOfWeek) {
      filter.$expr = {};
      
      if (timeOfDay) {
        filter.$expr.$and = filter.$expr.$and || [];
        filter.$expr.$and.push({
          $in: [{ $hour: "$timestamp" }, timeOfDay]
        });
      }
      
      if (dayOfWeek) {
        filter.$expr.$and = filter.$expr.$and || [];
        filter.$expr.$and.push({
          $in: [{ $dayOfWeek: "$timestamp" }, dayOfWeek]
        });
      }
    }

    // Weather and events context (if available)
    if (weather) {
      filter.weather = weather;
    }

    if (events) {
      filter.events = { $in: events };
    }

    // Sentiment analysis filter
    if (sentiment) {
      filter.sentiment = sentiment;
    }

    // Execute query
    let emotionData = await Emotion.find(filter).limit(limit);

    // Apply clustering if requested
    if (clustering && clustering.enabled) {
      emotionData = await this.applyClustering(emotionData, clustering);
    }

    return emotionData;
  }

  /**
   * Advanced trend analysis
   */
  async getTrendAnalysis(options) {
    const {
      timeRange,
      granularity,
      emotions,
      locations,
      groupBy
    } = options;

    const pipeline = [
      {
        $match: {
          timestamp: {
            $gte: new Date(Date.now() - timeRange * 60 * 60 * 1000)
          }
        }
      }
    ];

    // Add emotion filter
    if (emotions && emotions.length > 0) {
      pipeline[0].$match.coreEmotion = { $in: emotions };
    }

    // Add location filter
    if (locations && locations.length > 0) {
      pipeline[0].$match.$or = locations.map(loc => ({
        $and: [
          { latitude: { $gte: loc.lat - 0.1, $lte: loc.lat + 0.1 } },
          { longitude: { $gte: loc.lng - 0.1, $lte: loc.lng + 0.1 } }
        ]
      }));
    }

    // Group by time granularity
    const timeGroup = this.getTimeGrouping(granularity);
    pipeline.push({
      $group: {
        _id: {
          time: timeGroup,
          emotion: "$coreEmotion",
          ...(groupBy && { [groupBy]: `$${groupBy}` })
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: "$intensity" },
        maxIntensity: { $max: "$intensity" },
        minIntensity: { $min: "$intensity" }
      }
    });

    pipeline.push({ $sort: { "_id.time": 1 } });

    return await Emotion.aggregate(pipeline);
  }

  /**
   * Predictive analytics
   */
  async getPredictions(options) {
    const {
      region,
      timeHorizon,
      confidence,
      factors
    } = options;

    // Get historical data
    const historicalData = await this.getHistoricalData(region, timeHorizon * 2);

    // Apply machine learning prediction
    const predictions = await this.applyMLPrediction(historicalData, {
      horizon: timeHorizon,
      confidence,
      factors
    });

    return predictions;
  }

  /**
   * Advanced clustering analysis
   */
  async getClusteringAnalysis(options) {
    const {
      algorithm = 'kmeans',
      k = 5,
      minPoints = 3,
      maxDistance = 0.1
    } = options;

    // Get emotion data
    const emotions = await Emotion.find({
      latitude: { $exists: true },
      longitude: { $exists: true }
    }).limit(1000);

    // Apply clustering algorithm
    const clusters = await this.clusteringAlgorithms[algorithm](emotions, {
      k,
      minPoints,
      maxDistance
    });

    return clusters;
  }

  /**
   * Sentiment analysis
   */
  async getSentimentAnalysis(options) {
    const {
      timeRange,
      emotions,
      locations
    } = options;

    const pipeline = [
      {
        $match: {
          timestamp: {
            $gte: new Date(Date.now() - timeRange * 60 * 60 * 1000)
          }
        }
      }
    ];

    if (emotions) {
      pipeline[0].$match.coreEmotion = { $in: emotions };
    }

    if (locations) {
      pipeline[0].$match.$or = locations.map(loc => ({
        $and: [
          { latitude: { $gte: loc.lat - 0.1, $lte: loc.lat + 0.1 } },
          { longitude: { $gte: loc.lng - 0.1, $lte: loc.lng + 0.1 } }
        ]
      }));
    }

    pipeline.push({
      $group: {
        _id: "$coreEmotion",
        count: { $sum: 1 },
        avgIntensity: { $avg: "$intensity" },
        sentiment: {
          $avg: {
            $cond: {
              if: { $in: ["$coreEmotion", ["joy", "trust", "anticipation"]] },
              then: 1,
              else: {
                $cond: {
                  if: { $in: ["$coreEmotion", ["fear", "sadness", "disgust", "anger"]] },
                  then: -1,
                  else: 0
                }
              }
            }
          }
        }
      }
    });

    return await Emotion.aggregate(pipeline);
  }

  /**
   * Geographic heatmap analysis
   */
  async getHeatmapData(options) {
    const {
      bounds,
      resolution = 0.1,
      emotions,
      timeRange
    } = options;

    const pipeline = [
      {
        $match: {
          latitude: { $gte: bounds.south, $lte: bounds.north },
          longitude: { $gte: bounds.west, $lte: bounds.east }
        }
      }
    ];

    if (emotions) {
      pipeline[0].$match.coreEmotion = { $in: emotions };
    }

    if (timeRange) {
      pipeline[0].$match.timestamp = {
        $gte: new Date(Date.now() - timeRange * 60 * 60 * 1000)
      };
    }

    pipeline.push({
      $group: {
        _id: {
          lat: { $round: [{ $divide: ["$latitude", resolution] }, 0] },
          lng: { $round: [{ $divide: ["$longitude", resolution] }, 0] }
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: "$intensity" },
        dominantEmotion: { $first: "$coreEmotion" }
      }
    });

    pipeline.push({
      $project: {
        coordinates: [
          { $multiply: ["$_id.lng", resolution] },
          { $multiply: ["$_id.lat", resolution] }
        ],
        count: 1,
        avgIntensity: { $round: ["$avgIntensity", 2] },
        dominantEmotion: 1
      }
    });

    return await Emotion.aggregate(pipeline);
  }

  /**
   * Comparative analysis between regions
   */
  async getComparativeAnalysis(regions) {
    const results = {};

    for (const region of regions) {
      const { name, bounds, timeRange } = region;

      const pipeline = [
        {
          $match: {
            latitude: { $gte: bounds.south, $lte: bounds.north },
            longitude: { $gte: bounds.west, $lte: bounds.east },
            timestamp: {
              $gte: new Date(Date.now() - timeRange * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalEmotions: { $sum: 1 },
            avgIntensity: { $avg: "$intensity" },
            emotionBreakdown: {
              $push: {
                emotion: "$coreEmotion",
                intensity: "$intensity"
              }
            }
          }
        }
      ];

      const result = await Emotion.aggregate(pipeline);
      if (result.length > 0) {
        const data = result[0];
        
        // Calculate dominant emotion
        const emotionCounts = {};
        data.emotionBreakdown.forEach(item => {
          emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
        });
        
        const dominantEmotion = Object.entries(emotionCounts)
          .sort(([,a], [,b]) => b - a)[0][0];

        results[name] = {
          totalEmotions: data.totalEmotions,
          avgIntensity: Math.round(data.avgIntensity * 100) / 100,
          dominantEmotion,
          emotionBreakdown: emotionCounts
        };
      }
    }

    return results;
  }

  /**
   * Real-time analytics dashboard
   */
  async getDashboardData() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $facet: {
          last24h: [
            { $match: { timestamp: { $gte: last24h } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                avgIntensity: { $avg: "$intensity" },
                emotions: { $addToSet: "$coreEmotion" }
              }
            }
          ],
          last7d: [
            { $match: { timestamp: { $gte: last7d } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                avgIntensity: { $avg: "$intensity" },
                emotions: { $addToSet: "$coreEmotion" }
              }
            }
          ],
          topRegions: [
            { $match: { timestamp: { $gte: last24h } } },
            {
              $group: {
                _id: { city: "$city", country: "$country" },
                count: { $sum: 1 },
                avgIntensity: { $avg: "$intensity" }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          emotionTrends: [
            { $match: { timestamp: { $gte: last7d } } },
            {
              $group: {
                _id: {
                  date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                  emotion: "$coreEmotion"
                },
                count: { $sum: 1 },
                avgIntensity: { $avg: "$intensity" }
              }
            },
            { $sort: { "_id.date": 1 } }
          ]
        }
      }
    ];

    const results = await Emotion.aggregate(pipeline);
    return results[0];
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Apply clustering algorithm
   */
  async applyClustering(emotions, options) {
    const { algorithm = 'kmeans', ...params } = options;
    
    if (this.clusteringAlgorithms[algorithm]) {
      return await this.clusteringAlgorithms[algorithm](emotions, params);
    }
    
    return emotions;
  }

  /**
   * K-means clustering
   */
  async kMeansClustering(emotions, { k = 5 }) {
    // Simple k-means implementation
    const clusters = [];
    const centroids = this.initializeCentroids(emotions, k);

    for (let iteration = 0; iteration < 10; iteration++) {
      // Assign points to nearest centroid
      const assignments = emotions.map(emotion => {
        const distances = centroids.map(centroid => 
          this.calculateDistance(emotion, centroid)
        );
        return distances.indexOf(Math.min(...distances));
      });

      // Update centroids
      for (let i = 0; i < k; i++) {
        const clusterPoints = emotions.filter((_, index) => assignments[index] === i);
        if (clusterPoints.length > 0) {
          centroids[i] = this.calculateCentroid(clusterPoints);
        }
      }
    }

    // Group emotions by cluster
    for (let i = 0; i < k; i++) {
      const clusterEmotions = emotions.filter((_, index) => 
        this.calculateDistance(emotions[index], centroids[i]) === 
        Math.min(...centroids.map(c => this.calculateDistance(emotions[index], c)))
      );
      
      if (clusterEmotions.length > 0) {
        clusters.push({
          id: i,
          center: centroids[i],
          emotions: clusterEmotions,
          count: clusterEmotions.length
        });
      }
    }

    return clusters;
  }

  /**
   * DBSCAN clustering
   */
  async dbscanClustering(emotions, { minPoints = 3, maxDistance = 0.1 }) {
    const clusters = [];
    const visited = new Set();

    for (const emotion of emotions) {
      if (visited.has(emotion._id.toString())) continue;

      const neighbors = this.findNeighbors(emotion, emotions, maxDistance);
      
      if (neighbors.length >= minPoints) {
        const cluster = this.expandCluster(emotion, neighbors, emotions, visited, maxDistance, minPoints);
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Hierarchical clustering
   */
  async hierarchicalClustering(emotions, { maxDistance = 0.1 }) {
    // Simple hierarchical clustering implementation
    const clusters = emotions.map(emotion => ({
      id: emotion._id.toString(),
      emotions: [emotion],
      center: { latitude: emotion.latitude, longitude: emotion.longitude }
    }));

    while (clusters.length > 1) {
      let minDistance = Infinity;
      let cluster1 = null;
      let cluster2 = null;

      // Find closest clusters
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.calculateDistance(clusters[i].center, clusters[j].center);
          if (distance < minDistance) {
            minDistance = distance;
            cluster1 = i;
            cluster2 = j;
          }
        }
      }

      if (minDistance > maxDistance) break;

      // Merge clusters
      const mergedCluster = {
        id: `${clusters[cluster1].id}-${clusters[cluster2].id}`,
        emotions: [...clusters[cluster1].emotions, ...clusters[cluster2].emotions],
        center: this.calculateCentroid([clusters[cluster1].center, clusters[cluster2].center])
      };

      clusters.splice(Math.max(cluster1, cluster2), 1);
      clusters.splice(Math.min(cluster1, cluster2), 1);
      clusters.push(mergedCluster);
    }

    return clusters;
  }

  /**
   * Get time grouping expression
   */
  getTimeGrouping(granularity) {
    switch (granularity) {
      case 'hour':
        return { $dateToString: { format: "%Y-%m-%dT%H", date: "$timestamp" } };
      case 'day':
        return { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
      case 'week':
        return { $dateToString: { format: "%Y-W%U", date: "$timestamp" } };
      case 'month':
        return { $dateToString: { format: "%Y-%m", date: "$timestamp" } };
      default:
        return { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const lat1 = point1.latitude || point1.lat;
    const lng1 = point1.longitude || point1.lng;
    const lat2 = point2.latitude || point2.lat;
    const lng2 = point2.longitude || point2.lng;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calculate centroid of points
   */
  calculateCentroid(points) {
    const totalLat = points.reduce((sum, point) => sum + (point.latitude || point.lat), 0);
    const totalLng = points.reduce((sum, point) => sum + (point.longitude || point.lng), 0);
    
    return {
      latitude: totalLat / points.length,
      longitude: totalLng / points.length
    };
  }

  /**
   * Initialize centroids for k-means
   */
  initializeCentroids(emotions, k) {
    const centroids = [];
    const usedIndices = new Set();

    for (let i = 0; i < k; i++) {
      let index;
      do {
        index = Math.floor(Math.random() * emotions.length);
      } while (usedIndices.has(index));
      
      usedIndices.add(index);
      centroids.push({
        latitude: emotions[index].latitude,
        longitude: emotions[index].longitude
      });
    }

    return centroids;
  }

  /**
   * Find neighbors for DBSCAN
   */
  findNeighbors(point, allPoints, maxDistance) {
    return allPoints.filter(otherPoint => 
      this.calculateDistance(point, otherPoint) <= maxDistance
    );
  }

  /**
   * Expand cluster for DBSCAN
   */
  expandCluster(point, neighbors, allPoints, visited, maxDistance, minPoints) {
    const cluster = {
      id: point._id.toString(),
      emotions: [point],
      center: { latitude: point.latitude, longitude: point.longitude }
    };

    visited.add(point._id.toString());

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor._id.toString())) {
        visited.add(neighbor._id.toString());
        cluster.emotions.push(neighbor);

        const neighborNeighbors = this.findNeighbors(neighbor, allPoints, maxDistance);
        if (neighborNeighbors.length >= minPoints) {
          neighbors.push(...neighborNeighbors);
        }
      }
    }

    cluster.center = this.calculateCentroid(cluster.emotions);
    cluster.count = cluster.emotions.length;

    return cluster;
  }

  /**
   * Get historical data for predictions
   */
  async getHistoricalData(region, hours) {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const filter = {};
    if (region) {
      filter.$or = [
        { city: { $regex: region, $options: 'i' } },
        { country: { $regex: region, $options: 'i' } }
      ];
    }
    filter.timestamp = { $gte: startTime };

    return await Emotion.find(filter).sort({ timestamp: 1 });
  }

  /**
   * Apply machine learning prediction
   */
  async applyMLPrediction(historicalData, options) {
    // Simple prediction algorithm (can be enhanced with actual ML)
    const { horizon, confidence, factors } = options;
    
    const predictions = [];
    const now = new Date();

    // Calculate average patterns
    const hourlyPatterns = {};
    const dailyPatterns = {};

    historicalData.forEach(emotion => {
      const hour = emotion.timestamp.getHours();
      const day = emotion.timestamp.getDay();
      
      if (!hourlyPatterns[hour]) hourlyPatterns[hour] = [];
      if (!dailyPatterns[day]) dailyPatterns[day] = [];
      
      hourlyPatterns[hour].push(emotion.intensity);
      dailyPatterns[day].push(emotion.intensity);
    });

    // Generate predictions
    for (let i = 1; i <= horizon; i++) {
      const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = futureTime.getHours();
      const day = futureTime.getDay();

      const avgIntensity = hourlyPatterns[hour] && dailyPatterns[day] 
        ? (hourlyPatterns[hour].reduce((a, b) => a + b, 0) / hourlyPatterns[hour].length +
           dailyPatterns[day].reduce((a, b) => a + b, 0) / dailyPatterns[day].length) / 2
        : 3.0;

      predictions.push({
        timestamp: futureTime.toISOString(),
        predictedIntensity: Math.round(avgIntensity * 100) / 100,
        predictedEmotion: this.predictDominantEmotion(historicalData),
        confidence: confidence || 0.7
      });
    }

    return predictions;
  }

  /**
   * Predict dominant emotion
   */
  predictDominantEmotion(historicalData) {
    const emotionCounts = {};
    historicalData.forEach(emotion => {
      emotionCounts[emotion.coreEmotion] = (emotionCounts[emotion.coreEmotion] || 0) + 1;
    });

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    return dominantEmotion;
  }
}

module.exports = AnalyticsService; 