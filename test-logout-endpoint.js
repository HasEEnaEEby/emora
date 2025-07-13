// test-logout-endpoint.js - Debug logout endpoint
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testLogout() {
  try {
    console.log('🔍 Testing logout endpoint...');
    
    // First, let's test the endpoint without auth to see the response
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response body:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('📊 Parsed JSON:', responseJson);
    } catch (e) {
      console.log('❌ Failed to parse JSON:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLogout(); 