// fixed-quick-test.js - Better database connection test
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/user.model.js';

dotenv.config();

async function fixedTest() {
  try {
    console.log('🔍 Testing database connection and user lookup...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emora';
    console.log('📍 Connecting to:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');
    
    // Test 1: Check total users
    const totalUsers = await User.countDocuments();
    console.log(`\n📊 Total users in database: ${totalUsers}`);
    
    if (totalUsers === 0) {
      console.log('❌ No users found in database! Database might be empty.');
      await mongoose.disconnect();
      return;
    }
    
    // Test 2: List all users
    console.log('\n👥 All users in database:');
    const allUsers = await User.find({}, 'username email isActive').limit(10);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.email}) - Active: ${user.isActive}`);
    });
    
    // Test 3: Look for jordan specifically
    console.log('\n🔍 Looking for jordan users...');
    const jordanUsers = await User.find({ 
      username: { $regex: /jordan/i }
    }, 'username email password isActive');
    
    console.log(`Found ${jordanUsers.length} jordan users:`);
    jordanUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. Username: "${user.username}"`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Has password: ${!!user.password}`);
      console.log(`      Password starts with: ${user.password ? user.password.substring(0, 10) + '...' : 'NO PASSWORD'}`);
      console.log(`      Active: ${user.isActive}`);
      console.log('');
    });
    
    // Test 4: Test exact lookup that auth uses
    console.log('🔍 Testing exact auth lookup logic...');
    const testUsername = 'jordan123_496';
    
    // This is exactly what your auth controller does
    const user = await User.findOne({
      $or: [
        { username: testUsername },
        { username: { $regex: new RegExp(`^${testUsername}$`, 'i') } }
      ]
    }).select('+password');
    
    console.log(`\nAuth lookup result for "${testUsername}":`);
    console.log(`   Found: ${!!user}`);
    if (user) {
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Has password: ${!!user.password}`);
      console.log(`   Password hash: ${user.password ? user.password.substring(0, 20) + '...' : 'NONE'}`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Database test completed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

fixedTest();