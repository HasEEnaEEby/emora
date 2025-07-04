import mongoose from 'mongoose';

export const EMOTION_NAMES = [
  'joy', 'sadness', 'anger', 'fear', 'disgust',
  
  // Joy family
  'happy', 'joyful', 'excited', 'cheerful', 'delighted', 'ecstatic', 'elated', 'euphoric',
  'glad', 'pleased', 'content', 'satisfied', 'blissful', 'overjoyed', 'thrilled',
  
  // Sadness family
  'sad', 'depressed', 'melancholy', 'gloomy', 'dejected', 'despondent', 'sorrowful',
  'mournful', 'blue', 'down', 'miserable', 'heartbroken', 'grief-stricken',
  
  // Anger family
  'angry', 'furious', 'mad', 'irritated', 'annoyed', 'frustrated', 'enraged',
  'livid', 'irate', 'outraged', 'indignant', 'resentful', 'aggravated',
  
  // Fear family
  'scared', 'afraid', 'fearful', 'anxious', 'worried', 'nervous', 'terrified',
  'panicked', 'alarmed', 'apprehensive', 'uneasy', 'stressed', 'overwhelmed',
  
  // Disgust family
  'disgusted', 'revolted', 'repulsed', 'sickened', 'nauseated', 'appalled',
  'horrified', 'disturbed', 'offended', 'contemptuous',
  
  // Mixed/Complex emotions
  'confused', 'surprised', 'shocked', 'amazed', 'curious', 'hopeful', 'grateful',
  'proud', 'embarrassed', 'guilty', 'ashamed', 'jealous', 'envious', 'lonely',
  'bored', 'tired', 'energetic', 'calm', 'peaceful', 'relaxed', 'motivated',
  'inspired', 'confident', 'insecure', 'vulnerable', 'nostalgic',
  
  // Additional emotions
  'love', 'excitement', 'anxiety', 'loneliness', 'gratitude',
  'stress', 'relieved', 'nervous', 'disappointed'
];

export const CORE_EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'disgust'];

export const EMOTION_MAPPINGS = {
  // Core emotions map to themselves
  'joy': 'joy',
  'sadness': 'sadness',
  'anger': 'anger',
  'fear': 'fear',
  'disgust': 'disgust',
  
  // Joy mappings
  'happy': 'joy', 'joyful': 'joy', 'excited': 'joy', 'cheerful': 'joy',
  'delighted': 'joy', 'ecstatic': 'joy', 'elated': 'joy', 'euphoric': 'joy',
  'glad': 'joy', 'pleased': 'joy', 'content': 'joy', 'satisfied': 'joy',
  'blissful': 'joy', 'overjoyed': 'joy', 'thrilled': 'joy', 'grateful': 'joy',
  'proud': 'joy', 'confident': 'joy', 'inspired': 'joy', 'motivated': 'joy',
  'energetic': 'joy', 'hopeful': 'joy', 'love': 'joy', 'excitement': 'joy',
  'gratitude': 'joy', 'calm': 'joy', 'peaceful': 'joy', 'relaxed': 'joy',
  'relieved': 'joy', 'surprised': 'joy', 'amazed': 'joy', 'curious': 'joy',
  
  // Sadness mappings
  'sad': 'sadness', 'depressed': 'sadness', 'melancholy': 'sadness',
  'gloomy': 'sadness', 'dejected': 'sadness', 'despondent': 'sadness',
  'sorrowful': 'sadness', 'mournful': 'sadness', 'blue': 'sadness',
  'down': 'sadness', 'miserable': 'sadness', 'heartbroken': 'sadness',
  'grief-stricken': 'sadness', 'lonely': 'sadness', 'nostalgic': 'sadness',
  'guilty': 'sadness', 'ashamed': 'sadness', 'insecure': 'sadness',
  'vulnerable': 'sadness', 'loneliness': 'sadness', 'disappointed': 'sadness',
  'bored': 'sadness', 'tired': 'sadness',
  
  // Anger mappings
  'angry': 'anger', 'furious': 'anger', 'mad': 'anger', 'irritated': 'anger',
  'annoyed': 'anger', 'frustrated': 'anger', 'enraged': 'anger', 'livid': 'anger',
  'irate': 'anger', 'outraged': 'anger', 'indignant': 'anger', 'resentful': 'anger',
  'aggravated': 'anger', 'jealous': 'anger', 'envious': 'anger',
  
  // Fear mappings
  'scared': 'fear', 'afraid': 'fear', 'fearful': 'fear', 'anxious': 'fear',
  'worried': 'fear', 'nervous': 'fear', 'terrified': 'fear', 'panicked': 'fear',
  'alarmed': 'fear', 'apprehensive': 'fear', 'uneasy': 'fear', 'stressed': 'fear',
  'overwhelmed': 'fear', 'confused': 'fear', 'shocked': 'fear', 'anxiety': 'fear',
  'stress': 'fear',
  
  // Disgust mappings
  'disgusted': 'disgust', 'revolted': 'disgust', 'repulsed': 'disgust',
  'sickened': 'disgust', 'nauseated': 'disgust', 'appalled': 'disgust',
  'horrified': 'disgust', 'disturbed': 'disgust', 'offended': 'disgust',
  'contemptuous': 'disgust', 'embarrassed': 'disgust'
};

