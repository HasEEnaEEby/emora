import Joi from 'joi';
import { EMOTION_NAMES } from '../constants/emotions.js';

const heatmapValidator = {
  getHeatmap: Joi.object({
    timeRange: Joi.string()
      .valid('1h', '6h', '24h', '7d', '30d')
      .default('24h'),
    
    resolution: Joi.string()
      .valid('city', 'region', 'country')
      .default('city'),
    
    emotion: Joi.string()
      .valid(...EMOTION_NAMES)
      .optional(),
    
    minIntensity: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .default(1),
    
    maxIntensity: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .default(5)
      .custom((value, helpers) => {
        const { minIntensity } = helpers.state.ancestors[0];
        if (minIntensity && value < minIntensity) {
          return helpers.error('any.invalid', { message: 'maxIntensity must be greater than or equal to minIntensity' });
        }
        return value;
      })
  }),

  getStats: Joi.object({
    timeRange: Joi.string()
      .valid('1h', '6h', '24h', '7d', '30d')
      .default('24h')
  })
};

export default heatmapValidator;