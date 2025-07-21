import express from 'express';
import friendController from '../controllers/friend.controller.js';
import { validateFriendRequest, validateCheckIn, validateFriendResponse } from '../validators/friend.validator.js';
import { rateLimit } from '../middleware/rate-limit.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';

const router = express.Router();

// Apply authentication to all friend routes
router.use(authenticate);

// Rate limiting for friend requests
const friendRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: 'Too many friend requests. Please try again in 15 minutes.',
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many friend requests. Please try again in 15 minutes.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

const checkInLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: 'Too many check-ins, please try again later'
});

// Friend request routes
router.post('/request/:recipientId', friendRequestLimit, validateRequest(validateFriendRequest), friendController.sendFriendRequest);
router.delete('/request/:userId', friendController.cancelFriendRequest);
router.post('/respond', validateRequest(validateFriendResponse), friendController.respondToFriendRequest);

// Friend list and suggestions
router.get('/list', friendController.getFriends); // Main friends list
router.get('/suggestions', friendController.getFriendSuggestions);

// Search routes
router.get('/search', friendController.searchUsers); // Friend suggestions search (excludes friends/self)
router.get('/search-all', friendController.searchAllUsers); // Global user search (excludes only self)

// Pending/requests
router.get('/pending', friendController.getPendingRequests);

// Remove friend
router.delete('/:friendId', friendController.removeFriend);

// Check-in
router.post('/check-in/:friendId', checkInLimit, validateRequest(validateCheckIn), friendController.sendCheckIn);

// Friend mood/activity/insights
router.get('/:friendId/moods', friendController.getFriendMoods);
router.get('/:friendId/insights', friendController.getFriendMoodInsights);
router.get('/activity/feed', friendController.getFriendMoodActivityFeed);
router.post('/moods/:moodId/reactions', friendController.sendMoodReaction);

// Block user
router.post('/block/:userId', friendController.blockUser);

// Friendship stats
router.get('/stats/overview', friendController.getFriendshipStats);

export default router;