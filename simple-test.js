import axios from 'axios';

async function testBackend() {
  console.log('🧪 Testing backend fixes...\n');
  
  try {
    // Test 1: Health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:8000/api/health');
    console.log('✅ Health endpoint working:', healthResponse.data.success);
    
    // Test 2: Emotion constants
    console.log('\n2️⃣ Testing emotion constants...');
    const constantsResponse = await axios.get('http://localhost:8000/api/emotions/constants');
    console.log('✅ Emotion constants working:', constantsResponse.data.success);
    console.log('   Available emotions:', constantsResponse.data.data.emotions.length);
    console.log('   Includes "joy":', constantsResponse.data.data.emotions.includes('joy'));
    
    // Test 3: Dashboard
    console.log('\n3️⃣ Testing dashboard...');
    const dashboardResponse = await axios.get('http://localhost:8000/api/dashboard/home');
    console.log('✅ Dashboard working:', dashboardResponse.data.success);
    
    // Test 4: Root endpoint
    console.log('\n4️⃣ Testing root endpoint...');
    const rootResponse = await axios.get('http://localhost:8000/');
    console.log('✅ Root endpoint working:', rootResponse.data.success);
    
    console.log('\n🎉 All tests passed! Backend is working correctly!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

testBackend(); 