import mongoose from 'mongoose';
import Emotion from '../src/models/emotion.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Detailed Nepal cities and regions with cultural context
const nepalCities = [
  // Kathmandu Valley
  { 
    name: 'Kathmandu', 
    country: 'Nepal', 
    coordinates: [85.3240, 27.7172], 
    region: 'Central',
    culturalNotes: 'Capital city, bustling with tourists and locals',
    landmarks: ['Durbar Square', 'Swayambhunath', 'Pashupatinath']
  },
  { 
    name: 'Lalitpur', 
    country: 'Nepal', 
    coordinates: [85.3240, 27.6667], 
    region: 'Central',
    culturalNotes: 'Ancient city known for traditional architecture',
    landmarks: ['Patan Durbar Square', 'Golden Temple', 'Kumbeshwar']
  },
  { 
    name: 'Bhaktapur', 
    country: 'Nepal', 
    coordinates: [85.4281, 27.6710], 
    region: 'Central',
    culturalNotes: 'Medieval city with rich Newari culture',
    landmarks: ['Bhaktapur Durbar Square', 'Nyatapola Temple', 'Dattatreya Square']
  },
  
  // Western Nepal
  { 
    name: 'Pokhara', 
    country: 'Nepal', 
    coordinates: [83.9856, 28.2096], 
    region: 'Western',
    culturalNotes: 'Tourist hub with beautiful lakes and mountains',
    landmarks: ['Phewa Lake', 'World Peace Pagoda', 'Sarangkot']
  },
  { 
    name: 'Nepalgunj', 
    country: 'Nepal', 
    coordinates: [81.6167, 28.0500], 
    region: 'Western',
    culturalNotes: 'Gateway to western Nepal',
    landmarks: ['Bageshwori Temple', 'Narayan Ghat']
  },
  
  // Central Nepal
  { 
    name: 'Bharatpur', 
    country: 'Nepal', 
    coordinates: [84.4439, 27.6833], 
    region: 'Central',
    culturalNotes: 'Agricultural hub with modern development',
    landmarks: ['Chitwan National Park', 'Narayani River']
  },
  { 
    name: 'Hetauda', 
    country: 'Nepal', 
    coordinates: [85.0333, 27.4167], 
    region: 'Central',
    culturalNotes: 'Industrial city with growing population',
    landmarks: ['Makwanpur Gadhi', 'Indra Sarovar']
  },
  
  // Eastern Nepal
  { 
    name: 'Biratnagar', 
    country: 'Nepal', 
    coordinates: [87.2833, 26.4833], 
    region: 'Eastern',
    culturalNotes: 'Major industrial and commercial center',
    landmarks: ['Koshi Tappu Wildlife Reserve', 'Koshi Barrage']
  },
  { 
    name: 'Dharan', 
    country: 'Nepal', 
    coordinates: [87.2833, 26.8167], 
    region: 'Eastern',
    culturalNotes: 'Hill station with diverse ethnic groups',
    landmarks: ['Dantakali Temple', 'Pindeswari Temple']
  },
  
  // Far Western Nepal
  { 
    name: 'Dhangadhi', 
    country: 'Nepal', 
    coordinates: [80.5833, 28.7000], 
    region: 'Far Western',
    culturalNotes: 'Gateway to far western Nepal',
    landmarks: ['Shuklaphanta National Park', 'Mahakali River']
  },
  
  // Mountain Regions
  { 
    name: 'Namche Bazaar', 
    country: 'Nepal', 
    coordinates: [86.7167, 27.8000], 
    region: 'Eastern',
    culturalNotes: 'Sherpa village and trekking hub',
    landmarks: ['Everest Base Camp', 'Sagarmatha National Park']
  },
  { 
    name: 'Jomsom', 
    country: 'Nepal', 
    coordinates: [83.7333, 28.7833], 
    region: 'Western',
    culturalNotes: 'Mustang region gateway',
    landmarks: ['Muktinath Temple', 'Kali Gandaki Gorge']
  },
];

// Nepal-specific emotions and cultural context
const nepalEmotions = [
  { 
    coreEmotion: 'joy', 
    emotionTypes: ['joy', 'happiness', 'excitement', 'contentment'], 
    intensity: [3, 4, 5],
    culturalContext: 'Festivals, family gatherings, successful harvests'
  },
  { 
    coreEmotion: 'trust', 
    emotionTypes: ['hope', 'serenity', 'relief', 'gratitude'], 
    intensity: [3, 4, 5],
    culturalContext: 'Community support, religious faith, family bonds'
  },
  { 
    coreEmotion: 'fear', 
    emotionTypes: ['fear', 'anxiety', 'panic', 'stress'], 
    intensity: [2, 3, 4],
    culturalContext: 'Natural disasters, economic uncertainty, health concerns'
  },
  { 
    coreEmotion: 'surprise', 
    emotionTypes: ['surprised', 'curious', 'amused', 'excitement'], 
    intensity: [3, 4, 5],
    culturalContext: 'Tourist interactions, new technologies, cultural discoveries'
  },
  { 
    coreEmotion: 'sadness', 
    emotionTypes: ['sadness', 'disappointment', 'loneliness', 'despair'], 
    intensity: [2, 3, 4],
    culturalContext: 'Missing family, economic hardships, natural disasters'
  },
  { 
    coreEmotion: 'disgust', 
    emotionTypes: ['disgust', 'frustration', 'disappointment', 'anger'], 
    intensity: [2, 3, 4],
    culturalContext: 'Political issues, corruption, environmental problems'
  },
  { 
    coreEmotion: 'anger', 
    emotionTypes: ['anger', 'rage', 'frustration', 'hate'], 
    intensity: [2, 3, 4],
    culturalContext: 'Social injustice, economic inequality, political unrest'
  },
  { 
    coreEmotion: 'anticipation', 
    emotionTypes: ['excitement', 'hope', 'enthusiasm', 'curious'], 
    intensity: [3, 4, 5],
    culturalContext: 'Festivals, family visits, economic opportunities'
  },
];

