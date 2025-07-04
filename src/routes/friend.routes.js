import express from 'express';
import friendController from '../controllers/friend.controller.js';
import { validateFriendRequest, validateCheckIn, validateFriendResponse } from '../validators/friend.validator.js';
import { rateLimit } from '../middlewares/rate-limit.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply authentication to all friend routes
router.use(authenticate);

// Rate limiting for friend requests and check-ins
const friendRequestLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 friend requests per 10 minutes
  message: 'Too many friend requests, please try again later'
});

const checkInLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 check-ins per 5 minutes
  message: 'Too many check-ins, please try again later'
});

// Send friend request
router.post('/request/:recipientId',
  friendRequestLimit,
  validateFriendRequest,
  friendController.sendFriendRequest
);

// Accept friend request
router.post('/accept/:requestId',
  validateFriendResponse,
  friendController.acceptFriendRequest
);

// Decline friend request
router.post('/decline/:requestId',
  validateFriendResponse,
  friendController.declineFriendRequest
);

// Get friends list
router.get('/',
  friendController.getFriends
);

// Get pending friend requests
router.get('/pending',
  friendController.getPendingRequests
);

// Send check-in to friend
router.post('/check-in/:friendId',
  checkInLimit,
  validateCheckIn,
  friendController.sendCheckIn
);

// Get friend's moods (if allowed)
router.get('/:friendId/moods',
  friendController.getFriendMoods
);

// Remove friend
router.delete('/:friendId',
  friendController.removeFriend
);

// Block user
router.post('/block/:userId',
  friendController.blockUser
);

// Get friendship statistics
router.get('/stats/overview',
  friendController.getFriendshipStats
);

export default router;