// ============================================================================
// 3. FIXED BACKEND PROFILE ROUTES - src/routes/user/profile.routes.js
// ============================================================================

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import Emotion from '../../models/emotion.model.js';
import User from '../../models/user.model.js';

const router = express.Router();

// GET /api/user/profile - Get user profile with real data
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    console.log(`. Fetching profile for user ID: ${req.user.userId}`);
    
    const user = await User.findById(req.user.userId).select('-password -refreshTokens');
    
    if (!user) {
      console.log(`. User not found: ${req.user.userId}`);
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    console.log(`. User found: ${user.username}`);

    // Get real emotion data from database
    const emotionStats = await _calculateRealEmotionStats(user._id);
    console.log(`. Emotion stats calculated:`, emotionStats);

    // Calculate achievements based on real data
    const achievements = await _calculateRealAchievements(user, emotionStats);
    console.log(`🏆 Achievements calculated: ${achievements.filter(a => a.earned).length}/${achievements.length}`);

    // Calculate additional stats
    const joinedDaysAgo = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));
    const userLevel = _calculateUserLevel(emotionStats.totalEntries, emotionStats.currentStreak);
    
    const profileData = {
      id: user._id,
      username: user.username,
      displayName: user.displayName || user.profile?.displayName || user.username,
      email: user.email,
      pronouns: user.pronouns,
      ageGroup: user.ageGroup,
      selectedAvatar: user.selectedAvatar,
      profile: {
        displayName: user.profile?.displayName || user.username,
        bio: user.profile?.bio || '',
        themeColor: user.profile?.themeColor || '#6366f1',
      },
      stats: {
        totalEntries: emotionStats.totalEntries,
        currentStreak: emotionStats.currentStreak,
        longestStreak: emotionStats.longestStreak,
        totalFriends: user.analytics?.totalFriends || 0,
        helpedFriends: user.analytics?.totalComfortReactionsSent || 0,
        joinedDaysAgo,
        level: userLevel,
        badgesEarned: achievements.filter(a => a.earned).length,
        lastEmotionDate: emotionStats.lastEmotionDate,
        favoriteEmotion: emotionStats.favoriteEmotion,
        emotionDiversity: emotionStats.emotionDiversity,
        lastUpdated: new Date().toISOString(),
      },
      preferences: user.preferences || {
        notifications: {
          dailyReminder: true,
          friendRequests: true,
          comfortReactions: true,
        },
        shareLocation: false,
        shareEmotions: true,
        anonymousMode: false,
        moodPrivacy: 'friends',
      },
      achievements,
      joinDate: user.createdAt,
      lastActive: user.analytics?.lastActiveAt || user.lastLoginAt,
      isOnline: user.isOnline || false,
      isVerified: user.isOnboardingCompleted,
      location: user.location,
    };

    console.log(`. Profile data prepared for user: ${user.username}`);

    res.json({
      status: 'success',
      message: 'Profile retrieved successfully',
      data: profileData
    });

  } catch (error) {
    console.error('. Profile fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
      errorCode: 'PROFILE_FETCH_ERROR'
    });
  }
});

