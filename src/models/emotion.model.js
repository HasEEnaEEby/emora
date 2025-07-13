// src/models/emotion.model.js
import mongoose from 'mongoose';

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
      
      // Neutral emotions
      'calm', 'peaceful', 'neutral', 'focused', 'curious', 'thoughtful',
      'contemplative', 'reflective', 'alert', 'balanced'
    ],
  },
  emotion: {
    type: String,
    lowercase: true,
    // For backward compatibility
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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
    },
    address: {
      type: String,
      trim: true,
    },
  },
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

// Indexes for better performance
emotionSchema.index({ userId: 1, createdAt: -1 });
emotionSchema.index({ userId: 1, type: 1 });
emotionSchema.index({ userId: 1, intensity: 1 });
emotionSchema.index({ createdAt: -1 });
emotionSchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for emotion category
emotionSchema.virtual('category').get(function() {
  const positiveEmotions = ['joy', 'happiness', 'excitement', 'love', 'gratitude', 'contentment', 'pride', 'relief', 'hope', 'enthusiasm', 'serenity', 'bliss'];
  const negativeEmotions = ['sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 'loneliness', 'stress', 'guilt', 'shame', 'jealousy', 'regret'];
  
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
                        ['sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 'loneliness', 'stress', 'guilt', 'shame', 'jealousy', 'regret']
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

// Pre-save middleware
emotionSchema.pre('save', function(next) {
  // Ensure type is set (backward compatibility)
  if (!this.type && this.emotion) {
    this.type = this.emotion;
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