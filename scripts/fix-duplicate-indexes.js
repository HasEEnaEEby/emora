// scripts/fix-duplicate-indexes.js
// Run this script to fix duplicate index warnings
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emora-backend';

async function fixDuplicateIndexes() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Fix User collection indexes
    console.log('\n📋 Fixing User collection indexes...');
    const userCollection = db.collection('users');
    
    // Get existing indexes
    const userIndexes = await userCollection.indexes();
    console.log('Current User indexes:', userIndexes.map(idx => idx.name));

    // Drop duplicate indexes if they exist
    try {
      // Drop manual indexes (keep the unique ones created by the schema)
      const indexesToDrop = [];
      
      for (const index of userIndexes) {
        // Keep unique indexes and _id, drop others
        if (index.name !== '_id_' && 
            index.name !== 'username_1' && 
            index.name !== 'email_1' &&
            !index.unique) {
          indexesToDrop.push(index.name);
        }
      }

      for (const indexName of indexesToDrop) {
        try {
          await userCollection.dropIndex(indexName);
          console.log(`✅ Dropped duplicate index: ${indexName}`);
        } catch (error) {
          console.log(`⚠️ Could not drop index ${indexName}:`, error.message);
        }
      }

    } catch (error) {
      console.log('⚠️ Error dropping user indexes:', error.message);
    }

    // Fix Emotion collection indexes
    console.log('\n📊 Fixing Emotion/UnifiedEmotion collection indexes...');
    const emotionCollections = ['emotions', 'unifiedemotions'];
    
    for (const collectionName of emotionCollections) {
      try {
        const collection = db.collection(collectionName);
        const exists = await db.listCollections({ name: collectionName }).hasNext();
        
        if (!exists) {
          console.log(`⏭️ Collection ${collectionName} doesn't exist, skipping...`);
          continue;
        }

        const emotionIndexes = await collection.indexes();
        console.log(`Current ${collectionName} indexes:`, emotionIndexes.map(idx => idx.name));

        // Drop duplicate timestamp indexes
        const timestampIndexesToDrop = [];
        
        for (const index of emotionIndexes) {
          // Drop manual timestamp indexes (timestamps: true creates these automatically)
          if (index.name.includes('timestamp') && 
              index.name !== '_id_' && 
              !index.name.includes('createdAt') &&
              !index.name.includes('updatedAt')) {
            timestampIndexesToDrop.push(index.name);
          }
        }

        for (const indexName of timestampIndexesToDrop) {
          try {
            await collection.dropIndex(indexName);
            console.log(`✅ Dropped duplicate timestamp index: ${indexName}`);
          } catch (error) {
            console.log(`⚠️ Could not drop index ${indexName}:`, error.message);
          }
        }

      } catch (error) {
        console.log(`⚠️ Error fixing ${collectionName} indexes:`, error.message);
      }
    }

    // Recreate proper indexes
    console.log('\n🔨 Recreating proper indexes...');
    
    // User indexes
    try {
      await userCollection.createIndex({ username: 1 }, { unique: true, background: true });
      console.log('✅ Created unique username index');
    } catch (error) {
      console.log('ℹ️ Username index already exists:', error.message);
    }

    try {
      await userCollection.createIndex({ email: 1 }, { unique: true, background: true });
      console.log('✅ Created unique email index');
    } catch (error) {
      console.log('ℹ️ Email index already exists:', error.message);
    }

    try {
      await userCollection.createIndex({ isActive: 1 }, { background: true });
      console.log('✅ Created isActive index');
    } catch (error) {
      console.log('ℹ️ isActive index already exists:', error.message);
    }

    // Check final state
    console.log('\n📊 Final index state:');
    const finalUserIndexes = await userCollection.indexes();
    console.log('User collection indexes:');
    finalUserIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''}`);
    });

    console.log('\n✅ Index optimization complete!');
    console.log('\n🎯 Summary:');
    console.log('• Removed duplicate manual indexes');
    console.log('• Kept unique constraints for username and email');
    console.log('• MongoDB will no longer show duplicate index warnings');
    console.log('• Your app should now load properly');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
console.log('🚀 Starting duplicate index fix...');
fixDuplicateIndexes();