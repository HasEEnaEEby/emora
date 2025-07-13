// scripts/add-friend-indexes.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emora';

async function addFriendIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    console.log('📊 Adding friend system indexes...');

    // ✅ CRITICAL: Add indexes for friend operations
    const indexes = [
      // User lookup indexes
      { collection: 'users', index: { '_id': 1 } },
      { collection: 'users', index: { 'username': 1 } },
      { collection: 'users', index: { 'profile.displayName': 1 } },
      
      // Friend relationship indexes
      { collection: 'users', index: { 'friends.userId': 1 } },
      { collection: 'users', index: { 'friendRequests.sent.userId': 1 } },
      { collection: 'users', index: { 'friendRequests.received.userId': 1 } },
      
      // Privacy and activity indexes
      { collection: 'users', index: { 'privacySettings.profileVisibility': 1 } },
      { collection: 'users', index: { 'isActive': 1 } },
      { collection: 'users', index: { 'analytics.lastActiveAt': -1 } },
      { collection: 'users', index: { 'analytics.totalMoodsLogged': -1 } },
      
      // Location-based indexes
      { collection: 'users', index: { 'location.city': 1 } },
      { collection: 'users', index: { 'location.coordinates': '2dsphere' } },
      
      // Compound indexes for better performance
      { collection: 'users', index: { 'isActive': 1, 'privacySettings.profileVisibility': 1 } },
      { collection: 'users', index: { 'friends.userId': 1, 'isActive': 1 } },
      { collection: 'users', index: { 'friendRequests.sent.userId': 1, 'createdAt': -1 } },
      { collection: 'users', index: { 'friendRequests.received.userId': 1, 'createdAt': -1 } },
    ];

    for (const { collection, index } of indexes) {
      try {
        console.log(`📈 Adding index to ${collection}:`, index);
        await db.collection(collection).createIndex(index);
        console.log(`✅ Index added successfully to ${collection}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️ Index already exists for ${collection}:`, index);
        } else {
          console.error(`❌ Error adding index to ${collection}:`, error.message);
        }
      }
    }

    console.log('🎉 All friend system indexes added successfully!');
    
    // Show index statistics
    console.log('\n📊 Index Statistics:');
    const collections = ['users'];
    
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`\n${collectionName} collection (${indexes.length} indexes):`);
      indexes.forEach((index, i) => {
        console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addFriendIndexes().then(() => {
  console.log('✅ Index setup completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Index setup failed:', error);
  process.exit(1);
}); 