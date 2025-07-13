// test-friend-request-fixed.js - COMPREHENSIVE TEST
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
const TEST_USERNAME = '0to1e'; // ✅ UPDATED: Correct username
const TEST_PASSWORD = 'Rohan@123'; // ✅ UPDATED: Correct password

// Test user IDs
const testUserId = '6871cb1b3ea584f3d7a4886e'; // Different from logged-in user
const loggedInUserId = '6871dc82cb49e74d72743457'; // Your logged-in user

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: TEST_USERNAME, // ✅ FIXED: Use username instead of email
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

async function testFriendRequest() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const startTime = Date.now(); // ✅ FIXED: Declare startTime at function start

  try {
    console.log('📤 Testing friend request...');
    console.log('📊 Target user ID:', testUserId);
    console.log('📊 Logged in user ID:', loggedInUserId);
    
    const response = await axios.post(
      `${BASE_URL}/api/friends/request/${testUserId}`,
      {},
      { 
        headers,
        timeout: 30000 // 30 second timeout
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
    
    return null;
  }
}

async function testRateLimit() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('🚀 Testing rate limit (sending 5 requests quickly)...');

  for (let i = 1; i <= 5; i++) {
    try {
      console.log(`📤 Request ${i}/5...`);
      const response = await axios.post(
        `${BASE_URL}/api/friends/request/${testUserId}`,
        {},
        { headers, timeout: 10000 }
      );
      console.log(`✅ Request ${i} successful`);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`❌ Request ${i} - Rate limited:`, error.response.data);
        break;
      } else {
        console.log(`❌ Request ${i} failed:`, error.response?.data || error.message);
      }
    }
  }
}

async function testEndpoints() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const endpoints = [
    '/api/friends/list',
    '/api/friends/suggestions',
    '/api/friends/requests',
    '/api/friends/pending'
  ];

  console.log('🔍 Testing friend endpoints...');

  for (const endpoint of endpoints) {
    try {
      console.log(`📤 Testing ${endpoint}...`);
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        headers,
        timeout: 10000
      });
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint} - Status: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting comprehensive friend request tests...\n');

  // Test 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without login');
    return;
  }

  console.log('\n' + '='.repeat(50));
  console.log('TEST 1: Basic Friend Request');
  console.log('='.repeat(50));
  await testFriendRequest();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 2: Rate Limit Test');
  console.log('='.repeat(50));
  await testRateLimit();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 3: Endpoint Availability');
  console.log('='.repeat(50));
  await testEndpoints();

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!');
  console.log('='.repeat(50));
}

// Run the tests
runTests().catch(console.error); 