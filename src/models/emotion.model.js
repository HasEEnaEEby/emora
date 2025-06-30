import mongoose from 'mongoose';
import { EMOTION_NAMES, CORE_EMOTIONS, getCoreEmotion, getEmotionColor, getCoreEmotionColor, getEmotionCharacter } from '../constants/emotions.js';

const UnifiedEmotionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow anonymous entries
    index: true
  },
  
  // Original emotion (from extended set)
  emotion: {
    type: String,
    required: true,
    enum: EMOTION_NAMES,
    index: true
  },
  
  // Automatically mapped Inside Out core emotion
  coreEmotion: {
    type: String,
    required: true,
    enum: CORE_EMOTIONS,
    index: true
  },
  
  // Emotion intensity (0.0 to 1.0 for Inside Out compatibility)
  intensity: {
    type: Number,
    required: true,
    min: 0.0,
    max: 1.0,
    default: 0.5
  },
  
  // Legacy intensity (1-5 for backward compatibility)
  legacyIntensity: {
    type: Number,
    min: 1,
    max: 5
  },
  
  // Secondary emotions (Inside Out style mixed emotions)
  secondaryEmotions: [{
    emotion: {
      type: String,
      enum: EMOTION_NAMES
    },
    coreEmotion: {
      type: String,
      enum: CORE_EMOTIONS
    },
    intensity: {
      type: Number,
      min: 0.0,
      max: 1.0
    }
  }],
  
  // Location data (your existing structure)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates'
      }
    },
    city: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    continent: {
      type: String,
      trim: true
    },
    timezone: {
      type: String,
      trim: true
    }
  },
  
  // Context information (enhanced)
  context: {
    // Weather
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'],
      default: 'unknown'
    },
    temperature: Number,
    
    // Time context
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night']
    },
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    isWeekend: {
      type: Boolean,
      default: false
    },
    
    // Social context (Inside Out style)
    socialContext: {
      type: String,
      enum: ['alone', 'with_friends', 'with_family', 'with_partner', 'with_colleagues', 'in_public']
    },
    
    // Activity context
    activity: {
      type: String,
      enum: ['working', 'studying', 'exercising', 'relaxing', 'socializing', 'commuting', 'sleeping', 'eating', 'venting', 'other']
    },
    
    // Trigger description
    trigger: {
      type: String,
      maxlength: 500
    }
  },
  
  // Memory associations (Inside Out style)
  memory: {
    description: {
      type: String,
      maxlength: 1000
    },
    tags: [String],
    isPrivate: {
      type: Boolean,
      default: true
    },
    photos: [String], // URLs to emotion-related photos
    associatedSongs: [{
      title: String,
      artist: String,
      spotifyId: String
    }]
  },
  
  // Analytics data
  analytics: {
    duration: {
      type: Number, // Duration in minutes
      default: 0
    },
    peakIntensity: {
      type: Number,
      min: 0.0,
      max: 1.0
    },
    transitionFrom: {
      emotion: String,
      coreEmotion: String,
      timestamp: Date
    },
    transitionTo: {
      emotion: String,
      coreEmotion: String,
      timestamp: Date
    }
  },
  
  // Global sharing (anonymous)
  globalSharing: {
    isShared: {
      type: Boolean,
      default: false
    },
    anonymousId: String, // Generated UUID for privacy
    sharedAt: Date
  },
  
  // Legacy fields (for backward compatibility)
  isAnonymous: {
    type: Boolean,
    default: true
  },
  
  note: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  source: {
    type: String,
    enum: ['mobile', 'web', 'api'],
    default: 'web'
  },
  
  version: {
    type: String,
    default: '2.0' // Updated version for unified system
  },
  
  // Metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  timezone: {
    type: String,
    required: true
  },
  
  accuracy: {
    type: Number,
    min: 0.0,
    max: 1.0,
    default: 1.0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
UnifiedEmotionSchema.index({ userId: 1, createdAt: -1 });
UnifiedEmotionSchema.index({ emotion: 1, createdAt: -1 });
UnifiedEmotionSchema.index({ coreEmotion: 1, createdAt: -1 });
UnifiedEmotionSchema.index({ location: '2dsphere' });
UnifiedEmotionSchema.index({ 'location.country': 1, createdAt: -1 });
UnifiedEmotionSchema.index({ 'location.city': 1, createdAt: -1 });
UnifiedEmotionSchema.index({ 'context.timeOfDay': 1, emotion: 1 });
UnifiedEmotionSchema.index({ 'globalSharing.isShared': 1, timestamp: -1 });
UnifiedEmotionSchema.index({ timestamp: 1 });

// Virtuals
UnifiedEmotionSchema.virtual('emotionColor').get(function() {
  return getEmotionColor(this.emotion);
});

UnifiedEmotionSchema.virtual('coreEmotionColor').get(function() {
  return getCoreEmotionColor(this.coreEmotion);
});

UnifiedEmotionSchema.virtual('emotionCharacter').get(function() {
  return getEmotionCharacter(this.coreEmotion);
});

// Pre-save middleware
UnifiedEmotionSchema.pre('save', function(next) {
  // Auto-map to core emotion
  this.coreEmotion = getCoreEmotion(this.emotion);
  
  // Convert legacy intensity to 0-1 scale
  if (this.legacyIntensity && !this.intensity) {
    this.intensity = (this.legacyIntensity - 1) / 4; // Convert 1-5 to 0-1
  }
  
  // Set legacy intensity from 0-1 scale
  if (this.intensity && !this.legacyIntensity) {
    this.legacyIntensity = Math.round((this.intensity * 4) + 1); // Convert 0-1 to 1-5
  }
  
  // Auto-fill context based on timestamp
  const now = this.createdAt || new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Time of day
  if (!this.context.timeOfDay) {
    if (hour >= 6 && hour < 12) this.context.timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) this.context.timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) this.context.timeOfDay = 'evening';
    else this.context.timeOfDay = 'night';
  }
  
  // Day of week
  if (!this.context.dayOfWeek) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    this.context.dayOfWeek = days[day];
    this.context.isWeekend = day === 0 || day === 6;
  }
  
  next();
});

