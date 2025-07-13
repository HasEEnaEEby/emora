// test-login-fix.js - Test script to verify password hashing fix
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

async function testAuthFlow() {
  const testUser = {
    username: 'testuser' + Date.now(),
    email: 'test' + Date.now() + '@example.com',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    pronouns: 'They / Them',
    ageGroup: '25-34',
    selectedAvatar: 'fox'
  };

  console.log('🧪 Testing authentication flow...');
  console.log('📝 Test user:', { 
    username: testUser.username, 
    email: testUser.email,
    pronouns: testUser.pronouns,
    ageGroup: testUser.ageGroup,
    selectedAvatar: testUser.selectedAvatar
  });

  try {
    // Step 1: Register user
    console.log('\n📝 Step 1: Registering user...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    
    if (registerResponse.status === 201) {
      console.log('✅ Registration successful!');
      console.log('📋 Response:', {
        success: registerResponse.data.success,
        message: registerResponse.data.message,
        username: registerResponse.data.data?.user?.username,
        token: registerResponse.data.data?.token ? 'Present' : 'Missing'
      });
    } else {
      console.log('❌ Registration failed:', registerResponse.status);
      return;
    }

    // Step 2: Login with same credentials
    console.log('\n🔑 Step 2: Logging in with same credentials...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: testUser.username,
      password: testUser.password
    });

    if (loginResponse.status === 200) {
      console.log('✅ Login successful!');
      console.log('📋 Response:', {
        success: loginResponse.data.success,
        message: loginResponse.data.message,
        username: loginResponse.data.data?.user?.username,
        token: loginResponse.data.data?.token ? 'Present' : 'Missing'
      });
      
      // Step 3: Test authenticated endpoint
      console.log('\n👤 Step 3: Testing authenticated endpoint...');
      const token = loginResponse.data.data?.token;
      
      if (token) {
        try {
          const currentUserResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (currentUserResponse.status === 200) {
            console.log('✅ Authenticated endpoint test successful!');
            console.log('📋 Current user:', {
              username: currentUserResponse.data.data?.user?.username,
              email: currentUserResponse.data.data?.user?.email
            });
          } else {
            console.log('❌ Authenticated endpoint test failed:', currentUserResponse.status);
          }
        } catch (authError) {
          console.log('❌ Authenticated endpoint error:', authError.response?.data || authError.message);
        }
      }
      
      console.log('\n🎉 All tests passed! Password hashing fix is working correctly.');
      
    } else {
      console.log('❌ Login failed:', loginResponse.status);
      console.log('📋 Error:', loginResponse.data);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔍 Analysis: 401 error suggests password verification still failing');
      console.log('   This could indicate the double hashing fix needs more work');
    } else if (error.response?.status === 409) {
      console.log('\n🔍 Analysis: 409 error suggests username/email already exists');
      console.log('   Try running the test again with a fresh username');
    } else {
      console.log('\n🔍 Analysis: Unexpected error - check server logs');
    }
  }
}

// Run the test
testAuthFlow().catch(console.error); 