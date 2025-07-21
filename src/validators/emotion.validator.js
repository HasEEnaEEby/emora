import Joi from 'joi';

// Define available emotion types (you can expand this based on your constants)
const EMOTION_TYPES = [
  'joy', 'sadness', 'anger', 'fear', 'disgust', 'surprise',
  'love', 'excitement', 'anxiety', 'loneliness', 'gratitude',
  'stress', 'calm', 'frustrated', 'hopeful', 'overwhelmed', 
  'content', 'confused', 'proud', 'disappointed', 'relieved',
  'nervous', 'confident', 'guilty', 'nostalgic', 'inspired'
];

const CORE_EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'disgust'];

const WEATHER_TYPES = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'];
const TIME_OF_DAY = ['morning', 'afternoon', 'evening', 'night'];
const SOCIAL_CONTEXTS = ['alone', 'with_friends', 'with_family', 'with_partner', 'with_colleagues', 'in_public'];
const ACTIVITIES = ['working', 'studying', 'exercising', 'relaxing', 'socializing', 'commuting', 'sleeping', 'eating', 'venting', 'other'];
const PRIVACY_LEVELS = ['private', 'friends', 'public'];
const REACTION_TYPES = ['hug', 'support', 'rainbow', 'heart', 'strength', 'listening'];

// Main emotion logging schema
export const emotionLogSchema = Joi.object({
  emotion: Joi.string()
    .required()
    .valid(...EMOTION_TYPES)
    .messages({
      'any.required': 'Emotion type is required',
      'any.only': `Emotion must be one of: ${EMOTION_TYPES.join(', ')}`
    }),

  coreEmotion: Joi.string()
    .valid(...CORE_EMOTIONS)
    .messages({
      'any.only': `Core emotion must be one of: ${CORE_EMOTIONS.join(', ')}`
    }),

  intensity: Joi.number()
    .min(0.0)
    .max(1.0)
    .messages({
      'number.min': 'Intensity must be between 0.0 and 1.0',
      'number.max': 'Intensity must be between 0.0 and 1.0'
    }),

  legacyIntensity: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .messages({
      'number.min': 'Legacy intensity must be between 1 and 5',
      'number.max': 'Legacy intensity must be between 1 and 5'
    }),

  secondaryEmotions: Joi.array().items(
    Joi.object({
      emotion: Joi.string().valid(...EMOTION_TYPES),
      coreEmotion: Joi.string().valid(...CORE_EMOTIONS),
      intensity: Joi.number().min(0.0).max(1.0)
    })
  ).max(3).messages({
    'array.max': 'Maximum 3 secondary emotions allowed'
  }),

  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array()
      .items(Joi.number())
      .length(2)
      .custom((value, helpers) => {
        const [lng, lat] = value;
        if (lng < -180 || lng > 180) {
          return helpers.error('custom.longitude');
        }
        if (lat < -90 || lat > 90) {
          return helpers.error('custom.latitude');
        }
        return value;
      })
      .messages({
        'array.length': 'Coordinates must contain exactly 2 numbers [longitude, latitude]',
        'custom.longitude': 'Longitude must be between -180 and 180',
        'custom.latitude': 'Latitude must be between -90 and 90'
      }),
    city: Joi.string().trim().max(100),
    region: Joi.string().trim().max(100),
    country: Joi.string().trim().max(100),
    continent: Joi.string().trim().max(50),
    timezone: Joi.string().trim().max(50)
  }),

  context: Joi.object({
    weather: Joi.string().valid(...WEATHER_TYPES),
    temperature: Joi.number().min(-50).max(60).messages({
      'number.min': 'Temperature must be between -50°C and 60°C',
      'number.max': 'Temperature must be between -50°C and 60°C'
    }),
    timeOfDay: Joi.string().valid(...TIME_OF_DAY),
    dayOfWeek: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    isWeekend: Joi.boolean(),
    socialContext: Joi.string().valid(...SOCIAL_CONTEXTS),
    activity: Joi.string().valid(...ACTIVITIES),
    trigger: Joi.string().max(500).trim().messages({
      'string.max': 'Trigger description cannot exceed 500 characters'
    })
  }),

  memory: Joi.object({
    description: Joi.string().max(1000).trim().messages({
      'string.max': 'Memory description cannot exceed 1000 characters'
    }),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).messages({
      'array.max': 'Maximum 10 tags allowed'
    }),
    isPrivate: Joi.boolean().default(true),
    photos: Joi.array().items(
      Joi.string().uri().messages({
        'string.uri': 'Photo must be a valid URL'
      })
    ).max(5).messages({
      'array.max': 'Maximum 5 photos allowed'
    }),
    associatedSongs: Joi.array().items(
      Joi.object({
        title: Joi.string().max(200),
        artist: Joi.string().max(200),
      })
    ).max(3).messages({
      'array.max': 'Maximum 3 associated songs allowed'
    })
  }),

  privacyLevel: Joi.string()
    .valid(...PRIVACY_LEVELS)
    .default('private')
    .messages({
      'any.only': `Privacy level must be one of: ${PRIVACY_LEVELS.join(', ')}`
    }),

  note: Joi.string()
    .max(500)
    .trim()
    .allow('')
    .messages({
      'string.max': 'Note cannot exceed 500 characters'
    }),

  timezone: Joi.string()
    .default('UTC')
    .messages({
      'string.base': 'Timezone must be a string'
    }),

  source: Joi.string()
    .valid('mobile', 'web', 'api')
    .default('api'),

  isAnonymous: Joi.boolean().default(true),

  accuracy: Joi.number().min(0.0).max(1.0).default(1.0)

}).or('intensity', 'legacyIntensity').messages({
  'object.missing': 'Either intensity (0.0-1.0) or legacyIntensity (1-5) is required'
});

