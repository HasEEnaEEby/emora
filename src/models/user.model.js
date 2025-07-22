// src/models/user.model.js - FIXED AGE GROUPS
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../config/index.js';

const userSchema = new mongoose.Schema({
  // Basic identity
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    lowercase: true,
    unique: true,
    match: /^[a-zA-Z0-9_]+$/
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  email: {
    type: String,
    required: false,  
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,     
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);  
      },
      message: 'Please enter a valid email address'
    }
  },
  
  password: {
    type: String,
    minlength: 8,
    required: false
  },

  // Profile information
  pronouns: {
    type: String,
    enum: ['She / Her', 'He / Him', 'They / Them', 'Other'],
    required: false
  },
  
  // FIXED: Standardized age groups that match validation and frontend
  ageGroup: {
    type: String,
    enum: [
      'Under 18',    // For minors
      '18-24',       // Young adults  
      '25-34',       // Early career
      '35-44',       // Mid career
      '45-54',       // Late career
      '55-64',       // Pre-retirement
      '65+'          // Seniors
    ],
    required: false
  },
  
  selectedAvatar: {
    type: String,
    enum: [
      'panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 
      'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin', 'dragon'
    ],
    default: 'panda'
  },

  // Location data
  location: {
    name: {
      type: String,
      default: 'Unknown'
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    country: String,
    city: String,
    timezone: String
  },
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true
  },
  
  isOnboardingCompleted: {
    type: Boolean,
    default: false
  },

  onboardingCompletedAt: {
    type: Date,
    default: null
  },
  
  isOnline: {
    type: Boolean,
    default: false
  },
  
  // Profile settings
  profile: {
    displayName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    bio: {
      type: String,
      maxlength: 200,
      trim: true
    },
    themeColor: {
      type: String,
      default: '#6366f1',
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    }
  },
  
  // Authentication & security
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: Date,
  lastLoginAt: Date,
  deletedAt: Date,
  
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // User preferences
  preferences: {
    shareLocation: {
      type: Boolean,
      default: false
    },
    shareEmotions: {
      type: Boolean,
      default: true
    },
    anonymousMode: {
      type: Boolean,
      default: true
    },
    allowRecommendations: {
      type: Boolean,
      default: true
    },
    notifications: {
      dailyReminder: {
        type: Boolean,
        default: true
      },
      time: {
        type: String,
        default: '20:00'
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      friendRequests: { type: Boolean, default: true },
      comfortReactions: { type: Boolean, default: true },
      friendMoodUpdates: { type: Boolean, default: true }
    },
    moodPrivacy: {
      type: String,
      enum: ['private', 'friends', 'public'],
      default: 'private'
    }
  },

  // Friends and social connections
  friends: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'blocked'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: {
      type: Date,
      default: null
    }
  }],

  friendRequests: {
    sent: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    received: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Enhanced privacy settings
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    },
    emotionVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private'
    },
    locationVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private'
    }
  },
  
  // User analytics and statistics
  analytics: {
    totalEmotionEntries: {
      type: Number,
      default: 0
    },
    totalMoodsLogged: {
      type: Number,
      default: 0
    },
    daysSinceJoined: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    lastLogDate: Date,
    loginCount: {
      type: Number,
      default: 0
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    totalFriends: { type: Number, default: 0 },
    totalComfortReactionsSent: { type: Number, default: 0 },
    totalComfortReactionsReceived: { type: Number, default: 0 },
    totalPostsShared: { type: Number, default: 0 },
    totalCommentsGiven: { type: Number, default: 0 },
    totalCommentsReceived: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.refreshTokens;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ isActive: 1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ 'analytics.lastActiveAt': -1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ 'analytics.totalFriends': -1 });
userSchema.index({ username: 1, email: 1 }, { unique: true });
userSchema.index({ 'location.country': 1, 'location.city': 1 });
userSchema.index({ isActive: 1, isOnline: 1 });

