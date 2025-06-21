import Joi from 'joi';

const onboardingValidator = {
  createUser: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .pattern(/^[a-zA-Z0-9_]+$/)
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
      })
  }),

  updatePronouns: Joi.object({
    pronouns: Joi.string()
      .valid('she/her', 'he/him', 'they/them', 'other')
      .required()
  }),

  updateAgeGroup: Joi.object({
    ageGroup: Joi.string()
      .valid('less_than_20', '20s', '30s', '40s', '50s_and_above')
      .required()
  }),

  updateAvatar: Joi.object({
    avatar: Joi.string()
      .valid(
        'ghost', 'dog', 'rabbit_ears', 'rabbit_standing', 'fox', 'wolf',
        'bear', 'pig', 'cat', 'default_smile', 'happy_face', 'love_eyes'
      )
      .required()
  }),

  updatePreferences: Joi.object({
    preferences: Joi.object({
      shareLocation: Joi.boolean(),
      anonymousMode: Joi.boolean(),
      notifications: Joi.object({
        dailyReminder: Joi.boolean(),
        time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        timezone: Joi.string()
      })
    }).required()
  })
};

export default onboardingValidator;