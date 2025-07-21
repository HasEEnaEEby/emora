import io from 'socket.io-client';
import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000';

// Test data for Nepal
const NEPAL_TEST_EMOTIONS = [
  {
    coordinates: [85.3240, 27.7172], // Kathmandu
    coreEmotion: 'joy',
    emotionTypes: ['happiness', 'gratitude'],
    intensity: 4.2,
    city: 'Kathmandu',
    country: 'Nepal',
    context: 'Cultural celebration'
  },
  {
    coordinates: [83.9856, 28.2096], // Pokhara
    coreEmotion: 'trust',
    emotionTypes: ['love', 'acceptance'],
    intensity: 3.8,
    city: 'Pokhara',
    country: 'Nepal',
    context: 'Community gathering'
  },
  {
    coordinates: [85.3333, 27.6667], // Lalitpur
    coreEmotion: 'anticipation',
    emotionTypes: ['hope', 'excitement'],
    intensity: 4.0,
    city: 'Lalitpur',
    country: 'Nepal',
    context: 'New opportunities'
  },
  {
    coordinates: [84.4333, 27.6833], // Bharatpur
    coreEmotion: 'fear',
    emotionTypes: ['anxiety', 'worry'],
    intensity: 2.5,
    city: 'Bharatpur',
    country: 'Nepal',
    context: 'Economic concerns'
  },
  {
    coordinates: [87.2833, 26.4833], // Biratnagar
    coreEmotion: 'sadness',
    emotionTypes: ['melancholy', 'disappointment'],
    intensity: 3.1,
    city: 'Biratnagar',
    country: 'Nepal',
    context: 'Personal loss'
  }
];

// Global test emotions
const GLOBAL_TEST_EMOTIONS = [
  {
    coordinates: [-74.0060, 40.7128], // NYC
    coreEmotion: 'joy',
    emotionTypes: ['excitement', 'contentment'],
    intensity: 4.5,
    city: 'New York',
    country: 'USA',
    context: 'Career success'
  },
  {
    coordinates: [-0.1278, 51.5074], // London
    coreEmotion: 'trust',
    emotionTypes: ['admiration', 'devotion'],
    intensity: 3.9,
    city: 'London',
    country: 'UK',
    context: 'Family time'
  },
  {
    coordinates: [139.6503, 35.6762], // Tokyo
    coreEmotion: 'fear',
    emotionTypes: ['stress', 'panic'],
    intensity: 2.8,
    city: 'Tokyo',
    country: 'Japan',
    context: 'Work pressure'
  }
];

class RealtimeTester {
  constructor() {
    this.socket = null;
    this.testResults = {
      websocket: { success: 0, failed: 0 },
      api: { success: 0, failed: 0 },
      realtime: { success: 0, failed: 0 }
    };
  }

  async connectWebSocket() {
    try {
      console.log('🔌 Connecting to WebSocket...');
      this.socket = io(WS_URL);
      
      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        this.testResults.websocket.success++;
      });
      
      this.socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
      });
      
      this.socket.on('newEmotion', (data) => {
        console.log('🎯 Received new emotion:', data.coreEmotion, 'from', data.city);
        this.testResults.realtime.success++;
      });
      
      this.socket.on('globalStatsUpdated', (data) => {
        console.log('📊 Global stats updated:', data.totalEmotions, 'emotions');
        this.testResults.realtime.success++;
      });
      
      this.socket.on('error', (error) => {
        console.log('❌ WebSocket error:', error);
        this.testResults.websocket.failed++;
      });
      
      return true;
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      this.testResults.websocket.failed++;
      return false;
    }
  }

  async testAPIEndpoints() {
    console.log('\n🌐 Testing API endpoints...');
    
    const endpoints = [
      '/api/map/emotion-data',
      '/api/map/emotion-clusters',
      '/api/map/stats',
      '/api/map/emotion-trends',
      '/api/analytics/dashboard'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        console.log(`✅ ${endpoint}: ${response.status}`);
        this.testResults.api.success++;
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
        this.testResults.api.failed++;
      }
    }
  }

  async submitTestEmotions() {
    console.log('\n📤 Submitting test emotions...');
    
    const allEmotions = [...NEPAL_TEST_EMOTIONS, ...GLOBAL_TEST_EMOTIONS];
    
    for (let i = 0; i < allEmotions.length; i++) {
      const emotion = allEmotions[i];
      
      try {
        // Submit via WebSocket
        if (this.socket && this.socket.connected) {
          this.socket.emit('submitEmotion', emotion);
          console.log(`📡 WebSocket: ${emotion.coreEmotion} from ${emotion.city}`);
        }
        
        // Submit via REST API
        const response = await axios.post(`${BASE_URL}/api/map/submit-emotion`, emotion);
        console.log(`🌐 API: ${emotion.coreEmotion} from ${emotion.city} - ${response.status}`);
        
        // Wait between submissions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to submit ${emotion.coreEmotion} from ${emotion.city}:`, error.message);
      }
    }
  }

  async testNepalSpecificData() {
    console.log('\n🇳🇵 Testing Nepal-specific data...');
    
    try {
      // Test Nepal emotion data
      const nepalResponse = await axios.get(`${BASE_URL}/api/map/emotion-data?country=Nepal`);
      console.log(`✅ Nepal emotions: ${nepalResponse.data.data?.length || 0} records`);
      
      // Test Nepal clusters
      const nepalClusters = await axios.get(`${BASE_URL}/api/map/emotion-clusters?country=Nepal`);
      console.log(`✅ Nepal clusters: ${nepalClusters.data.data?.length || 0} clusters`);
      
      // Test Nepal insights
      const nepalInsights = await axios.get(`${BASE_URL}/api/map/insights?region=Nepal`);
      console.log(`✅ Nepal insights: ${nepalInsights.data.insight ? 'Generated' : 'Failed'}`);
      
    } catch (error) {
      console.error('❌ Nepal-specific tests failed:', error.message);
    }
  }

  async runTests() {
    console.log('🚀 Starting Real-time Emotion Map Tests...\n');
    
    // Test WebSocket connection
    await this.connectWebSocket();
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test API endpoints
    await this.testAPIEndpoints();
    
    // Submit test emotions
    await this.submitTestEmotions();
    
    // Test Nepal-specific features
    await this.testNepalSpecificData();
    
    // Wait for real-time updates
    console.log('\n⏳ Waiting for real-time updates...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Print results
    this.printResults();
  }

  printResults() {
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`WebSocket: ${this.testResults.websocket.success} ✅, ${this.testResults.websocket.failed} ❌`);
    console.log(`API: ${this.testResults.api.success} ✅, ${this.testResults.api.failed} ❌`);
    console.log(`Real-time: ${this.testResults.realtime.success} ✅, ${this.testResults.realtime.failed} ❌`);
    
    const totalSuccess = this.testResults.websocket.success + this.testResults.api.success + this.testResults.realtime.success;
    const totalFailed = this.testResults.websocket.failed + this.testResults.api.failed + this.testResults.realtime.failed;
    
    console.log(`\nOverall: ${totalSuccess} ✅, ${totalFailed} ❌`);
    
    if (totalFailed === 0) {
      console.log('🎉 All tests passed! Real-time features working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check server logs for details.');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new RealtimeTester();
  
  tester.runTests().then(() => {
    setTimeout(() => {
      tester.disconnect();
      process.exit(0);
    }, 2000);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export default RealtimeTester; 