// seed-emotion-data.js - Comprehensive emotion data seeding
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from './src/models/user.model.js';
import Emotion from './src/models/emotion.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emora';

// Emotion types from the model
const EMOTION_TYPES = [
  // Positive emotions
  'joy', 'happiness', 'excitement', 'love', 'gratitude', 'contentment', 
  'pride', 'relief', 'hope', 'enthusiasm', 'serenity', 'bliss',
  
  // Negative emotions
  'sadness', 'anger', 'fear', 'anxiety', 'frustration', 'disappointment', 
  'loneliness', 'stress', 'guilt', 'shame', 'jealousy', 'regret',
  
  // Neutral emotions
  'calm', 'peaceful', 'neutral', 'focused', 'curious', 'thoughtful',
  'contemplative', 'reflective', 'alert', 'balanced'
];

// Sample locations for emotion entries
const SAMPLE_LOCATIONS = [
  {
    type: 'Point',
    coordinates: [-74.006, 40.7128], // New York
    address: 'New York, NY, USA'
  },
  {
    type: 'Point',
    coordinates: [-0.1276, 51.5074], // London
    address: 'London, UK'
  },
  {
    type: 'Point',
    coordinates: [139.6917, 35.6895], // Tokyo
    address: 'Tokyo, Japan'
  },
  {
    type: 'Point',
    coordinates: [13.4050, 52.5200], // Berlin
    address: 'Berlin, Germany'
  },
  {
    type: 'Point',
    coordinates: [151.2093, -33.8688], // Sydney
    address: 'Sydney, Australia'
  }
];

// Sample context data
const CONTEXT_OPTIONS = {
  weather: ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy'],
  timeOfDay: ['morning', 'afternoon', 'evening', 'night'],
  socialContext: ['alone', 'with_friends', 'with_family', 'at_work', 'in_public'],
  activity: [
    'working', 'exercising', 'cooking', 'reading', 'watching_tv', 'socializing',
    'commuting', 'shopping', 'studying', 'meditating', 'gaming', 'outdoors'
  ]
};

// Sample tags
const SAMPLE_TAGS = [
  'work', 'family', 'relationships', 'health', 'money', 'travel', 
  'social', 'personal', 'achievement', 'challenge', 'change', 'routine',
  'exercise', 'food', 'music', 'nature', 'technology', 'art', 'learning'
];

