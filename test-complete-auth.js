// test-complete-auth.js - Test the complete authentication flow
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

async function testCompleteAuthFlow() {
  console.log('🧪 Testing complete authentication flow...');
  
  const testUser = {
    username: 'jordan123_496',
    password: 'password123'
  };
  
  try {
    // Test 1: Login
    console.log('\n🔑 Step 1: Testing login...');
    console.log(`📝 Username: ${testUser.username}`);
    console.log(`📝 Password: ${testUser.password}`);
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, testUser);
    
    if (loginResponse.status === 200) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log('📋 Response data:');
      console.log(`   Success: ${loginResponse.data.success}`);
      console.log(`   Message: ${loginResponse.data.message}`);
      console.log(`   Username: ${loginResponse.data.data?.user?.username}`);
      console.log(`   Email: ${loginResponse.data.data?.user?.email}`);
      console.log(`   Token: ${loginResponse.data.data?.token ? 'Present' : 'Missing'}`);
      console.log(`   Onboarding completed: ${loginResponse.data.data?.user?.isOnboardingCompleted}`);
      
      const token = loginResponse.data.data?.token;
      
      if (token) {
        // Test 2: Use the token for authenticated request
        console.log('\n👤 Step 2: Testing authenticated request...');
        
        try {
          const userResponse = await axios.get(`${BASE_URL}/api/user/home-data`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (userResponse.status === 200) {
            console.log('✅ AUTHENTICATED REQUEST SUCCESSFUL!');
            console.log('📋 Home data:');
            console.log(`   User ID: ${userResponse.data.data?.user?.id}`);
            console.log(`   Username: ${userResponse.data.data?.user?.username}`);
            console.log(`   Current streak: ${userResponse.data.data?.user?.currentStreak}`);
            console.log(`   Total emotions: ${userResponse.data.data?.dashboard?.totalEmotions}`);
          }
        } catch (authError) {
          console.log('❌ Authenticated request failed:', authError.response?.data);
        }
        
        // Test 3: Test community endpoints
        console.log('\n🌍 Step 3: Testing community endpoints...');
        
        try {
          const feedResponse = await axios.get(`${BASE_URL}/api/community/global-feed?page=1&limit=5`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (feedResponse.status === 200) {
            console.log('✅ GLOBAL FEED SUCCESSFUL!');
            console.log(`   Posts found: ${feedResponse.data.data?.posts?.length || 0}`);
          }
        } catch (feedError) {
          console.log('❌ Global feed failed:', feedError.response?.data);
        }
        
        try {
          const statsResponse = await axios.get(`${BASE_URL}/api/community/global-stats?timeRange=24h`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (statsResponse.status === 200) {
            console.log('✅ GLOBAL STATS SUCCESSFUL!');
            console.log(`   Total moods: ${statsResponse.data.data?.totalMoods || 0}`);
            console.log(`   Emotion breakdown: ${statsResponse.data.data?.emotionBreakdown?.length || 0} emotions`);
          }
        } catch (statsError) {
          console.log('❌ Global stats failed:', statsError.response?.data);
        }
      }
      
      console.log('\n🎉 AUTHENTICATION FLOW COMPLETE!');
      console.log('🎯 Now try logging in with your Flutter app using:');
      console.log(`   Username: ${testUser.username}`);
      console.log(`   Password: ${testUser.password}`);
      
    } else {
      console.log('❌ Login failed with status:', loginResponse.status);
    }
    
  } catch (error) {
    console.log('❌ Login failed:');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.message}`);
    console.log(`   Full error: ${JSON.stringify(error.response?.data, null, 2)}`);
    
    if (error.response?.status === 401) {
      console.log('\n🔍 Debugging 401 error...');
      console.log('   This should not happen since we just created the user');
      console.log('   Check if the backend server is running properly');
    }
  }
}

// Also test with one of the existing users
async function testExistingUser() {
  console.log('\n\n🧪 Testing with existing user from seed data...');
  
  const existingUser = {
    username: 'testuser509', // This user definitely exists from your output
    password: 'password123'
  };
  
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, existingUser);
    
    if (loginResponse.status === 200) {
      console.log('✅ EXISTING USER LOGIN SUCCESSFUL!');
      console.log(`   Username: ${existingUser.username} works perfectly`);
    }
  } catch (error) {
    console.log('❌ Existing user login failed:', error.response?.data?.message);
  }
}

// Run both tests
async function runAllTests() {
  await testCompleteAuthFlow();
  await testExistingUser();
}

runAllTests().catch(console.error);