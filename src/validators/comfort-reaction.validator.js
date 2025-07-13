import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware.js';

const comfortReactionValidator = [
  body('reactionType')
    .notEmpty()
    .withMessage('Reaction type is required')
    .isIn(['hug', 'support', 'rainbow', 'heart', 'strength', 'listening'])
    .withMessage('Invalid reaction type'),
  body('message')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Message cannot exceed 100 characters')
    .trim(),
  validateRequest
];

const markReadValidator = [
  body('reactionIds')
    .isArray({ min: 1 })
    .withMessage('Reaction IDs must be a non-empty array')
    .custom((value) => {
      if (!value.every(id => typeof id === 'string' && id.length === 24)) {
        throw new Error('Invalid reaction ID format');
      }
      return true;
    }),
  validateRequest
];

export { comfortReactionValidator, markReadValidator };