// Sample notes for emotions
const EMOTION_NOTES = {
  joy: [
    "Had an amazing day at the beach with friends! The sunshine was perfect.",
    "Just finished a great workout session. Those endorphins are really kicking in!",
    "Got the job I've been dreaming of! Everything is falling into place.",
    "Spent quality time with family today. These moments are priceless.",
    "Achieved a personal goal I've been working towards for months."
  ],
  happiness: [
    "Woke up feeling grateful for all the wonderful people in my life.",
    "Had the most delicious homemade pasta for dinner. Cooking really is therapeutic.",
    "Received a surprise gift from a friend. It's the little things that matter.",
    "Spent the afternoon in nature. The fresh air and sunshine were perfect.",
    "Completed a challenging project and feel so accomplished."
  ],
  excitement: [
    "Planning a trip to a new country! The anticipation is building.",
    "Starting a new chapter in my life. Everything feels possible.",
    "Got tickets to my favorite band's concert. Can't wait!",
    "About to try something completely new and different.",
    "Received exciting news that changes everything for the better."
  ],
  love: [
    "Spent the evening cuddling with my partner. Pure bliss.",
    "My child said 'I love you' for the first time today.",
    "Reconnected with an old friend. Our bond is still strong.",
    "Witnessed a beautiful moment between strangers. Love is everywhere.",
    "Felt overwhelming gratitude for my support system."
  ],
  gratitude: [
    "Reflecting on all the good things in my life today.",
    "Someone held the door open for me. Small acts of kindness matter.",
    "Grateful for my health and the ability to move freely.",
    "Appreciating the simple pleasures: good food, warm home, loving people.",
    "Thankful for the challenges that have made me stronger."
  ],
  contentment: [
    "Sitting in my favorite spot with a good book and hot tea.",
    "Everything feels balanced and peaceful right now.",
    "Enjoying the quiet moments of the day.",
    "Feeling satisfied with where I am in life.",
    "Simple pleasures bring the most joy."
  ],
  pride: [
    "Just finished a marathon! Never thought I could do it.",
    "My child graduated today. So proud of their achievements.",
    "Overcame a fear that's been holding me back.",
    "Helped someone in need and it felt amazing.",
    "Accomplished something I've been working towards for years."
  ],
  relief: [
    "Finally got the test results back - everything is okay.",
    "Resolved a conflict that's been weighing on me.",
    "Finished a stressful project at work.",
    "Found my lost keys after searching for hours.",
    "Got through a difficult conversation successfully."
  ],
  hope: [
    "Starting a new treatment that could change everything.",
    "Applied for my dream job. Fingers crossed!",
    "Seeing positive changes in a difficult situation.",
    "Planning for a better future.",
    "Believing that good things are coming."
  ],
  enthusiasm: [
    "Starting a new hobby that I'm passionate about.",
    "Meeting new people who share my interests.",
    "Learning something new and exciting.",
    "Planning an adventure that gets my heart racing.",
    "Feeling motivated and energized about life."
  ],
  serenity: [
    "Meditation session was particularly peaceful today.",
    "Watching the sunset from my balcony.",
    "Feeling at peace with myself and the world.",
    "Spending time in nature, feeling connected.",
    "Everything feels harmonious and balanced."
  ],
  bliss: [
    "Perfect moment with someone I love deeply.",
    "Achieved a state of complete peace and joy.",
    "Experiencing pure happiness without any worries.",
    "Everything feels perfect right now.",
    "Living in the moment and loving it."
  ],
  sadness: [
    "Missing someone who's no longer in my life.",
    "Feeling overwhelmed by recent losses.",
    "Struggling with loneliness today.",
    "Disappointed by how things turned out.",
    "Feeling disconnected from others."
  ],
  anger: [
    "Frustrated by unfair treatment at work.",
    "Angry about a broken promise.",
    "Irritated by constant interruptions.",
    "Mad about a situation I can't control.",
    "Feeling disrespected and unheard."
  ],
  fear: [
    "Anxious about an upcoming medical procedure.",
    "Scared about financial uncertainty.",
    "Fearful about a relationship ending.",
    "Worried about a loved one's health.",
    "Afraid of making a big mistake."
  ],
  anxiety: [
    "Overthinking about tomorrow's presentation.",
    "Stressed about meeting deadlines.",
    "Worried about what others think of me.",
    "Anxious about social situations.",
    "Feeling overwhelmed by responsibilities."
  ],
  frustration: [
    "Technology is not cooperating today.",
    "Stuck in traffic when I'm already late.",
    "Can't seem to get anything right.",
    "Frustrated by lack of progress.",
    "Everything feels like an uphill battle."
  ],
  disappointment: [
    "Didn't get the promotion I was hoping for.",
    "Plans fell through at the last minute.",
    "Someone let me down again.",
    "Not achieving what I set out to do.",
    "Feeling let down by life."
  ],
  loneliness: [
    "Everyone seems busy and unavailable.",
    "Feeling isolated in a crowded room.",
    "Missing deep connections with others.",
    "No one understands what I'm going through.",
    "Feeling alone in my struggles."
  ],
  stress: [
    "Too many deadlines approaching.",
    "Juggling too many responsibilities.",
    "Financial pressure is overwhelming.",
    "Work-life balance is non-existent.",
    "Everything feels urgent and important."
  ],
  guilt: [
    "I should have handled that situation better.",
    "Feeling bad about hurting someone's feelings.",
    "Not spending enough time with family.",
    "Guilty about taking time for myself.",
    "Should have been more understanding."
  ],
  shame: [
    "Embarrassed about a mistake I made.",
    "Feeling inadequate compared to others.",
    "Ashamed of my past actions.",
    "Not living up to my own standards.",
    "Feeling like I don't belong."
  ],
  jealousy: [
    "Envious of someone else's success.",
    "Jealous of a friend's relationship.",
    "Wishing I had what others have.",
    "Comparing myself unfavorably to others.",
    "Feeling left out of social events."
  ],
  regret: [
    "Wishing I had made different choices.",
    "Regretting words I can't take back.",
    "Should have taken that opportunity.",
    "Looking back with disappointment.",
    "If only I had known then what I know now."
  ],
  calm: [
    "Taking deep breaths and finding peace.",
    "Everything feels manageable right now.",
    "Feeling centered and grounded.",
    "Mind is clear and focused.",
    "At ease with the present moment."
  ],
  peaceful: [
    "Sitting in quiet contemplation.",
    "Feeling harmony with the world.",
    "Mind is at rest and content.",
    "Everything feels balanced.",
    "Experiencing inner tranquility."
  ],
  neutral: [
    "Feeling neither particularly good nor bad.",
    "Just going through the motions today.",
    "Neither happy nor sad, just existing.",
    "Feeling indifferent about most things.",
    "In a state of emotional equilibrium."
  ],
  focused: [
    "Concentrating deeply on my work.",
    "Mind is sharp and alert.",
    "Feeling productive and driven.",
    "Clear about my goals and priorities.",
    "In the zone and getting things done."
  ],
  curious: [
    "Interested in learning something new.",
    "Wondering about the world around me.",
    "Asking questions and seeking answers.",
    "Feeling intrigued by possibilities.",
    "Open to new experiences and ideas."
  ],
  thoughtful: [
    "Reflecting on recent experiences.",
    "Thinking deeply about life choices.",
    "Contemplating the meaning of things.",
    "Processing emotions and thoughts.",
    "Taking time to understand myself better."
  ],
  contemplative: [
    "Spending time in quiet reflection.",
    "Thinking about the bigger picture.",
    "Contemplating life's mysteries.",
    "Feeling philosophical today.",
    "Deep in thought about existence."
  ],
  reflective: [
    "Looking back on my journey so far.",
    "Thinking about lessons learned.",
    "Reflecting on personal growth.",
    "Contemplating my values and beliefs.",
    "Taking stock of where I am in life."
  ],
  alert: [
    "Feeling awake and aware.",
    "Mind is sharp and responsive.",
    "Ready to handle whatever comes.",
    "Feeling vigilant and prepared.",
    "Senses are heightened and focused."
  ],
  balanced: [
    "Feeling emotionally stable today.",
    "Work and life feel in harmony.",
    "Mind and body are aligned.",
    "Everything feels proportional.",
    "In a state of emotional equilibrium."
  ]
};

