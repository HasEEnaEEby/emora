// src/middlewares/validation.middleware.js - Fixed version
import { createErrorResponse } from '../utils/response.js';

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