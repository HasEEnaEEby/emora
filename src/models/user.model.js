// src/models/user.model.js - COMPLETE FIXED VERSION
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
    unique: true, // This creates the index automatically
    match: /^[a-zA-Z0-9_]+$/
  },
  
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true, // This creates the index automatically
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  
  password: {
    type: String,
    minlength: 8,
    required: false // Allow users to register without password initially
  },

  // Profile information
  pronouns: {
    type: String,
    enum: ['She / Her', 'He / Him', 'They / Them', 'Other'],
    required: false
  },
  
  ageGroup: {
    type: String,
    enum: [
      'Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+',
      'less than 20s', '20s', '30s', '40s', '50s and above'
    ],
    required: false
  },
  
  selectedAvatar: {
    type: String,
    enum: [
      'panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 
      'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin'
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
    // Note: No manual index - we let the migration script handle this
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
    // Social analytics
    totalFriends: { type: Number, default: 0 },
    totalComfortReactionsSent: { type: Number, default: 0 },
    totalComfortReactionsReceived: { type: Number, default: 0 }
  }
}, {
  timestamps: true, // This automatically creates createdAt and updatedAt with indexes
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive data from JSON output
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

// ============================================================================
// INDEXES - Only add what's not automatically created
// ============================================================================

// NOTE: username and email indexes are created automatically by unique: true
// NOTE: createdAt and updatedAt indexes are created automatically by timestamps: true

// Only add compound indexes and specific performance indexes
userSchema.index({ isActive: 1 }); // For filtering active users
userSchema.index({ 'location.coordinates': '2dsphere' }); // For geospatial queries
userSchema.index({ 'analytics.lastActiveAt': -1 }); // For sorting by activity
userSchema.index({ isOnline: 1 }); // For filtering online users
userSchema.index({ 'analytics.totalFriends': -1 }); // For social features

// Compound indexes for complex queries
userSchema.index({ username: 1, email: 1 }, { unique: true });
userSchema.index({ 'location.country': 1, 'location.city': 1 });
userSchema.index({ isActive: 1, isOnline: 1 });

// ============================================================================
// VIRTUALS
// ============================================================================

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('daysSinceJoined').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update calculated fields
userSchema.pre('save', function(next) {
  // Update days since joined
  if (this.createdAt) {
    this.analytics.daysSinceJoined = Math.floor(
      (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)
    );
  }
  
  // Update last active timestamp if user is active
  if (this.isModified('isOnline') && this.isOnline) {
    this.analytics.lastActiveAt = new Date();
  }
  
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

// Password comparison
userSchema.methods.comparePassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.matchPassword = async function(enteredPassword) {
  return this.comparePassword(enteredPassword);
};

// Generate JWT token
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

// Get public profile (safe for API responses)
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
      shareLocation: undefined // Don't expose location sharing preference
    },
    stats: this.getStats(),
    daysSinceJoined: this.daysSinceJoined,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt
  };
};

// Get user statistics
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

// Complete onboarding
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

// Handle login attempts and account locking
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  // If we're at max attempts and not locked, lock the account
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return await this.updateOne(updates);
};

// Update user activity
userSchema.methods.updateActivity = async function() {
  this.analytics.lastActiveAt = new Date();
  this.analytics.loginCount += 1;
  this.lastLoginAt = new Date();
  return await this.save();
};

// Set online status
userSchema.methods.setOnlineStatus = function(isOnline) {
  this.isOnline = isOnline;
  if (isOnline) {
    this.analytics.lastActiveAt = new Date();
  }
  return this.save();
};

// Update streak tracking
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
      return; // Already logged today
    } else if (daysDiff === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1; // Streak broken
    }
  } else {
    currentStreak = 1; // First log
  }

  this.analytics.currentStreak = currentStreak;
  if (currentStreak > this.analytics.longestStreak) {
    this.analytics.longestStreak = currentStreak;
  }
  this.analytics.lastLogDate = today;

  return this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

// Find nearby users
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

// Generate username suggestions
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

// Check username availability
userSchema.statics.isUsernameAvailable = async function(username) {
  if (!username || username.trim() === '') return false;
  const user = await this.findOne({ username: username.toLowerCase().trim() });
  return !user;
};

// Check email availability
userSchema.statics.isEmailAvailable = async function(email) {
  if (!email || email.trim() === '') return false;
  const user = await this.findOne({ email: email.toLowerCase().trim() });
  return !user;
};

// ============================================================================
// EXPORT MODEL
// ============================================================================

const User = mongoose.model('User', userSchema);

export default User;