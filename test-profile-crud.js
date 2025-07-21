// test-profile-crud.js - Test script for profile CRUD operations
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
const TEST_USERNAME = '0to1e'; // . UPDATED: Correct username
const TEST_PASSWORD = 'Rohan@123'; // . UPDATED: Correct password

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: TEST_USERNAME, // . FIXED: Use username instead of email
      password: TEST_PASSWORD
    });

    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('. Login successful');
      return true;
    } else {
      console.log('. Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('. Login error:', error.response?.data || error.message);
    return false;
  }
}

async function testGetProfile() {
  try {
    console.log('\n. Testing GET /api/user/profile...');
    const response = await axios.get(`${BASE_URL}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = response.data;
    
    if (data.success) {
      console.log('. Profile retrieved successfully');
      console.log('. Profile data:', {
        username: data.data.user.username,
        selectedAvatar: data.data.user.selectedAvatar,
        pronouns: data.data.user.pronouns,
        ageGroup: data.data.user.ageGroup,
      });
      return true;
    } else {
      console.log('. Profile fetch failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('. Profile fetch error:', error.response?.data || error.message);
    return false;
  }
}

async function testGetAchievements() {
  try {
    console.log('\n🏆 Testing GET /api/user/achievements...');
    const response = await axios.get(`${BASE_URL}/api/user/achievements`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = response.data;
    
    if (data.success) {
      console.log('. Achievements retrieved successfully');
      console.log('🏆 Achievements data:', {
        totalEarned: data.data.totalEarned,
        totalAvailable: data.data.totalAvailable,
        stats: data.data.stats,
        achievementsCount: data.data.achievements.length,
      });
      
      // Show earned achievements
      const earnedAchievements = data.data.achievements.filter(a => a.earned);
      if (earnedAchievements.length > 0) {
        console.log('🎉 Earned achievements:');
        earnedAchievements.forEach(achievement => {
          console.log(`  - ${achievement.title}: ${achievement.description}`);
        });
      }
      
      return true;
    } else {
      console.log('. Achievements fetch failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('. Achievements fetch error:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateProfile() {
  try {
    console.log('\n✏️ Testing PATCH /api/user/profile...');
    const updateData = {
      pronouns: 'They / Them',
      ageGroup: '25-34',
      selectedAvatar: 'bear',
      profile: {
        displayName: 'Test User',
        bio: 'Testing profile updates',
        themeColor: '#8B5CF6',
      },
    };

    const response = await axios.patch(`${BASE_URL}/api/user/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    
    if (data.success) {
      console.log('. Profile updated successfully');
      console.log('. Updated profile:', data.data.user);
      return true;
    } else {
      console.log('. Profile update failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('. Profile update error:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdatePreferences() {
  try {
    console.log('\n⚙️ Testing PUT /api/user/preferences...');
    const preferencesData = {
      notifications: {
        dailyReminder: true,
        time: '20:00',
        timezone: 'UTC',
        friendRequests: true,
        comfortReactions: true,
        friendMoodUpdates: true,
      },
      shareLocation: false,
      shareEmotions: true,
      anonymousMode: true,
      allowRecommendations: true,
      moodPrivacy: 'private',
    };

    const response = await axios.put(`${BASE_URL}/api/user/preferences`, preferencesData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    
    if (data.success) {
      console.log('. Preferences updated successfully');
      console.log('⚙️ Updated preferences:', data.data.preferences);
      return true;
    } else {
      console.log('. Preferences update failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('. Preferences update error:', error.response?.data || error.message);
    return false;
  }
}

async function testExportData() {
  try {
    console.log('\n📤 Testing POST /api/user/export-data...');
    const exportData = {
      dataTypes: ['profile', 'emotions', 'analytics', 'achievements'],
    };

    const response = await axios.post(`${BASE_URL}/api/user/export-data`, exportData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    
    if (data.success) {
      console.log('. Data export initiated successfully');
      console.log('📦 Export data:', {
        exportId: data.data.exportId,
        estimatedSize: data.data.estimatedSize,
        estimatedCompletion: data.data.estimatedCompletion,
        dataTypes: data.data.dataTypes,
      });
      return true;
    } else {
      console.log('. Data export failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('. Data export error:', error.response?.data || error.message);
    return false;
  }
}

async function testGetStats() {
  try {
    console.log('\n📈 Testing GET /api/user/stats...');
    const response = await axios.get(`${BASE_URL}/api/user/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = response.data;
    
    if (data.success) {
      console.log('. Stats retrieved successfully');
      console.log('. Stats data:', data.data.statistics);
      return true;
    } else {
      console.log('. Stats fetch failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('. Stats fetch error:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Profile CRUD Tests...\n');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('. Cannot proceed without login');
    return;
  }

  // Run all tests
  const tests = [
    { name: 'Get Profile', test: testGetProfile },
    { name: 'Get Achievements', test: testGetAchievements },
    { name: 'Update Profile', test: testUpdateProfile },
    { name: 'Update Preferences', test: testUpdatePreferences },
    { name: 'Export Data', test: testExportData },
    { name: 'Get Stats', test: testGetStats },
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      const success = await test.test();
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`. Error in ${test.name}:`, error);
      results.push({ name: test.name, success: false });
    }
  }

  // Summary
  console.log('\n. Test Results Summary:');
  console.log('========================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '.' : '.';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All profile CRUD operations are working correctly!');
  } else {
    console.log('. Some tests failed. Check the logs above for details.');
  }
}

// Run the tests
runAllTests().catch(console.error); 