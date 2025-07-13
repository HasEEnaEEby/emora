import profileService from '../services/profile.service.js';
import { createResponse } from '../utils/response.js';

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
      const { default: User } = await import('../models/user.model.js');

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

export default new ProfileController();