// Nepal-specific context data
const nepalContexts = [
  { weather: 'sunny', timeOfDay: 'morning', socialContext: 'alone', culturalEvent: 'daily_puja' },
  { weather: 'rainy', timeOfDay: 'afternoon', socialContext: 'with_family', culturalEvent: 'monsoon_season' },
  { weather: 'cloudy', timeOfDay: 'evening', socialContext: 'with_friends', culturalEvent: 'festival_preparation' },
  { weather: 'sunny', timeOfDay: 'night', socialContext: 'alone', culturalEvent: 'meditation' },
  { weather: 'rainy', timeOfDay: 'morning', socialContext: 'at_work', culturalEvent: 'work_day' },
  { weather: 'cloudy', timeOfDay: 'afternoon', socialContext: 'alone', culturalEvent: 'market_day' },
  { weather: 'sunny', timeOfDay: 'evening', socialContext: 'with_friends', culturalEvent: 'social_gathering' },
  { weather: 'rainy', timeOfDay: 'night', socialContext: 'with_family', culturalEvent: 'family_time' },
];

// Nepal-specific notes reflecting cultural context
const nepalNotes = [
  // Religious and Spiritual
  'Feeling blessed after morning puja',
  'Grateful for the temple visit today',
  'Finding peace in meditation',
  'Thankful for community support',
  'Feeling connected to my ancestors',
  
  // Family and Community
  'Missing my family in the village',
  'Happy to help my neighbor today',
  'Grateful for our close-knit community',
  'Feeling homesick for my hometown',
  'Joyful after family gathering',
  
  // Nature and Environment
  'Awed by the mountain views',
  'Peaceful in the garden',
  'Inspired by the monsoon rain',
  'Grateful for clean air',
  'Feeling connected to nature',
  
  // Work and Education
  'Excited about learning new skills',
  'Stressed about upcoming exams',
  'Happy to contribute to my community',
  'Worried about job opportunities',
  'Grateful for educational opportunities',
  
  // Cultural and Social
  'Excited about the upcoming festival',
  'Missing traditional food from home',
  'Happy to share our culture with visitors',
  'Feeling proud of our heritage',
  'Grateful for cultural preservation',
  
  // Economic and Development
  'Hopeful about economic growth',
  'Concerned about rising costs',
  'Grateful for remittance support',
  'Excited about new opportunities',
  'Worried about financial stability',
  
  // Health and Wellness
  'Feeling healthy and strong',
  'Grateful for traditional medicine',
  'Concerned about healthcare access',
  'Happy to exercise in nature',
  'Feeling peaceful and balanced',
  
  // Technology and Modern Life
  'Excited about new technology',
  'Grateful for internet connectivity',
  'Missing face-to-face interactions',
  'Happy to stay connected with family abroad',
  'Feeling overwhelmed by social media',
];

// Nepal-specific tags
const nepalTags = [
  ['family', 'home', 'grateful', 'nepal'],
  ['work', 'stress', 'anxiety', 'kathmandu'],
  ['friends', 'social', 'happy', 'community'],
  ['health', 'wellness', 'peace', 'meditation'],
  ['travel', 'adventure', 'excited', 'himalayas'],
  ['study', 'learning', 'focused', 'education'],
  ['nature', 'outdoors', 'peaceful', 'mountains'],
  ['music', 'art', 'creative', 'culture'],
  ['food', 'culture', 'joyful', 'traditional'],
  ['technology', 'innovation', 'curious', 'modern'],
  ['religion', 'spiritual', 'faith', 'temple'],
  ['festival', 'celebration', 'joy', 'tradition'],
  ['village', 'rural', 'simple', 'authentic'],
  ['tourism', 'visitors', 'international', 'global'],
  ['development', 'progress', 'future', 'hope'],
];

