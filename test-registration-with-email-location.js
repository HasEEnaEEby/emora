import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

async function testRegistrationWithEmailAndLocation() {
  try {
    console.log('🧪 Testing registration with email and location...\n');

    const testData = {
      username: `testuser_${Date.now()}`,
      password: 'TestPassword123!',
      email: 'test@example.com',
      pronouns: 'They / Them',
      ageGroup: '25-34',
      selectedAvatar: 'panda',
      location: 'San Francisco, CA',
      latitude: 37.7749,
      longitude: -122.4194
    };

    console.log('📤 Registration data:', testData);

    const response = await axios.post(`${BASE_URL}/api/onboarding/register`, testData);

    console.log('✅ Registration successful!');
    console.log('📥 Response:', {
      status: response.status,
      message: response.data.message,
      user: {
        id: response.data.data.user.id,
        username: response.data.data.user.username,
        email: response.data.data.user.email,
        location: response.data.data.user.location,
        pronouns: response.data.data.user.pronouns,
        ageGroup: response.data.data.user.ageGroup,
        selectedAvatar: response.data.data.user.selectedAvatar
      },
      hasToken: !!response.data.data.token
    });

    // Test login with the created user
    console.log('\n🔐 Testing login with created user...');
    
    const loginResponse = await axios.post(`${BASE_URL}/api/onboarding/login`, {
      username: testData.username,
      password: testData.password
    });

    console.log('✅ Login successful!');
    console.log('📥 Login response:', {
      status: loginResponse.status,
      message: loginResponse.data.message,
      hasToken: !!loginResponse.data.data.token
    });

    // Test getting current user with token
    console.log('\n👤 Testing get current user...');
    
    const token = loginResponse.data.data.token;
    const userResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Get current user successful!');
    console.log('📥 User data:', {
      status: userResponse.status,
      user: userResponse.data.data
    });

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRegistrationWithEmailAndLocation(); 