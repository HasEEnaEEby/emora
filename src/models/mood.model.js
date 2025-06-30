// src/models/mood.model.js - Fixed version
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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
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
      required: true,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    continent: {
      type: String,
      required: true,
      trim: true
    },
    timezone: {
      type: String,
      trim: true
    }
  },
  context: {
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'],
      default: 'unknown'
    },
    temperature: Number,
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
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
    }
  },
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
    enum: ['mobile', 'web', 'api'],
    default: 'web'
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

// Indexes for performance
moodSchema.index({ location: '2dsphere' });
moodSchema.index({ userId: 1, createdAt: -1 });
moodSchema.index({ emotion: 1, createdAt: -1 });
moodSchema.index({ 'location.country': 1, createdAt: -1 });
moodSchema.index({ 'location.city': 1, createdAt: -1 });
moodSchema.index({ 'context.timeOfDay': 1, emotion: 1 });
moodSchema.index({ createdAt: -1 });

// Virtual for emotion category - FIXED VERSION
moodSchema.virtual('emotionCategory').get(function() {
  return getCoreEmotion(this.emotion); // Use getCoreEmotion instead of getEmotionCategory
});

// Virtual for core emotion (Inside Out style)
moodSchema.virtual('coreEmotion').get(function() {
  return getCoreEmotion(this.emotion);
});

// Static methods
moodSchema.statics.getEmotionStats = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$emotion',
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

moodSchema.statics.getCoreEmotionStats = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $addFields: {
        coreEmotion: {
          $switch: {
            branches: [
              { case: { $in: ['$emotion', ['happy', 'joyful', 'excited', 'cheerful', 'delighted', 'content', 'grateful', 'proud']] }, then: 'joy' },
              { case: { $in: ['$emotion', ['sad', 'depressed', 'melancholy', 'lonely', 'heartbroken', 'nostalgic']] }, then: 'sadness' },
              { case: { $in: ['$emotion', ['angry', 'furious', 'frustrated', 'annoyed', 'irritated', 'jealous']] }, then: 'anger' },
              { case: { $in: ['$emotion', ['scared', 'anxious', 'worried', 'nervous', 'stressed', 'overwhelmed']] }, then: 'fear' },
              { case: { $in: ['$emotion', ['disgusted', 'revolted', 'appalled', 'offended', 'embarrassed']] }, then: 'disgust' }
            ],
            default: 'joy'
          }
        }
      }
    },
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

moodSchema.statics.getLocationStats = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          city: '$location.city',
          country: '$location.country',
          coordinates: '$location.coordinates'
        },
        count: { $sum: 1 },
        emotions: { $push: { emotion: '$emotion', intensity: '$intensity' } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

moodSchema.statics.getGlobalMoodHeatmap = function(bounds, timeRange) {
  const matchQuery = {
    createdAt: { $gte: timeRange.startDate, $lte: timeRange.endDate }
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
      $addFields: {
        coreEmotion: {
          $switch: {
            branches: [
              { case: { $in: ['$emotion', ['happy', 'joyful', 'excited', 'cheerful', 'delighted', 'content', 'grateful', 'proud']] }, then: 'joy' },
              { case: { $in: ['$emotion', ['sad', 'depressed', 'melancholy', 'lonely', 'heartbroken', 'nostalgic']] }, then: 'sadness' },
              { case: { $in: ['$emotion', ['angry', 'furious', 'frustrated', 'annoyed', 'irritated', 'jealous']] }, then: 'anger' },
              { case: { $in: ['$emotion', ['scared', 'anxious', 'worried', 'nervous', 'stressed', 'overwhelmed']] }, then: 'fear' },
              { case: { $in: ['$emotion', ['disgusted', 'revolted', 'appalled', 'offended', 'embarrassed']] }, then: 'disgust' }
            ],
            default: 'joy'
          }
        }
      }
    },
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
        lastUpdate: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 1000 }
  ]);
};

// Instance methods
moodSchema.methods.getEmotionColor = function() {
  return getEmotionColor(this.emotion);
};

moodSchema.methods.getCoreEmotion = function() {
  return getCoreEmotion(this.emotion);
};

// Pre-save middleware
moodSchema.pre('save', function(next) {
  // Set context based on timestamp
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Time of day
  if (hour >= 6 && hour < 12) this.context.timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) this.context.timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) this.context.timeOfDay = 'evening';
  else this.context.timeOfDay = 'night';
  
  // Day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  this.context.dayOfWeek = days[day];
  this.context.isWeekend = day === 0 || day === 6;
  
  next();
});

const Mood = mongoose.model('Mood', moodSchema);

export default Mood;