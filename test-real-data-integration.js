// Test script to populate database with realistic data and test /api/user/home-data endpoint
import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;

// Test data with correct enum values
const testUsers = [
  {
    username: 'alice_emotions',
    email: 'alice@test.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    pronouns: 'She / Her',
    ageGroup: '18-24',
    selectedAvatar: 'cat'
  },
  {
    username: 'bob_mindful',
    email: 'bob@test.com', 
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    pronouns: 'He / Him',
    ageGroup: '25-34',
    selectedAvatar: 'dog'
  }
];

const testEmotions = [
  { emotion: 'joy', intensity: 8, context: 'work', notes: 'Great team meeting today!' },
  { emotion: 'anxiety', intensity: 6, context: 'school', notes: 'Nervous about upcoming presentation' },
  { emotion: 'gratitude', intensity: 9, context: 'family', notes: 'Dinner with family was amazing' },
  { emotion: 'frustration', intensity: 4, context: 'personal', notes: 'Traffic was terrible' },
  { emotion: 'excitement', intensity: 10, context: 'social', notes: 'Concert tickets secured!' }
];

let authTokens = [];

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTestUser(userData) {
  try {
    console.log(`📝 Creating user: ${userData.username}`);
    
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    console.log(`✅ User created: ${userData.username}`);
    
    // Login to get auth token
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: userData.username,
      password: userData.password
    });
    
    const token = loginResponse.data.data.token;
    console.log(`🔑 Auth token obtained for ${userData.username}`);
    
    return {
      userData,
      token,
      userId: loginResponse.data.data.user.id
    };
  } catch (error) {
    if ((error.response?.status === 400 || error.response?.status === 409) && 
        (error.response.data.message?.includes('already exists') || error.response.data.message?.includes('Username already exists'))) {
      console.log(`⚠️  User ${userData.username} already exists, attempting login...`);
      try {
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          username: userData.username,
          password: userData.password
        });
        return {
          userData,
          token: loginResponse.data.data.token,
          userId: loginResponse.data.data.user.id
        };
      } catch (loginError) {
        console.error(`❌ Failed to login existing user ${userData.username}:`, loginError.response?.data || loginError.message);
        throw loginError;
      }
    } else {
      console.error(`❌ Failed to create user ${userData.username}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function createTestEmotions(userAuth) {
  try {
    console.log(`😊 Creating emotions for user: ${userAuth.userData.username}`);
    
    for (const emotion of testEmotions) {
      const emotionData = {
        ...emotion,
        location: {
          name: 'Test Location',
          coordinates: [-74.006, 40.7128], // NYC coordinates
          city: 'New York',
          country: 'USA'
        },
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time within last week
      };
      
      try {
        const response = await axios.post(`${API_URL}/emotions/log`, emotionData, {
          headers: {
            'Authorization': `Bearer ${userAuth.token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`  ✅ Created emotion: ${emotion.emotion} (intensity: ${emotion.intensity})`);
        await wait(100); // Small delay between requests
      } catch (error) {
        console.error(`  ❌ Failed to create emotion ${emotion.emotion}:`, error.response?.data || error.message);
      }
    }
  } catch (error) {
    console.error(`❌ Error creating emotions for ${userAuth.userData.username}:`, error.message);
  }
}

async function testHomeDataEndpoint(userAuth) {
  try {
    console.log(`\n🏠 Testing /api/user/home-data for ${userAuth.userData.username}`);
    
    const response = await axios.get(`${API_URL}/user/home-data`, {
      headers: {
        'Authorization': `Bearer ${userAuth.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const homeData = response.data;
    console.log(`✅ Home data response status: ${response.status}`);
    console.log(`📊 Home data structure:`, JSON.stringify(homeData, null, 2));
    
    // Verify the data contains real information
    if (homeData.status === 'success' && homeData.data) {
      const { data } = homeData;
      console.log(`\n📈 User Stats Summary:`);
      console.log(`  - Username: ${data.user?.username || 'N/A'}`);
      console.log(`  - Total Emotions: ${data.stats?.totalEmotionEntries || 0}`);
      console.log(`  - Current Streak: ${data.stats?.currentStreak || 0}`);
      console.log(`  - Days Since Joined: ${data.stats?.daysSinceJoined || 0}`);
      console.log(`  - Recent Emotions: ${data.recentEmotions?.length || 0}`);
      
      if (data.stats?.totalEmotionEntries > 0) {
        console.log(`🎉 SUCCESS: Home data contains REAL emotion data!`);
        return true;
      } else {
        console.log(`⚠️  WARNING: Home data still shows 0 emotions - may need to wait for data sync`);
        return false;
      }
    } else {
      console.log(`❌ ERROR: Invalid home data response format`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to test home data endpoint:`, error.response?.data || error.message);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 Starting EMORA Real Data Integration Test\n');
  console.log('===============================================');
  
  try {
    // Test server health first
    console.log('🏥 Testing server health...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log(`✅ Server is healthy: ${healthResponse.data.message}\n`);
    
    // Create test users
    console.log('👥 Creating test users...');
    for (const userData of testUsers) {
      const userAuth = await createTestUser(userData);
      authTokens.push(userAuth);
      await wait(500); // Wait between user creation
    }
    console.log(`✅ Created ${authTokens.length} test users\n`);
    
    // Create emotions for each user
    console.log('😊 Creating test emotions...');
    for (const userAuth of authTokens) {
      await createTestEmotions(userAuth);
      await wait(1000); // Wait between users
    }
    console.log(`✅ Finished creating emotions for all users\n`);
    
    // Wait for data to process
    console.log('⏳ Waiting 3 seconds for data processing...');
    await wait(3000);
    
    // Test home data endpoint for each user
    console.log('🧪 Testing /api/user/home-data endpoint...');
    let successCount = 0;
    for (const userAuth of authTokens) {
      const success = await testHomeDataEndpoint(userAuth);
      if (success) successCount++;
      await wait(1000);
    }
    
    console.log('\n===============================================');
    console.log('🎯 TEST RESULTS SUMMARY:');
    console.log(`✅ Users created: ${authTokens.length}`);
    console.log(`😊 Emotions created: ${authTokens.length * testEmotions.length}`);
    console.log(`🏠 Home data tests passed: ${successCount}/${authTokens.length}`);
    
    if (successCount > 0) {
      console.log('🎉 SUCCESS: Real data integration is working!');
      console.log('🎯 Next step: Test Flutter app integration');
    } else {
      console.log('⚠️  WARNING: Home data still returning mock/empty data');
      console.log('🔍 Check if emotion logging is working correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

// Run the test
runFullTest()
  .then(() => {
    console.log('\n✅ Integration test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  }); 