// Helper function to get core emotion
export const getCoreEmotion = (emotion) => {
  return EMOTION_MAPPINGS[emotion?.toLowerCase()] || 'joy';
};

// ============================================================================
// UNIFIED EMOTION SCHEMA
// ============================================================================

const UnifiedEmotionSchema = new mongoose.Schema({
  // User association
  userId: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and Number for flexibility
    ref: 'User',
    required: false, // Allow anonymous emotions
    // Note: No manual index - handled by compound indexes below
  },
  
  // Emotion data
  emotion: {
    type: String,
    required: true,
    enum: EMOTION_NAMES,
    // Note: No manual index - handled by compound indexes below
  },
  
  coreEmotion: {
    type: String,
    required: false, // Auto-generated in pre-save middleware
    enum: CORE_EMOTIONS,
    // Note: No manual index - handled by compound indexes below
  },
  
  intensity: {
    type: Number,
    required: true,
    min: 0.0,
    max: 1.0,
    default: 0.5
  },
  
  legacyIntensity: {
    type: Number,
    min: 1,
    max: 5
  },
  
  // Secondary emotions for complex emotional states
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
  
  // Location data (GeoJSON format)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      // Note: No manual index - handled by compound indexes below
      validate: {
        validator: function(coords) {
          // Allow empty coordinates for privacy
          if (!coords || coords.length === 0) return true;
          // Validate coordinates if provided
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates - must be [longitude, latitude]'
      }
    },
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    country: { type: String, trim: true },
    continent: { type: String, trim: true },
    timezone: { type: String, trim: true }
  },
  
  // Contextual information
  context: {
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'],
      default: 'unknown'
    },
    temperature: Number,
    
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night']
    },
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    isWeekend: { type: Boolean, default: false },
    
    socialContext: {
      type: String,
      enum: ['alone', 'with_friends', 'with_family', 'with_partner', 'with_colleagues', 'in_public']
    },
    
    activity: {
      type: String,
      enum: ['working', 'studying', 'exercising', 'relaxing', 'socializing', 'commuting', 'sleeping', 'eating', 'venting', 'other']
    },
    
    trigger: { type: String, maxlength: 500 }
  },
  
  // Memory and notes
  memory: {
    description: { type: String, maxlength: 1000 },
    tags: [String],
    isPrivate: { type: Boolean, default: true },
    photos: [String],
    associatedSongs: [{
      title: String,
      artist: String,
      spotifyId: String
    }]
  },
  
  // Privacy settings
  privacyLevel: {
    type: String,
    enum: ['private', 'friends', 'public'],
    default: 'private'
  },
  
  // Social features
  comfortReactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ComfortReaction'
  }],
  
  // Analytics data
  analytics: {
    duration: { type: Number, default: 0 },
    peakIntensity: { type: Number, min: 0.0, max: 1.0 },
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
  
  // Global sharing for heatmap
  globalSharing: {
    isShared: { type: Boolean, default: false },
    anonymousId: String,
    sharedAt: Date
  },
  
  // Metadata
  isAnonymous: { type: Boolean, default: true },
  note: { type: String, maxlength: 500, trim: true },
  source: {
    type: String,
    enum: ['mobile', 'web', 'api'],
    default: 'web'
  },
  version: { type: String, default: '2.0' },
  
  // Custom timestamp for flexibility
  timestamp: {
    type: Date,
    default: Date.now
    // Note: No manual index - this was causing the duplicate warnings
  },
  
  timezone: {
    type: String,
    required: true,
    default: 'UTC'
  },
  
  accuracy: {
    type: Number,
    min: 0.0,
    max: 1.0,
    default: 1.0
  }
}, {
  timestamps: true, // This creates createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEXES - Only add what's needed, avoid duplicates
// ============================================================================

// Compound indexes for common queries
UnifiedEmotionSchema.index({ userId: 1, createdAt: -1 }); // User emotion timeline
UnifiedEmotionSchema.index({ emotion: 1, createdAt: -1 }); // Emotion type analysis
UnifiedEmotionSchema.index({ coreEmotion: 1, createdAt: -1 }); // Core emotion analysis

// Geospatial index for location-based queries
UnifiedEmotionSchema.index({ 'location.coordinates': '2dsphere' }); // Heatmap queries

// Location-based compound indexes
UnifiedEmotionSchema.index({ 'location.country': 1, createdAt: -1 }); // Country analysis
UnifiedEmotionSchema.index({ 'location.city': 1, createdAt: -1 }); // City analysis

// Context-based indexes
UnifiedEmotionSchema.index({ 'context.timeOfDay': 1, emotion: 1 }); // Time pattern analysis

// Global sharing index (for public heatmap)
UnifiedEmotionSchema.index({ 'globalSharing.isShared': 1, createdAt: -1 }); // Public emotions

// Privacy level index
UnifiedEmotionSchema.index({ privacyLevel: 1, createdAt: -1 }); // Privacy filtering

// NOTE: We do NOT add manual timestamp index as it conflicts with createdAt

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

UnifiedEmotionSchema.pre('save', function(next) {
  // Always set coreEmotion based on emotion
  this.coreEmotion = getCoreEmotion(this.emotion);
  
  // Handle intensity conversions between legacy (1-5) and new (0.0-1.0) systems
  if (this.legacyIntensity && !this.intensity) {
    this.intensity = (this.legacyIntensity - 1) / 4;
  }
  
  if (this.intensity && !this.legacyIntensity) {
    this.legacyIntensity = Math.round((this.intensity * 4) + 1);
  }
  
  // Auto-fill context based on timestamp
  const now = this.createdAt || new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  if (!this.context) {
    this.context = {};
  }
  
  // Auto-detect time of day
  if (!this.context.timeOfDay) {
    if (hour >= 6 && hour < 12) this.context.timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) this.context.timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) this.context.timeOfDay = 'evening';
    else this.context.timeOfDay = 'night';
  }
  
  // Auto-detect day of week
  if (!this.context.dayOfWeek) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    this.context.dayOfWeek = days[day];
    this.context.isWeekend = day === 0 || day === 6;
  }
  
  next();
});

