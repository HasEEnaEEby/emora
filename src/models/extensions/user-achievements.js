// src/models/extensions/user-achievements.js - Extension for your existing User model
import User from '../user.model.js';

// Add achievement tracking to your existing User schema
const userSchema = User.schema;

// Add achievement fields if they don't exist
if (!userSchema.paths.achievements) {
  userSchema.add({
    achievements: {
      earnedAchievements: [{
        type: String,
        default: [],
      }],
      achievementProgress: {
        type: Map,
        of: Number,
        default: new Map(),
      },
      lastAchievementDate: {
        type: Date,
      },
      totalAchievements: {
        type: Number,
        default: 0,
      },
    }
  });
}

// Extend analytics if needed
if (!userSchema.paths['analytics.averageEmotionIntensity']) {
  userSchema.add({
    'analytics.averageEmotionIntensity': {
      type: Number,
      default: 0,
    },
    'analytics.emotionBreakdown': {
      type: Map,
      of: Number,
      default: new Map(),
    },
    'analytics.firstEmotionDate': {
      type: Date,
    },
  });
}

// Add methods for achievement tracking
userSchema.methods.updateAnalytics = async function(emotionData = null) {
  try {
    // Import Emotion model here to avoid circular dependency
    const Emotion = mongoose.model('Emotion');
    
    // Get all emotions for this user
    const emotions = await Emotion.find({ userId: this._id }).sort({ createdAt: -1 }).lean();
    
    // Update basic stats
    this.analytics.totalEmotionEntries = emotions.length;
    
    if (emotions.length > 0) {
      // Update first emotion date
      if (!this.analytics.firstEmotionDate) {
        this.analytics.firstEmotionDate = emotions[emotions.length - 1].createdAt;
      }
      
      // Calculate streaks using your existing method
      this.updateStreak();
      
      // Calculate average intensity
      const emotionsWithIntensity = emotions.filter(e => e.intensity);
      if (emotionsWithIntensity.length > 0) {
        this.analytics.averageEmotionIntensity = emotionsWithIntensity.reduce((sum, e) => sum + e.intensity, 0) / emotionsWithIntensity.length;
      }
      
      // Update emotion breakdown
      const breakdown = new Map();
      emotions.forEach(emotion => {
        const type = emotion.type || emotion.emotion;
        breakdown.set(type, (breakdown.get(type) || 0) + 1);
      });
      this.analytics.emotionBreakdown = breakdown;
    }
    
    // Update last active time
    this.analytics.lastActiveAt = new Date();
    
    await this.save();
    
    console.log(`. Analytics updated for user ${this.username}: ${this.analytics.totalEmotionEntries} entries, ${this.analytics.currentStreak} streak`);
    
  } catch (error) {
    console.error('. Error updating user analytics:', error);
  }
};

userSchema.methods.checkAndUpdateAchievements = async function() {
  try {
    const newAchievements = [];
    
    // Initialize achievements if not exists
    if (!this.achievements) {
      this.achievements = {
        earnedAchievements: [],
        achievementProgress: new Map(),
        totalAchievements: 0,
      };
    }
    
    const totalEntries = this.analytics?.totalEmotionEntries || 0;
    const currentStreak = this.analytics?.currentStreak || 0;
    const longestStreak = this.analytics?.longestStreak || 0;
    const daysSinceJoining = this.daysSinceJoined;
    
    // Get emotion diversity from breakdown
    const emotionTypes = this.analytics?.emotionBreakdown?.size || 0;
    
    // Achievement definitions
    const achievementChecks = [
      {
        id: 'first_steps',
        condition: totalEntries >= 1,
        title: 'First Steps',
        description: 'Logged your first emotion',
      },
      {
        id: 'getting_started',
        condition: totalEntries >= 5,
        title: 'Getting Started',
        description: 'Logged 5 emotions',
      },
      {
        id: 'emotion_explorer',
        condition: totalEntries >= 15,
        title: 'Emotion Explorer',
        description: 'Logged 15 emotions',
      },
      {
        id: 'dedicated_tracker',
        condition: totalEntries >= 30,
        title: 'Dedicated Tracker',
        description: 'Logged 30 emotions',
      },
      {
        id: 'emotion_master',
        condition: totalEntries >= 100,
        title: 'Emotion Master',
        description: 'Logged 100 emotions',
      },
      {
        id: 'three_day_streak',
        condition: longestStreak >= 3,
        title: 'Three Day Warrior',
        description: 'Maintained a 3-day streak',
      },
      {
        id: 'week_warrior',
        condition: longestStreak >= 7,
        title: 'Week Warrior',
        description: 'Maintained a 7-day streak',
      },
      {
        id: 'consistency_champion',
        condition: longestStreak >= 30,
        title: 'Consistency Champion',
        description: 'Maintained a 30-day streak',
      },
      {
        id: 'emotion_variety',
        condition: emotionTypes >= 10,
        title: 'Emotion Variety',
        description: 'Logged 10 different emotions',
      },
      {
        id: 'veteran_user',
        condition: daysSinceJoining >= 30,
        title: 'Veteran User',
        description: 'Active member for 30 days',
      },
    ];
    
    // Check each achievement
    for (const achievement of achievementChecks) {
      const alreadyEarned = this.achievements.earnedAchievements.includes(achievement.id);
      
      if (achievement.condition && !alreadyEarned) {
        this.achievements.earnedAchievements.push(achievement.id);
        this.achievements.lastAchievementDate = new Date();
        newAchievements.push({
          ...achievement,
          earnedAt: new Date(),
        });
        
        console.log(`🎉 New achievement earned by ${this.username}: ${achievement.title}`);
      }
    }
    
    // Update total achievements
    this.achievements.totalAchievements = this.achievements.earnedAchievements.length;
    
    if (newAchievements.length > 0) {
      await this.save();
    }
    
    return newAchievements;
    
  } catch (error) {
    console.error('. Error checking achievements:', error);
    return [];
  }
};

// Add virtual for achievement completion percentage
userSchema.virtual('achievementCompletionPercentage').get(function() {
  const totalPossibleAchievements = 10; 
  const earnedCount = this.achievements?.earnedAchievements?.length || 0;
  return Math.round((earnedCount / totalPossibleAchievements) * 100);
});

// Add method to get user level based on activity
userSchema.methods.getUserLevel = function() {
  const totalEntries = this.analytics?.totalEmotionEntries || 0;
  const currentStreak = this.analytics?.currentStreak || 0;
  
  if (totalEntries === 0) return 'New Explorer';
  if (totalEntries >= 1 && totalEntries < 5) return 'Emotion Novice';
  if (totalEntries >= 5 && totalEntries < 15) return 'Mood Tracker';
  if (totalEntries >= 15 && totalEntries < 30) return 'Feeling Expert';
  if (totalEntries >= 30 && totalEntries < 50) return 'Emotion Master';
  if (totalEntries >= 50 && totalEntries < 100) return 'Emotional Explorer';
  if (currentStreak >= 30) return 'Consistency Champion';
  if (totalEntries >= 100) return 'Emotion Sage';
  return 'Emotional Explorer';
};

// Export the extended User model
export default User;