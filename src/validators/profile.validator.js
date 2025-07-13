import { body } from 'express-validator';

const updateProfileValidator = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('profile.avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  body('profile.themeColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Theme color must be a valid hex color'),
  body('profile.pronouns')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Pronouns cannot exceed 20 characters')
    .trim(),
  body('profile.language')
    .optional()
    .isIn(['en', 'nep'])
    .withMessage('Language must be either "en" or "nep"'),
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

export { updateProfileValidator };