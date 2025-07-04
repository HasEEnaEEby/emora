// src/middlewares/validation.middleware.js - Fixed version
import { validationResult } from 'express-validator';
import { createErrorResponse } from '../utils/response.js';

// Express-validator middleware
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json(createErrorResponse(
      'Validation failed',
      { errors: errorMessages }
    ));
  }
  next();
};

// Joi validation middleware (legacy)
const validationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json(createErrorResponse(
        'Validation failed', 
        { errors }
      ));
    }

    req.body = value;
    next();
  };
};

export default validationMiddleware;