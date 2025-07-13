// test-friend-endpoints-simple.js - SIMPLE ENDPOINT TEST
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

async function testEndpoints() {
  console.log('🔍 Testing friend endpoints availability...\n');

  const endpoints = [
    '/api/health',
    '/api/friends/list',
    '/api/friends/suggestions', 
    '/api/friends/requests',
    '/api/friends/pending'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📤 Testing ${endpoint}...`);
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 5000
      });
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      
      if (response.status === 401) {
        console.log(`   📝 Expected: Authentication required`);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`✅ ${endpoint} - Status: 401 (Expected: Auth required)`);
      } else if (error.response?.status === 404) {
        console.log(`❌ ${endpoint} - Status: 404 (Endpoint not found)`);
      } else {
        console.log(`❌ ${endpoint} - Error: ${error.response?.status || error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY:');
  console.log('✅ 200/401 = Endpoint exists and working');
  console.log('❌ 404 = Endpoint not registered');
  console.log('='.repeat(50));
}

// Run the test
testEndpoints().catch(console.error); 