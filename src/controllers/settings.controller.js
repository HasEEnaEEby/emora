const profileService = require('../services/profile.service');
const { createResponse } = require('../utils/response');

class SettingsController {
  async getSettings(req, res, next) {
    try {
      const userId = req.user.id;
      const User = require('../models/user.model');

      const user = await User.findById(userId).select('settings profile.language');
      
      const settings = {
        notifications: user.settings?.notifications ?? true,
        locationAccess: user.settings?.locationAccess ?? false,
        moodPrivacy: user.settings?.moodPrivacy ?? 'private',
        language: user.settings?.language || user.profile?.language || 'en'
      };

      res.json(createResponse(
        'Settings retrieved successfully',
        settings
      ));
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const userId = req.user.id;
      const { settings } = req.body;

      const updatedProfile = await profileService.updateProfile(userId, { settings });

      res.json(createResponse(
        'Settings updated successfully',
        updatedProfile.settings
      ));
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationSettings(req, res, next) {
    try {
      const userId = req.user.id;
      const { notifications } = req.body;

      const User = require('../models/user.model');
      await User.findByIdAndUpdate(userId, {
        'settings.notifications': notifications
      });

      res.json(createResponse(
        'Notification settings updated successfully',
        { notifications }
      ));
    } catch (error) {
      next(error);
    }
  }

  async updatePrivacySettings(req, res, next) {
    try {
      const userId = req.user.id;
      const { moodPrivacy } = req.body;

      const User = require('../models/user.model');
      await User.findByIdAndUpdate(userId, {
        'settings.moodPrivacy': moodPrivacy
      });

      res.json(createResponse(
        'Privacy settings updated successfully',
        { moodPrivacy }
      ));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