// ============================================================================
// VIRTUALS
// ============================================================================

UnifiedEmotionSchema.virtual('emotionColor').get(function() {
  const colors = {
    'joy': '#F59E0B',      // Warm yellow/orange
    'sadness': '#3B82F6',   // Blue
    'anger': '#EF4444',     // Red
    'fear': '#8B5CF6',      // Purple
    'disgust': '#10B981'    // Green
  };
  return colors[this.coreEmotion] || '#6B7280';
});

UnifiedEmotionSchema.virtual('coreEmotionColor').get(function() {
  const colors = {
    'joy': '#F59E0B',
    'sadness': '#3B82F6',
    'anger': '#EF4444',
    'fear': '#8B5CF6',
    'disgust': '#10B981'
  };
  return colors[this.coreEmotion] || '#6B7280';
});

UnifiedEmotionSchema.virtual('emotionCharacter').get(function() {
  const characters = {
    'joy': { 
      name: 'Joy', 
      description: 'Optimistic and energetic', 
      color: '#F59E0B',
      emoji: '😊' 
    },
    'sadness': { 
      name: 'Sadness', 
      description: 'Thoughtful and empathetic', 
      color: '#3B82F6',
      emoji: '😢' 
    },
    'anger': { 
      name: 'Anger', 
      description: 'Passionate about fairness', 
      color: '#EF4444',
      emoji: '😠' 
    },
    'fear': { 
      name: 'Fear', 
      description: 'Protective and cautious', 
      color: '#8B5CF6',
      emoji: '😰' 
    },
    'disgust': { 
      name: 'Disgust', 
      description: 'Maintains high standards', 
      color: '#10B981',
      emoji: '🤢' 
    }
  };
  return characters[this.coreEmotion] || characters['joy'];
});

