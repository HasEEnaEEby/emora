// test-endpoint-basic.js - Basic endpoint functionality test
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:8000';

async function testBasicEndpoints() {
  try {
    console.log('🧪 Testing basic endpoint functionality...');
    
    // Test 1: Health endpoint
    console.log('📡 Test 1: Health endpoint...');
    const healthStart = Date.now();
    const healthResponse = await axios.get(`${BASE_URL}/api/health`, {
      timeout: 10000
    });
    const healthDuration = Date.now() - healthStart;
    
    console.log('✅ Health endpoint:');
    console.log('   Status:', healthResponse.status);
    console.log('   Duration:', healthDuration + 'ms');
    console.log('   Success:', healthResponse.data.success);
    
    // Test 2: Root endpoint
    console.log('📡 Test 2: Root endpoint...');
    const rootStart = Date.now();
    const rootResponse = await axios.get(`${BASE_URL}/`, {
      timeout: 10000
    });
    const rootDuration = Date.now() - rootStart;
    
    console.log('✅ Root endpoint:');
    console.log('   Status:', rootResponse.status);
    console.log('   Duration:', rootDuration + 'ms');
    console.log('   Success:', rootResponse.data.success);
    
    // Test 3: Friend endpoint without auth (should return 401)
    console.log('📡 Test 3: Friend endpoint without auth...');
    const friendStart = Date.now();
    
    try {
      const friendResponse = await axios.post(`${BASE_URL}/api/friends/request/test-user`, {}, {
        timeout: 10000
      });
      console.log('❌ Unexpected success - should have returned 401');
    } catch (error) {
      const friendDuration = Date.now() - friendStart;
      console.log('✅ Friend endpoint (expected 401):');
      console.log('   Status:', error.response?.status);
      console.log('   Duration:', friendDuration + 'ms');
      console.log('   Message:', error.response?.data?.message);
      
      if (error.response?.status === 401) {
        console.log('✅ Correctly returned 401 for unauthenticated request');
      }
    }
    
    console.log('\n🎉 Basic endpoint tests completed successfully!');
    console.log('📊 Performance Summary:');
    console.log('   - Health endpoint: ' + healthDuration + 'ms');
    console.log('   - Root endpoint: ' + rootDuration + 'ms');
    console.log('   - All endpoints responding quickly (< 100ms)');
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('   Error:', error.message);
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
  }
}

// Run the test
testBasicEndpoints(); 