// . ADDED: Indexes for friend arrays to improve performance
userSchema.index({ 'friends.userId': 1 });
userSchema.index({ 'friendRequests.sent.userId': 1 });
userSchema.index({ 'friendRequests.received.userId': 1 });
userSchema.index({ 'friends.status': 1 });
userSchema.index({ 'friends.userId': 1, 'friends.status': 1 });

// Virtual properties
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('daysSinceJoined').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    // . FIXED: Use a consistent approach
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update calculated fields
userSchema.pre('save', function(next) {
  if (this.createdAt) {
    this.analytics.daysSinceJoined = Math.floor(
      (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)
    );
  }
  
  if (this.isModified('isOnline') && this.isOnline) {
    this.analytics.lastActiveAt = new Date();
  }
  
  next();
});

// Instance Methods
userSchema.methods.comparePassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.matchPassword = async function(enteredPassword) {
  return this.comparePassword(enteredPassword);
};

userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      userId: this._id,
      username: this.username 
    },
    process.env.JWT_SECRET || config.JWT_SECRET || 'emora-fallback-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
};

userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    pronouns: this.pronouns,
    ageGroup: this.ageGroup,
    selectedAvatar: this.selectedAvatar,
    isOnboardingCompleted: this.isOnboardingCompleted,
    isActive: this.isActive,
    isOnline: this.isOnline,
    location: {
      name: this.location?.name,
      country: this.location?.country,
      city: this.location?.city
    },
    profile: this.profile,
    preferences: {
      ...this.preferences?.toObject(),
      shareLocation: undefined
    },
    stats: this.getStats(),
    daysSinceJoined: this.daysSinceJoined,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt
  };
};

userSchema.methods.getStats = function() {
  return {
    totalEmotionEntries: this.analytics?.totalEmotionEntries || 0,
    totalMoodsLogged: this.analytics?.totalMoodsLogged || 0,
    daysSinceJoined: this.daysSinceJoined,
    longestStreak: this.analytics?.longestStreak || 0,
    currentStreak: this.analytics?.currentStreak || 0,
    loginCount: this.analytics?.loginCount || 0,
    totalFriends: this.analytics?.totalFriends || 0,
    totalComfortReactionsSent: this.analytics?.totalComfortReactionsSent || 0,
    totalComfortReactionsReceived: this.analytics?.totalComfortReactionsReceived || 0,
    joinedAt: this.createdAt,
    lastActiveAt: this.analytics?.lastActiveAt || this.lastLoginAt
  };
};

userSchema.methods.completeOnboarding = async function(data) {
  const { pronouns, ageGroup, selectedAvatar, location, email } = data;
  
  if (pronouns) this.pronouns = pronouns;
  if (ageGroup) this.ageGroup = ageGroup;
  if (selectedAvatar) this.selectedAvatar = selectedAvatar;
  if (email && email.trim()) {
    this.email = email.trim().toLowerCase();
  }
  if (location) {
    this.location = {
      ...this.location?.toObject(),
      ...location
    };
  }
  
  this.isOnboardingCompleted = true;
  this.onboardingCompletedAt = new Date();
  
  return await this.save();
};

// Additional methods remain the same...
userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000;
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return await this.updateOne(updates);
};

userSchema.methods.updateActivity = async function() {
  this.analytics.lastActiveAt = new Date();
  this.analytics.loginCount += 1;
  this.lastLoginAt = new Date();
  return await this.save();
};

userSchema.methods.setOnlineStatus = function(isOnline) {
  this.isOnline = isOnline;
  if (isOnline) {
    this.analytics.lastActiveAt = new Date();
  }
  return this.save();
};

userSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastLogDate = this.analytics?.lastLogDate;
  let currentStreak = this.analytics?.currentStreak || 0;

  if (lastLogDate) {
    const lastLog = new Date(lastLogDate);
    lastLog.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - lastLog) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      return;
    } else if (daysDiff === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }

  this.analytics.currentStreak = currentStreak;
  if (currentStreak > this.analytics.longestStreak) {
    this.analytics.longestStreak = currentStreak;
  }
  this.analytics.lastLogDate = today;

  return this.save();
};

