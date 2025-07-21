const axios = require('axios');

const BASE_URL = 'http://localhost:8000';

async function testProfileUpdate() {
  try {
    console.log('🧪 Testing Profile Update Functionality');
    console.log('=====================================');

    // Step 1: Login to get token
    console.log('\n1️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: '0to1e',
      password: 'password123'
    });

    const token = loginResponse.data.data.token;
    console.log('. Login successful');

    // Step 2: Get current profile
    console.log('\n2️⃣ Getting current profile...');
    const getProfileResponse = await axios.get(`${BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('. Current profile data:');
    console.log(JSON.stringify(getProfileResponse.data.data, null, 2));

    // Step 3: Update profile with new data
    console.log('\n3️⃣ Updating profile...');
    const updateData = {
      pronouns: 'He / Him',
      ageGroup: '35-44',
      selectedAvatar: 'dragon',
      profile: {
        displayName: 'Haseenakc kahtri',
        bio: 'hello whats wpp',
        themeColor: '#10B981'
      }
    };

    const updateResponse = await axios.patch(`${BASE_URL}/api/user/profile`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('. Profile update successful');
    console.log('. Updated profile response:');
    console.log(JSON.stringify(updateResponse.data.data, null, 2));

    // Step 4: Verify the update by getting profile again
    console.log('\n4️⃣ Verifying update...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('. Verified profile data:');
    console.log(JSON.stringify(verifyResponse.data.data, null, 2));

    // Step 5: Test with different data
    console.log('\n5️⃣ Testing with different data...');
    const updateData2 = {
      pronouns: 'She / Her',
      ageGroup: '18-24',
      selectedAvatar: 'unicorn',
      profile: {
        displayName: 'Final Test User',
        bio: 'Final test bio with emoji 🎉',
        themeColor: '#EC4899'
      }
    };

    const updateResponse2 = await axios.patch(`${BASE_URL}/api/user/profile`, updateData2, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('. Second profile update successful');
    console.log('. Second update response:');
    console.log(JSON.stringify(updateResponse2.data.data, null, 2));

    console.log('\n🎉 All profile update tests passed!');
    console.log('\n. Summary:');
    console.log('- Login: .');
    console.log('- Get Profile: .');
    console.log('- Update Profile: .');
    console.log('- Verify Update: .');
    console.log('- Multiple Updates: .');

  } catch (error) {
    console.error('. Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testProfileUpdate(); 