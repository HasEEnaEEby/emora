// src/routes/emotion.routes.js - Updated with real logging and new endpoints
import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware.js';
import Emotion from '../models/emotion.model.js';
import User from '../models/user.model.js';
import emotionService from '../services/emotion.service.js';
import { mapToPlutchikCoreEmotion } from '../constants/emotion-mappings.js';

const router = express.Router();

// POST /api/emotions - Log a new emotion
router.post('/', authMiddleware, [
  body('type').notEmpty().trim().withMessage('Emotion type is required'),
  body('intensity').optional().isInt({ min: 1, max: 5 }).withMessage('Intensity must be between 1 and 5'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note must be less than 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('location.latitude').optional().isFloat({ min: -90, max: 90 }),
  body('location.longitude').optional().isFloat({ min: -180, max: 180 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, intensity = 3, note, tags = [], location, context } = req.body;
    
    console.log(`🎭 Logging emotion for user ${req.user.userId}: ${type}`);

    // Create emotion entry with proper field mapping
    const emotion = new Emotion({
      userId: req.user.userId,
      type: type.toLowerCase(),
      emotion: type.toLowerCase(), // For backward compatibility
      coreEmotion: mapToPlutchikCoreEmotion(type), // Map to valid Plutchik core emotion
      intensity: parseInt(intensity),
      note: note || '',
      tags,
      location: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
        address: location.address || null,
        city: location.city || null,
        country: location.country || null,
        region: location.region || null,
        hasUserConsent: true,
        source: 'gps'
      } : null,
      context: context || {},
      createdAt: new Date(),
    });

    await emotion.save();
    
    console.log(`✅ Emotion saved: ${emotion._id}`);

    // Update user analytics
    await _updateUserAnalytics(req.user.userId);

    // Check for new achievements
    const newAchievements = await _checkForNewAchievements(req.user.userId);

    res.status(201).json({
      status: 'success',
      message: 'Emotion logged successfully',
      data: {
        emotion: {
          id: emotion._id,
          type: emotion.type,
          emotion: emotion.emotion,
          intensity: emotion.intensity,
          note: emotion.note,
          tags: emotion.tags,
          hasLocation: !!emotion.location,
          createdAt: emotion.createdAt,
        },
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
      }
    });

  } catch (error) {
    console.error('❌ Error logging emotion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to log emotion'
    });
  }
});

// GET /api/emotions/insights - Get user emotion insights
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    console.log(`📊 Fetching insights for user: ${req.user.userId} (${timeframe})`);

    const insights = await emotionService.getUserEmotionInsights(req.user.userId, timeframe);

    res.json({
      status: 'success',
      message: 'Insights retrieved successfully',
      data: insights
    });

  } catch (error) {
    console.error('❌ Error fetching insights:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch insights'
    });
  }
});

// GET /api/emotions/analytics - Get emotion analytics for charts
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    console.log(`📈 Fetching analytics for user: ${req.user.userId} (${timeframe})`);

    const analytics = await emotionService.getEmotionAnalytics(req.user.userId, timeframe);

    res.json({
      status: 'success',
      message: 'Analytics retrieved successfully',
      data: analytics
    });

  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics'
    });
  }
});

// GET /api/emotions/history - Get user emotion history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    console.log(`📜 Fetching emotion history for user: ${req.user.userId}`);

    const emotions = await emotionService.getUserEmotionHistory(
      req.user.userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      status: 'success',
      message: 'Emotion history retrieved successfully',
      data: {
        emotions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: emotions.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching emotion history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch emotion history'
    });
  }
});

// GET /api/emotions - Get user emotions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      startDate, 
      endDate, 
      type,
      emotion,
      minIntensity,
      maxIntensity 
    } = req.query;

    const query = { userId: req.user.userId };

    // Add date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Add emotion filtering (handle both 'emotion' and 'type' fields)
    if (emotion || type) {
      const emotionType = emotion || type;
      query.$or = [
        { emotion: emotionType.toLowerCase() },
        { type: emotionType.toLowerCase() }
      ];
    }

    // Add intensity filtering
    if (minIntensity || maxIntensity) {
      query.intensity = {};
      if (minIntensity) query.intensity.$gte = parseInt(minIntensity);
      if (maxIntensity) query.intensity.$lte = parseInt(maxIntensity);
    }

    const emotions = await Emotion.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await Emotion.countDocuments(query);

    console.log(`✅ Found ${emotions.length} emotions for user ${req.user.userId}`);

    res.json({
      status: 'success',
      message: 'Emotions retrieved successfully',
      data: {
        emotions: emotions.map(emotion => ({
          id: emotion._id,
          type: emotion.type || emotion.emotion,
          emotion: emotion.emotion || emotion.type,
          intensity: emotion.intensity,
          note: emotion.note,
          tags: emotion.tags || [],
          hasLocation: !!emotion.location,
          createdAt: emotion.createdAt,
        })),
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + parseInt(limit),
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching emotions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch emotions'
    });
  }
});

