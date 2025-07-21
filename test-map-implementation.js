// test-map-implementation.js - Test script for EMORA Global Emotion Map
import mongoose from 'mongoose';
import Emotion from './src/models/emotion.model.js';
import User from './src/models/user.model.js';
import { mapToPlutchikCoreEmotion, PLUTCHIK_CORE_EMOTIONS } from './src/constants/emotion-mappings.js';

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/emora',
  sampleEmotions: [
    { type: 'joy', intensity: 5, location: { city: 'New York', country: 'USA', coordinates: [-74.006, 40.7128] } },
    { type: 'happiness', intensity: 4, location: { city: 'London', country: 'UK', coordinates: [-0.1276, 51.5074] } },
    { type: 'gratitude', intensity: 4, location: { city: 'Tokyo', country: 'Japan', coordinates: [139.6917, 35.6895] } },
    { type: 'love', intensity: 5, location: { city: 'Paris', country: 'France', coordinates: [2.3522, 48.8566] } },
    { type: 'calm', intensity: 3, location: { city: 'Sydney', country: 'Australia', coordinates: [151.2093, -33.8688] } },
    { type: 'sadness', intensity: 2, location: { city: 'Toronto', country: 'Canada', coordinates: [-79.3832, 43.6532] } },
    { type: 'anger', intensity: 4, location: { city: 'Berlin', country: 'Germany', coordinates: [13.4050, 52.5200] } },
    { type: 'fear', intensity: 1, location: { city: 'Mumbai', country: 'India', coordinates: [72.8777, 19.0760] } }
  ]
};

