import Joi from 'joi';
import { EMOTION_NAMES } from '../constants/emotions.js';

const moodValidator = {
  createMood: Joi.object({
    emotion: Joi.string()
      .valid(...EMOTION_NAMES)
      .required()
      .messages({
        'any.only': `Emotion must be one of: ${EMOTION_NAMES.join(', ')}`
      }),
    
    intensity: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .default(3),
    
    location: Joi.object({
      coordinates: Joi.array()
        .items(Joi.number())
        .length(2)
        .custom((value, helpers) => {
          const [lon, lat] = value;
          if (lon < -180 || lon > 180) {
            return helpers.error('any.invalid', { message: 'Longitude must be between -180 and 180' });
          }
          if (lat < -90 || lat > 90) {
            return helpers.error('any.invalid', { message: 'Latitude must be between -90 and 90' });
          }
          return value;
        }),
      
      city: Joi.string().trim().max(100),
      region: Joi.string().trim().max(100),
      country: Joi.string().trim().max(100),
      continent: Joi.string().trim().max(50),
      timezone: Joi.string().trim().max(50)
    }).optional(),
    
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(10)
      .default([]),
    
    note: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .default(''),
    
    isAnonymous: Joi.boolean().default(true),
    
    source: Joi.string()
      .valid('mobile', 'web', 'api')
      .default('web')
  }),

  updateMood: Joi.object({
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(10),
    
    note: Joi.string()
      .trim()
      .max(500)
      .allow(''),
    
    isAnonymous: Joi.boolean()
  })
};

export default moodValidator;