// GET /api/emotions/constants - Get emotion constants and types
router.get('/constants', (req, res) => {
  res.json({
    status: 'success',
    message: 'Emotion constants retrieved successfully',
    data: {
      emotionTypes: [
        // Positive emotions
        'joy', 'happiness', 'excitement', 'love', 'gratitude', 'contentment', 
        'pride', 'relief', 'hope', 'enthusiasm', 'serenity', 'bliss',
        
        // Negative emotions
        'sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 
        'loneliness', 'stress', 'guilt', 'shame', 'jealousy', 'regret',
        
        // Neutral emotions
        'calm', 'peaceful', 'neutral', 'focused', 'curious', 'thoughtful',
        'contemplative', 'reflective', 'alert', 'balanced'
      ],
      intensityLevels: {
        1: { label: 'Very Low', description: 'Barely noticeable' },
        2: { label: 'Low', description: 'Mild feeling' },
        3: { label: 'Moderate', description: 'Noticeable feeling' },
        4: { label: 'High', description: 'Strong feeling' },
        5: { label: 'Very High', description: 'Overwhelming feeling' }
      },
      categories: {
        positive: ['joy', 'happiness', 'excitement', 'love', 'gratitude', 'contentment', 'pride', 'relief', 'hope', 'enthusiasm', 'serenity', 'bliss'],
        negative: ['sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 'loneliness', 'stress', 'guilt', 'shame', 'jealousy', 'regret'],
        neutral: ['calm', 'peaceful', 'neutral', 'focused', 'curious', 'thoughtful', 'contemplative', 'reflective', 'alert', 'balanced']
      },
      commonTags: [
        'work', 'family', 'relationships', 'health', 'money', 'travel', 
        'social', 'personal', 'achievement', 'challenge', 'change', 'routine'
      ]
    }
  });
});

// GET /api/emotions/comprehensive-insights - Get comprehensive insights for enhanced view
router.get('/comprehensive-insights', authMiddleware, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    console.log(`🎯 Fetching comprehensive insights for user: ${req.user.userId} (${timeframe})`);

    const insights = await emotionService.getComprehensiveInsights(req.user.userId, timeframe);

    res.json({
      status: 'success',
      message: 'Comprehensive insights retrieved successfully',
      data: insights
    });

  } catch (error) {
    console.error('❌ Error fetching comprehensive insights:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch comprehensive insights'
    });
  }
});

router.get('/ai-insights', authMiddleware, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    console.log(`🤖 Fetching AI insights for user: ${req.user.userId} (${timeframe})`);

    const aiInsights = await emotionService.getAIInsights(req.user.userId, timeframe);

    res.json({
      status: 'success',
      message: 'AI insights retrieved successfully',
      data: aiInsights
    });

  } catch (error) {
    console.error('❌ Error fetching AI insights:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch AI insights'
    });
  }
});

router.get('/predictions', authMiddleware, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    console.log(`🔮 Fetching predictions for user: ${req.user.userId} (${timeframe})`);

    const predictions = await emotionService.getPredictions(req.user.userId, timeframe);

    res.json({
      status: 'success',
      message: 'Predictions retrieved successfully',
      data: predictions
    });

  } catch (error) {
    console.error('❌ Error fetching predictions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch predictions'
    });
  }
});

// GET /api/emotions/patterns - Get pattern analysis
router.get('/patterns', authMiddleware, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    console.log(`🔍 Fetching patterns for user: ${req.user.userId} (${timeframe})`);

    const patterns = await emotionService.getPatternAnalysis(req.user.userId, timeframe);

    res.json({
      status: 'success',
      message: 'Pattern analysis retrieved successfully',
      data: patterns
    });

  } catch (error) {
    console.error('❌ Error fetching patterns:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pattern analysis'
    });
  }
});

// GET /api/emotions/recommendations - Get personalized recommendations
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    console.log(`💡 Fetching recommendations for user: ${req.user.userId} (${timeframe})`);

    const recommendations = await emotionService.getRecommendations(req.user.userId, timeframe);

    res.json({
      status: 'success',
      message: 'Recommendations retrieved successfully',
      data: recommendations
    });

  } catch (error) {
    console.error('❌ Error fetching recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recommendations'
    });
  }
});

// GET /api/emotions/stats - Get emotion statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
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
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const emotions = await Emotion.find({
      userId: req.user.userId,
      createdAt: { $gte: startDate }
    }).lean();

    const stats = _calculateEmotionStats(emotions);

    res.json({
      status: 'success',
      message: 'Emotion statistics retrieved successfully',
      data: {
        period,
        ...stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching emotion stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch emotion statistics'
    });
  }
});

