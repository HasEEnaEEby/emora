import Friend from '../models/friend.model.js';
import User from '../models/user.model.js';
import Emotion from '../models/emotion.model.js';
import logger from '../utils/logger.js';
import { createErrorResponse, createResponse } from '../utils/response.js';

class FriendController {
  // Send friend request
  sendFriendRequest = async (req, res) => {
    try {
      const { recipientId } = req.params;
      const { message } = req.body;
      const userId = req.user.userId || req.user.id;

      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json(createErrorResponse('User not found'));
      }

      // Check if already friends or request exists
      const existingFriendship = await Friend.findFriendship(userId, recipientId);
      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          return res.status(400).json(createErrorResponse('Already friends'));
        } else if (existingFriendship.status === 'pending') {
          return res.status(400).json(createErrorResponse('Friend request already sent'));
        } else if (existingFriendship.status === 'blocked') {
          return res.status(403).json(createErrorResponse('Cannot send request to blocked user'));
        }
      }

      // Check if recipient allows friend requests
      if (recipient.privacy?.allowFriendRequests === false) {
        return res.status(403).json(createErrorResponse('User does not accept friend requests'));
      }

      // Find mutual friends
      const mutualFriends = await Friend.getMutualFriends(userId, recipientId);

      const friendship = await Friend.create({
        requester: userId,
        recipient: recipientId,
        request: { message },
        metadata: {
          mutualFriends: mutualFriends.map(f => f._id),
          friendshipStrength: mutualFriends.length > 0 ? 75 : 25
        }
      });

      // Emit real-time notification
      if (req.io) {
        req.io.to(recipientId.toString()).emit('friend_request_received', {
          requestId: friendship._id,
          requester: {
            id: req.user._id,
            username: req.user.username,
            avatar: req.user.profile?.avatar
          },
          message
        });
      }

      res.status(201).json(createResponse(
        'Friend request sent successfully',
        {
          requestId: friendship._id,
          recipient: {
            id: recipient._id,
            username: recipient.username,
            avatar: recipient.profile?.avatar
          }
        }
      ));

    } catch (error) {
      logger.error('Error sending friend request:', error);
      res.status(500).json(createErrorResponse(
        'Failed to send friend request',
        error.message
      ));
    }
  };

  // Accept friend request
  acceptFriendRequest = async (req, res) => {
    try {
      const { requestId } = req.params;
      const { message } = req.body;
      const userId = req.user.userId || req.user.id;

      const friendship = await Friend.findById(requestId);
      if (!friendship) {
        return res.status(404).json(createErrorResponse('Friend request not found'));
      }

      if (friendship.recipient.toString() !== userId) {
        return res.status(403).json(createErrorResponse('Not authorized to accept this request'));
      }

      if (friendship.status !== 'pending') {
        return res.status(400).json(createErrorResponse('Request is not pending'));
      }

      await friendship.acceptRequest(message);

      // Emit real-time notification
      if (req.io) {
        req.io.to(friendship.requester.toString()).emit('friend_request_accepted', {
          requestId: friendship._id,
          recipient: {
            id: req.user._id,
            username: req.user.username,
            avatar: req.user.profile?.avatar
          },
          message
        });
      }

      res.json(createResponse(
        'Friend request accepted successfully',
        {
          friendship: {
            id: friendship._id,
            status: friendship.status,
            requester: friendship.requester,
            recipient: friendship.recipient
          }
        }
      ));

    } catch (error) {
      logger.error('Error accepting friend request:', error);
      res.status(500).json(createErrorResponse(
        'Failed to accept friend request',
        error.message
      ));
    }
  };

  // Decline friend request
  declineFriendRequest = async (req, res) => {
    try {
      const { requestId } = req.params;
      const { message } = req.body;
      const userId = req.user.userId || req.user.id;

      const friendship = await Friend.findById(requestId);
      if (!friendship) {
        return res.status(404).json(createErrorResponse('Friend request not found'));
      }

      if (friendship.recipient.toString() !== userId) {
        return res.status(403).json(createErrorResponse('Not authorized to decline this request'));
      }

      if (friendship.status !== 'pending') {
        return res.status(400).json(createErrorResponse('Request is not pending'));
      }

      await friendship.declineRequest(message);

      // Emit real-time notification
      if (req.io) {
        req.io.to(friendship.requester.toString()).emit('friend_request_declined', {
          requestId: friendship._id,
          recipient: {
            id: req.user._id,
            username: req.user.username
          },
          message
        });
      }

      res.json(createResponse('Friend request declined successfully'));

    } catch (error) {
      logger.error('Error declining friend request:', error);
      res.status(500).json(createErrorResponse(
        'Failed to decline friend request',
        error.message
      ));
    }
  };

  // Get friends list
  getFriends = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { status = 'accepted' } = req.query;

      const friends = await Friend.getFriends(userId, status);

      const friendsList = friends.map(friendship => {
        const friend = friendship.requester._id.toString() === userId 
          ? friendship.recipient 
          : friendship.requester;
        
        return {
          id: friendship._id,
          friend: {
            id: friend._id,
            username: friend.username,
            avatar: friend.profile?.avatar,
            displayName: friend.profile?.displayName
          },
          status: friendship.status,
          privacy: friendship.privacy,
          activity: friendship.activity,
          metadata: friendship.metadata,
          createdAt: friendship.createdAt
        };
      });

      res.json(createResponse(
        'Friends list retrieved successfully',
        { friends: friendsList }
      ));

    } catch (error) {
      logger.error('Error getting friends:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get friends list',
        error.message
      ));
    }
  };

  // Get pending friend requests
  getPendingRequests = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;

      const pendingRequests = await Friend.getPendingRequests(userId);

      const requests = pendingRequests.map(friendship => ({
        id: friendship._id,
        requester: {
          id: friendship.requester._id,
          username: friendship.requester.username,
          avatar: friendship.requester.profile?.avatar,
          displayName: friendship.requester.profile?.displayName
        },
        request: friendship.request,
        metadata: friendship.metadata,
        createdAt: friendship.createdAt
      }));

      res.json(createResponse(
        'Pending requests retrieved successfully',
        { requests }
      ));

    } catch (error) {
      logger.error('Error getting pending requests:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get pending requests',
        error.message
      ));
    }
  };

  // Send check-in to friend
  sendCheckIn = async (req, res) => {
    try {
      const { friendId } = req.params;
      const { message, emotion } = req.body;
      const userId = req.user.userId || req.user.id;

      const friendship = await Friend.findFriendship(userId, friendId);
      if (!friendship || friendship.status !== 'accepted') {
        return res.status(404).json(createErrorResponse('Friendship not found'));
      }

      if (!friendship.privacy.allowCheckIns) {
        return res.status(403).json(createErrorResponse('Friend does not allow check-ins'));
      }

      await friendship.sendCheckIn();

      // Emit real-time notification
      if (req.io) {
        req.io.to(friendId).emit('friend_check_in', {
          from: {
            id: req.user._id,
            username: req.user.username,
            avatar: req.user.profile?.avatar
          },
          message,
          emotion,
          timestamp: new Date()
        });
      }

      res.json(createResponse(
        'Check-in sent successfully',
        {
          checkIn: {
            to: friendId,
            message,
            emotion,
            timestamp: new Date()
          }
        }
      ));

    } catch (error) {
      logger.error('Error sending check-in:', error);
      res.status(500).json(createErrorResponse(
        'Failed to send check-in',
        error.message
      ));
    }
  };

  // Get friend's moods (if allowed)
  getFriendMoods = async (req, res) => {
    try {
      const { friendId } = req.params;
      const { days = 7 } = req.query;
      const userId = req.user.userId || req.user.id;

      const friendship = await Friend.findFriendship(userId, friendId);
      if (!friendship || friendship.status !== 'accepted') {
        return res.status(404).json(createErrorResponse('Friendship not found'));
      }

      if (!friendship.privacy.allowMoodSharing) {
        return res.status(403).json(createErrorResponse('Friend does not share moods'));
      }

      // Get friend's recent moods
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const moods = await Emotion.find({
        userId: friendId,
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 }).limit(50);

      res.json(createResponse(
        'Friend moods retrieved successfully',
        {
          friendId,
          moods: moods.map(mood => ({
            id: mood._id,
            emotion: mood.emotion,
            intensity: mood.intensity,
            note: mood.note,
            createdAt: mood.createdAt
          }))
        }
      ));

    } catch (error) {
      logger.error('Error getting friend moods:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get friend moods',
        error.message
      ));
    }
  };

  // Remove friend
  removeFriend = async (req, res) => {
    try {
      const { friendId } = req.params;
      const userId = req.user.userId || req.user.id;

      const friendship = await Friend.findFriendship(userId, friendId);
      if (!friendship) {
        return res.status(404).json(createErrorResponse('Friendship not found'));
      }

      await Friend.findByIdAndDelete(friendship._id);

      // Emit real-time notification
      if (req.io) {
        req.io.to(friendId).emit('friend_removed', {
          removedBy: {
            id: req.user._id,
            username: req.user.username
          }
        });
      }

      res.json(createResponse('Friend removed successfully'));

    } catch (error) {
      logger.error('Error removing friend:', error);
      res.status(500).json(createErrorResponse(
        'Failed to remove friend',
        error.message
      ));
    }
  };

  // Block user
  blockUser = async (req, res) => {
    try {
      const { userId: targetUserId } = req.params;
      const userId = req.user.userId || req.user.id;

      let friendship = await Friend.findFriendship(userId, targetUserId);
      
      if (friendship) {
        await friendship.blockUser();
      } else {
        // Create blocked friendship
        friendship = await Friend.create({
          requester: userId,
          recipient: targetUserId,
          status: 'blocked'
        });
      }

      res.json(createResponse('User blocked successfully'));

    } catch (error) {
      logger.error('Error blocking user:', error);
      res.status(500).json(createErrorResponse(
        'Failed to block user',
        error.message
      ));
    }
  };

  // Get friendship statistics
  getFriendshipStats = async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;

      const stats = await Friend.aggregate([
        {
          $match: {
            $or: [
              { requester: userId },
              { recipient: userId }
            ]
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const statsMap = stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      res.json(createResponse(
        'Friendship statistics retrieved successfully',
        {
          total: Object.values(statsMap).reduce((a, b) => a + b, 0),
          accepted: statsMap.accepted || 0,
          pending: statsMap.pending || 0,
          declined: statsMap.declined || 0,
          blocked: statsMap.blocked || 0
        }
      ));

    } catch (error) {
      logger.error('Error getting friendship stats:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get friendship statistics',
        error.message
      ));
    }
  };
}

export default new FriendController();