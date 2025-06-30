// src/validators/emotion.validator.js
import { body, query, validationResult } from 'express-validator';
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

// Validate emotion logging
export const validateEmotionLog = [
  body('emotion')
    .isString()
    .isIn(EMOTION_NAMES)
    .withMessage(`Emotion must be one of: ${EMOTION_NAMES.join(', ')}`),
  
  body('intensity')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Intensity must be a number between 0 and 1'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be a valid GeoJSON object'),
  
  body('location.type')
    .optional()
    .equals('Point')
    .withMessage('Location type must be "Point"'),
  
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]'),
  
  body('note')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Note must be a string with max 1000 characters'),
  
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  
  body('secondaryEmotions')
    .optional()
    .isArray()
    .withMessage('Secondary emotions must be an array'),
  
  body('memory')
    .optional()
    .isObject()
    .withMessage('Memory must be an object'),
  
  body('globalSharing')
    .optional()
    .isBoolean()
    .withMessage('Global sharing must be a boolean'),
  
  handleValidationErrors
];

// Validate emotion update
export const validateEmotionUpdate = [
  body('intensity')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Intensity must be a number between 0 and 1'),
  
  body('note')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Note must be a string with max 1000 characters'),
  
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  
  body('memory')
    .optional()
    .isObject()
    .withMessage('Memory must be an object'),
  
  body('globalSharing')
    .optional()
    .isBoolean()
    .withMessage('Global sharing must be a boolean'),
  
  handleValidationErrors
];

// Validate pagination parameters
export const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  handleValidationErrors
];

// Validate timeframe parameter
export const validateTimeframe = [
  query('timeframe')
    .optional()
    .isIn(['1h', '6h', '12h', '24h', '3d', '7d', '14d', '30d', '90d', '1y'])
    .withMessage('Timeframe must be one of: 1h, 6h, 12h, 24h, 3d, 7d, 14d, 30d, 90d, 1y'),
  
  handleValidationErrors
];

// Validate emotion search parameters
export const validateEmotionSearch = [
  query('q')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('emotion')
    .optional()
    .isIn(EMOTION_NAMES)
    .withMessage(`Emotion must be one of: ${EMOTION_NAMES.join(', ')}`),
  
  query('coreEmotion')
    .optional()
    .isIn(['joy', 'sadness', 'anger', 'fear', 'disgust'])
    .withMessage('Core emotion must be one of: joy, sadness, anger, fear, disgust'),
  
  ...validatePagination.slice(0, -1), // Include pagination validation without the error handler
  ...validateTimeframe.slice(0, -1), // Include timeframe validation without the error handler
  
  handleValidationErrors
];

// Export all validators
export default {
  validateEmotionLog,
  validateEmotionUpdate,
  validatePagination,
  validateTimeframe,
  validateEmotionSearch,
  handleValidationErrors
};