// Comfort reaction schema
export const comfortReactionSchema = Joi.object({
  reactionType: Joi.string()
    .required()
    .valid(...REACTION_TYPES)
    .messages({
      'any.required': 'Reaction type is required',
      'any.only': `Reaction type must be one of: ${REACTION_TYPES.join(', ')}`
    }),

  message: Joi.string()
    .max(100)
    .trim()
    .allow('')
    .messages({
      'string.max': 'Reaction message cannot exceed 100 characters'
    })
});

// Emotion update schema (for PUT requests)
export const emotionUpdateSchema = Joi.object({
  emotion: Joi.string().valid(...EMOTION_TYPES),
  intensity: Joi.number().min(0.0).max(1.0),
  legacyIntensity: Joi.number().integer().min(1).max(5),
  privacyLevel: Joi.string().valid(...PRIVACY_LEVELS),
  note: Joi.string().max(500).trim().allow(''),
  context: Joi.object({
    weather: Joi.string().valid(...WEATHER_TYPES),
    temperature: Joi.number().min(-50).max(60),
    timeOfDay: Joi.string().valid(...TIME_OF_DAY),
    socialContext: Joi.string().valid(...SOCIAL_CONTEXTS),
    activity: Joi.string().valid(...ACTIVITIES),
    trigger: Joi.string().max(500).trim()
  }),
  memory: Joi.object({
    description: Joi.string().max(1000).trim(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
    isPrivate: Joi.boolean()
  })
});

// Search emotions schema
export const emotionSearchSchema = Joi.object({
  q: Joi.string().min(2).max(100).trim().messages({
    'string.min': 'Search query must be at least 2 characters',
    'string.max': 'Search query cannot exceed 100 characters'
  }),
  emotion: Joi.string().valid(...EMOTION_TYPES),
  coreEmotion: Joi.string().valid(...CORE_EMOTIONS),
  minIntensity: Joi.number().min(0.0).max(1.0),
  maxIntensity: Joi.number().min(0.0).max(1.0),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
    'date.min': 'End date must be after start date'
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Timeline query schema
export const emotionTimelineSchema = Joi.object({
  timeframe: Joi.string().valid('24h', '7d', '30d', '90d', '1y').default('7d'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

// Global heatmap schema
export const globalHeatmapSchema = Joi.object({
  bounds: Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed.northeast || !parsed.southwest) {
        return helpers.error('custom.bounds');
      }
      return parsed;
    } catch (e) {
      return helpers.error('custom.bounds');
    }
  }).messages({
    'custom.bounds': 'Bounds must be valid JSON with northeast and southwest properties'
  }),
  timeframe: Joi.string().valid('1h', '24h', '7d', '30d').default('7d'),
  emotion: Joi.string().valid(...EMOTION_TYPES),
  coreEmotion: Joi.string().valid(...CORE_EMOTIONS),
  minIntensity: Joi.number().min(0.0).max(1.0),
  maxIntensity: Joi.number().min(0.0).max(1.0)
});

// Feed query schema
export const emotionFeedSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  friendsOnly: Joi.boolean().default(false),
  coreEmotion: Joi.string().valid(...CORE_EMOTIONS),
  minIntensity: Joi.number().min(0.0).max(1.0)
});

// User stats schema
export const userStatsSchema = Joi.object({
  timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('7d')
});

