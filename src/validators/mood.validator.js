// src/validators/mood.validator.js
import { body, validationResult } from 'express-validator';
import { EMOTION_NAMES } from '../constants/emotions.js';

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Validate mood entry
export const validateMoodEntry = [
  body('emotion')
    .isString()
    .isIn(EMOTION_NAMES)
    .withMessage(`Emotion must be one of: ${EMOTION_NAMES.join(', ')}`),
  
  body('intensity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Intensity must be an integer between 1 and 10'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be a valid object'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('note')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Note must be a string with max 1000 characters'),
  
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
  
  body('source')
    .optional()
    .isString()
    .isIn(['web', 'mobile', 'api'])
    .withMessage('Source must be one of: web, mobile, api'),
  
  handleValidationErrors
];

// Validate mood update
export const validateMoodUpdate = [
  body('emotion')
    .optional()
    .isString()
    .isIn(EMOTION_NAMES)
    .withMessage(`Emotion must be one of: ${EMOTION_NAMES.join(', ')}`),
  
  body('intensity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Intensity must be an integer between 1 and 10'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('note')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Note must be a string with max 1000 characters'),
  
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
  
  handleValidationErrors
];

export default {
  validateMoodEntry,
  validateMoodUpdate,
  handleValidationErrors
};