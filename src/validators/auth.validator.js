import Joi from 'joi';

const authValidator = {
  login: Joi.object({
    username: Joi.string()
      .required()
      .trim()
      .lowercase(),
    password: Joi.string()
      .min(6)
      .allow('')
      .optional()
  }),

  quickAccess: Joi.object({
    username: Joi.string()
      .required()
      .trim()
      .lowercase()
  }),

  addPassword: Joi.object({
    password: Joi.string()
      .min(6)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      })
  })
};

export default authValidator;