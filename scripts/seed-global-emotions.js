import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Emotion from '../src/models/emotion.model.js';

dotenv.config();

// Global cities with diverse locations
const GLOBAL_CITIES = [
  // Asia
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, region: 'Asia' },
  { city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, region: 'Asia' },
  { city: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, region: 'Asia' },
  { city: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, region: 'Asia' },
  { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, region: 'Asia' },
  { city: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018, region: 'Asia' },
  { city: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456, region: 'Asia' },
  { city: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842, region: 'Asia' },
  { city: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lng: 101.6869, region: 'Asia' },
  { city: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lng: 106.6297, region: 'Asia' },
  
  // Europe
  { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, region: 'Europe' },
  { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, region: 'Europe' },
  { city: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050, region: 'Europe' },
  { city: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038, region: 'Europe' },
  { city: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964, region: 'Europe' },
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041, region: 'Europe' },
  { city: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686, region: 'Europe' },
  { city: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738, region: 'Europe' },
  { city: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378, region: 'Europe' },
  { city: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122, region: 'Europe' },
  
  // North America
  { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060, region: 'North America' },
  { city: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437, region: 'North America' },
  { city: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298, region: 'North America' },
  { city: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, region: 'North America' },
  { city: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207, region: 'North America' },
  { city: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America' },
  
  // South America
  { city: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, region: 'South America' },
  { city: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729, region: 'South America' },
  { city: 'Buenos Aires', country: 'Argentina', lat: -34.6118, lng: -58.3960, region: 'South America' },
  { city: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428, region: 'South America' },
  { city: 'Bogotá', country: 'Colombia', lat: 4.7110, lng: -74.0721, region: 'South America' },
  
  // Africa
  { city: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, region: 'Africa' },
  { city: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, region: 'Africa' },
  { city: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219, region: 'Africa' },
  { city: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241, region: 'Africa' },
  { city: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473, region: 'Africa' },
  
  // Oceania
  { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, region: 'Oceania' },
  { city: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631, region: 'Oceania' },
  { city: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633, region: 'Oceania' },
  
  // Nepal cities (more focused)
  { city: 'Kathmandu', country: 'Nepal', lat: 27.7172, lng: 85.3240, region: 'Asia' },
  { city: 'Pokhara', country: 'Nepal', lat: 28.2096, lng: 83.9856, region: 'Asia' },
  { city: 'Lalitpur', country: 'Nepal', lat: 27.6667, lng: 85.3333, region: 'Asia' },
  { city: 'Bharatpur', country: 'Nepal', lat: 27.6833, lng: 84.4333, region: 'Asia' },
  { city: 'Biratnagar', country: 'Nepal', lat: 26.4833, lng: 87.2833, region: 'Asia' },
];

// Emotion variations
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

// Context scenarios
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
  'Travel experiences',
  'Food and dining',
  'Entertainment',
  'Sports events',
  'Educational activities',
];

// Generate emotion data
function generateGlobalEmotionData() {
  const emotions = [];
  const now = new Date();
  
  GLOBAL_CITIES.forEach((city, cityIndex) => {
    const baseTime = new Date(now.getTime() - (cityIndex * 2 * 60 * 60 * 1000));
    
    // Generate 3-8 emotions per city
    const emotionCount = Math.floor(Math.random() * 6) + 3;
    
    for (let i = 0; i < emotionCount; i++) {
      const coreEmotion = Object.keys(EMOTION_VARIATIONS)[Math.floor(Math.random() * 8)];
      const emotionTypes = EMOTION_VARIATIONS[coreEmotion];
      const selectedTypes = emotionTypes.slice(0, Math.floor(Math.random() * 3) + 1);
      
      const intensity = Math.random() * 3 + 2; // 2-5 intensity
      const context = CONTEXT_SCENARIOS[Math.floor(Math.random() * CONTEXT_SCENARIOS.length)];
      
      // Add some randomness to coordinates (within city limits)
      const latOffset = (Math.random() - 0.5) * 0.05; // ±0.025 degrees
      const lngOffset = (Math.random() - 0.5) * 0.05;
      
      emotions.push({
        userId: new mongoose.Types.ObjectId(),
        type: 'joy', // Valid enum value
        coreEmotion,
        intensity: parseFloat(intensity.toFixed(1)),
        note: context,
        tags: selectedTypes,
        location: {
          type: 'Point',
          coordinates: [city.lng + lngOffset, city.lat + latOffset],
          city: city.city,
          country: city.country,
          region: city.region,
          displayName: `${city.city}, ${city.country}`,
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
  
  return emotions;
}

// Seed the database
async function seedGlobalEmotionData() {
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
    const emotionData = generateGlobalEmotionData();
    console.log(`Generated ${emotionData.length} emotion records`);
    
    // Insert the data
    const result = await Emotion.insertMany(emotionData);
    console.log(`Successfully inserted ${result.length} emotion records`);
    
    // Display summary by country
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
    
    console.log('\n📊 Global Emotion Data Summary:');
    summary.forEach(country => {
      console.log(`\n${country._id}:`);
      country.emotions.forEach(emotion => {
        console.log(`  ${emotion.emotion}: ${emotion.count} (avg: ${emotion.avgIntensity}/5)`);
      });
    });
    
    // Regional summary
    const regionalSummary = await Emotion.aggregate([
      {
        $group: {
          _id: '$location.region',
          countries: { $addToSet: '$location.country' },
          totalEmotions: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' }
        }
      },
      { $sort: { totalEmotions: -1 } }
    ]);
    
    console.log('\n🌍 Regional Summary:');
    regionalSummary.forEach(region => {
      console.log(`\n${region._id}:`);
      console.log(`  Countries: ${region.countries.join(', ')}`);
      console.log(`  Total emotions: ${region.totalEmotions}`);
      console.log(`  Avg intensity: ${region.avgIntensity.toFixed(2)}/5`);
    });
    
    console.log('\n✅ Global emotion data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGlobalEmotionData();
}

export { seedGlobalEmotionData }; 