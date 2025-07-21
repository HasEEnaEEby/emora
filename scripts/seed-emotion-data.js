import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Emotion from '../src/models/emotion.model.js';

dotenv.config();

// Nepal coordinates and cities
const NEPAL_LOCATIONS = [
  { city: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
  { city: 'Pokhara', lat: 28.2096, lng: 83.9856 },
  { city: 'Lalitpur', lat: 27.6667, lng: 85.3333 },
  { city: 'Bharatpur', lat: 27.6833, lng: 84.4333 },
  { city: 'Biratnagar', lat: 26.4833, lng: 87.2833 },
  { city: 'Birgunj', lat: 27.0000, lng: 84.8667 },
  { city: 'Dharan', lat: 26.8167, lng: 87.2833 },
  { city: 'Butwal', lat: 27.7000, lng: 83.4500 },
  { city: 'Hetauda', lat: 27.4167, lng: 85.0333 },
  { city: 'Nepalgunj', lat: 28.0500, lng: 81.6167 },
];

// Global locations for diversity
const GLOBAL_LOCATIONS = [
  { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
  { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { city: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
  { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { city: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { city: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { city: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
  { city: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
];

// Emotion types and their variations
const EMOTION_VARIATIONS = {
  joy: ['happiness', 'excitement', 'gratitude', 'contentment', 'elation'],
  trust: ['love', 'acceptance', 'admiration', 'devotion', 'reverence'],
  fear: ['anxiety', 'stress', 'worry', 'panic', 'apprehension'],
  surprise: ['amazement', 'astonishment', 'curiosity', 'wonder', 'shock'],
  sadness: ['grief', 'melancholy', 'despair', 'loneliness', 'disappointment'],
  disgust: ['aversion', 'distaste', 'repulsion', 'contempt', 'revulsion'],
  anger: ['frustration', 'rage', 'irritation', 'outrage', 'resentment'],
  anticipation: ['hope', 'excitement', 'eagerness', 'optimism', 'expectancy'],
};

// Context scenarios for realistic data
const CONTEXT_SCENARIOS = [
  'Daily commute',
  'Work stress',
  'Family time',
  'Social media',
  'News events',
  'Weather impact',
  'Health concerns',
  'Financial worries',
  'Relationship issues',
  'Personal achievements',
  'Community events',
  'Cultural celebrations',
  'Political events',
  'Economic changes',
  'Environmental concerns',
];

// Generate random emotion data
function generateEmotionData() {
  const emotions = [];
  const now = new Date();
  
  // Generate Nepal data (more focused)
  NEPAL_LOCATIONS.forEach((location, index) => {
    const baseTime = new Date(now.getTime() - (index * 2 * 60 * 60 * 1000)); // Spread over time
    
    // Generate 5-15 emotions per location
    const emotionCount = Math.floor(Math.random() * 11) + 5;
    
    for (let i = 0; i < emotionCount; i++) {
      const coreEmotion = Object.keys(EMOTION_VARIATIONS)[Math.floor(Math.random() * 8)];
      const emotionTypes = EMOTION_VARIATIONS[coreEmotion];
      const selectedTypes = emotionTypes.slice(0, Math.floor(Math.random() * 3) + 1);
      
      const intensity = Math.random() * 3 + 2; // 2-5 intensity
      const context = CONTEXT_SCENARIOS[Math.floor(Math.random() * CONTEXT_SCENARIOS.length)];
      
      emotions.push({
        userId: new mongoose.Types.ObjectId(), // Generate ObjectId
        type: 'joy', // Use valid type from enum, will be overridden by coreEmotion
        coreEmotion,
        intensity: parseFloat(intensity.toFixed(1)),
        note: context,
        tags: selectedTypes,
        location: {
          type: 'Point',
          coordinates: [location.lng + (Math.random() - 0.5) * 0.1, location.lat + (Math.random() - 0.5) * 0.1],
          city: location.city,
          country: 'Nepal',
          source: 'test'
        },
        privacy: 'public',
        isAnonymous: true,
        metadata: {
          source: 'api',
          version: '1.0.0'
        },
        createdAt: new Date(baseTime.getTime() + (i * 30 * 60 * 1000))
      });
    }
  });
  
  // Generate global data
  GLOBAL_LOCATIONS.forEach((location, index) => {
    const baseTime = new Date(now.getTime() - ((index + 10) * 3 * 60 * 60 * 1000));
    
    const emotionCount = Math.floor(Math.random() * 8) + 3;
    
    for (let i = 0; i < emotionCount; i++) {
      const coreEmotion = Object.keys(EMOTION_VARIATIONS)[Math.floor(Math.random() * 8)];
      const emotionTypes = EMOTION_VARIATIONS[coreEmotion];
      const selectedTypes = emotionTypes.slice(0, Math.floor(Math.random() * 3) + 1);
      
      const intensity = Math.random() * 3 + 2;
      const context = CONTEXT_SCENARIOS[Math.floor(Math.random() * CONTEXT_SCENARIOS.length)];
      
      emotions.push({
        userId: new mongoose.Types.ObjectId(), // Generate ObjectId
        type: 'joy', // Use valid type from enum, will be overridden by coreEmotion
        coreEmotion,
        intensity: parseFloat(intensity.toFixed(1)),
        note: context,
        tags: selectedTypes,
        location: {
          type: 'Point',
          coordinates: [location.lng + (Math.random() - 0.5) * 0.05, location.lat + (Math.random() - 0.5) * 0.05],
          city: location.city,
          country: location.country,
          source: 'test'
        },
        privacy: 'public',
        isAnonymous: true,
        metadata: {
          source: 'api',
          version: '1.0.0'
        },
        createdAt: new Date(baseTime.getTime() + (i * 45 * 60 * 1000))
      });
    }
  });
  
  return emotions;
}

// Seed the database
async function seedEmotionData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Clear existing emotion data
    await Emotion.deleteMany({});
    console.log('Cleared existing emotion data');
    
    // Generate new emotion data
    const emotionData = generateEmotionData();
    console.log(`Generated ${emotionData.length} emotion records`);
    
    // Insert the data
    const result = await Emotion.insertMany(emotionData);
    console.log(`Successfully inserted ${result.length} emotion records`);
    
    // Display summary
    const summary = await Emotion.aggregate([
      {
        $group: {
          _id: {
            country: '$location.country',
            coreEmotion: '$coreEmotion'
          },
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' }
        }
      },
      {
        $group: {
          _id: '$_id.country',
          emotions: {
            $push: {
              emotion: '$_id.coreEmotion',
              count: '$count',
              avgIntensity: { $round: ['$avgIntensity', 2] }
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);
    
    console.log('\n📊 Emotion Data Summary:');
    summary.forEach(country => {
      console.log(`\n${country._id}:`);
      country.emotions.forEach(emotion => {
        console.log(`  ${emotion.emotion}: ${emotion.count} (avg: ${emotion.avgIntensity}/5)`);
      });
    });
    
    // Nepal specific summary
    const nepalData = await Emotion.find({ 'location.country': 'Nepal' });
    const nepalStats = await Emotion.aggregate([
      { $match: { 'location.country': 'Nepal' } },
      {
        $group: {
          _id: '$coreEmotion',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          cities: { $addToSet: '$location.city' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n🇳🇵 Nepal Emotion Summary:');
    nepalStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} emotions (avg: ${stat.avgIntensity.toFixed(1)}/5) in ${stat.cities.length} cities`);
    });
    
    console.log('\n✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding
if (import.meta.url === `file://${process.argv[1]}`) {
  seedEmotionData();
}

export { seedEmotionData }; 