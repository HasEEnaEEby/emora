// src/models/mood.model.js - Updated with optional location and better analytics
import mongoose from 'mongoose';
import { EMOTION_NAMES, getCoreEmotion, getEmotionColor } from '../constants/emotions.js';

const moodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  emotion: {
    type: String,
    required: true,
    enum: EMOTION_NAMES,
    index: true
  },
  intensity: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3
  },
  
  // ✅ UPDATED: Location is now optional based on user consent
  location: {
    // Location consent tracking
    hasUserConsent: {
      type: Boolean,
      default: false
    },
    consentTimestamp: {
      type: Date,
      default: null
    },
    
    // GeoJSON Point (only if user consented)
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false, // ✅ CHANGED: Now optional
      validate: {
        validator: function(coords) {
          if (!coords || coords.length === 0) return true; // Allow empty if no consent
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates'
      }
    },
    
    // Address components (optional)
    city: {
      type: String,
      required: false, // ✅ CHANGED: Now optional
      trim: true,
      default: null
    },
    region: {
      type: String,
      trim: true,
      default: null
    },
    country: {
      type: String,
      required: false, // ✅ CHANGED: Now optional
      trim: true,
      default: null
    },
    continent: {
      type: String,
      required: false, // ✅ CHANGED: Now optional
      trim: true,
      default: null
    },
    timezone: {
      type: String,
      trim: true,
      default: null
    },
    
    // Location accuracy and source
    accuracy: {
      type: Number, // meters
      default: null
    },
    source: {
      type: String,
      enum: ['gps', 'network', 'passive', 'manual', 'ip_estimate'],
      default: 'network'
    },
    
    // Privacy settings for location
    shareLevel: {
      type: String,
      enum: ['none', 'city_only', 'region_only', 'country_only', 'full'],
      default: 'city_only'
    }
  },
  
  // Enhanced context with more analytics potential
  context: {
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'],
      default: 'unknown'
    },
    temperature: {
      type: Number,
      default: null
    },
    timeOfDay: {
      type: String,
      enum: ['early_morning', 'morning', 'late_morning', 'afternoon', 'evening', 'night', 'late_night'],
      required: true
    },
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    isWeekend: {
      type: Boolean,
      default: false
    },
    isHoliday: {
      type: Boolean,
      default: false
    },
    
    // Activity context for better suggestions
    activityType: {
      type: String,
      enum: ['work', 'school', 'home', 'social', 'exercise', 'travel', 'sleep', 'meals', 'commute', 'leisure', 'other'],
      default: 'other'
    },
    
    // Environmental factors
    socialContext: {
      type: String,
      enum: ['alone', 'with_family', 'with_friends', 'with_colleagues', 'with_strangers', 'with_partner'],
      default: 'alone'
    },
    
    // Health and wellness tracking
    sleepQuality: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    exerciseToday: {
      type: Boolean,
      default: false
    },
    stressLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  
  // Enhanced mood details
  triggers: [{
    type: String,
    enum: [
      'work_stress', 'relationship', 'health', 'money', 'family', 'friends', 
      'achievement', 'loss', 'change', 'uncertainty', 'social_media', 
      'news', 'weather', 'hormones', 'sleep', 'food', 'exercise', 'music', 
      'nature', 'creativity', 'spirituality', 'other'
    ]
  }],
  
  coping_strategies: [{
    type: String,
    enum: [
      'deep_breathing', 'meditation', 'exercise', 'music', 'talking', 'writing',
      'nature', 'rest', 'creative_activity', 'social_connection', 'therapy',
      'medication', 'spiritual_practice', 'distraction', 'other'
    ]
  }],
  
  isAnonymous: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  note: {
    type: String,
    maxlength: 500,
    trim: true
  },
  source: {
    type: String,
    enum: ['mobile', 'web', 'api', 'wearable'],
    default: 'web'
  },
  version: {
    type: String,
    default: '1.0'
  },
  
  // Enhanced privacy and community features
  privacy: {
    type: String,
    enum: ['private', 'friends', 'local_community', 'public'],
    default: 'private'
  },
  
  // Community engagement
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['comfort', 'support', 'love', 'understanding', 'strength', 'hope', 'relate', 'celebrate'],
      default: 'comfort'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isAnonymous: {
      type: Boolean,
      default: true
    }
  }],
  
  // Analytics for suggestions
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    
    // Suggestion tracking
    suggestionsShown: [{
      type: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    suggestionsUsed: [{
      type: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      effectiveness: {
        type: Number,
        min: 1,
        max: 5
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ ENHANCED: Updated indexes for better location-based analytics
moodSchema.index({ location: '2dsphere' });
moodSchema.index({ userId: 1, createdAt: -1 });
moodSchema.index({ emotion: 1, createdAt: -1 });
moodSchema.index({ 'location.country': 1, createdAt: -1 });
moodSchema.index({ 'location.city': 1, createdAt: -1 });
moodSchema.index({ 'location.hasUserConsent': 1 });
moodSchema.index({ 'context.timeOfDay': 1, emotion: 1 });
moodSchema.index({ 'context.activityType': 1, emotion: 1 });
moodSchema.index({ triggers: 1, emotion: 1 });
moodSchema.index({ privacy: 1, createdAt: -1 });

// ✅ ENHANCED: Better location-based analytics
moodSchema.statics.getNearbyMoodStats = function(coordinates, radiusKm = 50, filter = {}) {
  const radiusInRadians = radiusKm / 6371; // Earth's radius in km
  
  return this.aggregate([
    {
      $match: {
        'location.hasUserConsent': true,
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [coordinates, radiusInRadians]
          }
        },
        ...filter
      }
    },
    {
      $group: {
        _id: '$emotion',
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        commonTriggers: { $addToSet: '$triggers' },
        commonCopingStrategies: { $addToSet: '$coping_strategies' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

moodSchema.statics.getLocationBasedSuggestions = function(userId, location) {
  if (!location || !location.hasUserConsent) {
    return this.getGeneralSuggestions(userId);
  }
  
  const radiusInRadians = 25 / 6371; // 25km radius
  
  return this.aggregate([
    {
      $match: {
        userId: { $ne: userId },
        'location.hasUserConsent': true,
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [location.coordinates, radiusInRadians]
          }
        },
        'analytics.suggestionsUsed': { $exists: true, $ne: [] }
      }
    },
    {
      $unwind: '$analytics.suggestionsUsed'
    },
    {
      $match: {
        'analytics.suggestionsUsed.effectiveness': { $gte: 4 }
      }
    },
    {
      $group: {
        _id: '$analytics.suggestionsUsed.type',
        avgEffectiveness: { $avg: '$analytics.suggestionsUsed.effectiveness' },
        count: { $sum: 1 },
        emotions: { $addToSet: '$emotion' }
      }
    },
    { $sort: { avgEffectiveness: -1, count: -1 } },
    { $limit: 10 }
  ]);
};

// ✅ NEW: Smart location sharing based on user preferences
moodSchema.methods.getSharedLocationData = function() {
  if (!this.location.hasUserConsent) {
    return null;
  }
  
  switch (this.location.shareLevel) {
    case 'none':
      return null;
    case 'country_only':
      return {
        country: this.location.country,
        continent: this.location.continent
      };
    case 'region_only':
      return {
        region: this.location.region,
        country: this.location.country,
        continent: this.location.continent
      };
    case 'city_only':
      return {
        city: this.location.city,
        region: this.location.region,
        country: this.location.country
      };
    case 'full':
      return {
        coordinates: this.location.coordinates,
        city: this.location.city,
        region: this.location.region,
        country: this.location.country,
        continent: this.location.continent
      };
    default:
      return {
        city: this.location.city,
        country: this.location.country
      };
  }
};

// ✅ NEW: Enhanced suggestion tracking
moodSchema.methods.trackSuggestionShown = function(suggestionType) {
  this.analytics.suggestionsShown.push({
    type: suggestionType,
    timestamp: new Date()
  });
  return this.save();
};

moodSchema.methods.trackSuggestionUsed = function(suggestionType, effectiveness) {
  this.analytics.suggestionsUsed.push({
    type: suggestionType,
    timestamp: new Date(),
    effectiveness: effectiveness
  });
  return this.save();
};

// ✅ ENHANCED: Pre-save middleware with better time categorization
moodSchema.pre('save', function(next) {
  const now = this.createdAt || new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Enhanced time of day categorization
  if (hour >= 5 && hour < 8) this.context.timeOfDay = 'early_morning';
  else if (hour >= 8 && hour < 11) this.context.timeOfDay = 'morning';
  else if (hour >= 11 && hour < 13) this.context.timeOfDay = 'late_morning';
  else if (hour >= 13 && hour < 18) this.context.timeOfDay = 'afternoon';
  else if (hour >= 18 && hour < 22) this.context.timeOfDay = 'evening';
  else if (hour >= 22 || hour < 2) this.context.timeOfDay = 'night';
  else this.context.timeOfDay = 'late_night';
  
  // Day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  this.context.dayOfWeek = days[day];
  this.context.isWeekend = day === 0 || day === 6;
  
  next();
});

const Mood = mongoose.model('Mood', moodSchema);
export default Mood;