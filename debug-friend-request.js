// debug-friend-request.js - SIMPLE DEBUG TEST
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
const TEST_USERNAME = '0to1e';
const TEST_PASSWORD = 'Rohan@123';

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    });

    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

async function testSimpleFriendRequest() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const testUserId = '6871cb1b3ea584f3d7a4886e';

  try {
    console.log('📤 Testing simple friend request...');
    console.log('📊 Target user ID:', testUserId);
    
    const startTime = Date.now();
    
    // Test with shorter timeout first
    const response = await axios.post(
      `${BASE_URL}/api/friends/request/${testUserId}`,
      {},
      { 
        headers,
        timeout: 5000 // 5 second timeout for quick test
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Friend request successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📥 Response:', response.data);

    return response.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('❌ Friend request failed');
    console.log('⏱️ Time taken:', duration + 'ms');
    console.log('📊 Status:', error.response?.status);
    console.log('📥 Error data:', error.response?.data || error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('🚨 REQUEST TIMED OUT - Backend is hanging!');
    }
    
    return null;
  }
}

async function testHealthEndpoint() {
  try {
    console.log('🏥 Testing health endpoint...');
    const response = await axios.get(`${BASE_URL}/api/health`, {
      timeout: 5000
    });
    console.log('✅ Health endpoint working:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  try {
    console.log('🗄️ Testing database connection via user endpoint...');
    const response = await axios.get(`${BASE_URL}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    console.log('✅ Database connection working:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function runDebugTests() {
  console.log('🔍 Starting debug tests...\n');

  // Test 1: Health endpoint
  console.log('='.repeat(50));
  console.log('TEST 1: Health Endpoint');
  console.log('='.repeat(50));
  await testHealthEndpoint();

  // Test 2: Login
  console.log('\n' + '='.repeat(50));
  console.log('TEST 2: Login');
  console.log('='.repeat(50));
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without login');
    return;
  }

  // Test 3: Database connection
  console.log('\n' + '='.repeat(50));
  console.log('TEST 3: Database Connection');
  console.log('='.repeat(50));
  await testDatabaseConnection();

  // Test 4: Friend request
  console.log('\n' + '='.repeat(50));
  console.log('TEST 4: Friend Request (5s timeout)');
  console.log('='.repeat(50));
  await testSimpleFriendRequest();

  console.log('\n' + '='.repeat(50));
  console.log('🔍 Debug tests completed!');
  console.log('='.repeat(50));
}

// Run the debug tests
runDebugTests().catch(console.error); 