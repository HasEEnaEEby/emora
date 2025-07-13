// src/routes/user.routes.js - COMPLETE FIXED VERSION
import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// ===================================================================
// HOME & DASHBOARD ROUTES
// ===================================================================

// Get home dashboard data (main endpoint Flutter app calls)
router.get('/home-data', async (req, res) => {
  try {
    console.log('🏠 Fetching home data for user ID:', req.user.id);
    
    const { default: User } = await import('../models/user.model.js');
    const { default: Mood } = await import('../models/mood.model.js');
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User found:', user.username);

    // Get mood count and recent moods for this user
    const moodCount = await Mood.countDocuments({ userId: req.user.id });
    const recentMoods = await Mood.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`📊 Found ${moodCount} moods for user`);

    const homeData = {
      user: {
        id: user._id,
        username: user.username,
        pronouns: user.pronouns,
        ageGroup: user.ageGroup,
        selectedAvatar: user.selectedAvatar,
        currentStreak: 0,
        longestStreak: 0
      },
      dashboard: {
        totalEmotions: moodCount,
        todayEmotions: 0,
        averageMoodScore: moodCount > 0 ? 75 : 50,
        recentEmotions: recentMoods.map(mood => ({
          id: mood._id,
          emotion: mood.emotion,
          intensity: mood.intensity,
          timestamp: mood.createdAt,
          note: mood.note
        }))
      },
      insights: {
        weeklyProgress: 0,
        moodTrend: 'stable',
        dominantEmotion: recentMoods.length > 0 ? recentMoods[0].emotion : null
      },
      timestamp: new Date()
    };

    res.json({
      success: true,
      message: 'Home data retrieved successfully',
      data: homeData
    });

  } catch (error) {
    console.error('❌ Home data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home data'
    });
  }
});

// ===================================================================
// MOOD & EMOTION ROUTES - DIRECT CREATION (BYPASSING SERVICE)
// ===================================================================

// Log mood endpoint - ENHANCED with privacy and community features
router.post('/log-mood', async (req, res) => {
  try {
    const { 
      emotion, 
      intensity, 
      note, 
      context, 
      privacy = 'private', 
      isAnonymous = true,
      tags = []
    } = req.body;
    
    console.log('🎭 ENHANCED mood creation for user:', req.user.id, { 
      emotion, 
      intensity, 
      privacy 
    });

    // Import Mood model directly
    const { default: Mood } = await import('../models/mood.model.js');
    const { default: User } = await import('../models/user.model.js');
    
    // Get current time info for required context fields
    const now = new Date();
    const hour = now.getHours();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[now.getDay()];
    
    // Determine time of day
    let timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    console.log('🕐 Time context calculated:', { dayOfWeek, timeOfDay, hour });

    // Create enhanced mood document with community features
    const moodDocument = new Mood({
      userId: req.user.id,
      emotion: emotion,
      intensity: Math.min(intensity || 3, 5), // Max 5 per your schema
      location: {
        type: 'Point',
        coordinates: [-74.006, 40.7128], // [longitude, latitude]
        city: 'New York',
        region: 'NY', 
        country: 'United States',
        continent: 'North America',
        timezone: 'America/New_York'
      },
      context: {
        dayOfWeek: dayOfWeek,           // Required field
        timeOfDay: timeOfDay,           // Required field  
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        weather: 'unknown',
        temperature: null
      },
      note: note || '',
      tags: tags,
      isAnonymous: isAnonymous,
      source: 'mobile',
      // Enhanced community fields
      privacy: privacy,
      reactions: [],
      comments: [],
      shareCount: 0,
      viewCount: 0
    });

    console.log('💾 About to save enhanced mood with privacy:', {
      dayOfWeek: moodDocument.context.dayOfWeek,
      timeOfDay: moodDocument.context.timeOfDay,
      privacy: moodDocument.privacy
    });

    // Save directly to database
    const savedMood = await moodDocument.save();

    // Update user analytics
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 
        'analytics.totalMoodsLogged': 1,
        'analytics.totalEmotionEntries': 1 
      }
    });

    console.log(`✅ ENHANCED mood creation successful: ${emotion} (intensity: ${savedMood.intensity}, privacy: ${savedMood.privacy})`);

    res.status(201).json({
      success: true,
      message: 'Mood logged successfully',
      data: {
        id: savedMood._id,
        emotion: savedMood.emotion,
        intensity: savedMood.intensity,
        privacy: savedMood.privacy,
        note: savedMood.note,
        timestamp: savedMood.createdAt,
        context: savedMood.context,
        reactions: savedMood.reactions.length,
        comments: savedMood.comments.length
      }
    });

  } catch (error) {
    console.error('❌ ENHANCED mood creation error:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to log mood',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===================================================================
// USER MANAGEMENT ROUTES
// ===================================================================

// Mark first-time login as complete
router.patch('/first-time-login-complete', async (req, res) => {
  try {
    const { default: User } = await import('../models/user.model.js');
    
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { isFirstTimeLogin: false },
      { new: true }
    );

    res.json({
      success: true,
      message: 'First-time login marked as complete',
      data: {
        userId: user._id,
        username: user.username,
        isOnboardingCompleted: user.isOnboardingCompleted
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update first-time login status'
    });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const { default: User } = await import('../models/user.model.js');
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          pronouns: user.pronouns,
          ageGroup: user.ageGroup,
          selectedAvatar: user.selectedAvatar,
          isOnboardingCompleted: user.isOnboardingCompleted,
          isActive: user.isActive,
          isOnline: user.isOnline,
          location: user.location,
          profile: user.profile,
          preferences: user.preferences,
          stats: user.stats,
          daysSinceJoined: user.daysSinceJoined,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Update user profile
router.patch('/profile', async (req, res) => {
  try {
    const { pronouns, ageGroup, selectedAvatar, location, preferences } = req.body;
    
    const { default: User } = await import('../models/user.model.js');
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update only provided fields
    if (pronouns) user.pronouns = pronouns;
    if (ageGroup) user.ageGroup = ageGroup;
    if (selectedAvatar) user.selectedAvatar = selectedAvatar;
    if (location) user.location = location;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          pronouns: user.pronouns,
          ageGroup: user.ageGroup,
          selectedAvatar: user.selectedAvatar,
          preferences: user.preferences
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const { default: User } = await import('../models/user.model.js');
    const { default: Mood } = await import('../models/mood.model.js');
    
    const user = await User.findById(req.user.id);
    const moodCount = await Mood.countDocuments({ userId: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const daysSinceJoined = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        statistics: {
          totalMoodEntries: moodCount,
          daysSinceJoined,
          memberSince: user.createdAt,
          lastActive: user.stats?.lastActiveAt || user.updatedAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// ===================================================================
// HEALTH CHECK FOR USER SERVICE
// ===================================================================

// Health check for user routes
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'User service is healthy',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      authenticated: !!req.user,
      userId: req.user?.userId || req.user?.id || null
    }
  });
});

export default router;