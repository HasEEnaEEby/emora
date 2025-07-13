import express from 'express';
import friendController from '../controllers/friend.controller.js';
import { validateFriendRequest, validateCheckIn, validateFriendResponse } from '../validators/friend.validator.js';
import { rateLimit } from '../middleware/rate-limit.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';

const router = express.Router();

// Apply authentication to all friend routes
router.use(authenticate);

// ❌ REMOVED: Timeout middleware that was causing 408 timeouts
// router.use(timeoutMiddleware(15000));

// More reasonable rate limiting
const friendRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per 15 minutes
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
  max: 10, // 10 check-ins per 5 minutes
  message: 'Too many check-ins, please try again later'
});

// Core routes with proper rate limiting and validation
router.post('/request/:recipientId', friendRequestLimit, validateRequest(validateFriendRequest), friendController.sendFriendRequest);
router.post('/respond', validateRequest(validateFriendResponse), friendController.respondToFriendRequest);
router.get('/requests', friendController.getPendingRequests);
router.get('/pending', friendController.getPendingRequests);
router.get('/', friendController.getFriends);
router.get('/list', friendController.getFriends); // Alias for Flutter compatibility
router.get('/suggestions', friendController.getFriendSuggestions);
router.get('/search', friendController.searchUsers);
router.delete('/request/:userId', friendController.cancelFriendRequest);
router.delete('/:friendId', friendController.removeFriend);

// Additional routes
router.post('/check-in/:friendId', checkInLimit, validateRequest(validateCheckIn), friendController.sendCheckIn);
router.get('/:friendId/moods', friendController.getFriendMoods);
router.post('/block/:userId', friendController.blockUser);
router.get('/stats/overview', friendController.getFriendshipStats);

export default router;