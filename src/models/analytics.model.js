import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  stats: {
    totalMoods: {
      type: Number,
      default: 0
    },
    dominantEmotion: {
      emotion: String,
      count: Number,
      percentage: Number
    },
    emotionBreakdown: [{
      emotion: String,
      count: Number,
      avgIntensity: Number,
      percentage: Number
    }],
    moodScore: {
      type: Number,
      min: 0,
      max: 100
    },
    streaks: {
      current: {
        emotion: String,
        days: Number
      },
      longest: {
        emotion: String,
        days: Number,
        startDate: Date,
        endDate: Date
      }
    },
    patterns: {
      mostActiveTime: String,
      mostActiveDay: String,
      commonLocations: [String]
    }
  },
  insights: [{
    type: String,
    message: String,
    category: {
      type: String,
      enum: ['positive', 'concern', 'neutral', 'achievement']
    },
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  }],
  recommendations: [{
    type: String,
    title: String,
    description: String,
    category: {
      type: String,
      enum: ['music', 'activity', 'mindfulness', 'social', 'professional']
    },
    data: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Compound indexes
analyticsSchema.index({ userId: 1, date: -1 });
analyticsSchema.index({ 'stats.moodScore': -1 });

export default mongoose.model('Analytics', analyticsSchema);
