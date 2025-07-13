// create-jordan.js - Create the missing jordan123_496 user
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/user.model.js';

dotenv.config();

async function createJordanUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emora');
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ username: 'jordan123_496' });
    if (existingUser) {
      console.log('✅ User jordan123_496 already exists!');
      console.log(`   Email: ${existingUser.email}`);
      await mongoose.disconnect();
      return;
    }

    console.log('🔨 Creating user jordan123_496...');
    
    // Create the user data to match what you expect
    const userData = {
      username: 'jordan123_496',
      email: 'jordan39@example.com',
      password: 'password123', // This will be hashed by the User model
      pronouns: 'He / Him',
      ageGroup: '65+',
      selectedAvatar: 'rabbit',
      location: {
        name: 'San Francisco, CA, USA',
        coordinates: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749]
        },
        country: 'United States',
        city: 'San Francisco'
      },
      isActive: true,
      isOnboardingCompleted: true,
      onboardingCompletedAt: new Date('2025-01-23T07:25:51.084Z'),
      isOnline: false,
      profile: {
        displayName: 'Jordan Thompson',
        bio: 'Exploring emotional wellness through technology',
        themeColor: '#6366f1'
      },
      loginAttempts: 0,
      preferences: {
        shareLocation: true,
        shareEmotions: true,
        anonymousMode: false,
        moodPrivacy: 'public',
        notifications: {
          dailyReminder: true,
          time: '18:00',
          friendRequests: true,
          comfortReactions: true
        }
      },
      privacySettings: {
        profileVisibility: 'public',
        moodSharingLevel: 'public'
      },
      analytics: {
        totalEmotionEntries: 0,
        totalMoodsLogged: 0,
        daysSinceJoined: 0,
        longestStreak: 0,
        currentStreak: 0,
        loginCount: 0,
        lastActiveAt: new Date()
      },
      createdAt: new Date('2025-07-11T14:42:10.485Z'),
      updatedAt: new Date('2025-07-11T14:42:27.067Z')
    };

    // Create and save the user (password will be hashed automatically)
    const newUser = new User(userData);
    await newUser.save();

    console.log('🎉 User created successfully!');
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   ID: ${newUser._id}`);
    console.log(`   Password: password123`);
    console.log(`   Password hash: ${newUser.password}`);
    
    // Test password verification
    const testPassword = await bcrypt.compare('password123', newUser.password);
    console.log(`   Password test: ${testPassword ? '✅ Valid' : '❌ Invalid'}`);
    
    await mongoose.disconnect();
    
    console.log('\n🎯 Now try logging in with:');
    console.log('   Username: jordan123_496');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error creating user:', error);
    await mongoose.disconnect();
  }
}

createJordanUser();