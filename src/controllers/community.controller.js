// src/controllers/community.controller.js
import User from '../models/user.model.js';
import Mood from '../models/mood.model.js';
import CommunityPost from '../models/community-post.model.js';
import logger from '../utils/logger.js';

class CommunityController {
  
  // Get global community feed
  async getGlobalFeed(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const currentUserId = req.user.id;
      
      // Get public mood posts with user details
      const posts = await Mood.aggregate([
        {
          $match: {
            privacy: 'public',
            isAnonymous: true,
            note: { $exists: true, $ne: '' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            emotion: 1,
            intensity: 1,
            note: 1,
            location: 1,
            reactions: 1,
            comments: 1,
            viewCount: 1,
            shareCount: 1,
            createdAt: 1,
            'user.username': 1,
            'user.selectedAvatar': 1,
            'user.location': 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
      ]);
      
      // Transform to match frontend structure
      const transformedPosts = posts.map(post => ({
        id: post._id,
        name: CommunityController.getDisplayName(post.user),
        username: `@${post.user.username}`,
        emoji: CommunityController.getEmojiForEmotion(post.emotion),
        location: CommunityController.formatLocation(post.user.location || post.location),
        message: post.note,
        timestamp: post.createdAt,
        likes: post.reactions?.length || 0,
        comments: post.comments?.length || 0,
        views: post.viewCount || 0,
        shares: post.shareCount || 0,
        isLiked: post.reactions?.some(r => r.userId.toString() === currentUserId) || false,
        avatar: post.user.selectedAvatar?.charAt(0).toUpperCase() || 'U',
        moodColor: CommunityController.getColorForEmotion(post.emotion),
        activityType: CommunityController.getActivityType(post.emotion)
      }));
      
      res.json({
        success: true,
        message: 'Global feed retrieved successfully',
        data: {
          posts: transformedPosts,
          total: transformedPosts.length,
          page: parseInt(page),
          hasMore: transformedPosts.length === limit
        }
      });
    } catch (error) {
      logger.error('Error getting global feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get global feed',
        error: error.message
      });
    }
  }
  
  // Get friends' mood feed
  async getFriendsFeed(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const currentUserId = req.user.id;
      
      // Get current user's friends
      const user = await User.findById(currentUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const friendIds = user.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId);
      
      // Get friends' mood posts
      const posts = await Mood.aggregate([
        {
          $match: {
            userId: { $in: friendIds },
            privacy: { $in: ['public', 'friends'] },
            note: { $exists: true, $ne: '' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
      ]);
      
      const transformedPosts = posts.map(post => ({
        id: post._id,
        name: CommunityController.getDisplayName(post.user),
        username: `@${post.user.username}`,
        emoji: CommunityController.getEmojiForEmotion(post.emotion),
        location: CommunityController.formatLocation(post.user.location || post.location),
        message: post.note,
        timestamp: post.createdAt,
        likes: post.reactions?.length || 0,
        comments: post.comments?.length || 0,
        views: post.viewCount || 0,
        shares: post.shareCount || 0,
        isLiked: post.reactions?.some(r => r.userId.toString() === currentUserId) || false,
        avatar: post.user.selectedAvatar?.charAt(0).toUpperCase() || 'U',
        moodColor: CommunityController.getColorForEmotion(post.emotion),
        activityType: CommunityController.getActivityType(post.emotion),
        isFriend: true
      }));
      
      res.json({
        success: true,
        message: 'Friends feed retrieved successfully',
        data: {
          posts: transformedPosts,
          total: transformedPosts.length,
          page: parseInt(page),
          hasMore: transformedPosts.length === limit
        }
      });
    } catch (error) {
      logger.error('Error getting friends feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get friends feed',
        error: error.message
      });
    }
  }
  
  // React to a mood post
  async reactToPost(req, res) {
    try {
      const { postId, emoji, type = 'comfort' } = req.body;
      const currentUserId = req.user.id;
      
      if (!postId || !emoji) {
        return res.status(400).json({
          success: false,
          message: 'Post ID and emoji are required'
        });
      }

      const mood = await Mood.findById(postId);
      if (!mood) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if user can view this post
      const user = await User.findById(currentUserId);
      const friendIds = user.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId.toString());

      if (!mood.canUserView(currentUserId, friendIds)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to react to this post'
        });
      }
      
      // Check if user already reacted
      const existingReaction = mood.reactions.find(
        r => r.userId.toString() === currentUserId
      );
      
      if (existingReaction) {
        // Update existing reaction
        existingReaction.emoji = emoji;
        existingReaction.type = type;
        existingReaction.createdAt = new Date();
      } else {
        // Add new reaction
        mood.reactions.push({
          userId: currentUserId,
          emoji,
          type,
          createdAt: new Date()
        });

        // Update user analytics
        await User.findByIdAndUpdate(currentUserId, {
          $inc: { 'analytics.totalComfortReactionsSent': 1 }
        });

        // Update post owner analytics
        await User.findByIdAndUpdate(mood.userId, {
          $inc: { 'analytics.totalComfortReactionsReceived': 1 }
        });
      }
      
      await mood.save();
      
      logger.info(`User ${currentUserId} reacted to post ${postId} with ${emoji}`);
      
      // TODO: Send push notification to post owner
      
      res.json({
        success: true,
        message: 'Reaction added successfully',
        data: {
          postId,
          reaction: {
            emoji,
            type,
            userId: currentUserId
          },
          totalReactions: mood.reactions.length
        }
      });
    } catch (error) {
      logger.error('Error reacting to post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to react to post',
        error: error.message
      });
    }
  }

  // Remove reaction from post
  async removeReaction(req, res) {
    try {
      const { postId } = req.body;
      const currentUserId = req.user.id;
      
      if (!postId) {
        return res.status(400).json({
          success: false,
          message: 'Post ID is required'
        });
      }

      const mood = await Mood.findById(postId);
      if (!mood) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Remove user's reaction
      const initialCount = mood.reactions.length;
      mood.reactions = mood.reactions.filter(
        r => r.userId.toString() !== currentUserId
      );

      if (mood.reactions.length < initialCount) {
        await mood.save();
        
        res.json({
          success: true,
          message: 'Reaction removed successfully',
          data: {
            postId,
            totalReactions: mood.reactions.length
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'No reaction found to remove'
        });
      }
    } catch (error) {
      logger.error('Error removing reaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove reaction',
        error: error.message
      });
    }
  }
  
  // Add comment to a mood post
  async addComment(req, res) {
    try {
      const { postId, message, isAnonymous = false } = req.body;
      const currentUserId = req.user.id;
      
      if (!postId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Post ID and message are required'
        });
      }

      if (message.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Comment message too long (max 200 characters)'
        });
      }

      const mood = await Mood.findById(postId);
      if (!mood) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if user can view this post
      const user = await User.findById(currentUserId);
      const friendIds = user.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId.toString());

      if (!mood.canUserView(currentUserId, friendIds)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to comment on this post'
        });
      }
      
      mood.comments.push({
        userId: currentUserId,
        message,
        isAnonymous,
        createdAt: new Date()
      });
      
      await mood.save();

      // Update user analytics
      await User.findByIdAndUpdate(currentUserId, {
        $inc: { 'analytics.totalCommentsGiven': 1 }
      });

      // Update post owner analytics
      await User.findByIdAndUpdate(mood.userId, {
        $inc: { 'analytics.totalCommentsReceived': 1 }
      });
      
      logger.info(`User ${currentUserId} commented on post ${postId}`);
      
      // TODO: Send push notification to post owner
      
      res.json({
        success: true,
        message: 'Comment added successfully',
        data: {
          postId,
          comment: {
            message,
            isAnonymous,
            userId: currentUserId,
            createdAt: new Date()
          },
          totalComments: mood.comments.length
        }
      });
    } catch (error) {
      logger.error('Error adding comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add comment',
        error: error.message
      });
    }
  }

  // Get comments for a post
  async getComments(req, res) {
    try {
      const { postId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const currentUserId = req.user.id;
      
      const mood = await Mood.findById(postId)
        .populate({
          path: 'comments.userId',
          select: 'username profile.displayName selectedAvatar'
        });

      if (!mood) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if user can view this post
      const user = await User.findById(currentUserId);
      const friendIds = user.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId.toString());

      if (!mood.canUserView(currentUserId, friendIds)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view comments on this post'
        });
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      
      const comments = mood.comments
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(startIndex, endIndex)
        .map(comment => ({
          id: comment._id,
          message: comment.message,
          isAnonymous: comment.isAnonymous,
          createdAt: comment.createdAt,
          user: comment.isAnonymous ? null : {
            id: comment.userId._id,
            username: comment.userId.username,
            displayName: comment.userId.profile?.displayName || comment.userId.username,
            selectedAvatar: comment.userId.selectedAvatar
          }
        }));

      res.json({
        success: true,
        message: 'Comments retrieved successfully',
        data: {
          comments,
          total: mood.comments.length,
          page: parseInt(page),
          hasMore: endIndex < mood.comments.length
        }
      });
    } catch (error) {
      logger.error('Error getting comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get comments',
        error: error.message
      });
    }
  }
  
  // Get global mood statistics
  async getGlobalStats(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      // Calculate time threshold
      let hoursBack = 24;
      switch (timeRange) {
        case '1h': hoursBack = 1; break;
        case '6h': hoursBack = 6; break;
        case '12h': hoursBack = 12; break;
        case '24h': hoursBack = 24; break;
        case '7d': hoursBack = 24 * 7; break;
        case '30d': hoursBack = 24 * 30; break;
        default: hoursBack = 24;
      }

      const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const stats = await Mood.aggregate([
        {
          $match: {
            privacy: 'public',
            createdAt: { $gte: timeThreshold }
          }
        },
        {
          $group: {
            _id: '$emotion',
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      const total = stats.reduce((acc, stat) => acc + stat.count, 0);
      
      const formattedStats = stats.map(stat => ({
        emotion: stat._id,
        count: stat.count,
        percentage: total > 0 ? Math.round((stat.count / total) * 100) : 0,
        avgIntensity: Math.round(stat.avgIntensity * 10) / 10,
        emoji: CommunityController.getEmojiForEmotion(stat._id),
        color: CommunityController.getColorForEmotion(stat._id)
      }));

      // Get location-based stats
      const locationStats = await Mood.aggregate([
        {
          $match: {
            privacy: 'public',
            createdAt: { $gte: timeThreshold },
            'location.country': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$location.country',
            count: { $sum: 1 },
            emotions: { $push: '$emotion' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        }
      ]);
      
      res.json({
        success: true,
        message: 'Global statistics retrieved successfully',
        data: {
          timeRange,
          totalMoods: total,
          emotionBreakdown: formattedStats,
          topCountries: locationStats,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      logger.error('Error getting global stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get global statistics',
        error: error.message
      });
    }
  }

  // Get trending posts
  async getTrendingPosts(req, res) {
    try {
      const { timeRange = 24, limit = 20 } = req.query;
      const currentUserId = req.user.id;
      
      const timeThreshold = new Date(Date.now() - timeRange * 60 * 60 * 1000);
      
      const trendingPosts = await Mood.aggregate([
        {
          $match: {
            privacy: 'public',
            createdAt: { $gte: timeThreshold },
            note: { $exists: true, $ne: '' }
          }
        },
        {
          $addFields: {
            reactionCount: { $size: '$reactions' },
            commentCount: { $size: '$comments' },
            engagementScore: {
              $add: [
                { $multiply: [{ $size: '$reactions' }, 2] },
                { $multiply: [{ $size: '$comments' }, 3] },
                { $ifNull: ['$shareCount', 0] },
                { $divide: [{ $ifNull: ['$viewCount', 0] }, 10] }
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $sort: {
            engagementScore: -1,
            createdAt: -1
          }
        },
        {
          $limit: parseInt(limit)
        }
      ]);

      const transformedPosts = trendingPosts.map(post => ({
        id: post._id,
        name: CommunityController.getDisplayName(post.user),
        username: `@${post.user.username}`,
        emoji: CommunityController.getEmojiForEmotion(post.emotion),
        location: CommunityController.formatLocation(post.user.location || post.location),
        message: post.note,
        timestamp: post.createdAt,
        likes: post.reactionCount,
        comments: post.commentCount,
        views: post.viewCount || 0,
        shares: post.shareCount || 0,
        engagementScore: Math.round(post.engagementScore),
        isLiked: post.reactions?.some(r => r.userId.toString() === currentUserId) || false,
        avatar: post.user.selectedAvatar?.charAt(0).toUpperCase() || 'U',
        moodColor: CommunityController.getColorForEmotion(post.emotion),
        activityType: CommunityController.getActivityType(post.emotion)
      }));

      res.json({
        success: true,
        message: 'Trending posts retrieved successfully',
        data: {
          posts: transformedPosts,
          timeRange: `${timeRange}h`,
          total: transformedPosts.length
        }
      });
    } catch (error) {
      logger.error('Error getting trending posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trending posts',
        error: error.message
      });
    }
  }
  
  // Helper methods (static)
  static getDisplayName(user) {
    return user.profile?.displayName || user.username;
  }
  
  static getEmojiForEmotion(emotion) {
    const emojiMap = {
      'happy': '😊',
      'excited': '🎉',
      'calm': '😌',
      'grateful': '🙏',
      'content': '😌',
      'energetic': '💪',
      'joyful': '😄',
      'cheerful': '😃',
      'delighted': '😆',
      'proud': '🥳',
      'sad': '😔',
      'anxious': '😰',
      'angry': '😠',
      'overwhelmed': '😵',
      'stressed': '😤',
      'worried': '😟',
      'frustrated': '😤',
      'scared': '😨',
      'lonely': '😞',
      'depressed': '😢'
    };
    return emojiMap[emotion.toLowerCase()] || '😊';
  }
  
  static getColorForEmotion(emotion) {
    const colorMap = {
      'happy': '#10B981',
      'excited': '#FFD700',
      'calm': '#8B5CF6',
      'grateful': '#10B981',
      'content': '#6366F1',
      'energetic': '#FF6B35',
      'joyful': '#10B981',
      'cheerful': '#F59E0B',
      'delighted': '#10B981',
      'proud': '#8B5CF6',
      'sad': '#6B7280',
      'anxious': '#F59E0B',
      'angry': '#EF4444',
      'overwhelmed': '#8B5CF6',
      'stressed': '#EF4444',
      'worried': '#F59E0B',
      'frustrated': '#EF4444',
      'scared': '#F59E0B',
      'lonely': '#6B7280',
      'depressed': '#6B7280'
    };
    return colorMap[emotion.toLowerCase()] || '#8B5CF6';
  }
  
  static getActivityType(emotion) {
    const activityMap = {
      'excited': 'Achievement',
      'calm': 'Mindfulness',
      'energetic': 'Exercise',
      'grateful': 'Gratitude',
      'happy': 'Social',
      'content': 'Relaxation',
      'joyful': 'Social',
      'proud': 'Achievement'
    };
    return activityMap[emotion.toLowerCase()] || 'General';
  }
  
  static formatLocation(location) {
    if (!location) return 'Unknown';
    if (location.city && location.country) {
      return `${location.city}, ${location.country}`;
    }
    if (location.country) return location.country;
    if (location.name) return location.name;
    return 'Unknown';
  }
}

export default new CommunityController(); 