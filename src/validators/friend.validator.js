import Joi from 'joi';

// Friend request validation
export const validateFriendRequest = Joi.object({
  message: Joi.string().max(200).optional()
});

// Friend response validation
export const validateFriendResponse = Joi.object({
  requestUserId: Joi.string().required(),
  action: Joi.string().valid('accept', 'reject').required(),
  message: Joi.string().max(200).optional()
});

// Check-in validation
export const validateCheckIn = Joi.object({
  message: Joi.string().max(500).optional(),
  emotion: Joi.string().valid(
    'joy', 'sadness', 'anger', 'fear', 'disgust', 'confused', 'surprised', 
    'grateful', 'proud', 'embarrassed', 'guilty', 'ashamed', 'jealous', 
    'envious', 'lonely', 'bored', 'tired', 'energetic', 'calm', 'peaceful', 
    'relaxed', 'motivated', 'inspired', 'confident', 'insecure', 'vulnerable', 'nostalgic'
  ).optional()
});

// Friend query validation
export const validateFriendQuery = Joi.object({
  status: Joi.string().valid('accepted', 'pending', 'declined', 'blocked').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

// Friend moods query validation
export const validateFriendMoodsQuery = Joi.object({
  days: Joi.number().integer().min(1).max(365).optional()
});

// Block user validation
export const validateBlockUser = Joi.object({});

// Remove friend validation
export const validateRemoveFriend = Joi.object({});
