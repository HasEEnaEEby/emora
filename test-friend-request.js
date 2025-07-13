// test-friend-request.js - Test friend request endpoint performance
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:8000';
const TEST_USER_ID = '6871cb163ea584f3d7a48850'; // The user ID from the error logs

async function loginAndGetToken() {
  try {
    console.log('🔑 Logging in to get authentication token...');
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: '0to1e', // Using the username from the logs
      password: 'Rohan@123' // Using the correct password from curl test
    }, {
      timeout: 10000
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      return loginResponse.data.data.token;
    } else {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return null;
  }
}

async function testFriendRequest() {
  try {
    console.log('🧪 Testing friend request endpoint...');
    
    // First, let's test the health endpoint
    console.log('📡 Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`, {
      timeout: 10000
    });
    console.log('✅ Health check passed:', healthResponse.data.success);
    
    // Get authentication token
    const token = await loginAndGetToken();
    if (!token) {
      console.log('❌ Cannot proceed without authentication token');
      return;
    }
    
    // Test friend request endpoint
    console.log('📡 Testing friend request endpoint...');
    const startTime = Date.now();
    
    const response = await axios.post(`${BASE_URL}/api/friends/request/${TEST_USER_ID}`, {}, {
      timeout: 60000, // 60 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Friend request test completed:');
    console.log('   Status:', response.status);
    console.log('   Duration:', duration + 'ms');
    console.log('   Response:', response.data);
    
    // Test the optimized performance
    if (duration < 5000) {
      console.log('🚀 Excellent performance! Response time under 5 seconds');
    } else if (duration < 10000) {
      console.log('✅ Good performance! Response time under 10 seconds');
    } else {
      console.log('⚠️ Slow performance! Response time over 10 seconds');
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('   Error:', error.message);
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Duration:', error.code === 'ECONNABORTED' ? 'Timeout' : 'Unknown');
    
    // Check if it's a rate limit error
    if (error.response?.status === 429) {
      console.log('📊 Rate limit hit - this is expected behavior');
    }
  }
}

// Run the test
testFriendRequest(); 