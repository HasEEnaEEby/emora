// fixed-auth-test.js - Test login with existing user
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

async function testExistingUserLogin() {
  console.log('🧪 Testing login with existing user...');
  
  // Test with the user we know exists from database
  const existingUser = {
    username: 'jordan123_496',  // This user exists in your database
    password: 'password123'     // Try this common password
  };
  
  console.log('📝 Testing user:', existingUser.username);

  try {
    console.log('\n🔑 Step 1: Attempting login...');
    console.log('🔍 DEBUG: About to send login request');
    console.log('📤 Request data:', { username: existingUser.username, password: '***' });
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: existingUser.username,
      password: existingUser.password
    });

    if (loginResponse.status === 200) {
      console.log('✅ Login successful!');
      console.log('📋 Response:', {
        success: loginResponse.data.success,
        message: loginResponse.data.message,
        username: loginResponse.data.data?.user?.username,
        token: loginResponse.data.data?.token ? 'Present' : 'Missing'
      });
      
      console.log('\n🎉 SUCCESS: Password hashing fix is working!');
      
    } else {
      console.log('❌ Login failed with status:', loginResponse.status);
      console.log('📋 Response:', loginResponse.data);
    }

  } catch (error) {
    console.log('❌ Login failed with error:', error.response?.status);
    console.log('📋 Error details:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('\n🔍 401 Unauthorized - This means:');
      console.log('   Either the user doesn\'t exist OR password is wrong');
      console.log('   Let\'s try different passwords...');
      
      // Try different common passwords
      const passwordsToTry = ['password123', 'Password123', 'PASSWORD123', 'password', 'test123'];
      
      for (const pwd of passwordsToTry) {
        try {
          console.log(`\n🔍 Trying password: "${pwd}"`);
          const testResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: existingUser.username,
            password: pwd
          });
          
          if (testResponse.status === 200) {
            console.log(`✅ SUCCESS! Password is: "${pwd}"`);
            break;
          }
        } catch (pwdError) {
          console.log(`   ❌ "${pwd}" failed`);
        }
      }
    } else if (error.response?.status === 404) {
      console.log('\n🔍 404 Not Found - User doesn\'t exist in database');
    } else {
      console.log('\n🔍 Other error - check server logs');
    }
  }
}

async function testCreateNewUser() {
  console.log('\n\n🧪 Testing user creation with proper username length...');
  
  const newUser = {
    username: 'testuser' + Math.floor(Math.random() * 1000), // Shorter username
    email: 'test' + Date.now() + '@example.com',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    pronouns: 'They / Them',
    ageGroup: '25-34',
    selectedAvatar: 'fox'
  };

  console.log('📝 New user (fixed length):', { 
    username: newUser.username, 
    email: newUser.email,
    usernameLength: newUser.username.length
  });

  try {
    console.log('\n📝 Step 1: Registering new user...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, newUser);
    
    if (registerResponse.status === 201) {
      console.log('✅ Registration successful!');
      
      // Now try logging in
      console.log('\n🔑 Step 2: Logging in with new credentials...');
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: newUser.username,
        password: newUser.password
      });
      
      if (loginResponse.status === 200) {
        console.log('✅ Login successful with new user!');
        console.log('🎉 Complete auth flow works correctly!');
      }
    }
    
  } catch (error) {
    console.log('❌ New user test failed:', error.response?.data || error.message);
  }
}

// Run both tests
async function runAllTests() {
  await testExistingUserLogin();
  await testCreateNewUser();
}

runAllTests().catch(console.error);