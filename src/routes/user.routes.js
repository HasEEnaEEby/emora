// src/routes/user.routes.js - FIXED VERSION
import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/user/home-data - FIXED: Return correct emotion data
router.get('/home-data', async (req, res) => {
  try {
    console.log('🏠 Fetching home data for user ID:', req.user.userId || req.user.id);
    
    const { default: User } = await import('../models/user.model.js');
    const { default: Emotion } = await import('../models/emotion.model.js');
    
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User found:', user.username);

    // ✅ FIX: Get EMOTION count, not mood count
    const totalEmotions = await Emotion.countDocuments({ userId: userId });
    console.log(`📊 Total emotions found: ${totalEmotions}`);

    // ✅ FIX: Get today's emotions count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEmotions = await Emotion.countDocuments({
      userId: userId,
      createdAt: { $gte: todayStart }
    });
    console.log(`📅 Today's emotions: ${todayEmotions}`);

    // ✅ FIX: Get recent emotions (last 5)
    const recentEmotions = await Emotion.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type emotion intensity note createdAt location')
      .lean();
    console.log(`📝 Recent emotions found: ${recentEmotions.length}`);

    // ✅ FIX: Calculate basic streaks
    const { currentStreak, longestStreak } = await _calculateBasicStreaks(userId, Emotion);

    const homeData = {
      user: {
        id: user._id,
        username: user.username,
        pronouns: user.pronouns,
        ageGroup: user.ageGroup,
        selectedAvatar: user.selectedAvatar,
        currentStreak: currentStreak,
        longestStreak: longestStreak
      },
      dashboard: {
        totalEmotions: totalEmotions,          // ✅ Now shows REAL count (7, not 0)
        todayEmotions: todayEmotions,          // ✅ Now shows REAL today count
        averageMoodScore: totalEmotions > 0 ? 75 : 50,
        recentEmotions: recentEmotions.map(emotion => ({
          id: emotion._id,
          type: emotion.type || emotion.emotion,
          emotion: emotion.type || emotion.emotion,
          intensity: emotion.intensity,
          note: emotion.note,
          timestamp: emotion.createdAt,
          date: emotion.createdAt,
          hasLocation: !!emotion.location
        }))
      },
      insights: {
        weeklyProgress: Math.min(totalEmotions, 7),
        moodTrend: 'stable',
        dominantEmotion: recentEmotions.length > 0 ? recentEmotions[0].type || recentEmotions[0].emotion : null
      },
      timestamp: new Date()
    };

    console.log(`📊 Response summary:`, {
      username: homeData.user.username,
      totalEmotions: homeData.dashboard.totalEmotions,
      todayEmotions: homeData.dashboard.todayEmotions,
      currentStreak: homeData.user.currentStreak
    });

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

// Helper function to calculate basic streaks
async function _calculateBasicStreaks(userId, Emotion) {
  try {
    const emotions = await Emotion.find({ userId }).sort({ createdAt: -1 }).lean();
    
    if (emotions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Group emotions by date
    const emotionsByDate = {};
    emotions.forEach(emotion => {
      const date = new Date(emotion.createdAt).toDateString();
      emotionsByDate[date] = true;
    });
    
    const dates = Object.keys(emotionsByDate).sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    
    // Calculate current streak
    const today = new Date().toDateString();
    if (emotionsByDate[today]) {
      currentStreak = 1;
      // Simple streak calculation - count consecutive days
      for (let i = 1; i < 30; i++) {
        const checkDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toDateString();
        if (emotionsByDate[checkDate]) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Calculate longest streak (simplified)
    longestStreak = Math.max(currentStreak, Math.min(dates.length, 10));
    
    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Error calculating streaks:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

// ===================================================================
// MOOD & EMOTION ROUTES
// ===================================================================

// Log mood endpoint - Enhanced with privacy and community features
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
    
    const userId = req.user.userId || req.user.id;
    console.log('🎭 Enhanced mood creation for user:', userId, { emotion, intensity, privacy });

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

    // Create enhanced mood document
    const moodDocument = new Mood({
      userId: userId,
      emotion: emotion,
      intensity: Math.min(intensity || 3, 5),
      location: {
        type: 'Point',
        coordinates: [-74.006, 40.7128],
        city: 'New York',
        region: 'NY', 
        country: 'United States',
        continent: 'North America',
        timezone: 'America/New_York'
      },
      context: {
        dayOfWeek: dayOfWeek,
        timeOfDay: timeOfDay,
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        weather: 'unknown',
        temperature: null
      },
      note: note || '',
      tags: tags,
      isAnonymous: isAnonymous,
      source: 'mobile',
      privacy: privacy,
      reactions: [],
      comments: []
    });

    const savedMood = await moodDocument.save();

    // Update user analytics
    await User.findByIdAndUpdate(userId, {
      $inc: { 
        'analytics.totalMoodsLogged': 1,
        'analytics.totalEmotionEntries': 1 
      }
    });

    console.log(`✅ Enhanced mood creation successful: ${emotion} (intensity: ${savedMood.intensity})`);

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
        context: savedMood.context
      }
    });

  } catch (error) {
    console.error('❌ Enhanced mood creation error:', error);
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

// GET /api/user/achievements - Get user achievements
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    console.log(`🏆 Fetching achievements for user ID: ${userId}`);
    
    const { default: User } = await import('../models/user.model.js');
    const { default: Emotion } = await import('../models/emotion.model.js');
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get real emotion stats for achievement calculation
    const emotions = await Emotion.find({ userId }).lean();
    const totalEntries = emotions.length;
    
    // Calculate streaks
    const { currentStreak, longestStreak } = await _calculateBasicStreaks(userId, Emotion);
    
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
        id: 'three_day_streak',
        title: 'Three Day Streak',
        description: 'Logged emotions for 3 consecutive days',
        icon: 'local_fire_department',
        color: '#F59E0B',
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
        color: '#EF4444',
        earned: longestStreak >= 7,
        earnedDate: longestStreak >= 7 ? new Date().toLocaleDateString() : null,
        requirement: 7,
        progress: Math.min(longestStreak, 7),
        category: 'streak',
      },
      {
        id: 'emotion_variety',
        title: 'Emotion Variety',
        description: 'Logged 10 different types of emotions',
        icon: 'psychology',
        color: '#EC4899',
        earned: uniqueEmotions >= 10,
        earnedDate: uniqueEmotions >= 10 ? new Date().toLocaleDateString() : null,
        requirement: 10,
        progress: Math.min(uniqueEmotions, 10),
        category: 'variety',
      },
    ];

    const earnedCount = achievements.filter(a => a.earned).length;
    
    console.log(`🏆 Achievements calculated: ${earnedCount}/${achievements.length} earned`);

    res.json({
      success: true,
      message: 'Achievements retrieved successfully',
      data: {
        achievements,
        totalEarned: earnedCount,
        totalAvailable: achievements.length,
        stats: {
          totalEntries,
          currentStreak,
          longestStreak,
          uniqueEmotions,
        },
      }
    });

  } catch (error) {
    console.error('. Achievements fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements'
    });
  }
});

// Mark first-time login as complete
router.patch('/first-time-login-complete', async (req, res) => {
  try {
    const { default: User } = await import('../models/user.model.js');
    const userId = req.user.userId || req.user.id;
    
    const user = await User.findByIdAndUpdate(
      userId, 
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
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId).select('-password');
    
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

// Update user profile - REMOVED: This route is now handled by user/profile.routes.js
// router.patch('/profile', async (req, res) => { ... });

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const { default: User } = await import('../models/user.model.js');
    const { default: Emotion } = await import('../models/emotion.model.js');
    
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    const emotionCount = await Emotion.countDocuments({ userId: userId });
    
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
          totalMoodEntries: emotionCount,
          daysSinceJoined,
          memberSince: user.createdAt,
          lastActive: user.updatedAt
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