// PATCH /api/user/profile - Update user profile
router.patch('/profile', authMiddleware, [
  body('pronouns').optional().isIn(['She / Her', 'He / Him', 'They / Them', 'Other']),
  body('ageGroup').optional().isIn(['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']),
  body('selectedAvatar').optional().isIn(['panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin', 'dragon']),
  body('profile.displayName').optional().trim().isLength({ min: 1, max: 50 }),
  body('profile.bio').optional().trim().isLength({ max: 200 }),
  body('profile.themeColor').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
], async (req, res) => {
  try {
    console.log('. Profile update request body:', req.body);
    console.log('. User ID:', req.user.userId);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('. Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array(),
        errorCode: 'VALIDATION_FAILED'
      });
    }

    const { pronouns, ageGroup, selectedAvatar, profile } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Initialize profile object if it doesn't exist
    if (!user.profile) {
      user.profile = {};
    }

    // Update fields
    if (pronouns !== undefined) user.pronouns = pronouns;
    if (ageGroup !== undefined) user.ageGroup = ageGroup;
    if (selectedAvatar !== undefined) user.selectedAvatar = selectedAvatar;
    
    // Update profile fields if profile object is provided
    if (profile) {
      console.log('. Updating profile fields:', profile);
      if (profile.displayName !== undefined) {
        user.profile.displayName = profile.displayName;
        user.displayName = profile.displayName; // keep top-level in sync
      }
      if (profile.bio !== undefined) user.profile.bio = profile.bio;
      if (profile.themeColor !== undefined) user.profile.themeColor = profile.themeColor;
    }

    console.log('. User before save:', {
      id: user._id,
      username: user.username,
      pronouns: user.pronouns,
      ageGroup: user.ageGroup,
      selectedAvatar: user.selectedAvatar,
      profile: user.profile
    });

    await user.save();

    console.log(`. Profile updated for user: ${user.username}`);

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        username: user.username,
        profile: user.profile,
        pronouns: user.pronouns,
        ageGroup: user.ageGroup,
        selectedAvatar: user.selectedAvatar,
      }
    });

  } catch (error) {
    console.error('. Profile update error:', error);
    console.error('. Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      errorCode: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// PUT /api/user/preferences - FIXED: Update user preferences to match frontend format
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    console.log('📱 Updating preferences for user:', req.user.userId);
    console.log('📱 Request body:', req.body);

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Initialize preferences if they don't exist
    if (!user.preferences) {
      user.preferences = {
        notifications: {
          dailyReminder: true,
          friendRequests: true,
          comfortReactions: true,
        },
        shareLocation: false,
        shareEmotions: true,
        anonymousMode: false,
        moodPrivacy: 'friends',
      };
    }

    // FIXED: Handle both old and new preference formats
    const {
      notificationsEnabled,
      dataSharingEnabled,
      sharingEnabled,
      language,
      theme,
      darkModeEnabled,
      privacySettings,
      customSettings,
      // Legacy format support
      notifications,
      shareLocation,
      shareEmotions,
      anonymousMode,
      moodPrivacy
    } = req.body;

    // Update new format preferences
    if (notificationsEnabled !== undefined) {
      user.preferences.notifications = user.preferences.notifications || {};
      user.preferences.notifications.dailyReminder = notificationsEnabled;
      user.preferences.notifications.friendRequests = notificationsEnabled;
      user.preferences.notifications.comfortReactions = notificationsEnabled;
    }

    if (dataSharingEnabled !== undefined || sharingEnabled !== undefined) {
      user.preferences.shareEmotions = dataSharingEnabled ?? sharingEnabled ?? user.preferences.shareEmotions;
    }

    if (language !== undefined) {
      user.preferences.language = language;
    }

    if (theme !== undefined) {
      user.preferences.theme = theme;
    }

    if (darkModeEnabled !== undefined) {
      user.preferences.darkModeEnabled = darkModeEnabled;
    }

    if (privacySettings !== undefined) {
      user.preferences.privacySettings = privacySettings;
    }

    if (customSettings !== undefined) {
      user.preferences.customSettings = customSettings;
    }

    // Handle legacy format
    if (notifications) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...notifications
      };
    }

    if (shareLocation !== undefined) user.preferences.shareLocation = shareLocation;
    if (shareEmotions !== undefined) user.preferences.shareEmotions = shareEmotions;
    if (anonymousMode !== undefined) user.preferences.anonymousMode = anonymousMode;
    if (moodPrivacy !== undefined) user.preferences.moodPrivacy = moodPrivacy;

    await user.save();

    console.log(`. Preferences updated for user: ${user.username}`);
    console.log(`📱 Updated preferences:`, user.preferences);

    // Return preferences in the format the frontend expects
    const responsePreferences = {
      notificationsEnabled: user.preferences.notifications?.dailyReminder ?? true,
      sharingEnabled: user.preferences.shareEmotions ?? true,
      language: user.preferences.language ?? 'English',
      theme: user.preferences.theme ?? 'Cosmic Purple',
      darkModeEnabled: user.preferences.darkModeEnabled ?? true,
      privacySettings: user.preferences.privacySettings ?? {},
      customSettings: user.preferences.customSettings ?? {},
      // Include legacy fields for compatibility
      notifications: user.preferences.notifications,
      shareLocation: user.preferences.shareLocation,
      shareEmotions: user.preferences.shareEmotions,
      anonymousMode: user.preferences.anonymousMode,
      moodPrivacy: user.preferences.moodPrivacy,
    };

    res.json({
      status: 'success',
      message: 'Preferences updated successfully',
      data: responsePreferences
    });

  } catch (error) {
    console.error('. Preferences update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update preferences',
      errorCode: 'PREFERENCES_UPDATE_ERROR'
    });
  }
});

