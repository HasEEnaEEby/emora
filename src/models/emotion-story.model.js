import mongoose from 'mongoose';

const emotionStorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined'],
      default: 'invited'
    },
    joinedAt: {
      type: Date,
      default: null
    }
  }],
  privacy: {
    type: String,
    enum: ['private', 'friends', 'public'],
    default: 'friends'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  coverImage: {
    type: String,
    default: null
  },
  settings: {
    allowAnonymousContributions: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    maxParticipants: {
      type: Number,
      default: 10,
      min: 2,
      max: 50
    }
  },
  analytics: {
    totalContributions: {
      type: Number,
      default: 0
    },
    averageMood: {
      type: Number,
      default: 0
    },
    mostCommonEmotion: {
      type: String,
      default: null
    },
    lastActivity: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
emotionStorySchema.index({ creator: 1, isActive: 1 });
emotionStorySchema.index({ 'participants.user': 1, isActive: 1 });
emotionStorySchema.index({ privacy: 1, isActive: 1 });
emotionStorySchema.index({ startDate: 1, endDate: 1 });

// Virtual for participant count
emotionStorySchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.status === 'accepted').length;
});

// Method to check if user is participant
emotionStorySchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => 
    p.user.toString() === userId.toString() && p.status === 'accepted'
  );
};

// Method to check if user can contribute
emotionStorySchema.methods.canContribute = function(userId) {
  return this.isParticipant(userId) && this.isActive;
};

export default mongoose.model('EmotionStory', emotionStorySchema); 