// Methods (your existing + Inside Out)
UnifiedEmotionSchema.methods.getEmotionColor = function() {
  return getEmotionColor(this.emotion);
};

UnifiedEmotionSchema.methods.getDominantEmotion = function() {
  if (!this.secondaryEmotions || this.secondaryEmotions.length === 0) {
    return {
      emotion: this.emotion,
      coreEmotion: this.coreEmotion,
      intensity: this.intensity
    };
  }
  
  let dominant = { emotion: this.emotion, coreEmotion: this.coreEmotion, intensity: this.intensity };
  
  this.secondaryEmotions.forEach(secondary => {
    if (secondary.intensity > dominant.intensity) {
      dominant = secondary;
    }
  });
  
  return dominant;
};

UnifiedEmotionSchema.methods.toInsideOutFormat = function() {
  return {
    coreEmotion: this.coreEmotion,
    intensity: this.intensity,
    character: this.emotionCharacter,
    color: this.coreEmotionColor,
    originalEmotion: this.emotion,
    timestamp: this.timestamp || this.createdAt
  };
};

// Static methods (your existing + Inside Out)
UnifiedEmotionSchema.statics.getEmotionStats = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$emotion',
        coreEmotion: { $first: '$coreEmotion' },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

UnifiedEmotionSchema.statics.getCoreEmotionStats = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$coreEmotion',
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        emotions: { $addToSet: '$emotion' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

UnifiedEmotionSchema.statics.getGlobalEmotionHeatmap = function(bounds, timeRange) {
  const matchQuery = {
    'globalSharing.isShared': true,
    $or: [
      { timestamp: { $gte: timeRange.startDate, $lte: timeRange.endDate } },
      { createdAt: { $gte: timeRange.startDate, $lte: timeRange.endDate } }
    ]
  };

  if (bounds && bounds.northeast && bounds.southwest) {
    matchQuery['location.coordinates'] = {
      $geoWithin: {
        $box: [
          [bounds.southwest.lng, bounds.southwest.lat],
          [bounds.northeast.lng, bounds.northeast.lat]
        ]
      }
    };
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          coreEmotion: '$coreEmotion',
          location: {
            lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] },
            lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] }
          }
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        emotions: { $addToSet: '$emotion' },
        lastUpdate: { $max: { $ifNull: ['$timestamp', '$createdAt'] } }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 1000 }
  ]);
};

export default mongoose.model('UnifiedEmotion', UnifiedEmotionSchema);