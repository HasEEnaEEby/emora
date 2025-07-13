// test-emotion-logging.js - Focused test for emotion logging functionality
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

async function testBasicEmotionLogging() {
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
    console.log('🎭 Testing basic emotion logging...');
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

    console.log('✅ Basic emotion logging successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📥 Response:', response.data);

    return response.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('❌ Basic emotion logging failed');
    console.log('⏱️ Time taken:', duration + 'ms');
    console.log('📊 Status:', error.response?.status);
    console.log('📥 Error data:', error.response?.data || error.message);
    
    return null;
  }
}

async function testEmotionLoggingWithDifferentTypes() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('🚀 Testing emotion logging with different types...');

  const testEmotions = [
    { type: 'happiness', intensity: 5, note: 'Amazing day with friends!', tags: ['social', 'friends'] },
    { type: 'calm', intensity: 3, note: 'Peaceful evening at home', tags: ['home', 'relaxation'] },
    { type: 'excitement', intensity: 4, note: 'Starting a new project', tags: ['work', 'new'] },
    { type: 'gratitude', intensity: 4, note: 'Feeling thankful for everything', tags: ['appreciation'] },
    { type: 'contentment', intensity: 3, note: 'Satisfied with life right now', tags: ['life', 'satisfaction'] },
    { type: 'sadness', intensity: 2, note: 'Missing someone today', tags: ['missing', 'emotional'] },
    { type: 'anger', intensity: 3, note: 'Frustrated with traffic', tags: ['traffic', 'frustration'] },
    { type: 'fear', intensity: 2, note: 'Anxious about presentation', tags: ['anxiety', 'work'] }
  ];

  const results = [];

  for (let i = 0; i < testEmotions.length; i++) {
    const emotion = testEmotions[i];
    try {
      console.log(`📤 Logging emotion ${i + 1}/${testEmotions.length}: ${emotion.type}...`);
      const response = await axios.post(`${BASE_URL}/api/emotions`, emotion, { 
        headers, 
        timeout: 10000 
      });
      console.log(`✅ Logged: ${emotion.type} (ID: ${response.data.data.emotion.id})`);
      results.push({ emotion: emotion.type, success: true, id: response.data.data.emotion.id });
    } catch (error) {
      console.log(`❌ Failed to log ${emotion.type}:`, error.response?.data?.message || error.message);
      results.push({ emotion: emotion.type, success: false, error: error.response?.data?.message || error.message });
    }
  }

  return results;
}

async function testEmotionLoggingValidation() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('🔍 Testing emotion logging validation...');

  const invalidEmotions = [
    { type: 'invalid_emotion', intensity: 4, note: 'Invalid emotion type' },
    { type: 'joy', intensity: 0, note: 'Invalid intensity (too low)' },
    { type: 'joy', intensity: 6, note: 'Invalid intensity (too high)' },
    { type: '', intensity: 3, note: 'Empty emotion type' },
    { type: 'joy', intensity: 'invalid', note: 'Invalid intensity type' },
    { type: 'joy', intensity: 3, note: 'a'.repeat(1001), tags: ['test'] }, // Note too long
  ];

  const results = [];

  for (let i = 0; i < invalidEmotions.length; i++) {
    const emotion = invalidEmotions[i];
    try {
      console.log(`📤 Testing invalid emotion ${i + 1}/${invalidEmotions.length}: ${emotion.type}...`);
      const response = await axios.post(`${BASE_URL}/api/emotions`, emotion, { 
        headers, 
        timeout: 10000 
      });
      console.log(`⚠️ Unexpected success for invalid emotion: ${emotion.type}`);
      results.push({ emotion: emotion.type, success: true, expected: false });
    } catch (error) {
      console.log(`✅ Correctly rejected invalid emotion: ${emotion.type} - ${error.response?.data?.message || error.message}`);
      results.push({ emotion: emotion.type, success: false, expected: true, error: error.response?.data?.message || error.message });
    }
  }

  return results;
}

async function testEmotionRetrieval() {
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
    console.log('📊 Testing emotion retrieval...');
    const response = await axios.get(`${BASE_URL}/api/emotions`, {
      headers,
      timeout: 15000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Emotion retrieval successful!');
    console.log('⏱️ Response time:', duration + 'ms');
    console.log('📊 Emotions retrieved:', response.data.data.emotions.length);
    console.log('📊 Pagination:', response.data.data.pagination);

    // Show some sample emotions
    if (response.data.data.emotions.length > 0) {
      console.log('📋 Sample emotions:');
      response.data.data.emotions.slice(0, 3).forEach((emotion, index) => {
        console.log(`  ${index + 1}. ${emotion.type} (${emotion.intensity}/5) - ${emotion.note}`);
      });
    }

    return response.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('❌ Emotion retrieval failed');
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
    console.log('📈 Testing emotion statistics...');
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

async function testEmotionLoggingPerformance() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('⚡ Testing emotion logging performance...');

  const performanceResults = [];
  const testCount = 5;

  for (let i = 0; i < testCount; i++) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${BASE_URL}/api/emotions`, {
        type: 'test',
        intensity: 3,
        note: `Performance test ${i + 1}`,
        tags: ['performance', 'test']
      }, { 
        headers, 
        timeout: 10000 
      });
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Test ${i + 1}: ${duration}ms`);
      performanceResults.push({ test: i + 1, success: true, duration });
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`❌ Test ${i + 1}: ${duration}ms - ${error.response?.data?.message || error.message}`);
      performanceResults.push({ test: i + 1, success: false, duration, error: error.response?.data?.message || error.message });
    }
  }

  const successfulTests = performanceResults.filter(r => r.success);
  const avgDuration = successfulTests.length > 0 
    ? successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length 
    : 0;

  console.log(`📊 Performance Summary: ${successfulTests.length}/${testCount} successful, avg: ${avgDuration.toFixed(0)}ms`);

  return performanceResults;
}

async function runEmotionLoggingTests() {
  console.log('🚀 Starting focused emotion logging tests...\n');

  // Test 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without login');
    return;
  }

  console.log('\n' + '='.repeat(50));
  console.log('TEST 1: Basic Emotion Logging');
  console.log('='.repeat(50));
  await testBasicEmotionLogging();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 2: Different Emotion Types');
  console.log('='.repeat(50));
  await testEmotionLoggingWithDifferentTypes();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 3: Validation Testing');
  console.log('='.repeat(50));
  await testEmotionLoggingValidation();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 4: Emotion Retrieval');
  console.log('='.repeat(50));
  await testEmotionRetrieval();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 5: Emotion Statistics');
  console.log('='.repeat(50));
  await testEmotionStats();

  console.log('\n' + '='.repeat(50));
  console.log('TEST 6: Performance Testing');
  console.log('='.repeat(50));
  await testEmotionLoggingPerformance();

  console.log('\n' + '='.repeat(50));
  console.log('✅ All emotion logging tests completed!');
  console.log('='.repeat(50));
}

runEmotionLoggingTests().catch(console.error); 