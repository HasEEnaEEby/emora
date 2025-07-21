// src/models/emotion-cluster.model.js - AI-Powered Emotion Cluster Summaries
import mongoose from 'mongoose';
import { getPlutchikCoreColor, getPlutchikCoreEmoji } from '../constants/emotion-mappings.js';

const emotionClusterSchema = new mongoose.Schema({
  // Cluster identification
  clusterId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Location information
  location: {
    city: String,
    region: String,
    country: String,
    continent: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Time window
  timeWindow: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    duration: {
      type: String,
      enum: ['1h', '3h', '6h', '12h', '24h'],
      default: '1h'
    }
  },
  
  // Emotion breakdown
  emotionBreakdown: {
    joy: { type: Number, default: 0 },
    trust: { type: Number, default: 0 },
    fear: { type: Number, default: 0 },
    surprise: { type: Number, default: 0 },
    sadness: { type: Number, default: 0 },
    disgust: { type: Number, default: 0 },
    anger: { type: Number, default: 0 },
    anticipation: { type: Number, default: 0 }
  },
  
  // Dominant emotion
  dominantEmotion: {
    type: String,
    enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'],
    required: true
  },
  
  // AI-generated content
  aiGeneratedText: {
    summary: {
      type: String,
      maxlength: 500,
      trim: true
    },
    insight: {
      type: String,
      maxlength: 300,
      trim: true
    },
    suggestion: {
      type: String,
      maxlength: 200,
      trim: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Statistics
  statistics: {
    totalEmotions: {
      type: Number,
      default: 0
    },
    avgIntensity: {
      type: Number,
      default: 0
    },
    uniqueUsers: {
      type: Number,
      default: 0
    },
    peakHour: {
      type: String,
      default: null
    }
  },
  
  // Context and triggers
  commonContexts: [{
    weather: String,
    timeOfDay: String,
    socialContext: String,
    count: Number
  }],
  
  commonTriggers: [{
    trigger: String,
    count: Number
  }],
  
  // Metadata
  isProcessed: {
    type: Boolean,
    default: false
  },
  
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
emotionClusterSchema.index({ 'location.coordinates': '2dsphere' });
emotionClusterSchema.index({ 'location.country': 1, 'location.city': 1 });
emotionClusterSchema.index({ dominantEmotion: 1, 'timeWindow.start': -1 });
emotionClusterSchema.index({ clusterId: 1 });
emotionClusterSchema.index({ isProcessed: 1, processingStatus: 1 });

// Virtual for color
emotionClusterSchema.virtual('color').get(function() {
  return getPlutchikCoreColor(this.dominantEmotion);
});

// Virtual for emoji
emotionClusterSchema.virtual('emoji').get(function() {
  return getPlutchikCoreEmoji(this.dominantEmotion);
});

// Virtual for display location
emotionClusterSchema.virtual('displayLocation').get(function() {
  const parts = [];
  if (this.location.city) parts.push(this.location.city);
  if (this.location.region) parts.push(this.location.region);
  if (this.location.country) parts.push(this.location.country);
  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
});

// Instance methods
emotionClusterSchema.methods.toMapObject = function() {
  return {
    id: this._id,
    clusterId: this.clusterId,
    location: this.location,
    displayLocation: this.displayLocation,
    dominantEmotion: this.dominantEmotion,
    color: this.color,
    emoji: this.emoji,
    statistics: this.statistics,
    timeWindow: this.timeWindow,
    aiGeneratedText: this.aiGeneratedText,
    isProcessed: this.isProcessed
  };
};

emotionClusterSchema.methods.updateFromEmotions = function(emotions) {
  // Reset counters
  Object.keys(this.emotionBreakdown).forEach(emotion => {
    this.emotionBreakdown[emotion] = 0;
  });
  
  // Count emotions
  emotions.forEach(emotion => {
    if (emotion.coreEmotion && this.emotionBreakdown[emotion.coreEmotion] !== undefined) {
      this.emotionBreakdown[emotion.coreEmotion]++;
    }
  });
  
  // Find dominant emotion
  let maxCount = 0;
  let dominant = 'joy';
  
  Object.entries(this.emotionBreakdown).forEach(([emotion, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominant = emotion;
    }
  });
  
  this.dominantEmotion = dominant;
  this.statistics.totalEmotions = emotions.length;
  
  // Calculate average intensity
  const totalIntensity = emotions.reduce((sum, emotion) => sum + (emotion.intensity || 0), 0);
  this.statistics.avgIntensity = emotions.length > 0 ? totalIntensity / emotions.length : 0;
  
  // Count unique users
  const uniqueUsers = new Set(emotions.map(e => e.userId.toString()));
  this.statistics.uniqueUsers = uniqueUsers.size;
  
  // Find peak hour
  const hourCounts = {};
  emotions.forEach(emotion => {
    const hour = new Date(emotion.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  let peakHour = null;
  let maxHourCount = 0;
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxHourCount) {
      maxHourCount = count;
      peakHour = hour;
    }
  });
  
  this.statistics.peakHour = peakHour;
  this.lastUpdated = new Date();
  
  return this;
};

// Static methods
emotionClusterSchema.statics.createFromEmotions = async function(emotions, timeWindow) {
  if (!emotions || emotions.length === 0) {
    throw new Error('No emotions provided for cluster creation');
  }
  
  // Generate cluster ID
  const firstEmotion = emotions[0];
  const city = firstEmotion.location?.city?.toLowerCase() || 'unknown';
  const time = timeWindow.start.toISOString().slice(0, 13);
  const clusterId = `${city}-cluster-${time}`;
  
  // Check if cluster already exists
  let cluster = await this.findOne({ clusterId });
  
  if (!cluster) {
    cluster = new this({
      clusterId,
      location: firstEmotion.location,
      timeWindow,
      emotionBreakdown: {
        joy: 0, trust: 0, fear: 0, surprise: 0,
        sadness: 0, disgust: 0, anger: 0, anticipation: 0
      },
      dominantEmotion: 'joy',
      statistics: {
        totalEmotions: 0,
        avgIntensity: 0,
        uniqueUsers: 0,
        peakHour: null
      }
    });
  }
  
  // Update cluster with emotion data
  cluster.updateFromEmotions(emotions);
  
  return cluster.save();
};

emotionClusterSchema.statics.getMapClusters = async function(filters = {}) {
  const {
    startDate,
    endDate,
    country,
    city,
    dominantEmotion,
    minEmotions = 3
  } = filters;
  
  const matchQuery = {
    isProcessed: true,
    'statistics.totalEmotions': { $gte: minEmotions }
  };
  
  if (startDate || endDate) {
    matchQuery['timeWindow.start'] = {};
    if (startDate) matchQuery['timeWindow.start'].$gte = new Date(startDate);
    if (endDate) matchQuery['timeWindow.start'].$lte = new Date(endDate);
  }
  
  if (country) matchQuery['location.country'] = country;
  if (city) matchQuery['location.city'] = city;
  if (dominantEmotion) matchQuery.dominantEmotion = dominantEmotion;
  
  const clusters = await this.find(matchQuery)
    .sort({ 'timeWindow.start': -1 })
    .limit(1000)
    .lean();
  
  return clusters.map(cluster => ({
    ...cluster,
    color: getPlutchikCoreColor(cluster.dominantEmotion),
    emoji: getPlutchikCoreEmoji(cluster.dominantEmotion)
  }));
};

// Pre-save middleware
emotionClusterSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const EmotionCluster = mongoose.model('EmotionCluster', emotionClusterSchema);

export default EmotionCluster; 