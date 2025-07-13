// test-emotion-integration.js - Test emotion backend integration
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
const TEST_USERNAME = '0to1e'; // ✅ UPDATED: Correct username
const TEST_PASSWORD = 'Rohan@123'; // ✅ UPDATED: Correct password

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

async function testEmotionConstants() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const startTime = Date.now();

  try {
    console.log('📋 Testing emotion constants...');
    const response = await axios.get(`${BASE_URL}/api/emotions/constants`, {
      timeout: 10000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Emotion constants successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📊 Emotion types available:', response.data.data.emotionTypes.length);
    console.log('📊 Categories:', Object.keys(response.data.data.categories));

    return response.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('❌ Emotion constants failed');
    console.log('⏱️ Time taken:', duration + 'ms');
    console.log('📊 Status:', error.response?.status);
    console.log('📥 Error data:', error.response?.data || error.message);
    
    return null;
  }
}

async function testEmotionLogging() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const startTime = Date.now();

  try {
    console.log('🎭 Testing emotion logging...');
    const response = await axios.post(`${BASE_URL}/api/emotions`, {
      type: 'joy',
      intensity: 4,
      note: 'Had a great day at work!',
      tags: ['work', 'achievement']
    }, { 
      headers,
      timeout: 15000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Emotion logging successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📥 Response:', response.data);

    return response.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('❌ Emotion logging failed');
    console.log('⏱️ Time taken:', duration + 'ms');
    console.log('📊 Status:', error.response?.status);
    console.log('📥 Error data:', error.response?.data || error.message);
    
    return null;
  }
}

async function testGetEmotions() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const startTime = Date.now();

  try {
    console.log('📊 Testing get user emotions...');
    const response = await axios.get(`${BASE_URL}/api/emotions`, {
      headers,
      timeout: 15000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Get emotions successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📊 Emotions retrieved:', response.data.data.emotions.length);
    console.log('📊 Pagination:', response.data.data.pagination);

    return response.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('❌ Get emotions failed');
    console.log('⏱️ Time taken:', duration + 'ms');
    console.log('📊 Status:', error.response?.status);
    console.log('📥 Error data:', error.response?.data || error.message);
    
    return null;
  }
}

async function testEmotionStats() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const startTime = Date.now();

  try {
    console.log('📈 Testing emotion stats...');
    const response = await axios.get(`${BASE_URL}/api/emotions/stats?period=7d`, {
      headers,
      timeout: 15000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Emotion stats successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📊 Stats data:', response.data.data);

    return response.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('❌ Emotion stats failed');
    console.log('⏱️ Time taken:', duration + 'ms');
    console.log('📊 Status:', error.response?.status);
    console.log('📥 Error data:', error.response?.data || error.message);
    
    return null;
  }
}

async function testMultipleEmotions() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('🚀 Testing multiple emotion logging...');

  const testEmotions = [
    { type: 'happiness', intensity: 5, note: 'Amazing day with friends!' },
    { type: 'calm', intensity: 3, note: 'Peaceful evening at home' },
    { type: 'excitement', intensity: 4, note: 'Starting a new project' },
    { type: 'gratitude', intensity: 4, note: 'Feeling thankful for everything' },
    { type: 'contentment', intensity: 3, note: 'Satisfied with life right now' }
  ];

  for (let i = 0; i < testEmotions.length; i++) {
    const emotion = testEmotions[i];
    try {
      console.log(`📤 Logging emotion ${i + 1}/5: ${emotion.type}...`);
      const response = await axios.post(`${BASE_URL}/api/emotions`, emotion, { 
        headers, 
        timeout: 10000 
      });
      console.log(`✅ Logged: ${emotion.type}`);
    } catch (error) {
      console.log(`❌ Failed to log ${emotion.type}:`, error.response?.data?.message || error.message);
    }
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

  console.log('🚀 Testing emotion rate limit (sending 5 requests quickly)...');

  for (let i = 1; i <= 5; i++) {
    try {
      console.log(`📤 Emotion request ${i}/5...`);
      const response = await axios.post(
        `${BASE_URL}/api/emotions`,
        {
          type: 'test',
          intensity: 3,
          note: `Rate limit test ${i}`
        },
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

async function runTests() {
  console.log('🚀 Starting comprehensive emotion integration tests...\n');

  // Test 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without login');
    return;
  }

  console.log('\n' + '='.repeat(50));
  console.log('TEST 1: Emotion Constants');
  console.log('='.repeat(50));
  await testEmotionConstants();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 2: Basic Emotion Logging');
  console.log('='.repeat(50));
  await testEmotionLogging();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 3: Get User Emotions');
  console.log('='.repeat(50));
  await testGetEmotions();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 4: Emotion Statistics');
  console.log('='.repeat(50));
  await testEmotionStats();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 5: Multiple Emotion Logging');
  console.log('='.repeat(50));
  await testMultipleEmotions();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 6: Rate Limit Test');
  console.log('='.repeat(50));
  await testRateLimit();

  console.log('\n' + '='.repeat(50));
  console.log('✅ All emotion tests completed!');
  console.log('='.repeat(50));
}

runTests().catch(console.error); 