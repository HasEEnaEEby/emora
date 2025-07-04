// src/validators/onboarding.validator.js - UPDATED VERSION
import Joi from 'joi';

const onboardingValidator = {
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
      .allow(null),
    
    ageGroup: Joi.string()
      .valid('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'less than 20s', '20s', '30s', '40s', '50s and above')
      .optional()
      .allow(null),
    
    selectedAvatar: Joi.string()
      .valid('panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin')
      .optional()
      .allow(null),
    
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
      .allow(null)
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

  // Create user validation (for step-by-step onboarding)
  createUser: Joi.object({
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

  // Update pronouns validation
  updatePronouns: Joi.object({
    pronouns: Joi.string()
      .valid('She / Her', 'He / Him', 'They / Them', 'Other')
      .required()
      .messages({
        'any.only': 'Invalid pronouns selection'
      })
  }),

  // Update age group validation
  updateAgeGroup: Joi.object({
    ageGroup: Joi.string()
      .valid('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'less than 20s', '20s', '30s', '40s', '50s and above')
      .required()
      .messages({
        'any.only': 'Invalid age group selection'
      })
  }),

  // Update avatar validation
  updateAvatar: Joi.object({
    avatar: Joi.string()
      .valid('panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin')
      .required()
      .messages({
        'any.only': 'Invalid avatar selection'
      })
  }),

  // Update preferences validation
  updatePreferences: Joi.object({
    preferences: Joi.object({
      shareLocation: Joi.boolean().optional(),
      anonymousMode: Joi.boolean().optional(),
      notifications: Joi.object({
        dailyReminder: Joi.boolean().optional(),
        time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        timezone: Joi.string().optional()
      }).optional()
    }).required()
  }),

  // Save user data validation (anonymous onboarding)
  saveUserData: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(20)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .optional()
      .allow(null)
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
      }),
    
    pronouns: Joi.string()
      .valid('She / Her', 'He / Him', 'They / Them', 'Other')
      .optional()
      .allow(null),
    
    ageGroup: Joi.string()
      .valid('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'less than 20s', '20s', '30s', '40s', '50s and above')
      .optional()
      .allow(null),
    
    selectedAvatar: Joi.string()
      .valid('panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin')
      .optional()
      .allow(null),
    
    isCompleted: Joi.boolean().optional(),
    completedAt: Joi.date().optional().allow(null),
    additionalData: Joi.any().optional()
  }),

  // Complete onboarding validation
  completeOnboarding: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(20)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .optional()
      .allow(null)
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
      }),
    
    pronouns: Joi.string()
      .valid('She / Her', 'He / Him', 'They / Them', 'Other')
      .optional()
      .allow(null),
    
    ageGroup: Joi.string()
      .valid('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'less than 20s', '20s', '30s', '40s', '50s and above')
      .optional()
      .allow(null),
    
    selectedAvatar: Joi.string()
      .valid('panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin')
      .optional()
      .allow(null),
    
    isCompleted: Joi.boolean().optional(),
    completedAt: Joi.date().optional().allow(null),
    additionalData: Joi.any().optional()
  })
};

// Middleware function to validate requests using Joi
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
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
        errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

export default onboardingValidator;