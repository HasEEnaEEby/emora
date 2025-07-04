const User = require('../models/user.model');
const { createError } = require('../utils/response');

class ProfileService {
  async getProfile(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password -refreshTokens')
        .lean();

      if (!user) {
        throw createError('User not found', 404);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(userId, profileData) {
    try {
      const { name, email, profile, settings } = profileData;
      
      const updateFields = {};

      if (name) updateFields.name = name;
      if (email) updateFields.email = email;

      if (profile) {
        if (profile.avatar) updateFields['profile.avatar'] = profile.avatar;
        if (profile.themeColor) updateFields['profile.themeColor'] = profile.themeColor;
        if (profile.pronouns) updateFields['profile.pronouns'] = profile.pronouns;
        if (profile.language) updateFields['profile.language'] = profile.language;
      }

      if (settings) {
        if (settings.notifications !== undefined) updateFields['settings.notifications'] = settings.notifications;
        if (settings.locationAccess !== undefined) updateFields['settings.locationAccess'] = settings.locationAccess;
        if (settings.moodPrivacy) updateFields['settings.moodPrivacy'] = settings.moodPrivacy;
        if (settings.language) updateFields['settings.language'] = settings.language;
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password -refreshTokens');

      if (!updatedUser) {
        throw createError('User not found', 404);
      }

      return updatedUser;
    } catch (error) {
      if (error.code === 11000) {
        throw createError('Email already exists', 400);
      }
      throw error;
    }
  }

  async deleteAccount(userId) {
    try {
      // Start transaction for cleanup
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Delete user data
        await User.findByIdAndDelete(userId).session(session);
        
        // Delete related data
        await Promise.all([
          Emotion.deleteMany({ user: userId }).session(session),
          Friend.deleteMany({ 
            $or: [{ requester: userId }, { recipient: userId }] 
          }).session(session),
          ComfortReaction.deleteMany({ 
            $or: [{ fromUser: userId }, { toUser: userId }] 
          }).session(session),
          VentReaction.deleteMany({ user: userId }).session(session),
          // Keep vents and replies anonymous instead of deleting
          Vent.updateMany({ author: userId }, { 
            $unset: { author: 1 }, 
            $set: { isAnonymous: true } 
          }).session(session),
          VentReply.updateMany({ author: userId }, { 
            $unset: { author: 1 }, 
            $set: { isAnonymous: true } 
          }).session(session)
        ]);

        await session.commitTransaction();
        return { message: 'Account deleted successfully' };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      throw error;
    }
  }

  async updateStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastLogDate = user.streaks?.lastLogDate;
      let currentStreak = user.streaks?.current || 0;
      let longestStreak = user.streaks?.longest || 0;

      if (lastLogDate) {
        const lastLog = new Date(lastLogDate);
        lastLog.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today - lastLog) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Already logged today, no change
          return;
        } else if (daysDiff === 1) {
          // Consecutive day
          currentStreak += 1;
        } else {
          // Streak broken
          currentStreak = 1;
        }
      } else {
        // First log
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      await User.findByIdAndUpdate(userId, {
        'streaks.current': currentStreak,
        'streaks.longest': longestStreak,
        'streaks.lastLogDate': today
      });

      return { currentStreak, longestStreak };
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }
}

module.exports = new ProfileService();