import mongoose from 'mongoose';
import Emotion from './src/models/emotion.model.js';

async function testRegions() {
  try {
    await mongoose.connect('mongodb://localhost:27017/emora');
    console.log('✅ Connected to MongoDB');

    // Get all available regions
    const regions = await Emotion.aggregate([
      { $match: { privacy: 'public' } },
      {
        $group: {
          _id: {
            country: '$location.country',
            city: '$location.city'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n🌍 Available regions:');
    regions.forEach((r, i) => {
      console.log(`${i + 1}. ${r._id.city}, ${r._id.country}: ${r.count} emotions`);
    });

    // Test region matching for "Mexico City, Mexico"
    console.log('\n🔍 Testing region matching for "Mexico City, Mexico":');
    
    const testRegion = 'Mexico City, Mexico';
    const parts = testRegion.split(',');
    const cityPart = parts[0]?.trim();
    const countryPart = parts[1]?.trim();
    
    console.log(`City part: "${cityPart}"`);
    console.log(`Country part: "${countryPart}"`);

    // Test different matching strategies
    const queries = [
      { 'location.country': { $regex: testRegion, $options: 'i' } },
      { 'location.city': { $regex: testRegion, $options: 'i' } },
      { 'location.country': { $regex: countryPart, $options: 'i' } },
      { 'location.city': { $regex: cityPart, $options: 'i' } },
      { 'location.country': { $regex: 'Mexico', $options: 'i' } },
      { 'location.city': { $regex: 'Mexico City', $options: 'i' } }
    ];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const results = await Emotion.find({
        ...query,
        privacy: 'public'
      }).lean();
      
      console.log(`Query ${i + 1}: ${JSON.stringify(query)}`);
      console.log(`  Found: ${results.length} emotions`);
      if (results.length > 0) {
        console.log(`  Sample locations: ${results.slice(0, 3).map(e => `${e.location?.city}, ${e.location?.country}`).join('; ')}`);
      }
    }

    // Test the actual insight controller query
    console.log('\n🔍 Testing actual insight controller query:');
    const insightQuery = {
      $or: [
        { 'location.country': { $regex: testRegion, $options: 'i' } },
        { 'location.city': { $regex: testRegion, $options: 'i' } },
        { 'location.region': { $regex: testRegion, $options: 'i' } },
        { 'location.country': { $regex: cityPart, $options: 'i' } },
        { 'location.city': { $regex: cityPart, $options: 'i' } }
      ],
      privacy: 'public'
    };

    const insightResults = await Emotion.find(insightQuery).lean();
    console.log(`Insight query found: ${insightResults.length} emotions`);
    if (insightResults.length > 0) {
      console.log(`Sample locations: ${insightResults.slice(0, 3).map(e => `${e.location?.city}, ${e.location?.country}`).join('; ')}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRegions(); 