UnifiedEmotionSchema.virtual('reactionCount', {
  ref: 'ComfortReaction',
  localField: '_id',
  foreignField: 'emotionEntry',
  count: true
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

UnifiedEmotionSchema.methods.getEmotionColor = function() {
  return this.emotionColor;
};

UnifiedEmotionSchema.methods.getDominantEmotion = function() {
  if (!this.secondaryEmotions || this.secondaryEmotions.length === 0) {
    return {
      emotion: this.emotion,
      coreEmotion: this.coreEmotion,
      intensity: this.intensity
    };
  }
  
  let dominant = { 
    emotion: this.emotion, 
    coreEmotion: this.coreEmotion, 
    intensity: this.intensity 
  };
  
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
    timestamp: this.timestamp || this.createdAt,
    context: this.context,
    location: this.location?.city || this.location?.country || 'Unknown'
  };
};

UnifiedEmotionSchema.methods.getPublicData = function() {
  return {
    id: this._id,
    emotion: this.emotion,
    coreEmotion: this.coreEmotion,
    intensity: this.intensity,
    character: this.emotionCharacter,
    color: this.emotionColor,
    timestamp: this.timestamp || this.createdAt,
    context: {
      timeOfDay: this.context?.timeOfDay,
      weather: this.context?.weather,
      activity: this.context?.activity
    },
    location: this.privacyLevel === 'public' ? {
      city: this.location?.city,
      country: this.location?.country
    } : null,
    note: this.privacyLevel === 'public' ? this.note : null
  };
};

// ============================================================================
// STATIC METHODS
// ============================================================================

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

  // Add geospatial bounds if provided
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
    { $limit: 1000 } // Limit for performance
  ]);
};

UnifiedEmotionSchema.statics.getEmotionTrends = function(filter = {}, timeframe = '7d') {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  }

  const matchQuery = {
    ...filter,
    $or: [
      { timestamp: { $gte: startDate } },
      { createdAt: { $gte: startDate } }
    ]
  };

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $ifNull: ['$timestamp', '$createdAt'] }
            }
          },
          coreEmotion: '$coreEmotion'
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
};

UnifiedEmotionSchema.statics.findSimilarEmotions = function(emotion, userId, limit = 10) {
  const matchQuery = {
    coreEmotion: getCoreEmotion(emotion),
    privacyLevel: { $in: ['public', 'friends'] }
  };

  if (userId) {
    matchQuery.userId = { $ne: userId }; // Exclude user's own emotions
  }

  return this.find(matchQuery)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('emotion coreEmotion intensity note context.activity location.city createdAt')
    .lean();
};

// ============================================================================
// EXPORT MODEL
// ============================================================================

const UnifiedEmotion = mongoose.model('UnifiedEmotion', UnifiedEmotionSchema);

export default UnifiedEmotion;