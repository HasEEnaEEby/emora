import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware.js';

// Vent creation validation
export const validateVent = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Vent content must be between 1 and 1000 characters'),
  
  body('emotion')
    .optional()
    .isIn(['joy', 'sadness', 'anger', 'fear', 'disgust', 'confused', 'surprised', 'grateful', 'proud', 'embarrassed', 'guilty', 'ashamed', 'jealous', 'envious', 'lonely', 'bored', 'tired', 'energetic', 'calm', 'peaceful', 'relaxed', 'motivated', 'inspired', 'confident', 'insecure', 'vulnerable', 'nostalgic'])
    .withMessage('Invalid emotion type'),
  
  body('intensity')
    .optional()
    .isFloat({ min: 0.0, max: 1.0 })
    .withMessage('Intensity must be between 0.0 and 1.0'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  
  body('privacy.isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  
  body('privacy.allowReplies')
    .optional()
    .isBoolean()
    .withMessage('allowReplies must be a boolean'),
  
  body('privacy.allowReactions')
    .optional()
    .isBoolean()
    .withMessage('allowReactions must be a boolean'),
  
  body('privacy.blurContent')
    .optional()
    .isBoolean()
    .withMessage('blurContent must be a boolean'),
  
  body('privacy.contentWarning')
    .optional()
    .isIn(['none', 'sensitive', 'triggering', 'explicit'])
    .withMessage('Invalid content warning type'),
  
  body('location.city')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  
  body('location.country')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters'),
  
  body('location.region')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region must be less than 100 characters'),
  
  body('location.timezone')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Timezone must be less than 50 characters'),
  
  body('sessionToken')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Session token must be between 10 and 200 characters'),
  
  validateRequest
];

// Reaction validation
export const validateReaction = [
  param('ventId')
    .isMongoId()
    .withMessage('Invalid vent ID'),
  
  body('reactionType')
    .isIn(['comfort', 'relate', 'hug', 'heart', 'rainbow', 'strength', 'listening'])
    .withMessage('Invalid reaction type'),
  
  body('anonymousId')
    .isString()
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage('Anonymous ID must be between 10 and 100 characters'),
  
  validateRequest
];

// Reply validation
export const validateReply = [
  param('ventId')
    .isMongoId()
    .withMessage('Invalid vent ID'),
  
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reply content must be between 1 and 500 characters'),
  
  body('anonymousId')
    .isString()
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage('Anonymous ID must be between 10 and 100 characters'),
  
  validateRequest
];

// Flag validation
export const validateFlag = [
  param('ventId')
    .isMongoId()
    .withMessage('Invalid vent ID'),
  
  body('reason')
    .isIn(['inappropriate', 'spam', 'harassment', 'other'])
    .withMessage('Invalid flag reason'),
  
  body('anonymousId')
    .isString()
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage('Anonymous ID must be between 10 and 100 characters'),
  
  validateRequest
];

// Feed query validation
export const validateFeedQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('emotion')
    .optional()
    .isIn(['joy', 'sadness', 'anger', 'fear', 'disgust', 'confused', 'surprised', 'grateful', 'proud', 'embarrassed', 'guilty', 'ashamed', 'jealous', 'envious', 'lonely', 'bored', 'tired', 'energetic', 'calm', 'peaceful', 'relaxed', 'motivated', 'inspired', 'confident', 'insecure', 'vulnerable', 'nostalgic'])
    .withMessage('Invalid emotion filter'),
  
  query('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  
  query('country')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters'),
  
  validateRequest
];

// Delete vent validation
export const validateDeleteVent = [
  param('ventId')
    .isMongoId()
    .withMessage('Invalid vent ID'),
  
  body('anonymousId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage('Anonymous ID must be between 10 and 100 characters'),
  
  body('sessionToken')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Session token must be between 10 and 200 characters'),
  
  validateRequest
];