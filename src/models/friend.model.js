import mongoose from 'mongoose';

const FriendSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending',
    index: true
  },
  
  privacy: {
    allowMoodSharing: {
      type: Boolean,
      default: true
    },
    allowCheckIns: {
      type: Boolean,
      default: true
    },
    allowNotifications: {
      type: Boolean,
      default: true
    },
    visibleOnHeatmap: {
      type: Boolean,
      default: false
    }
  },
  
  metadata: {
    mutualFriends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    sharedInterests: [String],
    lastInteraction: Date,
    friendshipStrength: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  },
  
  request: {
    message: {
      type: String,
      maxlength: 200,
      trim: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  },
  
  response: {
    message: {
      type: String,
      maxlength: 200,
      trim: true
    },
    respondedAt: Date,
    autoAccepted: {
      type: Boolean,
      default: false
    }
  },
  
  activity: {
    checkInsSent: {
      type: Number,
      default: 0
    },
    checkInsReceived: {
      type: Number,
      default: 0
    },
    moodShares: {
      type: Number,
      default: 0
    },
    lastCheckIn: Date,
    lastMoodShare: Date
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

FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true });
FriendSchema.index({ status: 1, createdAt: -1 });
FriendSchema.index({ 'activity.lastCheckIn': -1 });

FriendSchema.virtual('isActive').get(function() {
  return this.status === 'accepted' && 
         this.request.expiresAt > new Date();
});

FriendSchema.virtual('canShareMoods').get(function() {
  return this.status === 'accepted' && 
         this.privacy.allowMoodSharing;
});

FriendSchema.virtual('canCheckIn').get(function() {
  return this.status === 'accepted' && 
         this.privacy.allowCheckIns;
});

FriendSchema.methods.acceptRequest = function(message = null) {
  this.status = 'accepted';
  this.response = {
    message,
    respondedAt: new Date(),
    autoAccepted: false
  };
  this.request.expiresAt = null; // Remove expiration
  return this.save();
};

FriendSchema.methods.declineRequest = function(message = null) {
  this.status = 'declined';
  this.response = {
    message,
    respondedAt: new Date(),
    autoAccepted: false
  };
  return this.save();
};

FriendSchema.methods.blockUser = function() {
  this.status = 'blocked';
  this.response = {
    respondedAt: new Date(),
    autoAccepted: false
  };
  return this.save();
};

FriendSchema.methods.sendCheckIn = function() {
  this.activity.checkInsSent += 1;
  this.activity.lastCheckIn = new Date();
  this.metadata.lastInteraction = new Date();
  return this.save();
};

FriendSchema.methods.receiveCheckIn = function() {
  this.activity.checkInsReceived += 1;
  this.activity.lastCheckIn = new Date();
  this.metadata.lastInteraction = new Date();
  return this.save();
};

FriendSchema.methods.shareMood = function() {
  this.activity.moodShares += 1;
  this.activity.lastMoodShare = new Date();
  this.metadata.lastInteraction = new Date();
  return this.save();
};

FriendSchema.statics.findFriendship = function(user1Id, user2Id) {
  return this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id },
      { requester: user2Id, recipient: user1Id }
    ]
  });
};

FriendSchema.statics.getFriends = function(userId, status = 'accepted') {
  return this.find({
    $or: [
      { requester: userId },
      { recipient: userId }
    ],
    status
  }).populate('requester', 'username email profile.avatar profile.displayName')
    .populate('recipient', 'username email profile.avatar profile.displayName');
};

FriendSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    recipient: userId,
    status: 'pending',
    'request.expiresAt': { $gt: new Date() }
  }).populate('requester', 'username email profile.avatar profile.displayName');
};

FriendSchema.statics.getSentRequests = function(userId) {
  return this.find({
    requester: userId,
    status: 'pending',
    'request.expiresAt': { $gt: new Date() }
  }).populate('recipient', 'username email profile.avatar profile.displayName');
};

FriendSchema.statics.getMutualFriends = function(user1Id, user2Id) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { requester: user1Id },
          { recipient: user1Id }
        ],
        status: 'accepted'
      }
    },
    {
      $lookup: {
        from: 'friends',
        let: { friendId: { $cond: [{ $eq: ['$requester', user1Id] }, '$recipient', '$requester'] } },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$status', 'accepted'] },
                  {
                    $or: [
                      { $eq: ['$requester', '$$friendId'] },
                      { $eq: ['$recipient', '$$friendId'] }
                    ]
                  },
                  {
                    $or: [
                      { $eq: ['$requester', user2Id] },
                      { $eq: ['$recipient', user2Id] }
                    ]
                  }
                ]
              }
            }
          }
        ],
        as: 'mutualFriendship'
      }
    },
    {
      $match: {
        'mutualFriendship.0': { $exists: true }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'friendId',
        foreignField: '_id',
        as: 'friend'
      }
    },
    {
      $unwind: '$friend'
    },
    {
      $project: {
        _id: '$friend._id',
        username: '$friend.username',
        avatar: '$friend.profile.avatar',
        displayName: '$friend.profile.displayName'
      }
    }
  ]);
};
FriendSchema.pre('save', function(next) {
  if (this.status === 'pending' && this.metadata.mutualFriends.length > 0) {
    this.status = 'accepted';
    this.response = {
      respondedAt: new Date(),
      autoAccepted: true
    };
  }
  next();
});

export default mongoose.model('Friend', FriendSchema);
