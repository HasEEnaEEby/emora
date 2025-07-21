import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

async function testServer() {
  console.log('🔍 Testing EMORA Backend Server...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log(`✅ Health check: ${healthResponse.status} - ${healthResponse.data.message}`);
    
    // Test API docs
    console.log('\n2. Testing API docs...');
    const docsResponse = await axios.get(`${BASE_URL}/api/docs`);
    console.log(`✅ API docs: ${docsResponse.status} - ${docsResponse.data.message}`);
    
    // Test map endpoints
    console.log('\n3. Testing map endpoints...');
    
    try {
      const emotionDataResponse = await axios.get(`${BASE_URL}/api/map/emotion-data`);
      console.log(`✅ Emotion data: ${emotionDataResponse.status} - ${emotionDataResponse.data.data?.length || 0} records`);
    } catch (error) {
      console.log(`❌ Emotion data: ${error.response?.status || error.message}`);
    }
    
    try {
      const clustersResponse = await axios.get(`${BASE_URL}/api/map/emotion-clusters`);
      console.log(`✅ Emotion clusters: ${clustersResponse.status} - ${clustersResponse.data.data?.length || 0} clusters`);
    } catch (error) {
      console.log(`❌ Emotion clusters: ${error.response?.status || error.message}`);
    }
    
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/map/stats`);
      console.log(`✅ Global stats: ${statsResponse.status} - ${statsResponse.data.data?.totalEmotions || 0} total emotions`);
    } catch (error) {
      console.log(`❌ Global stats: ${error.response?.status || error.message}`);
    }
    
    // Test Nepal-specific data
    console.log('\n4. Testing Nepal-specific data...');
    
    try {
      const nepalResponse = await axios.get(`${BASE_URL}/api/map/emotion-data?country=Nepal`);
      console.log(`✅ Nepal emotions: ${nepalResponse.data.data?.length || 0} records`);
    } catch (error) {
      console.log(`❌ Nepal emotions: ${error.response?.status || error.message}`);
    }
    
    console.log('\n🎉 Server test completed!');
    
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Start it with:');
      console.log('   cd emora-backend && npm start');
    }
  }
}

// Run the test
testServer(); 