// Friend management methods
userSchema.methods.sendFriendRequest = async function(targetUserId) {
  // Check if request already exists
  const existingSent = this.friendRequests.sent.find(
    req => req.userId.toString() === targetUserId.toString()
  );
  
  if (existingSent) {
    throw new Error('Friend request already sent');
  }

  // Check if already friends
  const existingFriend = this.friends.find(
    friend => friend.userId.toString() === targetUserId.toString()
  );

  if (existingFriend) {
    throw new Error('Already friends with this user');
  }

  // Add to sent requests
  this.friendRequests.sent.push({
    userId: targetUserId,
    createdAt: new Date()
  });

  return this.save();
};

userSchema.methods.acceptFriendRequest = async function(requestUserId) {
  // Remove from received requests
  this.friendRequests.received = this.friendRequests.received.filter(
    req => req.userId.toString() !== requestUserId.toString()
  );

  // Add to friends list
  this.friends.push({
    userId: requestUserId,
    status: 'accepted',
    createdAt: new Date(),
    acceptedAt: new Date()
  });

  // Update friend count
  this.analytics.totalFriends += 1;

  return this.save();
};

userSchema.methods.rejectFriendRequest = async function(requestUserId) {
  // Remove from received requests
  this.friendRequests.received = this.friendRequests.received.filter(
    req => req.userId.toString() !== requestUserId.toString()
  );

  return this.save();
};

userSchema.methods.removeFriend = async function(friendUserId) {
  // Remove from friends list
  this.friends = this.friends.filter(
    friend => friend.userId.toString() !== friendUserId.toString()
  );

  // Update friend count
  this.analytics.totalFriends = Math.max(0, this.analytics.totalFriends - 1);

  return this.save();
};

userSchema.methods.getFriendsList = function() {
  return this.friends.filter(friend => friend.status === 'accepted');
};

userSchema.methods.isPendingFriend = function(userId) {
  return this.friendRequests.sent.some(
    req => req.userId.toString() === userId.toString()
  );
};

userSchema.methods.isRequestReceived = function(userId) {
  return this.friendRequests.received.some(
    req => req.userId.toString() === userId.toString()
  );
};

userSchema.methods.isFriend = function(userId) {
  return this.friends.some(
    friend => friend.userId.toString() === userId.toString() && friend.status === 'accepted'
  );
};

// Static Methods
userSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    'preferences.shareLocation': true,
    isActive: true
  }).select('username selectedAvatar location.name location.city location.country');
};

userSchema.statics.generateUsernameSuggestions = async function(baseUsername) {
  const suggestions = [];
  const timestamp = Date.now().toString().slice(-4);
  const year = new Date().getFullYear();
  
  const candidates = [
    `${baseUsername}_${timestamp}`,
    `${baseUsername}${Math.floor(Math.random() * 999)}`,
    `${baseUsername}_${year}`,
    `user_${baseUsername}`,
    `${baseUsername}_official`,
    `${baseUsername}${Math.floor(Math.random() * 99)}`
  ];
  
  for (const candidate of candidates) {
    const exists = await this.findOne({ username: candidate.toLowerCase() });
    if (!exists) {
      suggestions.push(candidate);
      if (suggestions.length >= 3) break;
    }
  }
  
  return suggestions;
};

userSchema.statics.isUsernameAvailable = async function(username) {
  if (!username || username.trim() === '') return false;
  const user = await this.findOne({ username: username.toLowerCase().trim() });
  return !user;
};

userSchema.statics.isEmailAvailable = async function(email) {
  if (!email || email.trim() === '') return false;
  const user = await this.findOne({ email: email.toLowerCase().trim() });
  return !user;
};

const User = mongoose.model('User', userSchema);

export default User;