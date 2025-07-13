// test-db-performance.js - Database performance test
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:8000';

async function testDatabasePerformance() {
  try {
    console.log('🧪 Testing database performance...');
    
    // Test 1: Simple findById operation
    console.log('📡 Test 1: Simple findById operation...');
    const startTime1 = Date.now();
    
    const User = mongoose.model('User');
    const user = await User.findById('6871dc82cb49e74d72743457').select('_id username');
    
    const endTime1 = Date.now();
    const duration1 = endTime1 - startTime1;
    
    console.log('✅ FindById test:');
    console.log('   Duration:', duration1 + 'ms');
    console.log('   User found:', !!user);
    
    // Test 2: UpdateOne operation
    console.log('📡 Test 2: UpdateOne operation...');
    const startTime2 = Date.now();
    
    const updateResult = await User.updateOne(
      { _id: '6871dc82cb49e74d72743457' },
      { $set: { 'analytics.lastActiveAt': new Date() } }
    );
    
    const endTime2 = Date.now();
    const duration2 = endTime2 - startTime2;
    
    console.log('✅ UpdateOne test:');
    console.log('   Duration:', duration2 + 'ms');
    console.log('   Modified count:', updateResult.modifiedCount);
    
    // Test 3: Array operations
    console.log('📡 Test 3: Array operations...');
    const startTime3 = Date.now();
    
    const userWithArrays = await User.findById('6871dc82cb49e74d72743457').select('friends friendRequests');
    const friendCount = userWithArrays.friends.length;
    const sentRequestCount = userWithArrays.friendRequests.sent.length;
    const receivedRequestCount = userWithArrays.friendRequests.received.length;
    
    const endTime3 = Date.now();
    const duration3 = endTime3 - startTime3;
    
    console.log('✅ Array operations test:');
    console.log('   Duration:', duration3 + 'ms');
    console.log('   Friends count:', friendCount);
    console.log('   Sent requests:', sentRequestCount);
    console.log('   Received requests:', receivedRequestCount);
    
    // Test 4: Complex update with arrays
    console.log('📡 Test 4: Complex update with arrays...');
    const startTime4 = Date.now();
    
    const updateResult2 = await User.updateOne(
      { _id: '6871dc82cb49e74d72743457' },
      {
        $push: {
          'friendRequests.sent': {
            userId: 'test-user-id',
            createdAt: new Date()
          }
        }
      }
    );
    
    const endTime4 = Date.now();
    const duration4 = endTime4 - startTime4;
    
    console.log('✅ Complex update test:');
    console.log('   Duration:', duration4 + 'ms');
    console.log('   Modified count:', updateResult2.modifiedCount);
    
    // Performance summary
    console.log('\n📊 Database Performance Summary:');
    console.log('   - FindById: ' + duration1 + 'ms');
    console.log('   - UpdateOne: ' + duration2 + 'ms');
    console.log('   - Array operations: ' + duration3 + 'ms');
    console.log('   - Complex update: ' + duration4 + 'ms');
    
    const totalTime = duration1 + duration2 + duration3 + duration4;
    console.log('   - Total time: ' + totalTime + 'ms');
    
    if (totalTime < 100) {
      console.log('🚀 Excellent database performance!');
    } else if (totalTime < 500) {
      console.log('✅ Good database performance!');
    } else if (totalTime < 1000) {
      console.log('⚠️ Acceptable database performance!');
    } else {
      console.log('❌ Slow database performance!');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:');
    console.error('   Error:', error.message);
  }
}

// Run the test
testDatabasePerformance(); 