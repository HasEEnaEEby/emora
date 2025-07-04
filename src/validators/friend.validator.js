import { body, param, query } from 'express-validator';
import { validateRequest } from '../middlewares/validation.middleware.js';

// Friend request validation
export const validateFriendRequest = [
  param('recipientId')
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  
  body('message')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Message must be less than 200 characters'),
  
  validateRequest
];

// Friend response validation
export const validateFriendResponse = [
  param('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),
  
  body('message')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Message must be less than 200 characters'),
  
  validateRequest
];

// Check-in validation
export const validateCheckIn = [
  param('friendId')
    .isMongoId()
    .withMessage('Invalid friend ID'),
  
  body('message')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters'),
  
  body('emotion')
    .optional()
    .isIn(['joy', 'sadness', 'anger', 'fear', 'disgust', 'confused', 'surprised', 'grateful', 'proud', 'embarrassed', 'guilty', 'ashamed', 'jealous', 'envious', 'lonely', 'bored', 'tired', 'energetic', 'calm', 'peaceful', 'relaxed', 'motivated', 'inspired', 'confident', 'insecure', 'vulnerable', 'nostalgic'])
    .withMessage('Invalid emotion type'),
  
  validateRequest
];

// Friend query validation
export const validateFriendQuery = [
  query('status')
    .optional()
    .isIn(['accepted', 'pending', 'declined', 'blocked'])
    .withMessage('Invalid status filter'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  validateRequest
];

// Friend moods query validation
export const validateFriendMoodsQuery = [
  param('friendId')
    .isMongoId()
    .withMessage('Invalid friend ID'),
  
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  
  validateRequest
];

// Block user validation
export const validateBlockUser = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  validateRequest
];

// Remove friend validation
export const validateRemoveFriend = [
  param('friendId')
    .isMongoId()
    .withMessage('Invalid friend ID'),
  
  validateRequest
];