// GET /api/user/achievements - Get user achievements with real data
router.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get real emotion stats for achievement calculation
    const emotionStats = await _calculateRealEmotionStats(user._id);
    const achievements = await _calculateRealAchievements(user, emotionStats);

    res.json({
      status: 'success',
      message: 'Achievements retrieved successfully',
      data: {
        achievements,
        totalEarned: achievements.filter(a => a.earned).length,
        totalAvailable: achievements.length,
        stats: emotionStats,
      }
    });

  } catch (error) {
    console.error('. Achievements fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch achievements'
    });
  }
});

// POST /api/user/export-data - Export user data
router.post('/export-data', authMiddleware, async (req, res) => {
  try {
    console.log('📤 Data export request for user:', req.user.userId);

    const user = await User.findById(req.user.userId).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Default to exporting all data types if not specified
    const dataTypes = req.body.dataTypes || ['profile', 'emotions', 'analytics', 'achievements'];

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
      const emotions = await Emotion.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(1000) // Limit to last 1000 emotions
        .lean();
      exportData.emotions = emotions;
    }

    if (dataTypes.includes('analytics')) {
      const emotionStats = await _calculateRealEmotionStats(user._id);
      exportData.analytics = {
        ...user.analytics,
        realTimeStats: emotionStats,
      };
    }

    if (dataTypes.includes('achievements')) {
      const emotionStats = await _calculateRealEmotionStats(user._id);
      const achievements = await _calculateRealAchievements(user, emotionStats);
      exportData.achievements = achievements;
    }

    console.log(`. Data export generated for user: ${user.username}`);

    res.json({
      status: 'success',
      message: 'Data export generated successfully. Processing will complete within 24 hours.',
      data: {
        exportId: `export_${user._id}_${Date.now()}`,
        estimatedSize: Object.keys(exportData).length,
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        dataTypes: dataTypes,
      }
    });

  } catch (error) {
    console.error('. Data export error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export data'
    });
  }
});

// GET /api/user/stats/comprehensive - Get comprehensive user statistics
router.get('/stats/comprehensive', authMiddleware, async (req, res) => {
  try {
    console.log(`📊 Fetching comprehensive stats for user ID: ${req.user.userId}`);
    
    const user = await User.findById(req.user.userId).select('-password -refreshTokens');
    
    if (!user) {
      console.log(`❌ User not found: ${req.user.userId}`);
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    console.log(`✅ User found: ${user.username}`);

    // Get real emotion data from database
    const emotionStats = await _calculateRealEmotionStats(user._id);
    console.log(`📈 Emotion stats calculated:`, emotionStats);

    // Calculate achievements based on real data
    const achievements = await _calculateRealAchievements(user, emotionStats);
    const earnedAchievements = achievements.filter(a => a.earned);
    
    // Calculate additional stats
    const joinedDaysAgo = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));
    const userLevel = _calculateUserLevel(emotionStats.totalEntries, emotionStats.currentStreak);
    
    // Get friends count (if available)
    const totalFriends = user.analytics?.totalFriends || 0;
    const helpedFriends = user.analytics?.totalComfortReactionsSent || 0;
    
    const comprehensiveStats = {
      totalEntries: emotionStats.totalEntries,
      currentStreak: emotionStats.currentStreak,
      longestStreak: emotionStats.longestStreak,
      favoriteEmotion: emotionStats.favoriteEmotion,
      totalFriends: totalFriends,
      helpedFriends: helpedFriends,
      badgesEarned: earnedAchievements.length,
      level: userLevel,
      emotionDiversity: emotionStats.emotionDiversity,
      joinedDaysAgo: joinedDaysAgo,
      lastEmotionDate: emotionStats.lastEmotionDate,
      lastUpdated: new Date().toISOString(),
      achievements: {
        total: achievements.length,
        earned: earnedAchievements.length,
        progress: earnedAchievements.length > 0 ? (earnedAchievements.length / achievements.length * 100).toFixed(1) : '0.0',
      },
      streaks: {
        current: emotionStats.currentStreak,
        longest: emotionStats.longestStreak,
        isActive: emotionStats.currentStreak > 0,
      },
      activity: {
        totalEntries: emotionStats.totalEntries,
        averagePerDay: joinedDaysAgo > 0 ? (emotionStats.totalEntries / joinedDaysAgo).toFixed(2) : '0.00',
        lastActivity: emotionStats.lastEmotionDate,
      },
    };

    console.log(`📊 Comprehensive stats prepared for user: ${user.username}`);
    console.log(`📊 Stats summary:`, {
      totalEntries: comprehensiveStats.totalEntries,
      currentStreak: comprehensiveStats.currentStreak,
      totalFriends: comprehensiveStats.totalFriends,
      badgesEarned: comprehensiveStats.badgesEarned,
      level: comprehensiveStats.level,
    });

    res.json({
      status: 'success',
      message: 'Comprehensive stats retrieved successfully',
      data: comprehensiveStats
    });

  } catch (error) {
    console.error('❌ Comprehensive stats fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch comprehensive stats',
      errorCode: 'STATS_FETCH_ERROR'
    });
  }
});

