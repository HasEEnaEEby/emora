import mongoose from 'mongoose';

const communityPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  moodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mood',
    required: false 
  },
  
  content: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  
  emoji: {
    type: String,
    required: true
  },
  
  activityType: {
    type: String,
    enum: [
      'Achievement', 
      'Mindfulness', 
      'Exercise', 
      'Gratitude', 
      'Social', 
      'Relaxation',
      'Learning',
      'Creative',
      'Adventure',
      'General'
    ],
    default: 'General'
  },
  
  location: {
    city: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function(coords) {
          return !coords || (coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90);
        },
        message: 'Invalid coordinates'
      }
    }
  },
  
  privacy: {
    type: String,
    enum: ['public', 'friends'],
    default: 'public'
  },
  
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['comfort', 'support', 'love', 'understanding', 'strength', 'hope', 'celebrate'],
      default: 'support'
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
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  reportCount: {
    type: Number,
    default: 0
  },
  
  shareCount: {
    type: Number,
    default: 0
  },
  
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
communityPostSchema.index({ userId: 1, createdAt: -1 });
communityPostSchema.index({ privacy: 1, createdAt: -1 });
communityPostSchema.index({ activityType: 1, createdAt: -1 });
communityPostSchema.index({ isActive: 1, createdAt: -1 });
communityPostSchema.index({ 'location.country': 1, createdAt: -1 });
communityPostSchema.index({ 'location.city': 1, createdAt: -1 });
communityPostSchema.index({ 'reactions.userId': 1 });
communityPostSchema.index({ reportCount: 1 });
communityPostSchema.index({ shareCount: -1 });
communityPostSchema.index({ viewCount: -1 });

// Virtual for reaction count
communityPostSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Virtual for comment count
communityPostSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Instance methods
communityPostSchema.methods.addReaction = function(userId, emoji, type = 'support') {
  // Check if user already reacted
  const existingReaction = this.reactions.find(
    reaction => reaction.userId.toString() === userId.toString()
  );

  if (existingReaction) {
    // Update existing reaction
    existingReaction.emoji = emoji;
    existingReaction.type = type;
    existingReaction.createdAt = new Date();
  } else {
    // Add new reaction
    this.reactions.push({
      userId,
      emoji,
      type,
      createdAt: new Date()
    });
  }

  return this.save();
};

communityPostSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.userId.toString() !== userId.toString()
  );
  return this.save();
};

communityPostSchema.methods.addComment = function(userId, message, isAnonymous = true) {
  this.comments.push({
    userId,
    message,
    isAnonymous,
    createdAt: new Date()
  });
  return this.save();
};

communityPostSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(
    comment => comment._id.toString() !== commentId.toString()
  );
  return this.save();
};

communityPostSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

communityPostSchema.methods.incrementShare = function() {
  this.shareCount += 1;
  return this.save();
};

communityPostSchema.methods.reportPost = function() {
  this.reportCount += 1;
  if (this.reportCount >= 5) {
    this.isActive = false;
  }
  return this.save();
};

communityPostSchema.methods.hasUserReacted = function(userId) {
  return this.reactions.some(
    reaction => reaction.userId.toString() === userId.toString()
  );
};

communityPostSchema.methods.getUserReaction = function(userId) {
  return this.reactions.find(
    reaction => reaction.userId.toString() === userId.toString()
  );
};

communityPostSchema.methods.canUserView = function(userId, userFriends = []) {
  if (!this.isActive) return false;
  if (this.privacy === 'public') return true;
  if (this.privacy === 'friends') {
    return this.userId.toString() === userId.toString() || 
           userFriends.some(friendId => friendId.toString() === this.userId.toString());
  }
  return false;
};

// Static methods
communityPostSchema.statics.getPublicFeed = function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    privacy: 'public',
    isActive: true
  })
  .populate('userId', 'username profile.displayName selectedAvatar location')
  .populate('moodId', 'emotion intensity createdAt')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

communityPostSchema.statics.getFriendsFeed = function(friendIds, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    userId: { $in: friendIds },
    privacy: { $in: ['public', 'friends'] },
    isActive: true
  })
  .populate('userId', 'username profile.displayName selectedAvatar location')
  .populate('moodId', 'emotion intensity createdAt')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

communityPostSchema.statics.getPostsByActivityType = function(activityType, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    activityType,
    privacy: 'public',
    isActive: true
  })
  .populate('userId', 'username profile.displayName selectedAvatar location')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

communityPostSchema.statics.getTrendingPosts = function(timeRange = 24, limit = 20) {
  const timeThreshold = new Date(Date.now() - timeRange * 60 * 60 * 1000);
  
  return this.find({
    privacy: 'public',
    isActive: true,
    createdAt: { $gte: timeThreshold }
  })
  .populate('userId', 'username profile.displayName selectedAvatar location')
  .sort({ 
    reactionCount: -1, 
    commentCount: -1, 
    viewCount: -1,
    createdAt: -1 
  })
  .limit(limit);
};

const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);

export default CommunityPost; 