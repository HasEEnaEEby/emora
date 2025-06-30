
import mongoose from 'mongoose';

const EmotionTimelineSchema = new mongoose.Schema({
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
  
  // Timeline entries for the day
  timeline: [{
    timestamp: {
      type: Date,
      required: true
    },
    emotion: {
      type: String,
      required: true,
      enum: ['joy', 'sadness', 'anger', 'fear', 'disgust']
    },
    intensity: {
      type: Number,
      required: true,
      min: 0.0,
      max: 1.0
    },
    duration: {
      type: Number, // in minutes
      default: 0
    },
    context: {
      activity: String,
      location: String,
      trigger: String
    }
  }],
  
  // Daily summary
  summary: {
    dominantEmotion: {
      type: String,
      enum: ['joy', 'sadness', 'anger', 'fear', 'disgust']
    },
    emotionDistribution: {
      joy: { type: Number, default: 0 },
      sadness: { type: Number, default: 0 },
      anger: { type: Number, default: 0 },
      fear: { type: Number, default: 0 },
      disgust: { type: Number, default: 0 }
    },
    avgIntensity: {
      type: Number,
      min: 0.0,
      max: 1.0
    },
    totalEntries: {
      type: Number,
      default: 0
    },
    moodStability: {
      type: Number, // 0-1, how stable emotions were
      min: 0.0,
      max: 1.0
    }
  },
  
  // Insights generated from the timeline
  insights: [{
    type: {
      type: String,
      enum: ['pattern', 'trigger', 'suggestion', 'achievement']
    },
    message: String,
    confidence: {
      type: Number,
      min: 0.0,
      max: 1.0
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound indexes
EmotionTimelineSchema.index({ userId: 1, date: -1 });
EmotionTimelineSchema.index({ 'summary.dominantEmotion': 1, date: -1 });

export default mongoose.model('EmotionTimeline', EmotionTimelineSchema);