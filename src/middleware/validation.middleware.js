// src/middlewares/validation.middleware.js - JOI-ONLY VALIDATION (CLEAN & SIMPLE)

// Simple Joi validation middleware
const validationMiddleware = (schema) => {
  return [(req, res, next) => {
    // Skip validation if no schema provided
    if (!schema) {
      return next();
    }

    try {
      // Validate request body with Joi
      const { error, value } = schema.validate(req.body, {
        abortEarly: false, // Return all errors, not just the first one
        allowUnknown: true, // Allow unknown fields
        stripUnknown: true // Remove unknown fields from validated data
      });

      if (error) {
        // Format Joi errors for consistent API response
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, ''), // Remove quotes from Joi messages
          value: detail.context?.value
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errorMessages,
          errorCode: 'VALIDATION_ERROR'
        });
      }

      // Attach validated data to request (optional)
      req.validatedData = value;
      next();

    } catch (err) {
      console.error('Validation processing error:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Validation processing failed',
        errorCode: 'VALIDATION_PROCESSING_ERROR'
      });
    }
  }];
};

// Body validation (for most routes)
export const validateBody = (schema) => {
  return validationMiddleware(schema);
};

// Query parameters validation
export const validateQuery = (schema) => {
  return [(req, res, next) => {
    if (!schema) return next();

    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, ''),
          value: detail.context?.value
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Query validation failed',
          errors: errorMessages,
          errorCode: 'QUERY_VALIDATION_ERROR'
        });
      }

      req.validatedQuery = value;
      next();
    } catch (err) {
      console.error('Query validation error:', err);
      next();
    }
  }];
};

// URL parameters validation
export const validateParams = (schema) => {
  return [(req, res, next) => {
    if (!schema) return next();

    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        allowUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, ''),
          value: detail.context?.value
        }));

        return res.status(400).json({
          status: 'error',
          message: 'URL parameter validation failed',
          errors: errorMessages,
          errorCode: 'PARAMS_VALIDATION_ERROR'
        });
      }

      req.validatedParams = value;
      next();
    } catch (err) {
      console.error('Params validation error:', err);
      next();
    }
  }];
};

// Legacy aliases for backward compatibility
export const validateRequest = validationMiddleware;
export const validate = validationMiddleware;

// Export as default
export default validationMiddleware;