// ===== ANALYTICS VALIDATION SCHEMAS =====
// Pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Timeframe schema
export const timeframeSchema = Joi.object({
  timeframe: Joi.string().valid('1h', '24h', '7d', '30d', '90d', '1y').default('7d')
});

// Analytics query schema
export const analyticsQuerySchema = Joi.object({
  timeframe: Joi.string().valid('1h', '24h', '7d', '30d', '90d', '1y').default('7d'),
  groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  emotion: Joi.string().valid(...EMOTION_TYPES),
  coreEmotion: Joi.string().valid(...CORE_EMOTIONS),
  minIntensity: Joi.number().min(0.0).max(1.0),
  maxIntensity: Joi.number().min(0.0).max(1.0),
  includeLocation: Joi.boolean().default(false),
  includeWeather: Joi.boolean().default(false)
});

// Trends query schema
export const trendsQuerySchema = Joi.object({
  timeframe: Joi.string().valid('24h', '7d', '30d', '90d').default('7d'),
  category: Joi.string().valid('emotions', 'locations', 'demographics', 'activities').default('emotions'),
  limit: Joi.number().integer().min(1).max(50).default(10),
  page: Joi.number().integer().min(1).default(1)
});

// Heatmap data schema
export const heatmapDataSchema = Joi.object({
  bounds: Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed.northeast || !parsed.southwest) {
        return helpers.error('custom.bounds');
      }
      return parsed;
    } catch (e) {
      return helpers.error('custom.bounds');
    }
  }).messages({
    'custom.bounds': 'Bounds must be valid JSON with northeast and southwest properties'
  }),
  timeframe: Joi.string().valid('1h', '24h', '7d', '30d').default('7d'),
  zoom: Joi.number().integer().min(1).max(20).default(10)
});

// Patterns query schema
export const patternsQuerySchema = Joi.object({
  timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
  type: Joi.string().valid('temporal', 'emotional', 'behavioral', 'contextual').default('temporal'),
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
});

// Correlations query schema
export const correlationsQuerySchema = Joi.object({
  timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
  factors: Joi.array().items(
    Joi.string().valid('weather', 'time', 'location', 'activity', 'social')
  ).default(['weather', 'time']),
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
});

// Custom query schema
export const customQuerySchema = Joi.object({
  query: Joi.string().required().max(1000),
  parameters: Joi.object().default({}),
  timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('30d')
});

// Export schema schema
export const exportAnalyticsSchema = Joi.object({
  timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
  format: Joi.string().valid('json', 'csv', 'xlsx').default('json'),
  type: Joi.string().valid('overview', 'emotions', 'patterns', 'correlations').default('overview'),
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
});

// Compare analytics schema
export const compareAnalyticsSchema = Joi.object({
  period1: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required()
  }).required(),
  period2: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required()
  }).required(),
  metric: Joi.string().valid('emotions', 'intensity', 'patterns', 'trends').default('emotions'),
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
});

// Demographics query schema
export const demographicsQuerySchema = Joi.object({
  timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
  demographic: Joi.string().valid('age', 'location', 'gender', 'all').default('all'),
  anonymized: Joi.boolean().default(true)
});

// ===== MIDDLEWARE VALIDATION FUNCTIONS =====
// These are the functions your analytics routes are trying to import

export const validatePagination = (req, res, next) => {
  const { error, value } = paginationSchema.validate(req.query, {
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid pagination parameters',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  req.query = { ...req.query, ...value };
  next();
};

export const validateTimeframe = (req, res, next) => {
  const { error, value } = timeframeSchema.validate(req.query, {
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid timeframe parameter',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  req.query = { ...req.query, ...value };
  next();
};

export const validateAnalyticsQuery = (req, res, next) => {
  const { error, value } = analyticsQuerySchema.validate(req.query, {
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid analytics query parameters',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  req.query = { ...req.query, ...value };
  next();
};

// Default export for backwards compatibility
export default {
  emotionLogSchema,
  comfortReactionSchema,
  emotionUpdateSchema,
  emotionSearchSchema,
  emotionTimelineSchema,
  globalHeatmapSchema,
  emotionFeedSchema,
  userStatsSchema,
  paginationSchema,
  timeframeSchema,
  analyticsQuerySchema,
  trendsQuerySchema,
  heatmapDataSchema,
  patternsQuerySchema,
  correlationsQuerySchema,
  customQuerySchema,
  exportAnalyticsSchema,
  compareAnalyticsSchema,
  demographicsQuerySchema,
  validatePagination,
  validateTimeframe,
  validateAnalyticsQuery
};