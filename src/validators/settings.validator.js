const { body } = require('express-validator');

const updateSettingsValidator = [
  body('settings.notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications setting must be a boolean'),
  body('settings.locationAccess')
    .optional()
    .isBoolean()
    .withMessage('Location access setting must be a boolean'),
  body('settings.moodPrivacy')
    .optional()
    .isIn(['private', 'friends', 'public'])
    .withMessage('Mood privacy must be private, friends, or public'),
  body('settings.language')
    .optional()
    .isIn(['en', 'nep'])
    .withMessage('Language must be either "en" or "nep"')
];

module.exports = {
  updateSettingsValidator
};