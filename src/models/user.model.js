import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../config/index.js';

const userSchema = new mongoose.Schema({
  // Basic Identity
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
  
  // Security
  password: {
    type: String,
    minlength: 8,
    required: false // Allow passwordless accounts initially
  },

  pronouns: {
    type: String,
    enum: ['She / Her', 'He / Him', 'They / Them', 'Other'],
    required: false
  },
  
  // UPDATED: Frontend-compatible age groups
  ageGroup: {
    type: String,
    enum: ['less than 20s', '20s', '30s', '40s', '50s and above'],
    required: false
  },
  
  // UPDATED: Frontend-compatible avatars 
  selectedAvatar: {
    type: String,
    enum: ['panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon'],
    default: 'panda'
  },

  // Enhanced Location Support
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
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    country: String,
    city: String,
    timezone: String
  },
  
  // Optional fields
  email: {
    type: String,
    sparse: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Account status
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
  
  // Profile data
  profile: {
    displayName: {
      type: String,
      trim: true,
      maxlength: 50
    }
  },
  
  // Login security
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: Date,
  lastLoginAt: Date,
  deletedAt: Date,
  
  // Enhanced Privacy preferences
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
      }
    }
  },
  
  // Enhanced Analytics
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
    loginCount: {
      type: Number,
      default: 0
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ 'analytics.lastActiveAt': -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for days since joined
userSchema.virtual('daysSinceJoined').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
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

// Password comparison method
userSchema.methods.comparePassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Legacy method for backwards compatibility
userSchema.methods.matchPassword = async function(enteredPassword) {
  return this.comparePassword(enteredPassword);
};

// Enhanced public profile method
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    pronouns: this.pronouns,
    ageGroup: this.ageGroup,
    selectedAvatar: this.selectedAvatar,
    isOnboardingCompleted: this.isOnboardingCompleted,
    isActive: this.isActive,
    location: {
      name: this.location?.name,
      country: this.location?.country,
      city: this.location?.city
    },
    profile: this.profile,
    preferences: {
      ...this.preferences,
      // Don't expose sensitive location sharing preference
      shareLocation: undefined
    },
    stats: this.getStats(),
    daysSinceJoined: this.daysSinceJoined,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt
  };
};

// Enhanced onboarding completion
userSchema.methods.completeOnboarding = async function(data) {
  const { pronouns, ageGroup, selectedAvatar, location } = data;
  
  if (pronouns) this.pronouns = pronouns;
  if (ageGroup) this.ageGroup = ageGroup;
  if (selectedAvatar) this.selectedAvatar = selectedAvatar;
  if (location) {
    this.location = {
      ...this.location,
      ...location
    };
  }
  
  this.isOnboardingCompleted = true;
  this.onboardingCompletedAt = new Date();
  this.updatedAt = new Date();
  
  return await this.save();
};

// Enhanced login attempts tracking
userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return await this.updateOne(updates);
};

// Update activity tracking
userSchema.methods.updateActivity = async function() {
  this.analytics.lastActiveAt = new Date();
  this.analytics.loginCount += 1;
  this.lastLoginAt = new Date();
  return await this.save();
};

// Get user statistics
userSchema.methods.getStats = function() {
  return {
    totalEmotionEntries: this.analytics?.totalEmotionEntries || 0,
    totalMoodsLogged: this.analytics?.totalMoodsLogged || 0,
    daysSinceJoined: this.daysSinceJoined,
    longestStreak: this.analytics?.longestStreak || 0,
    loginCount: this.analytics?.loginCount || 0,
    joinedAt: this.createdAt,
    lastActiveAt: this.analytics?.lastActiveAt || this.lastLoginAt
  };
};

// Method to generate auth token
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

// Static method to find nearby users
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

// Static method to generate username suggestions
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

// Static method to check username availability
userSchema.statics.isUsernameAvailable = async function(username) {
  const user = await this.findOne({ username: username.toLowerCase() });
  return !user;
};

const User = mongoose.model('User', userSchema);

export default User;
