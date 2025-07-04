import mongoose from 'mongoose';

const VentSchema = new mongoose.Schema({
  // Anonymous identifier (no user link by default)
  anonymousId: {
    type: String,
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: false,
    index: true
  },

  content: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  
  emotion: {
    type: String,
    enum: ['joy', 'sadness', 'anger', 'fear', 'disgust', 'confused', 'surprised', 'grateful', 'proud', 'embarrassed', 'guilty', 'ashamed', 'jealous', 'envious', 'lonely', 'bored', 'tired', 'energetic', 'calm', 'peaceful', 'relaxed', 'motivated', 'inspired', 'confident', 'insecure', 'vulnerable', 'nostalgic'],
    required: false
  },
  
  // Intensity of the emotion
  intensity: {
    type: Number,
    min: 0.0,
    max: 1.0,
    default: 0.5
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  // Privacy settings
  privacy: {
    isPublic: {
      type: Boolean,
      default: true
    },
    allowReplies: {
      type: Boolean,
      default: true
    },
    allowReactions: {
      type: Boolean,
      default: true
    },
    blurContent: {
      type: Boolean,
      default: false
    },
    contentWarning: {
      type: String,
      enum: ['none', 'sensitive', 'triggering', 'explicit'],
      default: 'none'
    }
  },
  
  // Location (optional, for regional vents)
  location: {
    city: String,
    country: String,
    region: String,
    timezone: String
  },
  
  // Reactions
  reactions: [{
    type: {
      type: String,
      enum: ['comfort', 'relate', 'hug', 'heart', 'rainbow', 'strength', 'listening'],
      required: true
    },
    anonymousId: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Replies
  replies: [{
    content: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    anonymousId: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    reactions: [{
      type: {
        type: String,
        enum: ['comfort', 'relate', 'hug', 'heart', 'rainbow', 'strength', 'listening']
      },
      anonymousId: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  // Moderation flags
  moderation: {
    isFlagged: {
      type: Boolean,
      default: false
    },
    flaggedBy: [String], // Array of anonymous IDs who flagged
    flaggedReason: {
      type: String,
      enum: ['inappropriate', 'spam', 'harassment', 'other']
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    moderatedAt: Date
  },
  
  // Analytics
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    reactionCount: {
      type: Number,
      default: 0
    },
    replyCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    }
  },
  
  // Session info
  sessionToken: {
    type: String,
    required: false,
    index: true
  },
  
  // Source
  source: {
    type: String,
    enum: ['mobile', 'web', 'api'],
    default: 'web'
  },
  
  // Version
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
VentSchema.index({ createdAt: -1 });
VentSchema.index({ 'privacy.isPublic': 1, createdAt: -1 });
VentSchema.index({ emotion: 1, createdAt: -1 });
VentSchema.index({ tags: 1 });
VentSchema.index({ 'location.country': 1, createdAt: -1 });
VentSchema.index({ 'moderation.isHidden': 1 });

// Virtuals
VentSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

VentSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

VentSchema.virtual('isAnonymous').get(function() {
  return !this.userId;
});

// Methods
VentSchema.methods.addReaction = function(reactionType, anonymousId) {
  // Check if user already reacted
  const existingReaction = this.reactions.find(r => r.anonymousId === anonymousId);
  if (existingReaction) {
    existingReaction.type = reactionType;
    existingReaction.timestamp = new Date();
  } else {
    this.reactions.push({
      type: reactionType,
      anonymousId,
      timestamp: new Date()
    });
  }
  
  this.analytics.reactionCount = this.reactions.length;
  return this.save();
};

VentSchema.methods.addReply = function(content, anonymousId) {
  this.replies.push({
    content,
    anonymousId,
    timestamp: new Date()
  });
  
  this.analytics.replyCount = this.replies.length;
  return this.save();
};

VentSchema.methods.flag = function(reason, anonymousId) {
  if (!this.moderation.flaggedBy.includes(anonymousId)) {
    this.moderation.flaggedBy.push(anonymousId);
  }
  
  if (this.moderation.flaggedBy.length >= 3) {
    this.moderation.isFlagged = true;
    this.moderation.flaggedReason = reason;
  }
  
  return this.save();
};

// Static methods
VentSchema.statics.getPublicVents = function(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  const query = {
    'privacy.isPublic': true,
    'moderation.isHidden': false
  };
  
  if (filters.emotion) {
    query.emotion = filters.emotion;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.country) {
    query['location.country'] = filters.country;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-moderation.flaggedBy -sessionToken');
};

VentSchema.statics.getRegionalVents = function(country, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    'privacy.isPublic': true,
    'moderation.isHidden': false,
    'location.country': country
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-moderation.flaggedBy -sessionToken');
};

export default mongoose.model('Vent', VentSchema);