// DELETE /api/emotions/:id - Delete an emotion
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const emotion = await Emotion.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!emotion) {
      return res.status(404).json({
        status: 'error',
        message: 'Emotion not found'
      });
    }

    await Emotion.findByIdAndDelete(req.params.id);
    
    // Update user analytics after deletion
    await _updateUserAnalytics(req.user.userId);

    console.log(`🗑️ Emotion deleted: ${req.params.id}`);

    res.json({
      status: 'success',
      message: 'Emotion deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting emotion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete emotion'
    });
  }
});

// Helper functions
async function _updateUserAnalytics(userId) {
  try {
    console.log(`. Updating analytics for user: ${userId}`);
    
    const user = await User.findById(userId);
    if (!user) return;

    // Get all emotions for this user
    const emotions = await Emotion.find({ userId }).sort({ createdAt: -1 }).lean();
    
    // Calculate analytics
    const totalEmotionEntries = emotions.length;
    const { currentStreak, longestStreak } = _calculateStreaks(emotions);
    
    // Initialize analytics if not exists
    if (!user.analytics) {
      user.analytics = {};
    }

    // Update analytics
    user.analytics.totalEmotionEntries = totalEmotionEntries;
    user.analytics.currentStreak = currentStreak;
    user.analytics.longestStreak = Math.max(user.analytics.longestStreak || 0, longestStreak);
    user.analytics.lastActiveAt = new Date();

    await user.save();
    
    console.log(`. Analytics updated: ${totalEmotionEntries} entries, ${currentStreak} current streak`);

  } catch (error) {
    console.error('. Error updating user analytics:', error);
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

async function _checkForNewAchievements(userId) {
  try {
    console.log(`🏆 Checking for new achievements for user: ${userId}`);
    
    const user = await User.findById(userId);
    if (!user) return [];

    const emotions = await Emotion.find({ userId }).lean();
    const totalEntries = emotions.length;
    const { currentStreak, longestStreak } = _calculateStreaks(emotions);
    
    // Get unique emotions count
    const uniqueEmotions = new Set(emotions.map(e => e.type || e.emotion)).size;
    
    const newAchievements = [];
    
    // Initialize earnedAchievements if not exists
    if (!user.earnedAchievements) {
      user.earnedAchievements = [];
    }
    
    // Check for milestone achievements
    const milestones = [
      { id: 'first_steps', threshold: 1, field: 'totalEntries' },
      { id: 'getting_started', threshold: 5, field: 'totalEntries' },
      { id: 'emotion_explorer', threshold: 15, field: 'totalEntries' },
      { id: 'dedicated_tracker', threshold: 30, field: 'totalEntries' },
      { id: 'emotion_master', threshold: 100, field: 'totalEntries' },
      { id: 'three_day_streak', threshold: 3, field: 'longestStreak' },
      { id: 'week_warrior', threshold: 7, field: 'longestStreak' },
      { id: 'consistency_king', threshold: 30, field: 'longestStreak' },
      { id: 'emotion_variety', threshold: 10, field: 'uniqueEmotions' },
    ];
    
    const currentValues = {
      totalEntries,
      longestStreak,
      uniqueEmotions,
    };
    
    for (const milestone of milestones) {
      const currentValue = currentValues[milestone.field];
      const alreadyEarned = user.earnedAchievements.includes(milestone.id);
      
      if (currentValue >= milestone.threshold && !alreadyEarned) {
        user.earnedAchievements.push(milestone.id);
        newAchievements.push({
          id: milestone.id,
          earnedAt: new Date(),
          value: currentValue,
        });
        
        console.log(`🎉 New achievement earned: ${milestone.id}`);
      }
    }
    
    if (newAchievements.length > 0) {
      await user.save();
    }
    
    return newAchievements;
    
  } catch (error) {
    console.error('. Error checking achievements:', error);
    return [];
  }
}

function _calculateEmotionStats(emotions) {
  if (emotions.length === 0) {
    return {
      totalEntries: 0,
      averageIntensity: 0,
      emotionBreakdown: {},
      intensityDistribution: {},
      mostFrequentEmotion: null,
      emotionDiversity: 0,
    };
  }

  const totalEntries = emotions.length;
  
  // Calculate average intensity
  const emotionsWithIntensity = emotions.filter(e => e.intensity);
  const averageIntensity = emotionsWithIntensity.length > 0
    ? emotionsWithIntensity.reduce((sum, e) => sum + e.intensity, 0) / emotionsWithIntensity.length
    : 0;

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

  // Most frequent emotion
  const mostFrequentEmotion = Object.entries(emotionBreakdown)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

  // Emotion diversity
  const emotionDiversity = Object.keys(emotionBreakdown).length;

  return {
    totalEntries,
    averageIntensity: Math.round(averageIntensity * 10) / 10,
    emotionBreakdown,
    intensityDistribution,
    mostFrequentEmotion,
    emotionDiversity,
  };
}

export default router;