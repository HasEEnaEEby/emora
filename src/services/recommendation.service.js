import { getCoreEmotion } from '../constants/emotions.js';
import Mood from '../models/mood.model.js';
import logger from '../utils/logger.js';

class RecommendationsService {
  async getUserRecommendations(userId, options = {}) {
    const { type = 'all', limit = 10 } = options;
    
    try {
      // Get user's recent mood patterns
      const recentMoods = await this.getRecentUserMoods(userId, 7); // Last 7 days
      
      if (recentMoods.length === 0) {
        return this.getDefaultRecommendations();
      }

      // Analyze mood patterns
      const moodAnalysis = this.analyzeMoodPatterns(recentMoods);
      
      // Generate recommendations based on analysis
      const recommendations = await this.generateRecommendations(moodAnalysis, type, limit);
      
      return {
        moodAnalysis,
        recommendations,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting user recommendations:', error);
      throw error;
    }
  }

  async getRecentUserMoods(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await Mood.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 }).limit(50);
  }

  analyzeMoodPatterns(moods) {
    const emotionCounts = {};
    const timePatterns = {};
    let totalIntensity = 0;

    moods.forEach(mood => {
      // Count emotions
      emotionCounts[mood.emotion] = (emotionCounts[mood.emotion] || 0) + 1;
      
      // Track time patterns
      const timeOfDay = mood.context.timeOfDay;
      if (!timePatterns[timeOfDay]) {
        timePatterns[timeOfDay] = {};
      }
      timePatterns[timeOfDay][mood.emotion] = (timePatterns[timeOfDay][mood.emotion] || 0) + 1;
      
      totalIntensity += mood.intensity;
    });

    // Find dominant emotion
    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // Calculate average intensity
    const avgIntensity = totalIntensity / moods.length;

    // Determine overall mood trend
    const negativeEmotions = moods.filter(m => 
      getEmotionCategory(m.emotion) === 'negative'
    ).length;
    const positiveEmotions = moods.filter(m => 
      getEmotionCategory(m.emotion) === 'positive'
    ).length;

    const moodTrend = negativeEmotions > positiveEmotions ? 'negative' : 
                     positiveEmotions > negativeEmotions ? 'positive' : 'neutral';

    return {
      dominantEmotion: dominantEmotion ? dominantEmotion[0] : null,
      dominantEmotionCount: dominantEmotion ? dominantEmotion[1] : 0,
      avgIntensity,
      moodTrend,
      timePatterns,
      totalMoods: moods.length,
      emotionBreakdown: emotionCounts
    };
  }

  async generateRecommendations(analysis, type, limit) {
    const recommendations = [];

    // Music recommendations
    if (type === 'all' || type === 'music') {
      recommendations.push(...this.getMusicRecommendationsByMood(analysis));
    }

    // Activity recommendations
    if (type === 'all' || type === 'activities') {
      recommendations.push(...this.getActivityRecommendationsByMood(analysis));
    }

    // Mindfulness recommendations
    if (type === 'all' || type === 'mindfulness') {
      recommendations.push(...this.getMindfulnessRecommendationsByMood(analysis));
    }

    // Sort by relevance and limit
    return recommendations
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  getMusicRecommendationsByMood(analysis) {
    const { dominantEmotion, moodTrend, avgIntensity } = analysis;
    const recommendations = [];

    // Music recommendations based on dominant emotion
    const musicMap = {
      happy: {
        genres: ['pop', 'indie', 'electronic', 'funk'],
        mood: 'upbeat',
        description: 'Keep the good vibes going with these uplifting tracks'
      },
      sad: {
        genres: ['indie', 'alternative', 'acoustic', 'lo-fi'],
        mood: 'contemplative',
        description: 'Sometimes we need music that understands how we feel'
      },
      angry: {
        genres: ['rock', 'metal', 'punk', 'electronic'],
        mood: 'intense',
        description: 'Channel that energy with powerful, intense music'
      },
      anxious: {
        genres: ['ambient', 'classical', 'lo-fi', 'nature sounds'],
        mood: 'calming',
        description: 'Soothing sounds to help ease anxiety'
      },
      calm: {
        genres: ['ambient', 'classical', 'jazz', 'acoustic'],
        mood: 'peaceful',
        description: 'Perfect music to maintain your peaceful state'
      },
      excited: {
        genres: ['electronic', 'pop', 'dance', 'upbeat'],
        mood: 'energetic',
        description: 'High-energy tracks to match your excitement'
      },
      bored: {
        genres: ['discovery', 'indie', 'world', 'experimental'],
        mood: 'exploratory',
        description: 'Discover something new to spark interest'
      }
    };

    if (dominantEmotion && musicMap[dominantEmotion]) {
      const musicRec = musicMap[dominantEmotion];
      recommendations.push({
        type: 'music',
        category: 'playlist',
        title: `${musicRec.mood.charAt(0).toUpperCase() + musicRec.mood.slice(1)} Playlist`,
        description: musicRec.description,
        data: {
          genres: musicRec.genres,
          mood: musicRec.mood,
          emotion: dominantEmotion,
          intensity: avgIntensity
        },
        relevance: 0.9,
        source: 'mood_analysis'
      });
    }

    // Add time-based recommendations
    if (analysis.timePatterns.evening && Object.keys(analysis.timePatterns.evening).length > 0) {
      recommendations.push({
        type: 'music',
        category: 'playlist',
        title: 'Evening Wind Down',
        description: 'Perfect tracks for your evening routine',
        data: {
          genres: ['ambient', 'acoustic', 'classical'],
          mood: 'relaxing',
          timeOfDay: 'evening'
        },
        relevance: 0.7,
        source: 'time_pattern'
      });
    }

    return recommendations;
  }

  getActivityRecommendationsByMood(analysis) {
    const { dominantEmotion, moodTrend, avgIntensity } = analysis;
    const recommendations = [];

    const activityMap = {
      happy: [
        { activity: 'Share your joy', description: 'Call a friend or family member to share your good mood' },
        { activity: 'Creative project', description: 'Start a fun creative project while feeling inspired' },
        { activity: 'Outdoor adventure', description: 'Take your positive energy outside for a walk or bike ride' }
      ],
      sad: [
        { activity: 'Gentle self-care', description: 'Take a warm bath or practice gentle stretching' },
        { activity: 'Journaling', description: 'Write down your thoughts and feelings' },
        { activity: 'Watch comfort content', description: 'Watch a favorite movie or show for comfort' }
      ],
      angry: [
        { activity: 'Physical exercise', description: 'Go for a run or do high-intensity workout' },
        { activity: 'Anger journaling', description: 'Write down what\'s bothering you to process the emotion' },
        { activity: 'Progressive muscle relaxation', description: 'Tense and release muscle groups to release tension' }
      ],
      anxious: [
        { activity: 'Deep breathing', description: 'Practice 4-7-8 breathing technique' },
        { activity: 'Grounding exercise', description: 'Use the 5-4-3-2-1 sensory grounding technique' },
        { activity: 'Gentle yoga', description: 'Try restorative yoga poses' }
      ],
      calm: [
        { activity: 'Meditation', description: 'Enjoy a peaceful meditation session' },
        { activity: 'Reading', description: 'Read a book in a comfortable spot' },
        { activity: 'Nature observation', description: 'Spend time observing nature mindfully' }
      ],
      excited: [
        { activity: 'Social connection', description: 'Share your excitement with friends' },
        { activity: 'Start new project', description: 'Channel your energy into something productive' },
        { activity: 'Dance or movement', description: 'Express your energy through movement' }
      ],
      bored: [
        { activity: 'Learn something new', description: 'Try a new skill or hobby' },
        { activity: 'Explore your area', description: 'Take a walk somewhere you\'ve never been' },
        { activity: 'Creative challenge', description: 'Do a creative challenge or puzzle' }
      ]
    };

    if (dominantEmotion && activityMap[dominantEmotion]) {
      activityMap[dominantEmotion].forEach((activity, index) => {
        recommendations.push({
          type: 'activity',
          category: 'behavioral',
          title: activity.activity,
          description: activity.description,
          data: {
            emotion: dominantEmotion,
            difficulty: 'easy',
            timeRequired: '10-30 minutes'
          },
          relevance: 0.8 - (index * 0.1),
          source: 'emotion_based'
        });
      });
    }

    return recommendations;
  }

  getMindfulnessRecommendationsByMood(analysis) {
    const { moodTrend, avgIntensity } = analysis;
    const recommendations = [];

    // General mindfulness recommendations
    const mindfulnessActivities = [
      {
        title: 'Mindful Breathing',
        description: 'Focus on your breath for 5 minutes',
        technique: 'breath_focus',
        duration: 5
      },
      {
        title: 'Body Scan',
        description: 'Progressive body awareness meditation',
        technique: 'body_scan',
        duration: 10
      },
      {
        title: 'Loving Kindness',
        description: 'Send positive intentions to yourself and others',
        technique: 'loving_kindness',
        duration: 15
      }
    ];

    // Intensity-based recommendations
    if (avgIntensity > 4) {
      recommendations.push({
        type: 'mindfulness',
        category: 'meditation',
        title: 'Intensity Regulation',
        description: 'Techniques to help regulate intense emotions',
        data: {
          techniques: ['4-7-8 breathing', 'Progressive muscle relaxation'],
          duration: 10,
          intensity: 'high'
        },
        relevance: 0.9,
        source: 'intensity_based'
      });
    }

    // Add general mindfulness recommendations
    mindfulnessActivities.forEach((activity, index) => {
      recommendations.push({
        type: 'mindfulness',
        category: 'meditation',
        title: activity.title,
        description: activity.description,
        data: {
          technique: activity.technique,
          duration: activity.duration,
          difficulty: 'beginner'
        },
        relevance: 0.6 - (index * 0.1),
        source: 'general'
      });
    });

    return recommendations;
  }

  async getMusicRecommendations(userId, options = {}) {
    const recommendations = await this.getUserRecommendations(userId, {
      ...options,
      type: 'music'
    });
    return recommendations.recommendations;
  }

  async getActivityRecommendations(userId, options = {}) {
    const recommendations = await this.getUserRecommendations(userId, {
      ...options,
      type: 'activities'
    });
    return recommendations.recommendations;
  }

  async getMindfulnessRecommendations(userId, options = {}) {
    const recommendations = await this.getUserRecommendations(userId, {
      ...options,
      type: 'mindfulness'
    });
    return recommendations.recommendations;
  }

  getDefaultRecommendations() {
    return {
      moodAnalysis: null,
      recommendations: [
        {
          type: 'activity',
          category: 'getting_started',
          title: 'Start Your Mood Journey',
          description: 'Log your first mood to get personalized recommendations',
          data: {
            action: 'log_mood',
            priority: 'high'
          },
          relevance: 1.0,
          source: 'onboarding'
        },
        {
          type: 'mindfulness',
          category: 'meditation',
          title: 'Welcome Meditation',
          description: 'A gentle 5-minute meditation to start your mindfulness practice',
          data: {
            technique: 'breath_focus',
            duration: 5,
            difficulty: 'beginner'
          },
          relevance: 0.8,
          source: 'default'
        }
      ],
      generatedAt: new Date()
    };
  }
}

export default new RecommendationsService();