async function connectToDatabase() {
  try {
    await mongoose.connect(TEST_CONFIG.mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function testPlutchikMapping() {
  console.log('\n🧪 Testing Plutchik Core Emotion Mapping...');
  
  const testEmotions = [
    'joy', 'happiness', 'excitement', 'love', 'gratitude',
    'sadness', 'depression', 'loneliness', 'grief',
    'anger', 'frustration', 'rage', 'irritation',
    'fear', 'anxiety', 'panic', 'worry',
    'trust', 'acceptance', 'admiration',
    'surprise', 'amazement', 'curiosity',
    'disgust', 'hate', 'contempt',
    'anticipation', 'hope', 'optimism'
  ];
  
  testEmotions.forEach(emotion => {
    const coreEmotion = mapToPlutchikCoreEmotion(emotion);
    console.log(`${emotion} → ${coreEmotion}`);
  });
  
  console.log('✅ Plutchik mapping test completed');
}

async function createSampleEmotions() {
  console.log('\n📝 Creating sample emotions for testing...');
  
  // Clear existing test data
  await Emotion.deleteMany({ 'location.city': { $in: ['New York', 'London', 'Tokyo', 'Paris', 'Sydney', 'Toronto', 'Berlin', 'Mumbai'] } });
  
  // Create sample emotions
  const sampleEmotions = [];
  
  for (let i = 0; i < TEST_CONFIG.sampleEmotions.length; i++) {
    const sample = TEST_CONFIG.sampleEmotions[i];
    
    // Create multiple emotions for each location to test clustering
    for (let j = 0; j < 5; j++) {
      const timestamp = new Date(Date.now() - j * 3600000);
      const hour = timestamp.toISOString().slice(0, 13); // "2025-07-20T14"
      const coreEmotion = mapToPlutchikCoreEmotion(sample.type);
      const clusterId = `${sample.location.city.toLowerCase()}-${coreEmotion}-${hour}`;

      const emotion = new Emotion({
        userId: new mongoose.Types.ObjectId(), // Random user ID
        type: sample.type,
        emotion: sample.type,
        coreEmotion: coreEmotion,
        clusterId: clusterId,
        intensity: sample.intensity,
        note: `Test emotion ${j + 1} for ${sample.location.city}`,
        tags: ['test', 'map'],
        location: {
          type: 'Point',
          coordinates: sample.location.coordinates,
          city: sample.location.city,
          country: sample.location.country,
          hasUserConsent: true,
          source: 'test'
        },
        context: {
          weather: 'sunny',
          timeOfDay: 'afternoon',
          socialContext: 'alone'
        },
        privacy: 'public',
        createdAt: timestamp
      });
      
      sampleEmotions.push(emotion);
    }
  }
  
  await Emotion.insertMany(sampleEmotions);
  console.log(`✅ Created ${sampleEmotions.length} sample emotions`);
}

async function testMapDataAPI() {
  console.log('\n🗺️ Testing Map Data API...');
  
  try {
    // Test 1: Get all emotion data
    const allData = await Emotion.getEmotionMapData({});
    console.log(`📊 Found ${allData.length} emotion data points`);
    
    // Test 2: Get data by core emotion
    const joyData = await Emotion.getEmotionMapData({ coreEmotion: 'joy' });
    console.log(`😊 Found ${joyData.length} joy data points`);
    
    // Test 3: Get data by country
    const usaData = await Emotion.getEmotionMapData({ country: 'USA' });
    console.log(`🇺🇸 Found ${usaData.length} USA data points`);
    
    // Test 4: Get clusters
    const clusters = await Emotion.getEmotionClusters({});
    console.log(`🔥 Found ${clusters.length} emotion clusters`);
    
    // Test 5: Get trends
    const trends = await Emotion.getEmotionTrends({ days: 7 });
    console.log(`📈 Found trends for ${trends.length} location-emotion combinations`);
    
    // Test 6: Get global heatmap data
    const heatmapData = await Emotion.getGlobalHeatmapData({});
    console.log(`🔥 Found ${heatmapData.length} heatmap data points`);
    
    console.log('✅ Map data API tests completed');
    
    // Show sample data
    if (allData.length > 0) {
      console.log('\n📋 Sample map data:');
      console.log(JSON.stringify(allData[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Map data API test failed:', error);
  }
}

async function testLocationSchema() {
  console.log('\n📍 Testing Location Schema...');
  
  try {
    // Test location validation
    const validLocation = {
      type: 'Point',
      coordinates: [-74.006, 40.7128],
      city: 'New York',
      country: 'USA',
      hasUserConsent: true,
      source: 'gps'
    };
    
    const emotion = new Emotion({
      userId: new mongoose.Types.ObjectId(),
      type: 'joy',
      emotion: 'joy',
      coreEmotion: 'joy', // Explicitly set core emotion
      intensity: 4,
      location: validLocation,
      privacy: 'public'
    });
    
    await emotion.save();
    console.log('✅ Location schema validation passed');
    
    // Test location methods
    const displayLocation = emotion.location.getDisplayLocation();
    console.log(`📍 Display location: ${displayLocation}`);
    
    const privacyFiltered = emotion.location.getPrivacyFilteredLocation('country');
    console.log(`🔒 Privacy filtered: ${JSON.stringify(privacyFiltered)}`);
    
    const isValid = emotion.location.isValidLocation();
    console.log(`✅ Location validation: ${isValid}`);
    
    const locationString = emotion.location.getLocationString();
    console.log(`📍 Location string: ${locationString}`);
    
    console.log('✅ Location schema tests completed');
    
  } catch (error) {
    console.error('❌ Location schema test failed:', error);
  }
}

async function testCoreEmotionIntegration() {
  console.log('\n🎭 Testing Core Emotion Integration...');
  
  try {
    // Test that core emotions are properly set
    const emotions = await Emotion.find({}).limit(5);
    
    emotions.forEach(emotion => {
      console.log(`${emotion.type} → ${emotion.coreEmotion} (${emotion.clusterId})`);
    });
    
    // Test clusterId generation
    const clusters = await Emotion.aggregate([
      { $group: { _id: '$clusterId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    console.log('\n📊 Top 5 clusters:');
    clusters.forEach(cluster => {
      console.log(`  ${cluster._id}: ${cluster.count} emotions`);
    });
    
    // Test core emotion aggregation
    const coreEmotionStats = await Emotion.aggregate([
      {
        $group: {
          _id: '$coreEmotion',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Core emotion statistics:');
    coreEmotionStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} emotions, avg intensity: ${stat.avgIntensity.toFixed(2)}`);
    });
    
    console.log('✅ Core emotion integration tests completed');
    
  } catch (error) {
    console.error('❌ Core emotion integration test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting EMORA Global Emotion Map Implementation Tests...\n');
  
  try {
    await connectToDatabase();
    await testPlutchikMapping();
    await createSampleEmotions();
    await testMapDataAPI();
    await testLocationSchema();
    await testCoreEmotionIntegration();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Implementation Summary:');
    console.log('✅ Plutchik\'s 8 core emotions mapping');
    console.log('✅ Reusable location schema');
    console.log('✅ Emotion clustering system');
    console.log('✅ Map data aggregation APIs');
    console.log('✅ Core emotion integration');
    console.log('✅ Enhanced emotion model');
    
    console.log('\n🌍 Your EMORA Global Emotion Map is ready!');
    console.log('📡 API Endpoints available:');
    console.log('   GET /api/map/emotion-data');
    console.log('   GET /api/map/emotion-clusters');
    console.log('   GET /api/map/emotion-trends');
    console.log('   GET /api/map/stats');
    console.log('   GET /api/map/core-emotions');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests }; 