// src/routes/user/home.routes.js
import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import Emotion from '../../models/emotion.model.js';
import User from '../../models/user.model.js';

const router = express.Router();

// GET /api/user/home-data - Get user home dashboard data
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

    // Get real emotion data from database
    const emotionStats = await _calculateHomeEmotionStats(user._id);
    console.log(`📊 Home emotion stats:`, emotionStats);

    // Get recent emotions (last 10)
    const recentEmotions = await Emotion.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type emotion intensity note createdAt location')
      .lean();

    console.log(`📝 Found ${recentEmotions.length} recent emotions`);

    // Calculate mood trend
    const moodTrend = _calculateMoodTrend(recentEmotions);
    
    // Determine current mood based on recent emotions
    const currentMood = _determineCurrentMood(recentEmotions);

    // ✅ FIXED: Return format that matches frontend HomeDataModel expectations
    const homeData = {
      username: user.username,
      currentMood: currentMood,
      streak: emotionStats.currentStreak,
      isFirstTimeLogin: emotionStats.totalEmotions === 0,
      userStats: {
        totalMoodEntries: emotionStats.totalEmotions,
        streakDays: emotionStats.currentStreak,
        totalSessions: emotionStats.thisWeekEntries,
        moodCheckins: emotionStats.totalEmotions,
        averageMoodScore: emotionStats.averageIntensity,
        mostFrequentMood: currentMood,
        lastMoodLog: emotionStats.lastEmotionDate || new Date(),
        weeklyStats: {},
        monthlyStats: {},
      },
      selectedAvatar: user.selectedAvatar,
      dashboardData: {
        user: {
          id: user._id,
          username: user.username,
          displayName: user.profile?.displayName || user.username,
          avatar: user.selectedAvatar,
          pronouns: user.pronouns,
          level: _calculateUserLevel(emotionStats.totalEmotions, emotionStats.currentStreak),
        },
        stats: {
          totalEmotions: emotionStats.totalEmotions,
          currentStreak: emotionStats.currentStreak,
          longestStreak: emotionStats.longestStreak,
          mood: currentMood,
          moodTrend: moodTrend,
          thisWeekEntries: emotionStats.thisWeekEntries,
          averageIntensity: emotionStats.averageIntensity,
          lastEmotionDate: emotionStats.lastEmotionDate,
        },
        recentEmotions: recentEmotions.map(emotion => ({
          id: emotion._id,
          type: emotion.type || emotion.emotion,
          intensity: emotion.intensity || 3,
          note: emotion.note,
          date: emotion.createdAt,
          hasLocation: !!emotion.location,
        })),
        insights: _generateInsights(user, emotionStats, recentEmotions),
      },
      lastUpdated: new Date().toISOString(),
    };

    console.log(`✅ Home data prepared for user: ${user.username}`);

    res.json({
      status: 'success',
      message: 'Home data retrieved successfully',
      data: homeData
    });

  } catch (error) {
    console.error('❌ Home data fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch home data',
      errorCode: 'HOME_DATA_FETCH_ERROR'
    });
  }
});

// GET /api/user/emotion-summary - Get emotion summary for charts
router.get('/emotion-summary', authMiddleware, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    console.log(`📊 Fetching emotion summary for user ${req.user.userId}, period: ${period}`);
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const emotions = await Emotion.find({
      userId: req.user.userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 }).lean();

    const summary = _generateEmotionSummary(emotions, period);

    res.json({
      status: 'success',
      message: 'Emotion summary retrieved successfully',
      data: summary
    });

  } catch (error) {
    console.error('❌ Emotion summary fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch emotion summary'
    });
  }
});

