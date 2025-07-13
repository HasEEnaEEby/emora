// reset-account-lockout.js - Reset account lockout for testing
import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import config from './src/config/index.js';

async function resetAccountLockout() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    
    console.log('🔍 Looking for user "sofiya"...');
    const user = await User.findOne({ username: 'sofiya' });
    
    if (!user) {
      console.log('❌ User "sofiya" not found');
      return;
    }
    
    console.log('✅ Found user:', user.username);
    console.log('🔒 Current lockout status:', {
      loginAttempts: user.loginAttempts,
      lockUntil: user.lockUntil,
      isLocked: user.isLocked
    });
    
    // Reset lockout
    await user.updateOne({
      $unset: { loginAttempts: 1, lockUntil: 1 }
    });
    
    console.log('🔓 Account lockout reset successfully!');
    
    // Verify the reset
    const updatedUser = await User.findOne({ username: 'sofiya' });
    console.log('✅ Updated lockout status:', {
      loginAttempts: updatedUser.loginAttempts,
      lockUntil: updatedUser.lockUntil,
      isLocked: updatedUser.isLocked
    });
    
  } catch (error) {
    console.error('❌ Error resetting account lockout:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

resetAccountLockout(); 