// Nepal-specific cultural events and seasons
const culturalEvents = [
  { name: 'Dashain', month: 9, emotion: 'joy', intensity: 5 },
  { name: 'Tihar', month: 10, emotion: 'joy', intensity: 4 },
  { name: 'Holi', month: 2, emotion: 'joy', intensity: 5 },
  { name: 'Buddha Jayanti', month: 4, emotion: 'trust', intensity: 4 },
  { name: 'Indra Jatra', month: 8, emotion: 'anticipation', intensity: 4 },
  { name: 'Maha Shivaratri', month: 1, emotion: 'trust', intensity: 4 },
];

async function seedNepalEmotions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emora');
    console.log('✅ Connected to MongoDB');

    const emotionData = [];
    const now = new Date();
    
    // Generate emotion data for the past 60 days with more focus on Nepal
    for (let day = 0; day < 60; day++) {
      const date = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
      const month = date.getMonth();
      
      // Check for cultural events
      const culturalEvent = culturalEvents.find(event => event.month === month);
      
      // Generate 8-20 emotions per day (more for Nepal)
      const emotionsPerDay = Math.floor(Math.random() * 13) + 8;
      
      for (let i = 0; i < emotionsPerDay; i++) {
        // 70% chance for Nepal cities, 30% for other Asian cities
        const isNepal = Math.random() < 0.7;
        
        let city, emotion, context, note, tagSet;
        
        if (isNepal) {
          city = nepalCities[Math.floor(Math.random() * nepalCities.length)];
          emotion = nepalEmotions[Math.floor(Math.random() * nepalEmotions.length)];
          context = nepalContexts[Math.floor(Math.random() * nepalContexts.length)];
          note = nepalNotes[Math.floor(Math.random() * nepalNotes.length)];
          tagSet = nepalTags[Math.floor(Math.random() * nepalTags.length)];
          
          // Boost emotion intensity during cultural events
          if (culturalEvent && emotion.coreEmotion === culturalEvent.emotion) {
            emotion.intensity = [culturalEvent.intensity, culturalEvent.intensity, culturalEvent.intensity];
          }
        } else {
          // Use some other Asian cities for variety
          const otherAsianCities = [
            { name: 'Mumbai', country: 'India', coordinates: [72.8777, 19.0760], region: 'Maharashtra' },
            { name: 'Delhi', country: 'India', coordinates: [77.2090, 28.6139], region: 'Delhi' },
            { name: 'Dhaka', country: 'Bangladesh', coordinates: [90.3563, 23.8103], region: 'Dhaka' },
            { name: 'Colombo', country: 'Sri Lanka', coordinates: [79.8612, 6.9271], region: 'Western' },
          ];
          city = otherAsianCities[Math.floor(Math.random() * otherAsianCities.length)];
          emotion = nepalEmotions[Math.floor(Math.random() * nepalEmotions.length)];
          context = nepalContexts[Math.floor(Math.random() * nepalContexts.length)];
          note = nepalNotes[Math.floor(Math.random() * nepalNotes.length)];
          tagSet = nepalTags[Math.floor(Math.random() * nepalTags.length)];
        }
        
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
        const latOffset = (Math.random() - 0.5) * 0.05; // ±0.025 degrees for more precise location
        const lngOffset = (Math.random() - 0.5) * 0.05;
        
        const emotionDoc = {
          userId: new mongoose.Types.ObjectId(), // Generate valid ObjectId
          type: emotionType, // Add the required type field
          coreEmotion: emotion.coreEmotion,
          emotionTypes: [emotionType],
          intensity: intensity,
          note: note,
          tags: tagSet,
          privacy: 'public',
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
    
    // Detailed Nepal statistics
    const nepalStats = await Emotion.aggregate([
      { $match: { 'location.country': 'Nepal' } },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 },
          emotions: { $push: '$coreEmotion' },
          avgIntensity: { $avg: '$intensity' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    
    console.log('\n🇳🇵 Nepal Detailed Statistics:');
    console.log('City | Count | Avg Intensity | Top Emotion');
    console.log('-----|-------|---------------|------------');
    nepalStats.forEach(stat => {
      const emotionCounts = {};
      stat.emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
      const topEmotion = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0];
      console.log(`${stat._id} | ${stat.count} | ${stat.avgIntensity.toFixed(2)} | ${topEmotion?.[0] || 'N/A'}`);
    });
    
    // Emotion distribution in Nepal
    const emotionDistribution = await Emotion.aggregate([
      { $match: { 'location.country': 'Nepal' } },
      {
        $group: {
          _id: '$coreEmotion',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    
    console.log('\n📊 Nepal Emotion Distribution:');
    emotionDistribution.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} (avg intensity: ${stat.avgIntensity.toFixed(2)})`);
    });
    
    // Regional statistics
    const regionalStats = await Emotion.aggregate([
      { $match: { 'location.country': 'Nepal' } },
      {
        $group: {
          _id: '$location.region',
          count: { $sum: 1 },
          cities: { $addToSet: '$location.city' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    
    console.log('\n🗺️ Nepal Regional Distribution:');
    regionalStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} emotions (${stat.cities.length} cities)`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding Nepal emotion data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedNepalEmotions();

export { seedNepalEmotions }; 