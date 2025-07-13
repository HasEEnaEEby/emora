// test-friend-request-simple.js - UPDATED VERSION
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
const TEST_EMAIL = 'jois@gmail.com';
const TEST_PASSWORD = 'jois123';

// ✅ UPDATED: Use DIFFERENT user ID for testing
const testUserId = '6871cb1b3ea584f3d7a4886e'; // Different from logged-in user
const loggedInUserId = '6871dc82cb49e74d72743457'; // Your logged-in user

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      console.log('👤 Logged in user ID:', response.data.data.user.id);
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

async function testHealthEndpoint() {
  try {
    console.log('\n🏥 Testing health endpoint...');
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health endpoint working:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health endpoint failed:', error.response?.data || error.message);
    return false;
  }
}

async function testFriendRequest() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }

  try {
    console.log('\n📤 Testing friend request...');
    console.log('👤 Sending request from:', loggedInUserId);
    console.log('👥 To user:', testUserId);
    
    const startTime = Date.now();
    
    const response = await axios.post(
      `${BASE_URL}/api/friends/request/${testUserId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Friend request successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📊 Response:', response.data);
    
    return true;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ Friend request failed');
    console.error('⏱️ Time taken:', duration + 'ms');
    console.error('📊 Error response:', error.response?.data || error.message);
    console.error('🔢 Status code:', error.response?.status);
    
    if (error.response?.status === 429) {
      console.log('⚠️ Rate limit exceeded - this is expected behavior');
    }
    
    return false;
  }
}

async function testGetFriends() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }

  try {
    console.log('\n👥 Testing get friends...');
    
    const startTime = Date.now();
    
    const response = await axios.get(
      `${BASE_URL}/api/friends`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 seconds timeout
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Get friends successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📊 Friends count:', response.data.data?.friends?.length || 0);
    
    return true;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ Get friends failed');
    console.error('⏱️ Time taken:', duration + 'ms');
    console.error('📊 Error response:', error.response?.data || error.message);
    
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting friend request system tests...\n');
  
  // Test 1: Health endpoint
  const healthOk = await testHealthEndpoint();
  
  // Test 2: Login
  const loginOk = await login();
  
  if (!loginOk) {
    console.log('❌ Cannot proceed without login');
    return;
  }
  
  // Test 3: Friend request
  const friendRequestOk = await testFriendRequest();
  
  // Test 4: Get friends
  const getFriendsOk = await testGetFriends();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('🏥 Health endpoint:', healthOk ? '✅ PASS' : '❌ FAIL');
  console.log('🔐 Login:', loginOk ? '✅ PASS' : '❌ FAIL');
  console.log('📤 Friend request:', friendRequestOk ? '✅ PASS' : '❌ FAIL');
  console.log('👥 Get friends:', getFriendsOk ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = healthOk && loginOk && friendRequestOk && getFriendsOk;
  console.log('\n🎯 Overall result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
}

// Run the tests
runTests().catch(console.error); 