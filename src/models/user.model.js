import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../config/index.js';

const userSchema = new mongoose.Schema({
  // Basic Identity - REMOVED unique: true to avoid duplicate index
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    lowercase: true,
    match: /^[a-zA-Z0-9_]+$/
  },
  
  // Onboarding Data
  pronouns: {
    type: String,
    enum: ['she/her', 'he/him', 'they/them', 'other'],
    required: true
  },
  
  ageGroup: {
    type: String,
    enum: ['less_than_20', '20s', '30s', '40s', '50s_and_above'],
    required: true
  },
  
  avatar: {
    type: String,
    enum: [
      'ghost', 'dog', 'rabbit_ears', 'rabbit_standing', 'fox', 'wolf',
      'bear', 'pig', 'cat', 'default_smile', 'happy_face', 'love_eyes'
    ],
    default: 'default_smile'
  },
  
  // Optional fields - REMOVED unique: true to avoid duplicate index
  email: {
    type: String,
    sparse: true, // Allows multiple null values
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Security
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isOnboardingComplete: {
    type: Boolean,
    default: false
  },
  
  // Privacy preferences
  preferences: {
    shareLocation: {
      type: Boolean,
      default: true
    },
    anonymousMode: {
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
  
  // Analytics
  stats: {
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
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ONLY use schema.index() - no field-level unique: true
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for days since joined
userSchema.virtual('daysSinceJoined').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to hash password if provided
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

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate auth token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username 
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
};

const User = mongoose.model('User', userSchema);

export default User;