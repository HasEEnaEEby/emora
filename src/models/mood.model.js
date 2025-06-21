import mongoose from 'mongoose';
import { EMOTION_NAMES, getEmotionCategory, getEmotionColor } from '../constants/emotions.js';

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
  return getEmotionCategory(this.emotion);
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

// Instance methods
moodSchema.methods.getEmotionColor = function() {
  return getEmotionColor(this.emotion);
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
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  this.context.dayOfWeek = days[day];
  this.context.isWeekend = day === 0 || day === 6;
  
  next();
});

const Mood = mongoose.model('Mood', moodSchema);

export default Mood;
