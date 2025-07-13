// src/validators/onboarding.validator.js - FIXED TO MATCH BACKEND MODEL
import Joi from 'joi';

const onboardingValidator = {
  // Username validation schema
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .custom((value, helpers) => {
      if (value.startsWith('_') || value.endsWith('_')) {
        return helpers.error('any.invalid', { message: 'Username cannot start or end with underscore' });
      }
      if (/^\d+$/.test(value)) {
        return helpers.error('any.invalid', { message: 'Username cannot be only numbers' });
      }
      return value;
    })
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'any.invalid': '{{#message}}'
    }),

  // User registration validation
  registerUser: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(20)
      .required()
      .pattern(/^[a-zA-Z0-9_]+$/)
      .custom((value, helpers) => {
        if (value.startsWith('_') || value.endsWith('_')) {
          return helpers.error('any.invalid', { message: 'Username cannot start or end with underscore' });
        }
        if (/^\d+$/.test(value)) {
          return helpers.error('any.invalid', { message: 'Username cannot be only numbers' });
        }
        return value;
      })
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
        'any.invalid': '{{#message}}'
      }),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must be less than 128 characters long'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Invalid email format',
        'any.required': 'Email is required'
      }),
    
    pronouns: Joi.string()
      .valid('She / Her', 'He / Him', 'They / Them', 'Other')
      .optional()
      .allow(null, ''),
    
    // FIXED: Only allow the exact values that the backend model accepts
    ageGroup: Joi.string()
      .valid('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+')
      .optional()
      .allow(null, ''),
    
    selectedAvatar: Joi.string()
      .valid('panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin')
      .optional()
      .allow(null, ''),
    
    location: Joi.string()
      .max(200)
      .optional()
      .allow(null, ''),
    
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .optional()
      .allow(null),
    
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .optional()
      .allow(null),

    termsAccepted: Joi.boolean()
      .truthy()
      .required()
      .messages({
        'any.required': 'Terms of service must be accepted'
      }),

    privacyAccepted: Joi.boolean()
      .truthy()
      .required()
      .messages({
        'any.required': 'Privacy policy must be accepted'
      })
  }),

  // Username check validation
  checkUsername: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(20)
      .required()
      .pattern(/^[a-zA-Z0-9_]+$/)
      .custom((value, helpers) => {
        if (value.startsWith('_') || value.endsWith('_')) {
          return helpers.error('any.invalid', { message: 'Username cannot start or end with underscore' });
        }
        if (/^\d+$/.test(value)) {
          return helpers.error('any.invalid', { message: 'Username cannot be only numbers' });
        }
        return value;
      })
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
        'any.invalid': '{{#message}}'
      })
  }),

  // Login validation
  loginUser: Joi.object({
    username: Joi.string()
      .required()
      .messages({
        'any.required': 'Username is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  // Save user data validation (anonymous onboarding - all optional)
  saveUserData: Joi.object({
    pronouns: Joi.string()
      .valid('She / Her', 'He / Him', 'They / Them', 'Other')
      .optional()
      .allow(null, ''),
    
    // FIXED: Only allow exact backend model values
    ageGroup: Joi.string()
      .valid('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+')
      .optional()
      .allow(null, ''),
    
    selectedAvatar: Joi.string()
      .valid('panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin')
      .optional()
      .allow(null, ''),
    
    isCompleted: Joi.boolean().optional(),
    completedAt: Joi.date().optional().allow(null),
    additionalData: Joi.any().optional()
  }),

  // Complete onboarding validation (requires core data but no username)
  completeOnboarding: Joi.object({
    pronouns: Joi.string()
      .valid('She / Her', 'He / Him', 'They / Them', 'Other')
      .required()
      .messages({
        'any.required': 'Pronouns are required',
        'any.only': 'Invalid pronouns selection'
      }),
    
    // FIXED: Only allow exact backend model values
    ageGroup: Joi.string()
      .valid('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+')
      .required()
      .messages({
        'any.required': 'Age group is required',
        'any.only': 'Invalid age group selection'
      }),
    
    selectedAvatar: Joi.string()
      .valid('panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin')
      .required()
      .messages({
        'any.required': 'Avatar is required',
        'any.only': 'Invalid avatar selection'
      }),
    
    isCompleted: Joi.boolean().optional(),
    completedAt: Joi.date().optional().allow(null),
    additionalData: Joi.any().optional()
  })
};

// Middleware function to validate requests using Joi
export const validateRequest = (schema) => {
  return (req, res, next) => {
    // For URL parameters, validate params instead of body
    const dataToValidate = Object.keys(req.params).length > 0 ? req.params : req.body;
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors,
        errorCode: 'VALIDATION_FAILED'
      });
    }

    // Replace the data with validated and sanitized version
    if (Object.keys(req.params).length > 0) {
      req.params = { ...req.params, ...value };
    } else {
      req.body = value;
    }
    
    next();
  };
};

export default onboardingValidator;