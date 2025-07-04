// Test script to verify all backend fixes
import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

// Test data
const testEmotion = {
  emotion: 'joy',
  intensity: 0.8,
  note: 'Testing the completely fixed backend! 🎉',
  context: {
    weather: 'unknown',
    timeOfDay: 'morning',
    dayOfWeek: 'monday',
    isWeekend: false
  },
  memory: {
    tags: [],
    isPrivate: true,
    photos: [],
    associatedSongs: []
  },
  privacyLevel: 'friends',
  timezone: 'UTC'
};

const testUserData = {
  username: 'testuser',
  pronouns: 'They / Them',
  ageGroup: '25-34',
  selectedAvatar: 'elephant',
  isCompleted: true
};

async function testHealthEndpoint() {
  console.log('🏥 Testing health endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health endpoint working:', response.data.success);
    return true;
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    return false;
  }
}

async function testEmotionConstants() {
  console.log('🎭 Testing emotion constants...');
  try {
    const response = await axios.get(`${BASE_URL}/emotions/constants`);
    console.log('✅ Emotion constants working:', response.data.success);
    console.log('   Available emotions:', response.data.data.emotions.length);
    console.log('   Core emotions:', response.data.data.coreEmotions);
    return true;
  } catch (error) {
    console.log('❌ Emotion constants failed:', error.message);
    return false;
  }
}

async function testEmotionLogging() {
  console.log('📝 Testing emotion logging...');
  try {
    const response = await axios.post(`${BASE_URL}/emotions/log`, testEmotion);
    console.log('✅ Emotion logging working:', response.data.success);
    console.log('   Logged emotion ID:', response.data.data._id);
    console.log('   Core emotion:', response.data.data.coreEmotion);
    return response.data.data._id;
  } catch (error) {
    console.log('❌ Emotion logging failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUserRegistration() {
  console.log('👤 Testing user registration...');
  try {
    const response = await axios.post(`${BASE_URL}/onboarding/user-data`, testUserData);
    console.log('✅ User registration working:', response.data.success);
    return true;
  } catch (error) {
    console.log('❌ User registration failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDashboard() {
  console.log('📊 Testing dashboard...');
  try {
    const response = await axios.get(`${BASE_URL}/dashboard/home`);
    console.log('✅ Dashboard working:', response.data.success);
    return true;
  } catch (error) {
    console.log('❌ Dashboard failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGlobalHeatmap() {
  console.log('🌍 Testing global heatmap...');
  try {
    const response = await axios.get(`${BASE_URL}/emotions/global-heatmap`);
    console.log('✅ Global heatmap working:', response.data.success);
    return true;
  } catch (error) {
    console.log('❌ Global heatmap failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive backend tests...\n');
  
  const results = {
    health: await testHealthEndpoint(),
    constants: await testEmotionConstants(),
    emotionLogging: await testEmotionLogging(),
    userRegistration: await testUserRegistration(),
    dashboard: await testDashboard(),
    heatmap: await testGlobalHeatmap()
  };
  
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your backend is working perfectly!');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run the tests
runAllTests().catch(console.error); 