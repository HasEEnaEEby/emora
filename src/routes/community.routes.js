// src/routes/community.routes.js
import express from 'express';
import communityController from '../controllers/community.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All community routes require authentication
router.use(authMiddleware);

// Create a new community post
router.post('/', communityController.createCommunityPost);

// Get global community feed
router.get('/global-feed', communityController.getGlobalFeed);

// Get friends' mood feed
router.get('/friends-feed', communityController.getFriendsFeed);

// React to a mood post
router.post('/react', communityController.reactToPost);

// Remove reaction from post
router.delete('/react', communityController.removeReaction);

// Add comment to a mood post
router.post('/comment', communityController.addComment);

// Get comments for a post
router.get('/comments/:postId', communityController.getComments);

// Get global mood statistics
router.get('/stats', communityController.getGlobalStats);
router.get('/global-stats', communityController.getGlobalStats); 

// Get trending posts
router.get('/trending', communityController.getTrendingPosts);

export default router; 