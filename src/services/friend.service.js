import Friend from '../models/friend.model.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';

class FriendService {
  async sendFriendRequest(requesterId, recipientId, message = '') {
    try {
      // Check if users exist
      const [requester, recipient] = await Promise.all([
        User.findById(requesterId),
        User.findById(recipientId)
      ]);

      if (!requester || !recipient) {
        throw new Error('User not found');
      }

      if (requesterId === recipientId) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check for existing friendship
      const existingFriend = await Friend.findOne({
        $or: [
          { requester: requesterId, recipient: recipientId },
          { requester: recipientId, recipient: requesterId }
        ]
      });

      if (existingFriend) {
        if (existingFriend.status === 'accepted') {
          throw new Error('Already friends');
        }
        if (existingFriend.status === 'pending') {
          throw new Error('Friend request already sent');
        }
        if (existingFriend.status === 'blocked') {
          throw new Error('Cannot send friend request');
        }
      }

      // Create friend request
      const friendRequest = new Friend({
        requester: requesterId,
        recipient: recipientId,
        requestMessage: message,
        status: 'pending'
      });

      await friendRequest.save();
      await friendRequest.populate('requester', 'username selectedAvatar');

      return friendRequest;
    } catch (error) {
      logger.error('Error sending friend request:', error);
      throw error;
    }
  }

  async getFriendRequests(userId, type = 'received') {
    try {
      let query = {};
      let populateField = '';

      if (type === 'received') {
        query = { recipient: userId, status: 'pending' };
        populateField = 'requester';
      } else if (type === 'sent') {
        query = { requester: userId, status: 'pending' };
        populateField = 'recipient';
      }

      const requests = await Friend.find(query)
        .populate(populateField, 'username selectedAvatar pronouns')
        .sort({ createdAt: -1 });

      return requests;
    } catch (error) {
      logger.error('Error getting friend requests:', error);
      throw error;
    }
  }

  async respondToFriendRequest(requestId, userId, action) {
    try {
      const friendRequest = await Friend.findOne({
        _id: requestId,
        recipient: userId,
        status: 'pending'
      });

      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      if (action === 'accept') {
        friendRequest.status = 'accepted';
        friendRequest.acceptedAt = new Date();

        // Update friend counts
        await Promise.all([
          User.findByIdAndUpdate(friendRequest.requester, {
            $inc: { 'analytics.totalFriends': 1 }
          }),
          User.findByIdAndUpdate(friendRequest.recipient, {
            $inc: { 'analytics.totalFriends': 1 }
          })
        ]);
      } else if (action === 'decline') {
        friendRequest.status = 'declined';
      } else {
        throw new Error('Invalid action');
      }

      await friendRequest.save();
      await friendRequest.populate('requester', 'username selectedAvatar');

      return friendRequest;
    } catch (error) {
      logger.error('Error responding to friend request:', error);
      throw error;
    }
  }

  async getFriends(userId) {
    try {
      const friends = await Friend.find({
        $or: [
          { requester: userId, status: 'accepted' },
          { recipient: userId, status: 'accepted' }
        ]
      })
      .populate('requester recipient', 'username selectedAvatar pronouns preferences.moodPrivacy isOnline analytics.lastActiveAt')
      .sort({ acceptedAt: -1 });

      // Format friends list
      const friendsList = friends.map(friendship => {
        const friend = friendship.requester._id.toString() === userId 
          ? friendship.recipient 
          : friendship.requester;
        
        return {
          _id: friend._id,
          username: friend.username,
          selectedAvatar: friend.selectedAvatar,
          pronouns: friend.pronouns,
          isOnline: friend.isOnline || false,
          lastActive: friend.analytics?.lastActiveAt,
          moodPrivacy: friend.preferences?.moodPrivacy || 'private',
          friendshipId: friendship._id,
          friendsSince: friendship.acceptedAt
        };
      });

      return friendsList;
    } catch (error) {
      logger.error('Error getting friends:', error);
      throw error;
    }
  }

  async removeFriend(userId, friendId) {
    try {
      const friendship = await Friend.findOneAndDelete({
        $or: [
          { requester: userId, recipient: friendId, status: 'accepted' },
          { requester: friendId, recipient: userId, status: 'accepted' }
        ]
      });

      if (!friendship) {
        throw new Error('Friendship not found');
      }

      // Update friend counts
      await Promise.all([
        User.findByIdAndUpdate(userId, {
          $inc: { 'analytics.totalFriends': -1 }
        }),
        User.findByIdAndUpdate(friendId, {
          $inc: { 'analytics.totalFriends': -1 }
        })
      ]);

      return { message: 'Friend removed successfully' };
    } catch (error) {
      logger.error('Error removing friend:', error);
      throw error;
    }
  }

  async searchUsers(query, userId, page = 1, limit = 10) {
    try {
      if (!query || query.length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      const skip = (page - 1) * limit;

      // Search users by username
      const users = await User.find({
        _id: { $ne: userId },
        username: { $regex: query, $options: 'i' },
        isActive: true
      })
      .select('username selectedAvatar pronouns ageGroup')
      .skip(skip)
      .limit(parseInt(limit));

      // Check friendship status for each user
      const usersWithStatus = await Promise.all(
        users.map(async (user) => {
          const friendship = await Friend.findOne({
            $or: [
              { requester: userId, recipient: user._id },
              { requester: user._id, recipient: userId }
            ]
          });

          let status = 'none';
          if (friendship) {
            if (friendship.status === 'accepted') status = 'friends';
            else if (friendship.status === 'pending') {
              status = friendship.requester.toString() === userId ? 'sent' : 'received';
            }
            else if (friendship.status === 'blocked') status = 'blocked';
          }

          return {
            ...user.toObject(),
            friendshipStatus: status
          };
        })
      );

      return usersWithStatus;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }
}

export default new FriendService();
