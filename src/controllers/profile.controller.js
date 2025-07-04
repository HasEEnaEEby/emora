const profileService = require('../services/profile.service');
const { createResponse } = require('../utils/response');

class ProfileController {
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const profile = await profileService.getProfile(userId);

      res.json(createResponse(
        'Profile retrieved successfully',
        profile
      ));
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const profileData = req.body;

      const updatedProfile = await profileService.updateProfile(userId, profileData);

      res.json(createResponse(
        'Profile updated successfully',
        updatedProfile
      ));
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await profileService.deleteAccount(userId);

      res.json(createResponse(result.message));
    } catch (error) {
      next(error);
    }
  }

  async getStreakInfo(req, res, next) {
    try {
      const userId = req.user.id;
      const User = require('../models/user.model');

      const user = await User.findById(userId).select('streaks');
      
      const streakInfo = {
        currentStreak: user.streaks?.current || 0,
        longestStreak: user.streaks?.longest || 0,
        lastLogDate: user.streaks?.lastLogDate
      };

      res.json(createResponse(
        'Streak information retrieved successfully',
        streakInfo
      ));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProfileController();