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
    const { pronouns, ageGroup, selectedAvatar, location, preferences, profile } = req.body;
    
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
    if (profile) user.profile = { ...user.profile, ...profile };
    
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
          preferences: user.preferences,
          profile: user.profile
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

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const { notifications, shareLocation, shareEmotions, anonymousMode, moodPrivacy, allowRecommendations } = req.body;
    
    const { default: User } = await import('../models/user.model.js');
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update preferences
    user.preferences = {
      ...user.preferences,
      notifications: {
        ...user.preferences?.notifications,
        ...notifications,
      },
      shareLocation: shareLocation ?? user.preferences?.shareLocation ?? false,
      shareEmotions: shareEmotions ?? user.preferences?.shareEmotions ?? true,
      anonymousMode: anonymousMode ?? user.preferences?.anonymousMode ?? false,
      moodPrivacy: moodPrivacy ?? user.preferences?.moodPrivacy ?? 'friends',
      allowRecommendations: allowRecommendations ?? user.preferences?.allowRecommendations ?? true,
    };
    
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: user.preferences
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

// Export user data
router.post('/export-data', async (req, res) => {
  try {
    const { dataTypes = ['profile', 'emotions', 'analytics', 'achievements'] } = req.body;
    
    const { default: User } = await import('../models/user.model.js');
    const { default: Emotion } = await import('../models/emotion.model.js');
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      userId: user._id,
      username: user.username,
      requestedDataTypes: dataTypes,
    };

    if (dataTypes.includes('profile')) {
      exportData.profile = {
        username: user.username,
        email: user.email,
        pronouns: user.pronouns,
        ageGroup: user.ageGroup,
        selectedAvatar: user.selectedAvatar,
        profile: user.profile,
        joinDate: user.createdAt,
        preferences: user.preferences,
        location: user.location,
      };
    }

    if (dataTypes.includes('emotions')) {
      const emotions = await Emotion.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();
      exportData.emotions = emotions;
    }

    if (dataTypes.includes('analytics')) {
      const emotions = await Emotion.find({ userId: req.user.id }).lean();
      const totalEntries = emotions.length;
      const { currentStreak, longestStreak } = _calculateStreaks(emotions);
      
      exportData.analytics = {
        totalEntries,
        currentStreak,
        longestStreak,
        uniqueEmotions: new Set(emotions.map(e => e.type || e.emotion)).size,
        lastActive: user.updatedAt,
      };
    }

    if (dataTypes.includes('achievements')) {
      const emotions = await Emotion.find({ userId: req.user.id }).lean();
      const totalEntries = emotions.length;
      const { currentStreak, longestStreak } = _calculateStreaks(emotions);
      const uniqueEmotions = new Set(emotions.map(e => e.type || e.emotion)).size;
      
      const achievements = [
        {
          id: 'first_steps',
          title: 'First Steps',
          description: 'Logged your first emotion',
          earned: totalEntries >= 1,
          earnedDate: totalEntries >= 1 ? user.createdAt.toLocaleDateString() : null,
        },
        {
          id: 'getting_started',
          title: 'Getting Started',
          description: 'Logged 5 emotions',
          earned: totalEntries >= 5,
          earnedDate: totalEntries >= 5 ? new Date().toLocaleDateString() : null,
        },
        {
          id: 'emotion_explorer',
          title: 'Emotion Explorer',
          description: 'Logged 15 emotions',
          earned: totalEntries >= 15,
          earnedDate: totalEntries >= 15 ? new Date().toLocaleDateString() : null,
        },
        {
          id: 'three_day_streak',
          title: 'Three Day Streak',
          description: 'Logged emotions for 3 consecutive days',
          earned: longestStreak >= 3,
          earnedDate: longestStreak >= 3 ? new Date().toLocaleDateString() : null,
        },
        {
          id: 'emotion_variety',
          title: 'Emotion Variety',
          description: 'Experienced 10 different emotions',
          earned: uniqueEmotions >= 10,
          earnedDate: uniqueEmotions >= 10 ? new Date().toLocaleDateString() : null,
        },
      ];
      
      exportData.achievements = achievements;
    }

    res.json({
      success: true,
      message: 'Data export generated successfully. Processing will complete within 24 hours.',
      data: {
        exportId: `export_${Date.now()}`,
        estimatedSize: 5,
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        dataTypes: dataTypes,
        exportData: exportData,
      }
    });

  } catch (error) {
    console.error('❌ Data export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
});

// Delete user account
router.delete('/account', async (req, res) => {
  try {
    const { default: User } = await import('../models/user.model.js');
    const { default: Emotion } = await import('../models/emotion.model.js');
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete all user data
    await Emotion.deleteMany({ userId: req.user.id });
    await User.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('❌ Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
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

// Get user achievements
router.get('/achievements', async (req, res) => {
  try {
    const { default: User } = await import('../models/user.model.js');
    const { default: Emotion } = await import('../models/emotion.model.js');
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get emotion statistics for achievement calculation
    const emotions = await Emotion.find({ userId: req.user.id }).lean();
    const totalEntries = emotions.length;
    
    // Calculate streaks
    const { currentStreak, longestStreak } = _calculateStreaks(emotions);
    
    // Get unique emotions count
    const uniqueEmotions = new Set(emotions.map(e => e.type || e.emotion)).size;
    
    // Calculate achievements based on real data
    const achievements = [
      {
        id: 'first_steps',
        title: 'First Steps',
        description: 'Logged your first emotion',
        icon: 'emoji_emotions',
        color: '#10B981',
        earned: totalEntries >= 1,
        earnedDate: totalEntries >= 1 ? user.createdAt.toLocaleDateString() : null,
        requirement: 1,
        progress: Math.min(totalEntries, 1),
        category: 'milestone',
      },
      {
        id: 'getting_started',
        title: 'Getting Started',
        description: 'Logged 5 emotions',
        icon: 'trending_up',
        color: '#3B82F6',
        earned: totalEntries >= 5,
        earnedDate: totalEntries >= 5 ? new Date().toLocaleDateString() : null,
        requirement: 5,
        progress: Math.min(totalEntries, 5),
        category: 'milestone',
      },
      {
        id: 'emotion_explorer',
        title: 'Emotion Explorer',
        description: 'Logged 15 emotions',
        icon: 'explore',
        color: '#8B5CF6',
        earned: totalEntries >= 15,
        earnedDate: totalEntries >= 15 ? new Date().toLocaleDateString() : null,
        requirement: 15,
        progress: Math.min(totalEntries, 15),
        category: 'milestone',
      },
      {
        id: 'dedicated_tracker',
        title: 'Dedicated Tracker',
        description: 'Logged 30 emotions',
        icon: 'psychology',
        color: '#F59E0B',
        earned: totalEntries >= 30,
        earnedDate: totalEntries >= 30 ? new Date().toLocaleDateString() : null,
        requirement: 30,
        progress: Math.min(totalEntries, 30),
        category: 'milestone',
      },
      {
        id: 'three_day_streak',
        title: 'Three Day Streak',
        description: 'Logged emotions for 3 consecutive days',
        icon: 'local_fire_department',
        color: '#EF4444',
        earned: longestStreak >= 3,
        earnedDate: longestStreak >= 3 ? new Date().toLocaleDateString() : null,
        requirement: 3,
        progress: Math.min(longestStreak, 3),
        category: 'streak',
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Logged emotions for 7 consecutive days',
        icon: 'whatshot',
        color: '#DC2626',
        earned: longestStreak >= 7,
        earnedDate: longestStreak >= 7 ? new Date().toLocaleDateString() : null,
        requirement: 7,
        progress: Math.min(longestStreak, 7),
        category: 'streak',
      },
      {
        id: 'emotion_variety',
        title: 'Emotion Variety',
        description: 'Experienced 10 different emotions',
        icon: 'palette',
        color: '#8B5CF6',
        earned: uniqueEmotions >= 10,
        earnedDate: uniqueEmotions >= 10 ? new Date().toLocaleDateString() : null,
        requirement: 10,
        progress: Math.min(uniqueEmotions, 10),
        category: 'exploration',
      },
    ];

    res.json({
      success: true,
      message: 'Achievements retrieved successfully',
      data: {
        achievements,
        totalEarned: achievements.filter(a => a.earned).length,
        totalAvailable: achievements.length,
        stats: {
          totalEntries,
          currentStreak,
          longestStreak,
          uniqueEmotions,
        }
      }
    });

  } catch (error) {
    console.error('❌ Achievements fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements'
    });
  }
});

// Helper function to calculate streaks
function _calculateStreaks(emotions) {
  if (emotions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Group emotions by date
  const emotionsByDate = {};
  emotions.forEach(emotion => {
    const date = new Date(emotion.createdAt).toDateString();
    if (!emotionsByDate[date]) {
      emotionsByDate[date] = [];
    }
    emotionsByDate[date].push(emotion);
  });
  
  const dates = Object.keys(emotionsByDate).sort();
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  // Calculate current streak (from today backwards)
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  
  if (emotionsByDate[today]) {
    currentStreak = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const currentDate = new Date(dates[i]);
      const nextDate = new Date(dates[i + 1]);
      const dayDiff = (nextDate - currentDate) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else if (emotionsByDate[yesterday]) {
    currentStreak = 1;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (dates[i] === yesterday) {
        for (let j = i - 1; j >= 0; j--) {
          const currentDate = new Date(dates[j]);
          const nextDate = new Date(dates[j + 1]);
          const dayDiff = (nextDate - currentDate) / (1000 * 60 * 60 * 24);
          
          if (dayDiff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
        break;
      }
    }
  }
  
  // Calculate longest streak
  for (let i = 1; i < dates.length; i++) {
    const currentDate = new Date(dates[i]);
    const prevDate = new Date(dates[i - 1]);
    const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
    
    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  
  return { currentStreak, longestStreak };
}

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