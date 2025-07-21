// src/models/emotion.model.js - Enhanced with Plutchik Core Emotions and Clustering
import mongoose from 'mongoose';
import { mapToPlutchikCoreEmotion } from '../constants/emotion-mappings.js';
import { locationSchema } from './schemas/locationSchema.js';

const emotionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    lowercase: true,
    enum: [
      // Positive emotions
      'joy', 'happiness', 'excitement', 'love', 'gratitude', 'contentment', 
      'pride', 'relief', 'hope', 'enthusiasm', 'serenity', 'bliss',
      
      // Negative emotions
      'sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 
      'loneliness', 'stress', 'guilt', 'shame', 'jealousy', 'regret',
      'disgust', 'hate', 'rage', 'panic', 'despair', 'hopelessness',
      
      // Neutral emotions
      'calm', 'peaceful', 'neutral', 'focused', 'curious', 'thoughtful',
      'contemplative', 'reflective', 'alert', 'balanced', 'indifferent',
      'confused', 'surprised', 'amused', 'bored', 'tired', 'energetic'
    ],
  },
  emotion: {
    type: String,
    lowercase: true,
    // For backward compatibility
  },
  
  // . NEW: Plutchik's 8 core emotions
  coreEmotion: {
    type: String,
    enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'],
    required: true,
    index: true
  },
  
  // . NEW: Clustering for map aggregation
  clusterId: {
    type: String,
    index: true
  },
  
  intensity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  note: {
    type: String,
    maxlength: 500,
    default: '',
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  // . ENHANCED: Use reusable location schema
  location: locationSchema,
  context: {
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy'],
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
    },
    socialContext: {
      type: String,
      enum: ['alone', 'with_friends', 'with_family', 'at_work', 'in_public'],
    },
    activity: {
      type: String,
      maxlength: 100,
    },
  },
  privacy: {
    type: String,
    enum: ['private', 'friends', 'public'],
    default: 'private',
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  metadata: {
    source: {
      type: String,
      enum: ['mobile', 'web', 'api'],
      default: 'mobile',
    },
    version: {
      type: String,
      default: '1.0.0',
    },
    deviceInfo: {
      platform: String,
      model: String,
      os: String,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

  // . ENHANCED: Better indexes for map aggregation and clustering
emotionSchema.index({ userId: 1, createdAt: -1 });
emotionSchema.index({ userId: 1, type: 1 });
emotionSchema.index({ userId: 1, intensity: 1 });
emotionSchema.index({ createdAt: -1 });
  emotionSchema.index({ coreEmotion: 1, createdAt: -1 });
  emotionSchema.index({ 'location.country': 1, coreEmotion: 1 });
  emotionSchema.index({ 'location.city': 1, coreEmotion: 1 });
  emotionSchema.index({ privacy: 1, coreEmotion: 1 });
  emotionSchema.index({ coreEmotion: 1, clusterId: 1 });

// Virtual for emotion category
emotionSchema.virtual('category').get(function() {
  const positiveEmotions = ['joy', 'happiness', 'excitement', 'love', 'gratitude', 'contentment', 'pride', 'relief', 'hope', 'enthusiasm', 'serenity', 'bliss'];
  const negativeEmotions = ['sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 'loneliness', 'stress', 'guilt', 'shame', 'jealousy', 'regret', 'disgust', 'hate', 'rage', 'panic', 'despair', 'hopelessness'];
  
  const emotionType = this.type || this.emotion;
  
  if (positiveEmotions.includes(emotionType)) return 'positive';
  if (negativeEmotions.includes(emotionType)) return 'negative';
  return 'neutral';
});

// Virtual for time ago
emotionSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// Instance methods
emotionSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    type: this.type || this.emotion,
    intensity: this.intensity,
    note: this.note,
    tags: this.tags,
    category: this.category,
    timeAgo: this.timeAgo,
    hasLocation: !!this.location,
    createdAt: this.createdAt,
    privacy: this.privacy,
  };
};

// Static methods
emotionSchema.statics.getEmotionStats = async function(userId, startDate = null) {
  const query = { userId };
  if (startDate) {
    query.createdAt = { $gte: startDate };
  }
  
  const pipeline = [
    { $match: query },
    {
      $group: {
        _id: null,
        totalEmotions: { $sum: 1 },
        averageIntensity: { $avg: '$intensity' },
        emotionBreakdown: {
          $push: {
            type: { $ifNull: ['$type', '$emotion'] },
            intensity: '$intensity',
            category: {
              $switch: {
                branches: [
                  {
                    case: {
                      $in: [
                        { $ifNull: ['$type', '$emotion'] },
                        ['joy', 'happiness', 'excitement', 'love', 'gratitude', 'contentment', 'pride', 'relief', 'hope', 'enthusiasm', 'serenity', 'bliss']
                      ]
                    },
                    then: 'positive'
                  },
                  {
                    case: {
                      $in: [
                        { $ifNull: ['$type', '$emotion'] },
                        ['sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 'loneliness', 'stress', 'guilt', 'shame', 'jealousy', 'regret', 'disgust', 'hate', 'rage', 'panic', 'despair', 'hopelessness']
                      ]
                    },
                    then: 'negative'
                  }
                ],
                default: 'neutral'
              }
            }
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalEmotions: 0,
    averageIntensity: 0,
    emotionBreakdown: []
  };
};

emotionSchema.statics.getUserStreak = async function(userId) {
  const emotions = await this.find({ userId })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();
  
  if (emotions.length === 0) return { currentStreak: 0, longestStreak: 0 };
  
  // Group by date
  const emotionsByDate = {};
  emotions.forEach(emotion => {
    const date = new Date(emotion.createdAt).toDateString();
    if (!emotionsByDate[date]) {
      emotionsByDate[date] = true;
    }
  });
  
  const dates = Object.keys(emotionsByDate).sort();
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  // Calculate current streak
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  
  if (emotionsByDate[today]) {
    currentStreak = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const currentDate = new Date(dates[i]);
      const nextDate = new Date(dates[i + 1]);
      const dayDiff = (nextDate - currentDate) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else if (emotionsByDate[yesterday]) {
    currentStreak = 1;
  }
  
  // Calculate longest streak
  for (let i = 1; i < dates.length; i++) {
    const currentDate = new Date(dates[i]);
    const prevDate = new Date(dates[i - 1]);
    const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
    
    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  
  return { currentStreak, longestStreak };
};

// . NEW: Get emotion map data for global visualization
emotionSchema.statics.getEmotionMapData = async function(filters = {}) {
  const {
    coreEmotion,
    country,
    region,
    city,
    startDate,
    endDate,
    limit = 1000
  } = filters;
  
  const matchQuery = {
    privacy: 'public',
    'location.coordinates': { $exists: true, $ne: null }
  };
  
  // Apply filters
  if (coreEmotion) {
    matchQuery.coreEmotion = coreEmotion;
  }
  
  if (country) {
    matchQuery['location.country'] = country;
  }
  
  if (region) {
    matchQuery['location.region'] = region;
  }
  
  if (city) {
    matchQuery['location.city'] = city;
  }
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }
  
  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: {
          coreEmotion: '$coreEmotion',
          city: '$location.city',
          country: '$location.country',
          coordinates: '$location.coordinates'
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        emotions: { $addToSet: '$type' },
        latestTimestamp: { $max: '$createdAt' },
        // Enhanced metadata
        contextData: {
          $push: {
            weather: '$context.weather',
            timeOfDay: '$context.timeOfDay',
            socialContext: '$context.socialContext',
            activity: '$context.activity'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' }, // Add unique ID for frontend keying
        coreEmotion: '$_id.coreEmotion',
        city: '$_id.city',
        country: '$_id.country',
        // GeoJSON-compatible location format
        location: {
          type: 'Point',
          coordinates: '$_id.coordinates'
        },
        count: 1,
        avgIntensity: { $round: ['$avgIntensity', 2] },
        emotionTypes: '$emotions',
        latestTimestamp: 1,
        // Enhanced context metadata
        context: {
          weather: { $arrayElemAt: ['$contextData.weather', 0] },
          timeOfDay: { $arrayElemAt: ['$contextData.timeOfDay', 0] },
          socialContext: { $arrayElemAt: ['$contextData.socialContext', 0] },
          activity: { $arrayElemAt: ['$contextData.activity', 0] }
        },
        // Add display name for UI
        displayName: {
          $cond: {
            if: { $and: ['$_id.city', '$_id.country'] },
            then: { $concat: ['$_id.city', ', ', '$_id.country'] },
            else: {
              $cond: {
                if: '$_id.city',
                then: '$_id.city',
                else: '$_id.country'
              }
            }
          }
        }
      }
    },
    { $sort: { count: -1, avgIntensity: -1 } },
    { $limit: limit }
  ];
  
  return this.aggregate(pipeline);
};

// . NEW: Get global emotion heatmap data
emotionSchema.statics.getGlobalHeatmapData = async function(filters = {}) {
  const {
    startDate,
    endDate,
    coreEmotion,
    minIntensity = 1
  } = filters;
  
  const matchQuery = {
    privacy: 'public',
    'location.coordinates': { $exists: true, $ne: null },
    intensity: { $gte: minIntensity }
  };
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }
  
  if (coreEmotion) {
    matchQuery.coreEmotion = coreEmotion;
  }
  
  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: {
          coreEmotion: '$coreEmotion',
          coordinates: '$location.coordinates',
          city: '$location.city',
          country: '$location.country'
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        maxIntensity: { $max: '$intensity' },
        emotions: { $addToSet: '$type' }
      }
    },
    {
      $project: {
        _id: 0,
        coreEmotion: '$_id.coreEmotion',
        coordinates: '$_id.coordinates',
        city: '$_id.city',
        country: '$_id.country',
        count: 1,
        avgIntensity: { $round: ['$avgIntensity', 2] },
        maxIntensity: 1,
        emotionTypes: '$emotions'
      }
    },
    { $sort: { count: -1, avgIntensity: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

// . NEW: Get emotion clusters for heatmap visualization
emotionSchema.statics.getEmotionClusters = async function(filters = {}) {
  const {
    startDate,
    endDate,
    radiusKm = 50,
    minClusterSize = 3
  } = filters;
  
  const matchQuery = {
    privacy: 'public',
    'location.coordinates': { $exists: true, $ne: null }
  };
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }
  
  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: {
          country: '$location.country',
          coreEmotion: '$coreEmotion'
        },
        coordinates: { $first: '$location.coordinates' },
        city: { $first: '$location.city' },
        country: { $first: '$location.country' },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        emotions: { $addToSet: '$type' },
        latestTimestamp: { $max: '$createdAt' },
        // Calculate cluster size based on count
        size: { $sum: 1 }
      }
    },
    { $match: { count: { $gte: minClusterSize } } },
    {
      $project: {
        _id: 0,
        clusterId: { $concat: ['$country', '-', '$coreEmotion'] },
        coreEmotion: '$_id.coreEmotion',
        coordinates: 1,
        city: 1,
        country: 1,
        count: 1,
        avgIntensity: { $round: ['$avgIntensity', 2] },
        emotionTypes: '$emotions',
        latestTimestamp: 1,
        size: { $multiply: ['$size', 3] } // Scale size for visualization
      }
    },
    { $sort: { count: -1, avgIntensity: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

// . NEW: Get emotion trends by location
emotionSchema.statics.getEmotionTrends = async function(filters = {}) {
  const {
    country,
    city,
    coreEmotion,
    days = 7
  } = filters;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const matchQuery = {
    privacy: 'public',
    createdAt: { $gte: startDate }
  };
  
  if (country) matchQuery['location.country'] = country;
  if (city) matchQuery['location.city'] = city;
  if (coreEmotion) matchQuery.coreEmotion = coreEmotion;
  
  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          coreEmotion: '$coreEmotion',
          city: '$location.city',
          country: '$location.country'
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' }
      }
    },
    {
      $project: {
        _id: 0,
        date: '$_id.date',
        coreEmotion: '$_id.coreEmotion',
        city: '$_id.city',
        country: '$_id.country',
        count: 1,
        avgIntensity: { $round: ['$avgIntensity', 2] }
      }
    },
    { $sort: { date: 1, coreEmotion: 1 } }
  ];
  
  return this.aggregate(pipeline);
};

// . ENHANCED: Pre-save middleware with core emotion mapping and clustering
emotionSchema.pre('save', function(next) {
  // Ensure type is set (backward compatibility)
  if (!this.type && this.emotion) {
    this.type = this.emotion;
  }
  
  // . NEW: Map to Plutchik core emotion (ensure it's always set)
  const emotionType = this.type || this.emotion;
  this.coreEmotion = mapToPlutchikCoreEmotion(emotionType);
  
  // . NEW: Generate clusterId for aggregation
  if (this.location && this.location.coordinates && this.location.coordinates.length === 2) {
    const time = new Date().toISOString().slice(0, 13); // e.g., 2025-01-20T15
    const city = this.location.city?.toLowerCase() || 'unknown';
    const emotion = this.coreEmotion || mapToPlutchikCoreEmotion(this.type || this.emotion);
    this.clusterId = `${city}-${emotion}-${time}`;
  } else {
    // Fallback clusterId for emotions without location
    const time = new Date().toISOString().slice(0, 13);
    const emotion = this.coreEmotion || mapToPlutchikCoreEmotion(this.type || this.emotion);
    this.clusterId = `unknown-${emotion}-${time}`;
  }
  
  // Set context timeOfDay if not provided
  if (!this.context?.timeOfDay) {
    const hour = this.createdAt.getHours();
    if (!this.context) this.context = {};
    
    if (hour >= 5 && hour < 12) this.context.timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) this.context.timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) this.context.timeOfDay = 'evening';
    else this.context.timeOfDay = 'night';
  }
  
  next();
});

// Post-save middleware for analytics
emotionSchema.post('save', async function(doc) {
  try {
    // Update user's last active time
    await mongoose.model('User').findByIdAndUpdate(
      doc.userId,
      { 
        'analytics.lastActiveAt': new Date(),
        lastLoginAt: new Date(),
      }
    );
  } catch (error) {
    console.error('Error updating user analytics after emotion save:', error);
  }
});

const Emotion = mongoose.model('Emotion', emotionSchema);

export default Emotion;