// Helper functions
async function _calculateRealEmotionStats(userId) {
  try {
    console.log(`. Calculating real emotion stats for user: ${userId}`);
    
    // Get all emotions for this user
    const emotions = await Emotion.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📈 Found ${emotions.length} emotions for user`);

    if (emotions.length === 0) {
      return {
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastEmotionDate: null,
        favoriteEmotion: null,
        emotionDiversity: 0,
        emotionBreakdown: {},
      };
    }

    const totalEntries = emotions.length;
    const lastEmotionDate = emotions[0].createdAt;

    // Calculate streaks
    const { currentStreak, longestStreak } = _calculateStreaks(emotions);

    // Calculate emotion breakdown
    const emotionBreakdown = {};
    emotions.forEach(emotion => {
      const emotionType = emotion.type || emotion.emotion;
      emotionBreakdown[emotionType] = (emotionBreakdown[emotionType] || 0) + 1;
    });

    // Find favorite emotion
    const favoriteEmotion = Object.entries(emotionBreakdown)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    // Calculate diversity (number of unique emotions)
    const emotionDiversity = Object.keys(emotionBreakdown).length;

    const stats = {
      totalEntries,
      currentStreak,
      longestStreak,
      lastEmotionDate,
      favoriteEmotion,
      emotionDiversity,
      emotionBreakdown,
    };

    console.log(`. Stats calculated:`, stats);
    return stats;

  } catch (error) {
    console.error('. Error calculating emotion stats:', error);
    return {
      totalEntries: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastEmotionDate: null,
      favoriteEmotion: null,
      emotionDiversity: 0,
      emotionBreakdown: {},
    };
  }
}

function _calculateStreaks(emotions) {
  if (emotions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Sort emotions by date (oldest first)
  const sortedEmotions = emotions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  // Group emotions by date
  const emotionsByDate = {};
  sortedEmotions.forEach(emotion => {
    const date = new Date(emotion.createdAt).toDateString();
    if (!emotionsByDate[date]) {
      emotionsByDate[date] = [];
    }
    emotionsByDate[date].push(emotion);
  });
  
  const dates = Object.keys(emotionsByDate).sort();
  
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

function _calculateUserLevel(totalEntries, currentStreak) {
  if (totalEntries === 0) return 'New Explorer';
  if (totalEntries >= 1 && totalEntries < 5) return 'Emotion Novice';
  if (totalEntries >= 5 && totalEntries < 15) return 'Mood Tracker';
  if (totalEntries >= 15 && totalEntries < 30) return 'Feeling Expert';
  if (totalEntries >= 30 && totalEntries < 50) return 'Emotion Master';
  if (totalEntries >= 50 && totalEntries < 100) return 'Emotional Explorer';
  if (currentStreak >= 30) return 'Consistency Champion';
  if (totalEntries >= 100) return 'Emotion Sage';
  return 'Emotional Explorer';
}

async function _calculateRealAchievements(user, emotionStats) {
  const totalEntries = emotionStats.totalEntries;
  const currentStreak = emotionStats.currentStreak;
  const longestStreak = emotionStats.longestStreak;
  const totalFriends = user.analytics?.totalFriends || 0;
  const helpedFriends = user.analytics?.totalComfortReactionsSent || 0;
  const joinedDaysAgo = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));
  const emotionDiversity = emotionStats.emotionDiversity;

  console.log(`🏆 Calculating achievements with real data:`, {
    totalEntries,
    currentStreak,
    longestStreak,
    totalFriends,
    helpedFriends,
    joinedDaysAgo,
    emotionDiversity,
  });

  return [
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
      icon: 'timeline',
      color: '#F59E0B',
      earned: totalEntries >= 30,
      earnedDate: totalEntries >= 30 ? new Date().toLocaleDateString() : null,
      requirement: 30,
      progress: Math.min(totalEntries, 30),
      category: 'milestone',
    },
    {
      id: 'emotion_master',
      title: 'Emotion Master',
      description: 'Logged 100 emotions',
      icon: 'psychology',
      color: '#FFD700',
      earned: totalEntries >= 100,
      earnedDate: totalEntries >= 100 ? new Date().toLocaleDateString() : null,
      requirement: 100,
      progress: Math.min(totalEntries, 100),
      category: 'milestone',
    },
    {
      id: 'three_day_streak',
      title: 'Three Day Warrior',
      description: 'Maintained a 3-day streak',
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
      description: 'Maintained a 7-day streak',
      icon: 'calendar_today',
      color: '#8B5CF6',
      earned: longestStreak >= 7,
      earnedDate: longestStreak >= 7 ? new Date().toLocaleDateString() : null,
      requirement: 7,
      progress: Math.min(longestStreak, 7),
      category: 'streak',
    },
    {
      id: 'consistency_king',
      title: 'Consistency Champion',
      description: 'Maintained a 30-day streak',
      icon: 'workspace_premium',
      color: '#FF4500',
      earned: longestStreak >= 30,
      earnedDate: longestStreak >= 30 ? new Date().toLocaleDateString() : null,
      requirement: 30,
      progress: Math.min(longestStreak, 30),
      category: 'streak',
    },
    {
      id: 'emotion_variety',
      title: 'Emotion Variety',
      description: 'Logged 10 different emotions',
      icon: 'palette',
      color: '#EC4899',
      earned: emotionDiversity >= 10,
      earnedDate: emotionDiversity >= 10 ? new Date().toLocaleDateString() : null,
      requirement: 10,
      progress: Math.min(emotionDiversity, 10),
      category: 'diversity',
    },
    {
      id: 'social_butterfly',
      title: 'Social Butterfly',
      description: 'Connected with 10 friends',
      icon: 'people',
      color: '#6366F1',
      earned: totalFriends >= 10,
      earnedDate: totalFriends >= 10 ? new Date().toLocaleDateString() : null,
      requirement: 10,
      progress: Math.min(totalFriends, 10),
      category: 'social',
    },
    {
      id: 'support_hero',
      title: 'Support Hero',
      description: 'Helped 5 friends with support',
      icon: 'favorite',
      color: '#FF69B4',
      earned: helpedFriends >= 5,
      earnedDate: helpedFriends >= 5 ? new Date().toLocaleDateString() : null,
      requirement: 5,
      progress: Math.min(helpedFriends, 5),
      category: 'social',
    },
    {
      id: 'veteran_user',
      title: 'Veteran User',
      description: 'Active member for 30 days',
      icon: 'verified',
      color: '#3B82F6',
      earned: joinedDaysAgo >= 30,
      earnedDate: joinedDaysAgo >= 30 ? new Date().toLocaleDateString() : null,
      requirement: 30,
      progress: Math.min(joinedDaysAgo, 30),
      category: 'loyalty',
    },
  ];
}

export default router;