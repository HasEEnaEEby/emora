// list-users-with-passwords.js - Show all users for testing
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/user.model.js';

dotenv.config();

async function listAllUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emora');
    console.log('✅ Connected to MongoDB');

    console.log('👥 All users in database:');
    const users = await User.find({}, 'username email password isActive createdAt').limit(20).sort({ createdAt: -1 });
    
    console.log(`\n📊 Found ${users.length} users (showing latest 20):`);
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. Username: ${user.username.padEnd(20)} Email: ${user.email.padEnd(25)}`);
      console.log(`    Password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'NO PASSWORD'}`);
      console.log(`    Active: ${user.isActive ? '✅' : '❌'}   Created: ${user.createdAt.toLocaleDateString()}`);
      console.log('');
    });
    
    await mongoose.disconnect();
    
    console.log('\n🎯 QUICK TEST OPTIONS:');
    console.log('1. Create jordan123_496 user: node create-jordan.js');
    console.log('2. Try logging in with any of the above usernames and password: "password123"');
    console.log('3. Most likely all users have the same password from the seed script');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

listAllUsers();