// Helper functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomTags() {
  const numTags = randomInt(0, 3);
  const tags = [];
  for (let i = 0; i < numTags; i++) {
    const tag = randomChoice(SAMPLE_TAGS);
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

function getRandomContext() {
  return {
    weather: randomChoice(CONTEXT_OPTIONS.weather),
    timeOfDay: randomChoice(CONTEXT_OPTIONS.timeOfDay),
    socialContext: randomChoice(CONTEXT_OPTIONS.socialContext),
    activity: randomChoice(CONTEXT_OPTIONS.activity)
  };
}

function getRandomLocation() {
  return randomBool(0.3) ? randomChoice(SAMPLE_LOCATIONS) : null;
}

function getRandomNote(emotionType) {
  const notes = EMOTION_NOTES[emotionType] || EMOTION_NOTES.neutral;
  return randomBool(0.7) ? randomChoice(notes) : '';
}

async function createEmotionEntries(users, count = 1000) {
  console.log(`🎭 Creating ${count} emotion entries...`);
  
  const emotions = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < count; i++) {
    const user = randomChoice(users);
    const emotionType = randomChoice(EMOTION_TYPES);
    const intensity = randomInt(1, 5);
    const timestamp = randomDate(thirtyDaysAgo, now);
    const location = getRandomLocation();
    const context = getRandomContext();
    const tags = getRandomTags();
    const note = getRandomNote(emotionType);
    
    const emotion = new Emotion({
      userId: user._id,
      type: emotionType,
      emotion: emotionType, // For backward compatibility
      intensity: intensity,
      note: note,
      tags: tags,
      location: location,
      context: context,
      privacy: randomChoice(['private', 'friends', 'public']),
      isAnonymous: randomBool(0.1),
      metadata: {
        source: 'mobile',
        version: '1.0.0',
        deviceInfo: {
          platform: randomChoice(['iOS', 'Android']),
          model: randomChoice(['iPhone', 'Samsung', 'Google Pixel']),
          os: randomChoice(['iOS 15', 'Android 12', 'iOS 16', 'Android 13'])
        }
      },
      createdAt: timestamp,
      updatedAt: timestamp
    });
    
    emotions.push(emotion);
  }
  
  try {
    await Emotion.insertMany(emotions);
    console.log(`✅ Created ${emotions.length} emotion entries`);
    return emotions;
  } catch (error) {
    console.error('❌ Error creating emotion entries:', error);
    throw error;
  }
}

async function updateUserAnalytics(users) {
  console.log('📊 Updating user analytics...');
  
  for (const user of users) {
    try {
      const userEmotions = await Emotion.find({ userId: user._id }).lean();
      
      if (userEmotions.length > 0) {
        // Calculate analytics
        const totalEmotionEntries = userEmotions.length;
        const averageIntensity = userEmotions.reduce((sum, e) => sum + e.intensity, 0) / userEmotions.length;
        
        // Calculate streaks
        const emotionsByDate = {};
        userEmotions.forEach(emotion => {
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
        
        // Calculate current streak
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
        
        // Update user analytics
        if (!user.analytics) {
          user.analytics = {};
        }
        
        user.analytics.totalEmotionEntries = totalEmotionEntries;
        user.analytics.currentStreak = currentStreak;
        user.analytics.longestStreak = Math.max(user.analytics.longestStreak || 0, longestStreak);
        user.analytics.averageEmotionIntensity = Math.round(averageIntensity * 10) / 10;
        user.analytics.lastActiveAt = new Date();
        
        await user.save();
      }
    } catch (error) {
      console.error(`❌ Error updating analytics for user ${user._id}:`, error);
    }
  }
  
  console.log('✅ User analytics updated');
}

async function seedEmotionData() {
  try {
    console.log('🚀 Starting emotion data seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get existing users
    const users = await User.find({}).limit(50);
    if (users.length === 0) {
      console.log('❌ No users found. Please run the main seed script first.');
      return;
    }
    
    console.log(`📋 Found ${users.length} users to create emotion data for`);
    
    // Create emotion entries
    const emotionEntries = await createEmotionEntries(users, 500);
    
    // Update user analytics
    await updateUserAnalytics(users);
    
    console.log('🎉 Emotion data seeding completed successfully!');
    console.log(`📊 Created ${emotionEntries.length} emotion entries`);
    console.log(`👥 Updated analytics for ${users.length} users`);
    
  } catch (error) {
    console.error('❌ Error seeding emotion data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding
seedEmotionData(); 