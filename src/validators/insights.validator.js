import { query } from 'express-validator';
import { validateRequest } from '../middlewares/validation.middleware.js';

// Insights query validation
export const validateInsightsQuery = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format'),
  
  validateRequest
]; 