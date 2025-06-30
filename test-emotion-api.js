// ============================================================================
// DEBUG SCRIPT - Find out why you're getting 403 Forbidden
// ============================================================================

import axios from 'axios';

async function debugServer() {
  console.log('🔍 Debugging EMORA Server Issues...\n');

  const baseUrl = 'http://localhost:5000';
  
  // Test 1: Basic connection
  console.log('1️⃣  Testing basic server connection...');
  try {
    const response = await axios.get(baseUrl, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    console.log(`✅ Server responding with status: ${response.status}`);
    console.log(`📄 Response data:`, response.data);
  } catch (error) {
    console.log(`❌ Cannot connect to server:`, error.message);
    console.log('🚨 Make sure your server is running with: npm run dev');
    return;
  }

  // Test 2: Check health endpoint with different approaches
  console.log('\n2️⃣  Testing health endpoint variations...');
  
  const healthUrls = [
    `${baseUrl}/health`,
    `${baseUrl}/api/health`,
    `${baseUrl}/api/health/`
  ];

  for (const url of healthUrls) {
    try {
      const response = await axios.get(url, { 
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'EMORA-Test-Client',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ ${url} → Status: ${response.status}`);
      if (response.status === 200) {
        console.log(`📄 Data:`, response.data);
      } else {
        console.log(`📄 Error:`, response.data || response.statusText);
      }
    } catch (error) {
      console.log(`❌ ${url} → Error: ${error.message}`);
    }
  }

  // Test 3: Check CORS headers
  console.log('\n3️⃣  Testing CORS and headers...');
  try {
    const response = await axios.options(`${baseUrl}/api/health`, {
      timeout: 5000,
      validateStatus: () => true,
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    console.log(`📡 CORS preflight status: ${response.status}`);
    console.log(`📋 CORS headers:`, {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    });
  } catch (error) {
    console.log(`❌ CORS test failed: ${error.message}`);
  }

  // Test 4: Try emotion endpoints
  console.log('\n4️⃣  Testing emotion endpoints...');
  
  const emotionUrls = [
    `${baseUrl}/api/emotions`,
    `${baseUrl}/api/emotions/global-stats`,
    `${baseUrl}/api/emotions/feed`
  ];

  for (const url of emotionUrls) {
    try {
      const response = await axios.get(url, { 
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`📊 ${url} → Status: ${response.status}`);
      if (response.status < 400) {
        console.log(`✅ Working!`);
      } else {
        console.log(`❌ Error:`, response.data || response.statusText);
      }
    } catch (error) {
      console.log(`❌ ${url} → Error: ${error.message}`);
    }
  }

  console.log('\n🔧 Troubleshooting suggestions:');
  console.log('1. Check if your server.js has proper route registration');
  console.log('2. Verify CORS configuration allows localhost requests');
  console.log('3. Check if there\'s global auth middleware blocking requests');
  console.log('4. Look at server console logs for error details');
}

// Also test different HTTP methods
async function testHttpMethods() {
  console.log('\n5️⃣  Testing different HTTP methods...');
  
  const baseUrl = 'http://localhost:5000';
  const methods = ['GET', 'POST', 'OPTIONS'];
  
  for (const method of methods) {
    try {
      const config = {
        method: method.toLowerCase(),
        url: `${baseUrl}/api/health`,
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      if (method === 'POST') {
        config.data = { test: 'data' };
      }
      
      const response = await axios(config);
      console.log(`🔧 ${method} /api/health → Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${method} failed: ${error.message}`);
    }
  }
}

// Run all tests
async function main() {
  await debugServer();
  await testHttpMethods();
  
  console.log('\n💡 Next steps:');
  console.log('1. Check your server console logs');
  console.log('2. Verify server.js route configuration');
  console.log('3. Check middleware order (auth should come after public routes)');
  console.log('4. Test with curl: curl -v http://localhost:5000/api/health');
}

main().catch(console.error);

// ============================================================================
// COMMON FIXES FOR 403 FORBIDDEN
// ============================================================================

/*
🔧 ISSUE 1: Auth middleware blocking all routes
SOLUTION: Make sure auth middleware comes AFTER public routes

// ❌ Wrong order in server.js:
app.use(authMiddleware); // This blocks everything!
app.use('/api/emotions', emotionRoutes);

// ✅ Correct order:
app.use('/api/emotions', emotionRoutes); // Public routes first
app.use('/api/protected', authMiddleware, protectedRoutes);

🔧 ISSUE 2: CORS blocking requests
SOLUTION: Check your CORS configuration in server.js

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

🔧 ISSUE 3: Helmet blocking requests
SOLUTION: Check helmet configuration

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false  // Disable for development
}));

🔧 ISSUE 4: Missing routes
SOLUTION: Verify emotion routes are properly added

import emotionRoutes from './routes/emotion.routes.js';
app.use('/api/emotions', emotionRoutes);

🔧 ISSUE 5: Rate limiting too strict
SOLUTION: Check rate limiting configuration

// Make sure health endpoint is excluded
app.use(rateLimitMiddleware);
app.get('/api/health', (req, res) => { ... }); // Should be exempt
*/