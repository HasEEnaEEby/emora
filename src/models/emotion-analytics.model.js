// src/models/emotion-analytics.model.js
import mongoose from 'mongoose';
import { CORE_EMOTIONS, EMOTION_NAMES } from '../constants/emotions.js';

const EmotionAnalyticsSchema = new mongoose.Schema({
  // Time-based aggregation
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  hour: {
    type: Number,
    min: 0,
    max: 23,
    index: true
  },
  
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    index: true
  },
  
  week: {
    type: Number,
    min: 1,
    max: 53,
    index: true
  },
  
  month: {
    type: Number,
    min: 1,
    max: 12,
    index: true
  },
  
  year: {
    type: Number,
    index: true
  },

  // Location-based aggregation
  location: {
    country: {
      type: String,
      index: true
    },
    region: {
      type: String,
      index: true
    },
    city: {
      type: String,
      index: true
    },
    continent: {
      type: String,
      index: true
    },
    timezone: {
      type: String,
      index: true
    },
    geohash: {
      type: String,
      index: true
    }
  },

  // Global statistics
  globalStats: {
    totalEntries: {
      type: Number,
      default: 0,
      min: 0
    },
    
    uniqueUsers: {
      type: Number,
      default: 0,
      min: 0
    },
    
    averageIntensity: {
      type: Number,
      min: 0.0,
      max: 1.0,
      default: 0.5
    },
    
    // Emotion distribution
    emotionDistribution: {
      type: Map,
      of: {
        count: {
          type: Number,
          default: 0,
          min: 0
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100
        },
        averageIntensity: {
          type: Number,
          min: 0.0,
          max: 1.0
        }
      },
      default: new Map()
    },
    
    // Core emotion distribution (Inside Out style)
    coreEmotionDistribution: {
      type: Map,
      of: {
        count: {
          type: Number,
          default: 0,
          min: 0
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100
        },
        averageIntensity: {
          type: Number,
          min: 0.0,
          max: 1.0
        },
        subEmotions: [String]
      },
      default: new Map()
    },
    
    dominantEmotion: {
      type: String,
      enum: EMOTION_NAMES
    },
    
    dominantCoreEmotion: {
      type: String,
      enum: CORE_EMOTIONS
    }
  },

  // Context-based analytics
  contextAnalytics: {
    timeOfDay: {
      type: Map,
      of: {
        count: Number,
        dominantEmotion: String,
        averageIntensity: Number
      },
      default: new Map()
    },
    
    weather: {
      type: Map,
      of: {
        count: Number,
        dominantEmotion: String,
        averageIntensity: Number
      },
      default: new Map()
    },
    
    socialContext: {
      type: Map,
      of: {
        count: Number,
        dominantEmotion: String,
        averageIntensity: Number
      },
      default: new Map()
    },
    
    activity: {
      type: Map,
      of: {
        count: Number,
        dominantEmotion: String,
        averageIntensity: Number
      },
      default: new Map()
    }
  },

  // Trend analysis
  trendAnalysis: {
    emotionTrends: {
      type: Map,
      of: {
        trend: {
          type: String,
          enum: ['increasing', 'decreasing', 'stable', 'volatile']
        },
        changePercentage: Number,
        previousPeriodCount: Number,
        currentPeriodCount: Number
      },
      default: new Map()
    },
    
    intensityTrend: {
      trend: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable', 'volatile']
      },
      changePercentage: Number,
      previousAverage: Number,
      currentAverage: Number
    },
    
    popularityShifts: [{
      emotion: String,
      rankChange: Number,
      previousRank: Number,
      currentRank: Number
    }]
  },

  // Advanced insights
  insights: {
    patterns: [{
      type: {
        type: String,
        enum: ['temporal', 'location', 'weather', 'social', 'activity']
      },
      description: String,
      confidence: {
        type: Number,
        min: 0.0,
        max: 1.0
      },
      supportingData: mongoose.Schema.Types.Mixed
    }],
    
    anomalies: [{
      type: {
        type: String,
        enum: ['spike', 'drop', 'unusual_distribution', 'geographic_anomaly']
      },
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      detectedAt: {
        type: Date,
        default: Date.now
      },
      data: mongoose.Schema.Types.Mixed
    }],
    
    correlations: [{
      factor1: String,
      factor2: String,
      correlation: {
        type: Number,
        min: -1.0,
        max: 1.0
      },
      significance: {
        type: String,
        enum: ['weak', 'moderate', 'strong']
      }
    }]
  },

  // User behavior analytics
  userBehavior: {
    sessionPatterns: {
      averageSessionLength: Number,
      peakActiveHours: [Number],
      commonDevices: [String],
      averageEntriesPerSession: Number
    },
    
    engagementMetrics: {
      dailyActiveUsers: Number,
      weeklyActiveUsers: Number,
      monthlyActiveUsers: Number,
      retentionRate: Number,
      ventingUsage: Number,
      sharingRate: Number
    },
    
    demographicBreakdown: {
      byAgeGroup: {
        type: Map,
        of: Number,
        default: new Map()
      },
      byTimeZone: {
        type: Map,
        of: Number,
        default: new Map()
      }
    }
  },

  // Performance metrics
  performance: {
    processingTime: {
      type: Number,
      default: 0
    },
    
    dataQuality: {
      completeness: {
        type: Number,
        min: 0.0,
        max: 1.0
      },
      accuracy: {
        type: Number,
        min: 0.0,
        max: 1.0
      },
      consistency: {
        type: Number,
        min: 0.0,
        max: 1.0
      }
    },
    
    lastCalculated: {
      type: Date,
      default: Date.now
    },
    
    calculationVersion: {
      type: String,
      default: '1.0'
    }
  },

  // Metadata
  aggregationType: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
    required: true,
    index: true
  },
  
  dataSource: {
    type: String,
    enum: ['real_time', 'batch_job', 'manual'],
    default: 'batch_job'
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
EmotionAnalyticsSchema.index({ date: 1, 'location.country': 1 });
EmotionAnalyticsSchema.index({ date: 1, aggregationType: 1 });
EmotionAnalyticsSchema.index({ 'location.country': 1, date: -1 });
EmotionAnalyticsSchema.index({ year: 1, month: 1, aggregationType: 1 });
EmotionAnalyticsSchema.index({ dayOfWeek: 1, hour: 1 });
EmotionAnalyticsSchema.index({ 'globalStats.dominantEmotion': 1, date: -1 });

// Virtual fields
EmotionAnalyticsSchema.virtual('totalEmotionTypes').get(function() {
  return this.globalStats.emotionDistribution ? this.globalStats.emotionDistribution.size : 0;
});

EmotionAnalyticsSchema.virtual('diversity').get(function() {
  if (!this.globalStats.emotionDistribution || this.globalStats.emotionDistribution.size === 0) {
    return 0;
  }
  
  // Calculate Shannon diversity index
  const total = this.globalStats.totalEntries;
  let diversity = 0;
  
  for (const [emotion, data] of this.globalStats.emotionDistribution) {
    if (data.count > 0) {
      const proportion = data.count / total;
      diversity -= proportion * Math.log2(proportion);
    }
  }
  
  return Math.round(diversity * 100) / 100;
});

EmotionAnalyticsSchema.virtual('wellbeingScore').get(function() {
  if (!this.globalStats.coreEmotionDistribution) return 0;
  
  // Calculate a wellbeing score based on core emotions
  const weights = {
    joy: 1.0,
    sadness: -0.3,
    anger: -0.5,
    fear: -0.4,
    disgust: -0.2
  };
  
  let score = 0;
  let totalCount = 0;
  
  for (const [emotion, data] of this.globalStats.coreEmotionDistribution) {
    if (weights[emotion] && data.count > 0) {
      score += weights[emotion] * data.count * data.averageIntensity;
      totalCount += data.count;
    }
  }
  
  if (totalCount === 0) return 0;
  
  // Normalize to 0-100 scale
  const normalizedScore = ((score / totalCount) + 1) * 50;
  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
});

// Static methods
EmotionAnalyticsSchema.statics.getLatestAnalytics = function(filters = {}) {
  return this.findOne({
    ...filters,
    isActive: true
  }).sort({ date: -1 });
};

EmotionAnalyticsSchema.statics.getAnalyticsTrend = function(timeRange, location = null) {
  const matchQuery = {
    date: { $gte: timeRange.start, $lte: timeRange.end },
    isActive: true
  };
  
  if (location) {
    matchQuery['location.country'] = location;
  }
  
  return this.find(matchQuery).sort({ date: 1 });
};

EmotionAnalyticsSchema.statics.getTopEmotionsByLocation = function(timeRange, limit = 10) {
  return this.aggregate([
    {
      $match: {
        date: { $gte: timeRange.start, $lte: timeRange.end },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$location.country',
        totalEntries: { $sum: '$globalStats.totalEntries' },
        dominantEmotion: { $first: '$globalStats.dominantEmotion' },
        averageIntensity: { $avg: '$globalStats.averageIntensity' },
        wellbeingScore: { $avg: '$wellbeingScore' }
      }
    },
    { $sort: { totalEntries: -1 } },
    { $limit: limit }
  ]);
};

EmotionAnalyticsSchema.statics.getGlobalTrends = function(timeRange) {
  return this.aggregate([
    {
      $match: {
        date: { $gte: timeRange.start, $lte: timeRange.end },
        isActive: true
      }
    },
    {
      $group: {
        _id: {
          year: '$year',
          month: '$month',
          day: { $dayOfMonth: '$date' }
        },
        totalEntries: { $sum: '$globalStats.totalEntries' },
        averageIntensity: { $avg: '$globalStats.averageIntensity' },
        uniqueUsers: { $sum: '$globalStats.uniqueUsers' },
        wellbeingScore: { $avg: '$wellbeingScore' },
        diversity: { $avg: '$diversity' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Instance methods
EmotionAnalyticsSchema.methods.calculateTrends = function(previousPeriod) {
  if (!previousPeriod) return null;
  
  const trends = {};
  
  // Calculate emotion trends
  for (const [emotion, currentData] of this.globalStats.emotionDistribution) {
    const previousData = previousPeriod.globalStats.emotionDistribution.get(emotion);
    const previousCount = previousData ? previousData.count : 0;
    
    let trend = 'stable';
    let changePercentage = 0;
    
    if (previousCount > 0) {
      changePercentage = ((currentData.count - previousCount) / previousCount) * 100;
      
      if (changePercentage > 10) trend = 'increasing';
      else if (changePercentage < -10) trend = 'decreasing';
      else if (Math.abs(changePercentage) > 25) trend = 'volatile';
    } else if (currentData.count > 0) {
      trend = 'increasing';
      changePercentage = 100;
    }
    
    trends[emotion] = {
      trend,
      changePercentage: Math.round(changePercentage * 100) / 100,
      previousPeriodCount: previousCount,
      currentPeriodCount: currentData.count
    };
  }
  
  this.trendAnalysis.emotionTrends = new Map(Object.entries(trends));
  
  // Calculate intensity trend
  const intensityChange = this.globalStats.averageIntensity - (previousPeriod.globalStats.averageIntensity || 0);
  const intensityChangePercentage = previousPeriod.globalStats.averageIntensity > 0 
    ? (intensityChange / previousPeriod.globalStats.averageIntensity) * 100 
    : 0;
  
  this.trendAnalysis.intensityTrend = {
    trend: intensityChangePercentage > 5 ? 'increasing' : 
           intensityChangePercentage < -5 ? 'decreasing' : 'stable',
    changePercentage: Math.round(intensityChangePercentage * 100) / 100,
    previousAverage: previousPeriod.globalStats.averageIntensity || 0,
    currentAverage: this.globalStats.averageIntensity
  };
  
  return this.trendAnalysis;
};

EmotionAnalyticsSchema.methods.detectAnomalies = function(historicalData = []) {
  const anomalies = [];
  
  // Detect spikes in emotion counts
  if (historicalData.length > 0) {
    const avgTotal = historicalData.reduce((sum, data) => sum + data.globalStats.totalEntries, 0) / historicalData.length;
    const stdDev = Math.sqrt(
      historicalData.reduce((sum, data) => sum + Math.pow(data.globalStats.totalEntries - avgTotal, 2), 0) / historicalData.length
    );
    
    // Detect spike (more than 2 standard deviations above average)
    if (this.globalStats.totalEntries > avgTotal + (2 * stdDev)) {
      anomalies.push({
        type: 'spike',
        description: `Unusual spike in emotion entries: ${this.globalStats.totalEntries} vs average ${Math.round(avgTotal)}`,
        severity: this.globalStats.totalEntries > avgTotal + (3 * stdDev) ? 'high' : 'medium',
        data: {
          current: this.globalStats.totalEntries,
          average: Math.round(avgTotal),
          standardDeviations: Math.round(((this.globalStats.totalEntries - avgTotal) / stdDev) * 100) / 100
        }
      });
    }
    
    // Detect unusual emotional distribution
    const diversityScores = historicalData.map(data => data.diversity || 0);
    const avgDiversity = diversityScores.reduce((sum, score) => sum + score, 0) / diversityScores.length;
    
    if (Math.abs(this.diversity - avgDiversity) > 1.0) {
      anomalies.push({
        type: 'unusual_distribution',
        description: `Unusual emotion diversity: ${this.diversity} vs average ${Math.round(avgDiversity * 100) / 100}`,
        severity: Math.abs(this.diversity - avgDiversity) > 2.0 ? 'high' : 'medium',
        data: {
          currentDiversity: this.diversity,
          averageDiversity: Math.round(avgDiversity * 100) / 100,
          difference: Math.round((this.diversity - avgDiversity) * 100) / 100
        }
      });
    }
  }
  
  // Detect geographic anomalies
  if (this.location && this.globalStats.totalEntries > 1000) {
    const dominantPercentage = Math.max(...Array.from(this.globalStats.emotionDistribution.values()).map(data => data.percentage || 0));
    
    if (dominantPercentage > 70) {
      anomalies.push({
        type: 'geographic_anomaly',
        description: `Extreme emotion concentration in ${this.location.city || this.location.country}: ${dominantPercentage}% ${this.globalStats.dominantEmotion}`,
        severity: dominantPercentage > 85 ? 'high' : 'medium',
        data: {
          location: this.location,
          dominantEmotion: this.globalStats.dominantEmotion,
          percentage: dominantPercentage
        }
      });
    }
  }
  
  this.insights.anomalies = anomalies;
  return anomalies;
};

EmotionAnalyticsSchema.methods.generateInsights = function() {
  const insights = [];
  
  // Temporal patterns
  if (this.contextAnalytics.timeOfDay && this.contextAnalytics.timeOfDay.size > 0) {
    const timeData = Array.from(this.contextAnalytics.timeOfDay.entries());
    const peakTime = timeData.reduce((max, [time, data]) => 
      data.count > (max[1]?.count || 0) ? [time, data] : max
    );
    
    if (peakTime[1]) {
      insights.push({
        type: 'temporal',
        description: `Peak emotional activity occurs during ${peakTime[0]} with ${peakTime[1].dominantEmotion} being dominant`,
        confidence: 0.8,
        supportingData: {
          peakTime: peakTime[0],
          dominantEmotion: peakTime[1].dominantEmotion,
          count: peakTime[1].count,
          intensity: peakTime[1].averageIntensity
        }
      });
    }
  }
  
  // Weather correlations
  if (this.contextAnalytics.weather && this.contextAnalytics.weather.size > 2) {
    const weatherData = Array.from(this.contextAnalytics.weather.entries());
    const sunnyData = weatherData.find(([weather]) => weather === 'sunny')?.[1];
    const rainyData = weatherData.find(([weather]) => weather === 'rainy')?.[1];
    
    if (sunnyData && rainyData) {
      const intensityDiff = sunnyData.averageIntensity - rainyData.averageIntensity;
      
      if (Math.abs(intensityDiff) > 0.2) {
        insights.push({
          type: 'weather',
          description: `${intensityDiff > 0 ? 'Sunny' : 'Rainy'} weather correlates with ${Math.abs(intensityDiff) > 0.3 ? 'significantly ' : ''}higher emotional intensity`,
          confidence: Math.min(0.9, 0.5 + Math.abs(intensityDiff)),
          supportingData: {
            sunny: sunnyData,
            rainy: rainyData,
            intensityDifference: Math.round(intensityDiff * 100) / 100
          }
        });
      }
    }
  }
  
  // Social context insights
  if (this.contextAnalytics.socialContext && this.contextAnalytics.socialContext.size > 0) {
    const socialData = Array.from(this.contextAnalytics.socialContext.entries());
    const aloneData = socialData.find(([context]) => context === 'alone')?.[1];
    const socialContexts = socialData.filter(([context]) => context !== 'alone');
    
    if (aloneData && socialContexts.length > 0) {
      const avgSocialIntensity = socialContexts.reduce((sum, [, data]) => sum + data.averageIntensity, 0) / socialContexts.length;
      const intensityDiff = avgSocialIntensity - aloneData.averageIntensity;
      
      if (Math.abs(intensityDiff) > 0.15) {
        insights.push({
          type: 'social',
          description: `People experience ${intensityDiff > 0 ? 'higher' : 'lower'} emotional intensity when ${intensityDiff > 0 ? 'with others' : 'alone'}`,
          confidence: 0.7,
          supportingData: {
            aloneIntensity: aloneData.averageIntensity,
            socialIntensity: avgSocialIntensity,
            difference: Math.round(intensityDiff * 100) / 100
          }
        });
      }
    }
  }
  
  this.insights.patterns = insights;
  return insights;
};

EmotionAnalyticsSchema.methods.calculateCorrelations = function() {
  const correlations = [];
  
  // Calculate correlation between weather and emotion
  if (this.contextAnalytics.weather && this.contextAnalytics.weather.size > 2) {
    const weatherEmotions = Array.from(this.contextAnalytics.weather.entries());
    
    // Simple correlation calculation (could be enhanced with proper statistical methods)
    const positiveWeather = ['sunny', 'clear'];
    const negativeWeather = ['rainy', 'stormy', 'cloudy'];
    
    const positiveData = weatherEmotions.filter(([weather]) => positiveWeather.includes(weather));
    const negativeData = weatherEmotions.filter(([weather]) => negativeWeather.includes(weather));
    
    if (positiveData.length > 0 && negativeData.length > 0) {
      const positiveAvg = positiveData.reduce((sum, [, data]) => sum + data.averageIntensity, 0) / positiveData.length;
      const negativeAvg = negativeData.reduce((sum, [, data]) => sum + data.averageIntensity, 0) / negativeData.length;
      
      const correlation = (positiveAvg - negativeAvg) / Math.max(positiveAvg, negativeAvg);
      
      correlations.push({
        factor1: 'weather_positive',
        factor2: 'emotion_intensity',
        correlation: Math.round(correlation * 100) / 100,
        significance: Math.abs(correlation) > 0.3 ? 'strong' : Math.abs(correlation) > 0.15 ? 'moderate' : 'weak'
      });
    }
  }
  
  this.insights.correlations = correlations;
  return correlations;
};

// Pre-save middleware
EmotionAnalyticsSchema.pre('save', function(next) {
  // Auto-calculate derived fields
  if (this.date) {
    this.year = this.date.getFullYear();
    this.month = this.date.getMonth() + 1;
    this.dayOfWeek = this.date.getDay();
    this.hour = this.date.getHours();
    
    // Calculate week number
    const startOfYear = new Date(this.year, 0, 1);
    const dayOfYear = Math.floor((this.date - startOfYear) / (24 * 60 * 60 * 1000));
    this.week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  }
  
  // Update performance metrics
  this.performance.lastCalculated = new Date();
  
  // Calculate data quality metrics
  const completeness = this.calculateCompleteness();
  this.performance.dataQuality.completeness = completeness;
  this.performance.dataQuality.accuracy = this.calculateAccuracy();
  this.performance.dataQuality.consistency = this.calculateConsistency();
  
  next();
});

// Data quality calculation methods
EmotionAnalyticsSchema.methods.calculateCompleteness = function() {
  const requiredFields = [
    'globalStats.totalEntries',
    'globalStats.averageIntensity',
    'globalStats.emotionDistribution'
  ];
  
  let completedFields = 0;
  
  requiredFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], this);
    if (value !== undefined && value !== null) {
      completedFields++;
    }
  });
  
  return completedFields / requiredFields.length;
};

EmotionAnalyticsSchema.methods.calculateAccuracy = function() {
  // Simple accuracy check based on data consistency
  if (!this.globalStats.emotionDistribution || this.globalStats.emotionDistribution.size === 0) {
    return 0;
  }
  
  const totalFromDistribution = Array.from(this.globalStats.emotionDistribution.values())
    .reduce((sum, data) => sum + (data.count || 0), 0);
  
  const totalEntries = this.globalStats.totalEntries || 0;
  
  if (totalEntries === 0) return 0;
  
  const accuracy = Math.min(1, totalFromDistribution / totalEntries);
  return Math.round(accuracy * 100) / 100;
};

EmotionAnalyticsSchema.methods.calculateConsistency = function() {
  // Check if percentages add up to ~100%
  if (!this.globalStats.emotionDistribution || this.globalStats.emotionDistribution.size === 0) {
    return 0;
  }
  
  const totalPercentage = Array.from(this.globalStats.emotionDistribution.values())
    .reduce((sum, data) => sum + (data.percentage || 0), 0);
  
  const consistency = 1 - Math.abs(100 - totalPercentage) / 100;
  return Math.max(0, Math.round(consistency * 100) / 100);
};

// Export model
export default mongoose.model('EmotionAnalytics', EmotionAnalyticsSchema);