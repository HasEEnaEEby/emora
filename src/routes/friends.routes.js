// src/routes/friends.routes.js - ENHANCED FRIEND SYSTEM
import express from 'express';
import FriendController from '../controllers/friend.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();
const friendController = new FriendController();

// All friend routes require authentication
router.use(authMiddleware);

// ===================================================================
// FRIEND SUGGESTIONS & DISCOVERY
// ===================================================================

// Get smart friend suggestions based on location, emotions, and compatibility
router.get('/suggestions', friendController.getFriendSuggestions);

// Get nearby users (location-based suggestions)
router.get('/nearby', friendController.getNearbyUsers);

// Get users with similar emotional patterns
router.get('/similar-emotions', friendController.getUsersWithSimilarEmotions);

// Search users for friend suggestions
router.get('/search', friendController.searchUsers);

// ===================================================================
// FRIEND REQUESTS & MANAGEMENT
// ===================================================================

// Send friend request
router.post('/request', friendController.sendFriendRequest);

// Accept/Reject friend request
router.post('/respond', friendController.respondToFriendRequest);

// Cancel sent friend request
router.delete('/request/:userId', friendController.cancelFriendRequest);

// Get pending friend requests (sent and received)
router.get('/pending', friendController.getPendingRequests);

// ===================================================================
// FRIENDS LIST & INTERACTIONS
// ===================================================================

// Get friends list
router.get('/list', friendController.getFriends);

// Remove friend
router.delete('/:userId', friendController.removeFriend);

// Get friend's recent moods (if they allow sharing)
router.get('/:userId/moods', friendController.getFriendMoods);

// Send comfort reaction to friend's mood
router.post('/:userId/comfort', friendController.sendComfortReaction);

// ===================================================================
// FRIEND INSIGHTS & ANALYTICS
// ===================================================================

// Get mutual friends with another user
router.get('/:userId/mutual-friends', friendController.getMutualFriends);

// Get friendship insights and compatibility
router.get('/:userId/insights', friendController.getFriendshipInsights);

// Get friend activity feed
router.get('/activity-feed', friendController.getFriendActivityFeed);

export default router; 