import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/user.model.js';
import Mood from './src/models/mood.model.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emora';

// Sample data
const sampleUsers = [
  {
    username: 'alice_emotions',
    email: 'alice@example.com',
    password: '$2b$10$sample.hash.here',
    profile: {
      displayName: 'Alice Johnson',
      bio: 'Exploring emotions through mindfulness',
      pronouns: 'She/Her',
      ageGroup: '25-34'
    },
    selectedAvatar: 'cat',
    location: {
      type: 'Point',
      coordinates: [-74.006, 40.7128] // NYC
    },
    isActive: true,
    privacySettings: {
      profileVisibility: 'public'
    }
  },
  {
    username: 'bob_mindful',
    email: 'bob@example.com',
    password: '$2b$10$sample.hash.here',
    profile: {
      displayName: 'Bob Wilson',
      bio: 'Mental health advocate',
      pronouns: 'He/Him',
      ageGroup: '35-44'
    },
    selectedAvatar: 'dog',
    location: {
      type: 'Point',
      coordinates: [-118.2437, 34.0522] // LA
    },
    isActive: true,
    privacySettings: {
      profileVisibility: 'public'
    }
  }
];

const sampleMoods = [
  {
    emotion: 'joy',
    intensity: 5,
    note: 'Had a wonderful day at the park! The sunshine and fresh air really lifted my spirits.',
    privacy: 'public',
    location: {
      type: 'Point',
      coordinates: [-74.006, 40.7128],
      city: 'New York',
      country: 'United States',
      continent: 'North America'
    },
    context: {
      timeOfDay: 'afternoon',
      dayOfWeek: 'saturday',
      weather: 'sunny',
      isWeekend: true
    },
    source: 'mobile',
    reactions: [],
    comments: []
  },
  {
    emotion: 'calm',
    intensity: 4,
    note: 'Meditation session went really well today. Feeling centered and peaceful.',
    privacy: 'public',
    location: {
      type: 'Point',
      coordinates: [-118.2437, 34.0522],
      city: 'Los Angeles',
      country: 'United States',
      continent: 'North America'
    },
    context: {
      timeOfDay: 'morning',
      dayOfWeek: 'sunday',
      weather: 'cloudy',
      isWeekend: true
    },
    source: 'mobile',
    reactions: [],
    comments: []
  },
  {
    emotion: 'excited',
    intensity: 5,
    note: 'Just got promoted at work! All the hard work is paying off 🎉',
    privacy: 'public',
    location: {
      type: 'Point',
      coordinates: [-74.006, 40.7128],
      city: 'New York',
      country: 'United States',
      continent: 'North America'
    },
    context: {
      timeOfDay: 'morning',
      dayOfWeek: 'friday',
      weather: 'sunny',
      isWeekend: false
    },
    source: 'mobile',
    reactions: [],
    comments: []
  },
  {
    emotion: 'grateful',
    intensity: 4,
    note: 'Grateful for good friends and family. Had a lovely dinner together.',
    privacy: 'public',
    location: {
      type: 'Point',
      coordinates: [-118.2437, 34.0522],
      city: 'Los Angeles',
      country: 'United States',
      continent: 'North America'
    },
    context: {
      timeOfDay: 'evening',
      dayOfWeek: 'thursday',
      weather: 'cloudy',
      isWeekend: false
    },
    source: 'mobile',
    reactions: [],
    comments: []
  },
  {
    emotion: 'content',
    intensity: 3,
    note: 'Simple pleasures - coffee, books, and a cozy afternoon at home.',
    privacy: 'public',
    location: {
      type: 'Point',
      coordinates: [-74.006, 40.7128],
      city: 'New York',
      country: 'United States',
      continent: 'North America'
    },
    context: {
      timeOfDay: 'afternoon',
      dayOfWeek: 'wednesday',
      weather: 'rainy',
      isWeekend: false
    },
    source: 'mobile',
    reactions: [],
    comments: []
  }
];

async function seedData() {
  try {
    console.log('🌱 Starting data seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    
    console.log('✅ Connected to MongoDB');

    // Clear existing sample data (but keep the main user)
    await User.deleteMany({ 
      username: { $in: ['alice_emotions', 'bob_mindful'] } 
    });
    await Mood.deleteMany({ 
      note: { $regex: /park|meditation|promoted|grateful|coffee/i } 
    });

    console.log('🧹 Cleared existing sample data');

    // Create sample users
    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`👥 Created ${createdUsers.length} sample users`);

    // Add user IDs to mood data
    const moodsWithUsers = sampleMoods.map((mood, index) => ({
      ...mood,
      userId: createdUsers[index % createdUsers.length]._id
    }));

    // Create sample moods
    const createdMoods = await Mood.insertMany(moodsWithUsers);
    console.log(`🎭 Created ${createdMoods.length} sample moods`);

    // Add some reactions to make it more interactive
    for (let i = 0; i < createdMoods.length; i++) {
      const mood = createdMoods[i];
      const reactorUser = createdUsers[(i + 1) % createdUsers.length];
      
      mood.reactions.push({
        userId: reactorUser._id,
        emoji: ['❤️', '🤗', '👏', '🙌', '💫'][i % 5],
        type: 'comfort',
        createdAt: new Date()
      });
      
      await mood.save();
    }

    console.log('💝 Added sample reactions');

    console.log('🎉 Data seeding completed successfully!');
    console.log(`
📊 Sample Data Summary:
   👥 Users: ${createdUsers.length}
   🎭 Moods: ${createdMoods.length}
   💝 Reactions: ${createdMoods.length}
   
🔗 Test the API:
   • Global Feed: http://localhost:8000/api/community/global-feed
   • Global Stats: http://localhost:8000/api/community/global-stats
   • Friend Suggestions: http://localhost:8000/api/friends/suggestions
    `);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedData(); 