// Helper functions
async function _calculateHomeEmotionStats(userId) {
  try {
    console.log(`📊 Calculating home emotion stats for user: ${userId}`);
    
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

    console.log(`✅ Home stats calculated:`, stats);
    return stats;

  } catch (error) {
    console.error('❌ Error calculating home emotion stats:', error);
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

function _calculateUserLevel(totalEmotions, currentStreak) {
  if (totalEmotions === 0) return 'New Explorer';
  if (totalEmotions >= 1 && totalEmotions < 5) return 'Emotion Novice';
  if (totalEmotions >= 5 && totalEmotions < 15) return 'Mood Tracker';
  if (totalEmotions >= 15 && totalEmotions < 30) return 'Feeling Expert';
  if (totalEmotions >= 30 && totalEmotions < 50) return 'Emotion Master';
  if (totalEmotions >= 50 && totalEmotions < 100) return 'Emotional Explorer';
  if (currentStreak >= 30) return 'Consistency Champion';
  if (totalEmotions >= 100) return 'Emotion Sage';
  return 'Emotional Explorer';
}

function _generateInsights(user, emotionStats, recentEmotions) {
  const insights = [];
  
  // Streak insights
  if (emotionStats.currentStreak >= 7) {
    insights.push({
      type: 'achievement',
      title: 'Amazing Consistency!',
      message: `You're on a ${emotionStats.currentStreak}-day streak! Keep it up!`,
      icon: 'local_fire_department',
      color: '#FF4500',
    });
  } else if (emotionStats.currentStreak >= 3) {
    insights.push({
      type: 'encouragement',
      title: 'Building Momentum',
      message: `${emotionStats.currentStreak} days in a row! You're developing a great habit.`,
      icon: 'trending_up',
      color: '#10B981',
    });
  }
  
  // Activity insights
  if (emotionStats.thisWeekEntries >= 5) {
    insights.push({
      type: 'positive',
      title: 'Active Week',
      message: `You've logged ${emotionStats.thisWeekEntries} emotions this week!`,
      icon: 'timeline',
      color: '#8B5CF6',
    });
  }
  
  // Emotion diversity insights
  const uniqueEmotions = new Set(recentEmotions.map(e => e.type || e.emotion)).size;
  if (uniqueEmotions >= 5) {
    insights.push({
      type: 'observation',
      title: 'Emotional Range',
      message: `You've experienced ${uniqueEmotions} different emotions recently. That's a rich emotional life!`,
      icon: 'palette',
      color: '#EC4899',
    });
  }
  
  // First emotion insight
  if (emotionStats.totalEmotions === 1) {
    insights.push({
      type: 'welcome',
      title: 'Welcome to Your Journey!',
      message: 'You\'ve taken the first step in understanding your emotions. Every journey begins with a single step.',
      icon: 'emoji_emotions',
      color: '#10B981',
    });
  }
  
  // Milestone insights
  if ([5, 10, 25, 50, 100].includes(emotionStats.totalEmotions)) {
    insights.push({
      type: 'milestone',
      title: 'Milestone Reached!',
      message: `Congratulations on logging your ${emotionStats.totalEmotions}${_getOrdinalSuffix(emotionStats.totalEmotions)} emotion!`,
      icon: 'celebration',
      color: '#FFD700',
    });
  }
  
  return insights;
}

function _getOrdinalSuffix(number) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = number % 100;
  return suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0];
}

function _generateEmotionSummary(emotions, period) {
  if (emotions.length === 0) {
    return {
      totalEmotions: 0,
      emotionBreakdown: {},
      intensityDistribution: {},
      timelineData: [],
      topEmotions: [],
      averageIntensity: 0,
    };
  }

  // Emotion breakdown
  const emotionBreakdown = {};
  emotions.forEach(emotion => {
    const type = emotion.type || emotion.emotion || 'unknown';
    emotionBreakdown[type] = (emotionBreakdown[type] || 0) + 1;
  });

  // Intensity distribution
  const intensityDistribution = {};
  emotions.forEach(emotion => {
    const intensity = emotion.intensity || 3;
    intensityDistribution[intensity] = (intensityDistribution[intensity] || 0) + 1;
  });

  // Timeline data (group by day/hour based on period)
  const timelineData = _generateTimelineData(emotions, period);

  // Top emotions
  const topEmotions = Object.entries(emotionBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([emotion, count]) => ({ emotion, count }));

  // Average intensity
  const emotionsWithIntensity = emotions.filter(e => e.intensity);
  const averageIntensity = emotionsWithIntensity.length > 0
    ? emotionsWithIntensity.reduce((sum, e) => sum + e.intensity, 0) / emotionsWithIntensity.length
    : 0;

  return {
    totalEmotions: emotions.length,
    emotionBreakdown,
    intensityDistribution,
    timelineData,
    topEmotions,
    averageIntensity: Math.round(averageIntensity * 10) / 10,
  };
}

function _generateTimelineData(emotions, period) {
  const data = [];
  const now = new Date();
  
  if (period === '24h') {
    // Group by hour
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const count = emotions.filter(e => {
        const emotionDate = new Date(e.createdAt);
        return emotionDate >= hourStart && emotionDate < hourEnd;
      }).length;
      
      data.push({
        time: hourStart.toISOString(),
        count,
        label: hourStart.toLocaleTimeString([], { hour: '2-digit' }),
      });
    }
  } else {
    // Group by day
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayEmotions = emotions.filter(e => {
        const emotionDate = new Date(e.createdAt);
        return emotionDate >= dayStart && emotionDate < dayEnd;
      });
      
      const averageIntensity = dayEmotions.length > 0
        ? dayEmotions.reduce((sum, e) => sum + (e.intensity || 3), 0) / dayEmotions.length
        : 0;
      
      data.push({
        time: dayStart.toISOString(),
        count: dayEmotions.length,
        averageIntensity: Math.round(averageIntensity * 10) / 10,
        label: dayStart.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      });
    }
  }
  
  return data;
}

export default router;