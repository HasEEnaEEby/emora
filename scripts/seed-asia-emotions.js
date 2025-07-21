import mongoose from 'mongoose';
import Emotion from '../src/models/emotion.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Nepal and Asian cities with coordinates
const asianCities = [
  // Nepal
  { name: 'Kathmandu', country: 'Nepal', coordinates: [85.3240, 27.7172], region: 'Central' },
  { name: 'Pokhara', country: 'Nepal', coordinates: [83.9856, 28.2096], region: 'Western' },
  { name: 'Lalitpur', country: 'Nepal', coordinates: [85.3240, 27.6667], region: 'Central' },
  { name: 'Bharatpur', country: 'Nepal', coordinates: [84.4439, 27.6833], region: 'Central' },
  { name: 'Biratnagar', country: 'Nepal', coordinates: [87.2833, 26.4833], region: 'Eastern' },
  
  // India
  { name: 'Mumbai', country: 'India', coordinates: [72.8777, 19.0760], region: 'Maharashtra' },
  { name: 'Delhi', country: 'India', coordinates: [77.2090, 28.6139], region: 'Delhi' },
  { name: 'Bangalore', country: 'India', coordinates: [77.5946, 12.9716], region: 'Karnataka' },
  { name: 'Kolkata', country: 'India', coordinates: [88.3639, 22.5726], region: 'West Bengal' },
  
  // China
  { name: 'Beijing', country: 'China', coordinates: [116.4074, 39.9042], region: 'Beijing' },
  { name: 'Shanghai', country: 'China', coordinates: [121.4737, 31.2304], region: 'Shanghai' },
  { name: 'Guangzhou', country: 'China', coordinates: [113.2644, 23.1291], region: 'Guangdong' },
  
  // Japan
  { name: 'Tokyo', country: 'Japan', coordinates: [139.6917, 35.6895], region: 'Kanto' },
  { name: 'Osaka', country: 'Japan', coordinates: [135.5023, 34.6937], region: 'Kansai' },
  { name: 'Kyoto', country: 'Japan', coordinates: [135.7681, 35.0116], region: 'Kansai' },
  
  // South Korea
  { name: 'Seoul', country: 'South Korea', coordinates: [127.7669, 37.5665], region: 'Seoul' },
  { name: 'Busan', country: 'South Korea', coordinates: [129.0756, 35.1796], region: 'Busan' },
  
  // Thailand
  { name: 'Bangkok', country: 'Thailand', coordinates: [100.5018, 13.7563], region: 'Bangkok' },
  { name: 'Chiang Mai', country: 'Thailand', coordinates: [98.9853, 18.7883], region: 'Chiang Mai' },
  
  // Vietnam
  { name: 'Ho Chi Minh City', country: 'Vietnam', coordinates: [106.6297, 10.8231], region: 'Ho Chi Minh' },
  { name: 'Hanoi', country: 'Vietnam', coordinates: [105.8342, 21.0285], region: 'Hanoi' },
  
  // Singapore
  { name: 'Singapore', country: 'Singapore', coordinates: [103.8198, 1.3521], region: 'Singapore' },
  
  // Malaysia
  { name: 'Kuala Lumpur', country: 'Malaysia', coordinates: [101.6869, 3.1390], region: 'Kuala Lumpur' },
  
  // Indonesia
  { name: 'Jakarta', country: 'Indonesia', coordinates: [106.8456, -6.2088], region: 'Jakarta' },
  { name: 'Bali', country: 'Indonesia', coordinates: [115.1889, -8.4095], region: 'Bali' },
  
  // Philippines
  { name: 'Manila', country: 'Philippines', coordinates: [120.9842, 14.5995], region: 'Manila' },
  { name: 'Cebu', country: 'Philippines', coordinates: [123.8854, 10.3157], region: 'Cebu' },
];

// Emotion types with realistic context
const emotions = [
  { coreEmotion: 'joy', emotionTypes: ['joy', 'happiness', 'excitement', 'contentment'], intensity: [3, 4, 5] },
  { coreEmotion: 'trust', emotionTypes: ['hope', 'serenity', 'relief', 'gratitude'], intensity: [3, 4, 5] },
  { coreEmotion: 'fear', emotionTypes: ['fear', 'anxiety', 'panic', 'stress'], intensity: [2, 3, 4] },
  { coreEmotion: 'surprise', emotionTypes: ['surprised', 'curious', 'amused', 'excitement'], intensity: [3, 4, 5] },
  { coreEmotion: 'sadness', emotionTypes: ['sadness', 'disappointment', 'loneliness', 'despair'], intensity: [2, 3, 4] },
  { coreEmotion: 'disgust', emotionTypes: ['disgust', 'frustration', 'disappointment', 'anger'], intensity: [2, 3, 4] },
  { coreEmotion: 'anger', emotionTypes: ['anger', 'rage', 'frustration', 'hate'], intensity: [2, 3, 4] },
  { coreEmotion: 'anticipation', emotionTypes: ['excitement', 'hope', 'enthusiasm', 'curious'], intensity: [3, 4, 5] },
];

