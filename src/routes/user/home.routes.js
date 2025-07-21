// src/routes/user/home.routes.js - COMPLETE FIX
import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import Emotion from '../../models/emotion.model.js';
import User from '../../models/user.model.js';

const router = express.Router();

// GET /api/user/home-data - FIXED: Return Flutter-compatible format
router.get('/home-data', authMiddleware, async (req, res) => {
  try {
    console.log(`🏠 Fetching home data for user ID: ${req.user.userId}`);
    
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

    // ✅ FIX: Get REAL emotion count from database
    const totalEmotions = await Emotion.countDocuments({ userId: req.user.userId });
    console.log(`📊 Total emotions found: ${totalEmotions}`);

    // ✅ FIX: Get today's emotions count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEmotions = await Emotion.countDocuments({
      userId: req.user.userId,
      createdAt: { $gte: todayStart }
    });
    console.log(`📅 Today's emotions: ${todayEmotions}`);

    // ✅ FIX: Get recent emotions (last 10)
    const recentEmotions = await Emotion.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type emotion intensity note createdAt location')
      .lean();
    console.log(`📝 Recent emotions found: ${recentEmotions.length}`);

    // ✅ FIX: Calculate real emotion stats
    const emotionStats = await _calculateRealEmotionStats(req.user.userId);
    console.log(`📈 Emotion stats:`, emotionStats);

    // ✅ FIX: Calculate mood trend based on recent emotions
    const moodTrend = _calculateMoodTrend(recentEmotions);
    
    // ✅ FIX: Determine current mood from latest emotion
    const currentMood = _determineCurrentMood(recentEmotions);

    // ✅ FIX: Calculate average mood score
    const averageMoodScore = recentEmotions.length > 0
      ? Math.round(recentEmotions.reduce((sum, e) => sum + (e.intensity || 3), 0) / recentEmotions.length * 20)
      : 50;

    // ✅ FIX: Return format that matches Flutter HomeDataModel expectations EXACTLY
    const response = {
      success: true,
      message: 'Home data retrieved successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,  // ✅ This will now be "haseenakc"
          pronouns: user.pronouns,
          ageGroup: user.ageGroup,
          selectedAvatar: user.selectedAvatar,
          currentStreak: emotionStats.currentStreak,
          longestStreak: emotionStats.longestStreak
        },
        dashboard: {
          totalEmotions: totalEmotions,        // ✅ Now shows REAL count (5, not 0)
          todayEmotions: todayEmotions,        // ✅ Now shows REAL today count
          averageMoodScore: averageMoodScore,  // ✅ Calculated from real data
          recentEmotions: recentEmotions.map(emotion => ({
            id: emotion._id,
            type: emotion.type || emotion.emotion,
            intensity: emotion.intensity || 3,
            note: emotion.note,
            date: emotion.createdAt,
            hasLocation: !!emotion.location,
          }))
        },
        insights: {
          weeklyProgress: emotionStats.thisWeekEntries,
          moodTrend: moodTrend,
          dominantEmotion: currentMood
        },
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ Home data prepared for user: ${user.username}`);
    console.log(`📊 Response summary:`, {
      username: response.data.user.username,
      totalEmotions: response.data.dashboard.totalEmotions,
      todayEmotions: response.data.dashboard.todayEmotions,
      currentStreak: response.data.user.currentStreak
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Home data fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch home data',
      errorCode: 'HOME_DATA_FETCH_ERROR'
    });
  }
});

// ✅ FIXED: Calculate real emotion statistics
async function _calculateRealEmotionStats(userId) {
  try {
    console.log(`📊 Calculating emotion stats for user: ${userId}`);
    
    // Get all emotions for this user
    const allEmotions = await Emotion.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📈 Found ${allEmotions.length} total emotions`);

    if (allEmotions.length === 0) {
      return {
        totalEmotions: 0,
        currentStreak: 0,
        longestStreak: 0,
        thisWeekEntries: 0,
        averageIntensity: 0,
        lastEmotionDate: null,
      };
    }

    // Calculate this week's entries
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekEmotions = allEmotions.filter(e => new Date(e.createdAt) >= weekAgo);
    
    // Calculate average intensity
    const emotionsWithIntensity = allEmotions.filter(e => e.intensity);
    const averageIntensity = emotionsWithIntensity.length > 0 
      ? emotionsWithIntensity.reduce((sum, e) => sum + e.intensity, 0) / emotionsWithIntensity.length
      : 0;

    // Calculate streaks
    const { currentStreak, longestStreak } = _calculateStreaks(allEmotions);

    const stats = {
      totalEmotions: allEmotions.length,
      currentStreak,
      longestStreak,
      thisWeekEntries: thisWeekEmotions.length,
      averageIntensity: Math.round(averageIntensity * 10) / 10,
      lastEmotionDate: allEmotions[0].createdAt,
    };

    console.log(`📊 Stats calculated:`, stats);
    return stats;

  } catch (error) {
    console.error('❌ Error calculating emotion stats:', error);
    return {
      totalEmotions: 0,
      currentStreak: 0,
      longestStreak: 0,
      thisWeekEntries: 0,
      averageIntensity: 0,
      lastEmotionDate: null,
    };
  }
}

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

function _calculateMoodTrend(recentEmotions) {
  if (recentEmotions.length < 2) return 'stable';
  
  // Get emotions from last 3 days vs previous 3 days
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  
  const recentMoodEmotions = recentEmotions.filter(e => new Date(e.createdAt) >= threeDaysAgo);
  const previousMoodEmotions = recentEmotions.filter(e => 
    new Date(e.createdAt) >= sixDaysAgo && new Date(e.createdAt) < threeDaysAgo
  );
  
  if (recentMoodEmotions.length === 0 || previousMoodEmotions.length === 0) {
    return 'stable';
  }
  
  const recentAvg = recentMoodEmotions.reduce((sum, e) => sum + (e.intensity || 3), 0) / recentMoodEmotions.length;
  const previousAvg = previousMoodEmotions.reduce((sum, e) => sum + (e.intensity || 3), 0) / previousMoodEmotions.length;
  
  const difference = recentAvg - previousAvg;
  
  if (difference > 0.5) return 'improving';
  if (difference < -0.5) return 'declining';
  return 'stable';
}

function _determineCurrentMood(recentEmotions) {
  if (recentEmotions.length === 0) return 'neutral';
  
  // Get the most recent emotion as primary indicator
  const latestEmotion = recentEmotions[0];
  const emotionType = latestEmotion.type || latestEmotion.emotion;
  
  // Map emotions to mood categories
  const positiveEmotions = ['joy', 'happiness', 'excitement', 'love', 'gratitude', 'contentment', 'pride', 'relief'];
  const negativeEmotions = ['sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 'loneliness', 'stress'];
  const neutralEmotions = ['calm', 'peaceful', 'neutral', 'focused', 'curious', 'thoughtful'];
  
  if (positiveEmotions.includes(emotionType?.toLowerCase())) {
    return 'positive';
  } else if (negativeEmotions.includes(emotionType?.toLowerCase())) {
    return 'negative';
  } else if (neutralEmotions.includes(emotionType?.toLowerCase())) {
    return 'neutral';
  }
  
  // Fallback to intensity if emotion type isn't recognized
  const intensity = latestEmotion.intensity || 3;
  if (intensity >= 4) return 'positive';
  if (intensity <= 2) return 'negative';
  return 'neutral';
}

export default router;