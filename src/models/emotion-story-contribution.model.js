import mongoose from 'mongoose';

const emotionStoryContributionSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmotionStory',
    required: true
  },
  contributor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emotion: {
    type: String,
    required: true,
    enum: [
      'joy', 'excitement', 'contentment', 'gratitude', 'love', 'hope',
      'sadness', 'anger', 'fear', 'anxiety', 'disgust', 'shame',
      'surprise', 'confusion', 'curiosity', 'amusement', 'pride',
      'relief', 'nostalgia', 'awe', 'inspiration', 'peace'
    ]
  },
  intensity: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  context: {
    activity: {
      type: String,
      enum: ['work', 'school', 'home', 'social', 'exercise', 'travel', 'sleep', 'meals', 'commute', 'leisure', 'other'],
      default: 'other'
    },
    location: {
      type: String,
      trim: true
    },
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'],
      default: 'unknown'
    },
    socialContext: {
      type: String,
      enum: ['alone', 'with_family', 'with_friends', 'with_colleagues', 'with_strangers', 'with_partner'],
      default: 'alone'
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  media: {
    type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      default: null
    },
    url: {
      type: String,
      default: null
    },
    thumbnail: {
      type: String,
      default: null
    }
  },
  reactions: [{
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['heart', 'hug', 'support', 'celebration', 'empathy'],
      required: true
    },
    message: {
      type: String,
      maxlength: 100
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isApproved: {
    type: Boolean,
    default: true // Will be false if story requires approval
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
emotionStoryContributionSchema.index({ storyId: 1, createdAt: -1 });
emotionStoryContributionSchema.index({ contributor: 1, storyId: 1 });
emotionStoryContributionSchema.index({ isApproved: 1, storyId: 1 });
emotionStoryContributionSchema.index({ emotion: 1, storyId: 1 });

// Virtual for reaction count
emotionStoryContributionSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Method to add reaction
emotionStoryContributionSchema.methods.addReaction = function(fromUserId, type, message = null, isAnonymous = false) {
  // Check if user already reacted
  const existingReaction = this.reactions.find(r => 
    r.fromUser.toString() === fromUserId.toString() && r.type === type
  );
  
  if (existingReaction) {
    throw new Error('User has already reacted with this type');
  }
  
  this.reactions.push({
    fromUser: fromUserId,
    type,
    message,
    isAnonymous,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
emotionStoryContributionSchema.methods.removeReaction = function(fromUserId, type) {
  const reactionIndex = this.reactions.findIndex(r => 
    r.fromUser.toString() === fromUserId.toString() && r.type === type
  );
  
  if (reactionIndex === -1) {
    throw new Error('Reaction not found');
  }
  
  this.reactions.splice(reactionIndex, 1);
  return this.save();
};

export default mongoose.model('EmotionStoryContribution', emotionStoryContributionSchema); 