// Context data for realistic scenarios
const contexts = [
  { weather: 'sunny', timeOfDay: 'morning', socialContext: 'alone' },
  { weather: 'rainy', timeOfDay: 'afternoon', socialContext: 'with_friends' },
  { weather: 'cloudy', timeOfDay: 'evening', socialContext: 'with_family' },
  { weather: 'sunny', timeOfDay: 'night', socialContext: 'alone' },
  { weather: 'rainy', timeOfDay: 'morning', socialContext: 'at_work' },
  { weather: 'cloudy', timeOfDay: 'afternoon', socialContext: 'alone' },
  { weather: 'sunny', timeOfDay: 'evening', socialContext: 'with_friends' },
  { weather: 'rainy', timeOfDay: 'night', socialContext: 'with_family' },
];

// Realistic notes for different emotions and contexts
const notes = [
  'Feeling grateful for this beautiful day',
  'Missing my family back home',
  'Excited about the new project at work',
  'Stressed about upcoming exams',
  'Happy to spend time with friends',
  'Feeling homesick today',
  'Grateful for the support of my community',
  'Anxious about the future',
  'Joyful after a good meal',
  'Reflecting on life changes',
  'Excited about traveling soon',
  'Feeling peaceful in this moment',
  'Worried about health issues',
  'Happy to help someone today',
  'Missing my hometown',
  'Grateful for technology connecting us',
  'Feeling inspired by nature',
  'Stressed about financial matters',
  'Joyful after exercise',
  'Contemplating life decisions',
];

// Tags for different contexts
const tags = [
  ['family', 'home', 'grateful'],
  ['work', 'stress', 'anxiety'],
  ['friends', 'social', 'happy'],
  ['health', 'wellness', 'peace'],
  ['travel', 'adventure', 'excited'],
  ['study', 'learning', 'focused'],
  ['nature', 'outdoors', 'peaceful'],
  ['music', 'art', 'creative'],
  ['food', 'culture', 'joyful'],
  ['technology', 'innovation', 'curious'],
];

async function seedAsiaEmotions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emora');
    console.log('✅ Connected to MongoDB');

    // Clear existing emotion data (optional - comment out if you want to keep existing data)
    // await Emotion.deleteMany({});
    // console.log('🗑️ Cleared existing emotion data');

    const emotionData = [];
    const now = new Date();
    
    // Generate emotion data for the past 30 days
    for (let day = 0; day < 30; day++) {
      const date = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
      
      // Generate 5-15 emotions per day
      const emotionsPerDay = Math.floor(Math.random() * 11) + 5;
      
      for (let i = 0; i < emotionsPerDay; i++) {
        const city = asianCities[Math.floor(Math.random() * asianCities.length)];
        const emotion = emotions[Math.floor(Math.random() * emotions.length)];
        const context = contexts[Math.floor(Math.random() * contexts.length)];
        const note = notes[Math.floor(Math.random() * notes.length)];
        const tagSet = tags[Math.floor(Math.random() * tags.length)];
        
        // Random time within the day
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const emotionTime = new Date(date);
        emotionTime.setHours(hour, minute, 0, 0);
        
        // Random intensity within the emotion's range
        const intensityRange = emotion.intensity;
        const intensity = intensityRange[Math.floor(Math.random() * intensityRange.length)];
        
        // Random emotion type from the core emotion
        const emotionType = emotion.emotionTypes[Math.floor(Math.random() * emotion.emotionTypes.length)];
        
        // Add some randomness to coordinates (within city limits)
        const latOffset = (Math.random() - 0.5) * 0.1; // ±0.05 degrees
        const lngOffset = (Math.random() - 0.5) * 0.1;
        
        const emotionDoc = {
          userId: new mongoose.Types.ObjectId(), // Generate valid ObjectId
          type: emotionType, // Add the required type field
          coreEmotion: emotion.coreEmotion,
          emotionTypes: [emotionType],
          intensity: intensity,
          note: note,
          tags: tagSet,
          privacy: 'public', // All seeded data is public for map display
          location: {
            type: 'Point', // Add the required type field
            coordinates: [city.coordinates[0] + lngOffset, city.coordinates[1] + latOffset],
            country: city.country,
            city: city.name,
            region: city.region,
            displayName: `${city.name}, ${city.country}`,
          },
          context: context,
          createdAt: emotionTime,
          updatedAt: emotionTime,
        };
        
        emotionData.push(emotionDoc);
      }
    }
    
    // Insert all emotion data
    const result = await Emotion.insertMany(emotionData);
    console.log(`✅ Successfully seeded ${result.length} emotion records`);
    
    // Log some statistics
    const stats = await Emotion.aggregate([
      { $match: { privacy: 'public' } },
      {
        $group: {
          _id: '$location.country',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    
    console.log('\n📊 Seeded Data Statistics:');
    console.log('Country | Count | Avg Intensity');
    console.log('--------|-------|---------------');
    stats.forEach(stat => {
      console.log(`${stat._id} | ${stat.count} | ${stat.avgIntensity.toFixed(2)}`);
    });
    
    // Nepal specific stats
    const nepalStats = await Emotion.aggregate([
      { $match: { 'location.country': 'Nepal' } },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 },
          emotions: { $push: '$coreEmotion' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    
    console.log('\n🇳🇵 Nepal Specific Data:');
    nepalStats.forEach(stat => {
      const emotionCounts = {};
      stat.emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
      const topEmotion = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0];
      console.log(`${stat._id}: ${stat.count} emotions (top: ${topEmotion?.[0] || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding emotion data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedAsiaEmotions();

export { seedAsiaEmotions }; 