import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import Mood from '../models/mood.model.js';
import CommunityPost from '../models/community-post.model.js';

class FriendController {
  
  // Search users for friend suggestions
  async searchUsers(req, res) {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      const currentUserId = req.user.id;
      
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const users = await User.find({
        $and: [
          { _id: { $ne: currentUserId } },
          {
            $or: [
              { username: { $regex: query, $options: 'i' } },
              { 'profile.displayName': { $regex: query, $options: 'i' } }
            ]
          },
          { 'privacySettings.profileVisibility': { $in: ['public', 'friends'] } },
          { isActive: true }
        ]
      })
      .select('username profile.displayName selectedAvatar location friends friendRequests')
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
      // Get current user to filter out existing friends and pending requests
      const currentUser = await User.findById(currentUserId);
      const friendIds = currentUser.friends.map(f => f.userId.toString());
      const sentRequestIds = currentUser.friendRequests.sent.map(r => r.userId.toString());
      const receivedRequestIds = currentUser.friendRequests.received.map(r => r.userId.toString());
      
      const suggestions = users.filter(user => {
        const userId = user._id.toString();
        return !friendIds.includes(userId) && 
               !sentRequestIds.includes(userId) && 
               !receivedRequestIds.includes(userId);
      }).map(user => ({
        id: user._id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        selectedAvatar: user.selectedAvatar,
        location: user.location,
        mutualFriends: 0 // TODO: Calculate mutual friends
      }));
      
      res.json({
        success: true,
        data: {
          suggestions,
          total: suggestions.length,
          page: parseInt(page),
          totalPages: Math.ceil(suggestions.length / limit)
        }
      });
    } catch (error) {
      logger.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search users',
        error: error.message
      });
    }
  }
  
  // Send friend request - FIXED VERSION
  async sendFriendRequest(req, res) {
    console.log('🔍 1. Friend request started');
    
    try {
      const { recipientId } = req.params;
      const currentUserId = req.user.id;
      
      console.log('🔍 2. Parameters:', { recipientId, currentUserId });
      
      // Validation checks with proper returns
      if (!recipientId) {
        console.log('🔍 3. Missing recipientId');
        return res.status(400).json({
          success: false,
          message: 'Recipient ID is required'
        });
      }

      if (recipientId === currentUserId) {
        console.log('🔍 4. Cannot send to self');
        return res.status(400).json({
          success: false,
          message: 'Cannot send friend request to yourself'
        });
      }
      
      console.log('🔍 5. Starting database operations...');
      
      // Check if target user exists
      const targetUser = await User.findById(recipientId).select('_id');
      if (!targetUser) {
        console.log('🔍 6. Target user not found');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      console.log('🔍 6. Target user found');
      
      // Get current user
      const currentUser = await User.findById(currentUserId).select('friends friendRequests');
      
      console.log('🔍 7. Current user found');
      
      // Check existing friendship
      const isAlreadyFriend = currentUser.friends.some(
        f => f.userId.toString() === recipientId
      );
      
      if (isAlreadyFriend) {
        console.log('🔍 8. Already friends');
        return res.status(400).json({
          success: false,
          message: 'Already friends with this user'
        });
      }
      
      console.log('🔍 8. Not already friends');
      
      // Check existing sent request
      const alreadySent = currentUser.friendRequests.sent.some(
        r => r.userId.toString() === recipientId
      );
      
      if (alreadySent) {
        console.log('🔍 9. Request already sent');
        return res.status(400).json({
          success: false,
          message: 'Friend request already sent'
        });
      }
      
      console.log('🔍 9. No existing request found');
      
      // Send the friend request - SIMPLIFIED
      await User.findByIdAndUpdate(currentUserId, {
        $push: {
          'friendRequests.sent': {
            userId: recipientId,
            createdAt: new Date()
          }
        }
      });
      
      console.log('🔍 10. Updated sender');
      
      await User.findByIdAndUpdate(recipientId, {
        $push: {
          'friendRequests.received': {
            userId: currentUserId,
            createdAt: new Date()
          }
        }
      });
      
      console.log('🔍 11. Updated recipient');
      
      // Send success response
      console.log('🔍 12. Sending success response');
      return res.status(201).json({
        success: true,
        message: 'Friend request sent successfully',
        data: {
          recipientId,
          sentAt: new Date()
        }
      });
      
    } catch (error) {
      console.error('🔍 ERROR in sendFriendRequest:', error);
      
      // Only send response if not already sent
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send friend request',
          error: error.message
        });
      }
    }
  }
  
  // Accept/Reject friend request
  async respondToFriendRequest(req, res) {
    try {
      const { requestUserId, action } = req.body; // action: 'accept' or 'reject'
      const currentUserId = req.user.id;
      
      if (!requestUserId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Request user ID and action are required'
        });
      }

      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Action must be either "accept" or "reject"'
        });
      }

      // ✅ SIMPLIFIED: Use simple findById operation for better performance
      const currentUser = await User.findById(currentUserId).select('friendRequests friends');

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify the friend request exists
      const requestExists = currentUser.friendRequests.received.find(
        r => r.userId.toString() === requestUserId
      );

      if (!requestExists) {
        return res.status(404).json({
          success: false,
          message: 'Friend request not found'
        });
      }
      
      if (action === 'accept') {
        // ✅ SIMPLIFIED: Use simple updateOne operations for better performance
        await Promise.all([
          User.updateOne(
            { _id: currentUserId },
            {
              $push: {
                friends: {
                  userId: requestUserId,
                  status: 'accepted',
                  createdAt: new Date(),
                  acceptedAt: new Date()
                }
              },
              $pull: {
                'friendRequests.received': { userId: requestUserId }
              },
              $inc: {
                'analytics.totalFriends': 1
              }
            }
          ),
          User.updateOne(
            { _id: requestUserId },
            {
              $push: {
                friends: {
                  userId: currentUserId,
                  status: 'accepted',
                  createdAt: new Date(),
                  acceptedAt: new Date()
                }
              },
              $pull: {
                'friendRequests.sent': { userId: currentUserId }
              },
              $inc: {
                'analytics.totalFriends': 1
              }
            }
          )
        ]);

        logger.info(`Friend request accepted: ${requestUserId} and ${currentUserId} are now friends`);
      } else {
        // ✅ SIMPLIFIED: Use simple updateOne operations for better performance
        await Promise.all([
          User.updateOne(
            { _id: currentUserId },
            {
              $pull: {
                'friendRequests.received': { userId: requestUserId }
              }
            }
          ),
          User.updateOne(
            { _id: requestUserId },
            {
              $pull: {
                'friendRequests.sent': { userId: currentUserId }
              }
            }
          )
        ]);

        logger.info(`Friend request rejected: ${currentUserId} rejected ${requestUserId}`);
      }
      
      // TODO: Send push notification
      
      res.json({
        success: true,
        message: `Friend request ${action}ed successfully`,
        data: {
          action,
          userId: requestUserId,
          processedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error responding to friend request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to respond to friend request',
        error: error.message
      });
    }
  }
  
  // Get friend list
  async getFriends(req, res) {
    try {
      const currentUserId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      
      const user = await User.findById(currentUserId)
        .populate({
          path: 'friends.userId',
          select: 'username profile.displayName selectedAvatar location isOnline analytics.lastActiveAt'
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const friends = user.friends
        .filter(friend => friend.status === 'accepted')
        .map(friend => {
          const friendUser = friend.userId;
          return {
            id: friendUser._id,
            username: friendUser.username,
            displayName: friendUser.profile?.displayName || friendUser.username,
            selectedAvatar: friendUser.selectedAvatar,
            location: friendUser.location,
            isOnline: friendUser.isOnline,
            lastActiveAt: friendUser.analytics?.lastActiveAt,
            friendshipDate: friend.acceptedAt,
            status: friend.status
          };
        })
        .sort((a, b) => new Date(b.friendshipDate) - new Date(a.friendshipDate));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedFriends = friends.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        message: 'Friends retrieved successfully',
        data: {
          friends: paginatedFriends,
          total: friends.length,
          page: parseInt(page),
          totalPages: Math.ceil(friends.length / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting friends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get friends',
        error: error.message
      });
    }
  }

  // Get pending friend requests
  async getPendingRequests(req, res) {
    try {
      const currentUserId = req.user.id;
      
      const user = await User.findById(currentUserId)
        .populate({
          path: 'friendRequests.received.userId',
          select: 'username profile.displayName selectedAvatar location'
        })
        .populate({
          path: 'friendRequests.sent.userId',
          select: 'username profile.displayName selectedAvatar location'
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const receivedRequests = user.friendRequests.received.map(request => ({
        id: request._id,
        user: {
          id: request.userId._id,
          username: request.userId.username,
          displayName: request.userId.profile?.displayName || request.userId.username,
          selectedAvatar: request.userId.selectedAvatar,
          location: request.userId.location
        },
        createdAt: request.createdAt
      }));

      const sentRequests = user.friendRequests.sent.map(request => ({
        id: request._id,
        user: {
          id: request.userId._id,
          username: request.userId.username,
          displayName: request.userId.profile?.displayName || request.userId.username,
          selectedAvatar: request.userId.selectedAvatar,
          location: request.userId.location
        },
        createdAt: request.createdAt
      }));

      res.json({
        success: true,
        message: 'Pending requests retrieved successfully',
        data: {
          received: receivedRequests,
          sent: sentRequests,
          totalReceived: receivedRequests.length,
          totalSent: sentRequests.length
        }
      });
    } catch (error) {
      logger.error('Error getting pending requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending requests',
        error: error.message
      });
    }
  }

  // Remove friend
  async removeFriend(req, res) {
    try {
      const { friendId } = req.params;
      const friendUserId = friendId; // For backward compatibility with existing code
      const currentUserId = req.user.id;
      
      if (!friendUserId) {
        return res.status(400).json({
          success: false,
          message: 'Friend user ID is required'
        });
      }

      // Remove from both users' friend lists
      await User.findByIdAndUpdate(currentUserId, {
        $pull: {
          friends: { userId: friendUserId }
        },
        $inc: {
          'analytics.totalFriends': -1
        }
      });

      await User.findByIdAndUpdate(friendUserId, {
        $pull: {
          friends: { userId: currentUserId }
        },
        $inc: {
          'analytics.totalFriends': -1
        }
      });

      logger.info(`Friendship removed between ${currentUserId} and ${friendUserId}`);

      res.json({
        success: true,
        message: 'Friend removed successfully',
        data: {
          removedUserId: friendUserId,
          removedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error removing friend:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove friend',
        error: error.message
      });
    }
  }

  // Get friend suggestions based on multiple criteria
  async getFriendSuggestions(req, res) {
    try {
      const currentUserId = req.user.id;
      const { limit = 10, criteria = 'all' } = req.query;

      const currentUser = await User.findById(currentUserId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const friendIds = currentUser.friends.map(f => f.userId);
      const sentRequestIds = currentUser.friendRequests.sent.map(r => r.userId);
      const receivedRequestIds = currentUser.friendRequests.received.map(r => r.userId);

      // Base match criteria - exclude current user, friends, and pending requests
      const baseMatch = {
            _id: { $nin: [currentUserId, ...friendIds, ...sentRequestIds, ...receivedRequestIds] },
            isActive: true,
            'privacySettings.profileVisibility': { $in: ['public', 'friends'] }
      };

      let suggestions = [];

      if (criteria === 'mutual' || criteria === 'all') {
        // Find users with mutual friends
        const mutualSuggestions = await User.aggregate([
          { $match: baseMatch },
        {
          $addFields: {
            mutualFriends: {
              $size: {
                $setIntersection: [
                  { $map: { input: '$friends', as: 'friend', in: '$$friend.userId' } },
                  friendIds
                ]
              }
            }
          }
        },
        {
          $match: {
            mutualFriends: { $gt: 0 }
          }
        },
        {
          $sort: { mutualFriends: -1 }
        },
        {
            $limit: Math.ceil(limit * 0.4) // 40% of suggestions
        },
        {
          $project: {
              _id: 1,
            username: 1,
            'profile.displayName': 1,
            selectedAvatar: 1,
            location: 1,
              ageGroup: 1,
              pronouns: 1,
              mutualFriends: 1,
              'analytics.totalMoodsLogged': 1,
              'analytics.lastActiveAt': 1,
              suggestionType: { $literal: 'mutual' }
          }
        }
      ]);

        suggestions.push(...mutualSuggestions);
      }

      if (criteria === 'location' || criteria === 'all') {
        // Find users in the same location
        const locationSuggestions = await User.aggregate([
          { $match: baseMatch },
          {
            $match: {
              'location.city': currentUser.location?.city,
              'location.city': { $exists: true, $ne: null }
            }
          },
          {
            $addFields: {
              locationMatch: 1,
              mutualFriends: {
                $size: {
                  $setIntersection: [
                    { $map: { input: '$friends', as: 'friend', in: '$$friend.userId' } },
                    friendIds
                  ]
                }
              }
            }
          },
          {
            $sort: { mutualFriends: -1, 'analytics.lastActiveAt': -1 }
          },
          {
            $limit: Math.ceil(limit * 0.3)
          },
          {
            $project: {
              _id: 1,
              username: 1,
              'profile.displayName': 1,
              selectedAvatar: 1,
              location: 1,
              ageGroup: 1,
              pronouns: 1,
              mutualFriends: 1,
              'analytics.totalMoodsLogged': 1,
              'analytics.lastActiveAt': 1,
              suggestionType: { $literal: 'location' }
            }
          }
        ]);

        suggestions.push(...locationSuggestions);
      }

      if (criteria === 'activity' || criteria === 'all') {
        // Find active users with similar activity levels
        const activitySuggestions = await User.aggregate([
          { $match: baseMatch },
          {
            $addFields: {
              activityScore: {
                $add: [
                  { $multiply: ['$analytics.totalMoodsLogged', 2] },
                  { $multiply: ['$analytics.totalFriends', 1] },
                  { $cond: [{ $gt: ['$analytics.lastActiveAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }, 10, 0] }
                ]
              },
              mutualFriends: {
                $size: {
                  $setIntersection: [
                    { $map: { input: '$friends', as: 'friend', in: '$$friend.userId' } },
                    friendIds
                  ]
                }
              }
            }
          },
          {
            $sort: { activityScore: -1, mutualFriends: -1 }
          },
          {
            $limit: Math.ceil(limit * 0.3) // 30% of suggestions
          },
          {
            $project: {
              _id: 1,
              username: 1,
              'profile.displayName': 1,
              selectedAvatar: 1,
              location: 1,
              ageGroup: 1,
              pronouns: 1,
              mutualFriends: 1,
              'analytics.totalMoodsLogged': 1,
              'analytics.lastActiveAt': 1,
              activityScore: 1,
              suggestionType: { $literal: 'activity' }
            }
          }
        ]);

        suggestions.push(...activitySuggestions);
      }

      // Remove duplicates and limit results
      const uniqueSuggestions = suggestions.reduce((acc, suggestion) => {
        const exists = acc.find(s => s._id.toString() === suggestion._id.toString());
        if (!exists) {
          acc.push(suggestion);
        }
        return acc;
      }, []);

      // Sort by relevance score and limit
      const finalSuggestions = uniqueSuggestions
        .sort((a, b) => {
          // Calculate relevance score
          const scoreA = (a.mutualFriends * 3) + (a.activityScore || 0);
          const scoreB = (b.mutualFriends * 3) + (b.activityScore || 0);
          return scoreB - scoreA;
        })
        .slice(0, parseInt(limit))
        .map(suggestion => ({
          id: suggestion._id,
          username: suggestion.username,
          displayName: suggestion.profile?.displayName || suggestion.username,
          selectedAvatar: suggestion.selectedAvatar,
          location: suggestion.location?.name || 'Unknown',
          ageGroup: suggestion.ageGroup,
          pronouns: suggestion.pronouns,
          mutualFriends: suggestion.mutualFriends || 0,
          activityLevel: suggestion.analytics?.totalMoodsLogged || 0,
          lastActive: suggestion.analytics?.lastActiveAt,
          suggestionType: suggestion.suggestionType,
          commonInterests: FriendController._generateCommonInterests(suggestion, currentUser)
        }));

      res.json({
        success: true,
        message: 'Friend suggestions retrieved successfully',
        data: {
          suggestions: finalSuggestions,
          total: finalSuggestions.length,
          criteria: criteria,
          userStats: {
            totalFriends: currentUser.friends.length,
            totalRequests: currentUser.friendRequests.sent.length + currentUser.friendRequests.received.length
          }
        }
      });
    } catch (error) {
      logger.error('Error getting friend suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get friend suggestions',
        error: error.message
      });
    }
  }

  // Helper method to generate common interests - STATIC METHOD
  static _generateCommonInterests(suggestion, currentUser) {
    const interests = [];
    
    // Location-based interest
    if (suggestion.location?.city === currentUser.location?.city) {
      interests.push('Same city');
    }
    
    // Age group similarity
    if (suggestion.ageGroup === currentUser.ageGroup) {
      interests.push('Similar age');
    }
    
    // Activity level similarity
    const currentActivity = currentUser.analytics?.totalMoodsLogged || 0;
    const suggestionActivity = suggestion.analytics?.totalMoodsLogged || 0;
    if (Math.abs(currentActivity - suggestionActivity) <= 5) {
      interests.push('Similar activity level');
    }
    
    // Avatar preference (if same type)
    if (suggestion.selectedAvatar === currentUser.selectedAvatar) {
      interests.push('Similar style');
    }
    
    return interests;
  }

  // Send check-in to friend
  async sendCheckIn(req, res) {
    try {
      const { friendId } = req.params;
      const { message } = req.body;
      const currentUserId = req.user.id;
      
      if (!friendId) {
        return res.status(400).json({
          success: false,
          message: 'Friend ID is required'
        });
      }

      // Verify friendship exists
      const currentUser = await User.findById(currentUserId);
      const friendship = currentUser.friends.find(
        f => f.userId.toString() === friendId && f.status === 'accepted'
      );

      if (!friendship) {
        return res.status(403).json({
          success: false,
          message: 'You are not friends with this user'
        });
      }

      // TODO: Implement check-in functionality (notifications, etc.)
      logger.info(`Check-in sent from ${currentUserId} to ${friendId}`);

      res.json({
        success: true,
        message: 'Check-in sent successfully',
        data: {
          friendId,
          message,
          sentAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error sending check-in:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send check-in',
        error: error.message
      });
    }
  }

  // Get users with similar emotional patterns
  async getUsersWithSimilarEmotions(req, res) {
    try {
      const currentUserId = req.user.id;
      const { limit = 10, timeRange = '30d' } = req.query;

      const currentUser = await User.findById(currentUserId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const friendIds = currentUser.friends.map(f => f.userId);
      const sentRequestIds = currentUser.friendRequests.sent.map(r => r.userId);
      const receivedRequestIds = currentUser.friendRequests.received.map(r => r.userId);

      // Get current user's emotional patterns
      const currentUserMoods = await Mood.find({
        userId: currentUserId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      // Calculate dominant emotions for current user
      const emotionCounts = {};
      currentUserMoods.forEach(mood => {
        emotionCounts[mood.emotion] = (emotionCounts[mood.emotion] || 0) + 1;
      });

      const dominantEmotions = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([emotion]) => emotion);

      // Find users with similar emotional patterns
      const similarUsers = await User.aggregate([
        {
          $match: {
            _id: { 
              $nin: [currentUserId, ...friendIds, ...sentRequestIds, ...receivedRequestIds] 
            },
            isActive: true
          }
        },
        {
          $lookup: {
            from: 'moods',
            localField: '_id',
            foreignField: 'userId',
            as: 'moods'
          }
        },
        {
          $addFields: {
            recentMoods: {
              $filter: {
                input: '$moods',
                as: 'mood',
                cond: {
                  $gte: [
                    '$$mood.createdAt',
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  ]
                }
              }
            }
          }
        },
        {
          $addFields: {
            emotionCounts: {
              $reduce: {
                input: '$recentMoods',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $literal: {
                        $concat: [
                          '$$this.emotion',
                          ': ',
                          { $add: [{ $indexOfArray: ['$recentMoods', '$$this'] }, 1] }
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $addFields: {
            similarityScore: {
              $size: {
                $setIntersection: [
                  { $map: { input: '$recentMoods', as: 'mood', in: '$$mood.emotion' } },
                  dominantEmotions
                ]
              }
            }
          }
        },
        {
          $match: {
            similarityScore: { $gt: 0 },
            'recentMoods.0': { $exists: true }
          }
        },
        {
          $sort: { similarityScore: -1 }
        },
        {
          $limit: parseInt(limit)
        },
        {
          $project: {
            _id: 1,
            username: 1,
            selectedAvatar: 1,
            location: 1,
            similarityScore: 1,
            dominantEmotions: { $map: { input: '$recentMoods', as: 'mood', in: '$$mood.emotion' } },
            moodCount: { $size: '$recentMoods' }
          }
        }
      ]);

      res.json({
        success: true,
        message: 'Users with similar emotions found',
        data: {
          suggestions: similarUsers.map(user => ({
            id: user._id,
            username: user.username,
            avatar: user.selectedAvatar,
            location: user.location,
            similarityScore: user.similarityScore,
            dominantEmotions: user.dominantEmotions.slice(0, 3),
            moodCount: user.moodCount,
            insight: `You both frequently feel ${user.dominantEmotions[0]}`
          })),
          currentUserEmotions: dominantEmotions,
          timeRange: timeRange
        }
      });

    } catch (error) {
      console.error('Error getting similar emotion users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users with similar emotions'
      });
    }
  }

  // Get friendship insights and compatibility
  async getFriendshipInsights(req, res) {
    try {
      const currentUserId = req.user.id;
      const { userId } = req.params;

      const currentUser = await User.findById(currentUserId);
      const targetUser = await User.findById(userId);

      if (!currentUser || !targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get mutual friends
      const currentUserFriends = currentUser.friends.map(f => f.userId.toString());
      const targetUserFriends = targetUser.friends.map(f => f.userId.toString());
      const mutualFriends = currentUserFriends.filter(id => targetUserFriends.includes(id));

      // Get emotional compatibility
      const currentUserMoods = await Mood.find({
        userId: currentUserId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      const targetUserMoods = await Mood.find({
        userId: userId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      // Calculate emotional patterns
      const getEmotionPattern = (moods) => {
        const emotionCounts = {};
        moods.forEach(mood => {
          emotionCounts[mood.emotion] = (emotionCounts[mood.emotion] || 0) + 1;
        });
        return Object.entries(emotionCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([emotion, count]) => ({ emotion, count }));
      };

      const currentUserPattern = getEmotionPattern(currentUserMoods);
      const targetUserPattern = getEmotionPattern(targetUserMoods);

      // Calculate compatibility score
      const commonEmotions = currentUserPattern
        .filter(c => targetUserPattern.some(t => t.emotion === c.emotion))
        .length;

      const compatibilityScore = Math.min(100, (commonEmotions / 3) * 100);

      res.json({
        success: true,
        message: 'Friendship insights retrieved',
        data: {
          mutualFriends: mutualFriends.length,
          compatibilityScore: Math.round(compatibilityScore),
          currentUserEmotions: currentUserPattern,
          targetUserEmotions: targetUserPattern,
          insights: [
            mutualFriends.length > 0 ? `You have ${mutualFriends.length} mutual friends` : null,
            commonEmotions > 0 ? `You both frequently feel ${currentUserPattern[0]?.emotion}` : null,
            compatibilityScore > 70 ? 'High emotional compatibility!' : null,
            compatibilityScore < 30 ? 'Different emotional patterns' : null
          ].filter(Boolean)
        }
      });

    } catch (error) {
      console.error('Error getting friendship insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get friendship insights'
      });
    }
  }

  // Get friend activity feed
  async getFriendActivityFeed(req, res) {
    try {
      const currentUserId = req.user.id;
      const { limit = 20 } = req.query;

      const currentUser = await User.findById(currentUserId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const friendIds = currentUser.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId);

      // Get recent moods from friends who allow sharing
      const friendMoods = await Mood.find({
        userId: { $in: friendIds },
        privacy: { $in: ['friends', 'public'] },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
      .populate('userId', 'username selectedAvatar location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

      // Get recent community posts from friends
      const friendPosts = await CommunityPost.find({
        userId: { $in: friendIds },
        privacy: { $in: ['friends', 'public'] },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
      .populate('userId', 'username selectedAvatar location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

      // Combine and sort activities
      const activities = [
        ...friendMoods.map(mood => ({
          type: 'mood',
          id: mood._id,
          user: mood.userId,
          emotion: mood.emotion,
          note: mood.note,
          timestamp: mood.createdAt,
          privacy: mood.privacy
        })),
        ...friendPosts.map(post => ({
          type: 'post',
          id: post._id,
          user: post.userId,
          message: post.message,
          emoji: post.emoji,
          timestamp: post.createdAt,
          privacy: post.privacy
        }))
      ].sort((a, b) => b.timestamp - a.timestamp);

      res.json({
        success: true,
        message: 'Friend activity feed retrieved',
        data: {
          activities: activities.slice(0, parseInt(limit)),
          totalFriends: friendIds.length,
          timeRange: '7 days'
        }
      });

    } catch (error) {
      console.error('Error getting friend activity feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get friend activity feed'
      });
    }
  }

  // Send comfort reaction to friend's mood
  async sendComfortReaction(req, res) {
    try {
      const currentUserId = req.user.id;
      const { userId } = req.params;
      const { moodId, reactionType = 'comfort' } = req.body;

      const currentUser = await User.findById(currentUserId);
      const targetUser = await User.findById(userId);

      if (!currentUser || !targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if they are friends
      const isFriend = currentUser.friends.some(
        f => f.userId.toString() === userId && f.status === 'accepted'
      );

      if (!isFriend) {
        return res.status(403).json({
          success: false,
          message: 'You can only send comfort to friends'
        });
      }

      // Add reaction to mood
      const mood = await Mood.findById(moodId);
      if (!mood || mood.userId.toString() !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Mood not found'
        });
      }

      // Check if already reacted
      const existingReaction = mood.reactions.find(
        r => r.userId.toString() === currentUserId
      );

      if (existingReaction) {
        return res.status(400).json({
          success: false,
          message: 'You have already reacted to this mood'
        });
      }

      // Add reaction
      mood.reactions.push({
        userId: currentUserId,
        type: reactionType,
        timestamp: new Date()
      });

      await mood.save();

      // Update user analytics
      await User.findByIdAndUpdate(currentUserId, {
        $inc: { 'analytics.totalComfortReactionsSent': 1 }
      });

      await User.findByIdAndUpdate(userId, {
        $inc: { 'analytics.totalComfortReactionsReceived': 1 }
      });

      res.json({
        success: true,
        message: 'Comfort reaction sent successfully',
        data: {
          moodId: mood._id,
          reactionType: reactionType,
          totalReactions: mood.reactions.length
        }
      });

    } catch (error) {
      console.error('Error sending comfort reaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send comfort reaction'
      });
    }
  }

  // Get mutual friends with another user
  async getMutualFriends(req, res) {
    try {
      const currentUserId = req.user.id;
      const { userId } = req.params;

      const currentUser = await User.findById(currentUserId);
      const targetUser = await User.findById(userId);

      if (!currentUser || !targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const currentUserFriends = currentUser.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId.toString());

      const targetUserFriends = targetUser.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId.toString());

      const mutualFriendIds = currentUserFriends.filter(id => targetUserFriends.includes(id));

      // Get mutual friends details
      const mutualFriends = await User.find({
        _id: { $in: mutualFriendIds }
      }).select('username selectedAvatar location');

      res.json({
        success: true,
        message: 'Mutual friends retrieved',
        data: {
          mutualFriends: mutualFriends.map(friend => ({
            id: friend._id,
            username: friend.username,
            avatar: friend.selectedAvatar,
            location: friend.location
          })),
          count: mutualFriends.length
        }
      });

    } catch (error) {
      console.error('Error getting mutual friends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get mutual friends'
      });
    }
  }

  // Cancel sent friend request
  async cancelFriendRequest(req, res) {
    try {
      const currentUserId = req.user.id;
      const { userId } = req.params;

      // Validate userId parameter
      if (!userId || userId === 'request') {
        return res.status(400).json({
          success: false,
          message: 'Valid user ID is required for friend request cancellation'
        });
      }

      const currentUser = await User.findById(currentUserId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // ✅ FIXED: Remove from BOTH sender's sent requests AND recipient's received requests
      await Promise.all([
        // Remove from sender's sent requests
        User.findByIdAndUpdate(currentUserId, {
          $pull: {
            'friendRequests.sent': { userId: userId }
          }
        }),
        // Remove from recipient's received requests
        User.findByIdAndUpdate(userId, {
          $pull: {
            'friendRequests.received': { userId: currentUserId }
          }
        })
      ]);

      logger.info(`Friend request cancelled: ${currentUserId} cancelled request to ${userId}`);

      res.json({
        success: true,
        message: 'Friend request cancelled successfully'
      });

    } catch (error) {
      console.error('Error cancelling friend request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel friend request'
      });
    }
  }

  // Get friend's recent moods (if they allow sharing)
  async getFriendMoods(req, res) {
    try {
      const currentUserId = req.user.id;
      const { userId } = req.params;
      const { limit = 10 } = req.query;
      
      const currentUser = await User.findById(currentUserId);
      const targetUser = await User.findById(userId);

      if (!currentUser || !targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if they are friends
      const isFriend = currentUser.friends.some(
        f => f.userId.toString() === userId && f.status === 'accepted'
      );

      if (!isFriend) {
        return res.status(403).json({
          success: false,
          message: 'You can only view moods of your friends'
        });
      }

      // Get friend's moods that they allow friends to see
      const moods = await Mood.find({
        userId: userId,
        privacy: { $in: ['friends', 'public'] }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-reactions -comments');

      res.json({
        success: true,
        message: 'Friend moods retrieved',
        data: {
          moods: moods.map(mood => ({
            id: mood._id,
            emotion: mood.emotion,
            intensity: mood.intensity,
            note: mood.note,
            timestamp: mood.createdAt,
            privacy: mood.privacy
          })),
          friend: {
            id: targetUser._id,
            username: targetUser.username,
            avatar: targetUser.selectedAvatar
          }
        }
      });

    } catch (error) {
      console.error('Error getting friend moods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get friend moods'
      });
    }
  }

  // Block user
  async blockUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      if (userId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot block yourself'
        });
      }

      // Remove any existing friendship
      await User.findByIdAndUpdate(currentUserId, {
        $pull: {
          friends: { userId },
          'friendRequests.sent': { userId },
          'friendRequests.received': { userId }
        }
      });

      await User.findByIdAndUpdate(userId, {
        $pull: {
          friends: { userId: currentUserId },
          'friendRequests.sent': { userId: currentUserId },
          'friendRequests.received': { userId: currentUserId }
        }
      });

      // TODO: Add to blocked users list (requires adding blockedUsers field to User model)
      
      logger.info(`User ${currentUserId} blocked user ${userId}`);

      res.json({
        success: true,
        message: 'User blocked successfully',
        data: {
          blockedUserId: userId,
          blockedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error blocking user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to block user',
        error: error.message
      });
    }
  }

  // Get friendship statistics
  async getFriendshipStats(req, res) {
    try {
      const currentUserId = req.user.id;
      
      const user = await User.findById(currentUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const totalFriends = user.friends.filter(f => f.status === 'accepted').length;
      const pendingRequests = user.friendRequests.received.length;
      const sentRequests = user.friendRequests.sent.length;

      res.json({
        success: true,
        message: 'Friendship stats retrieved successfully',
        data: {
          totalFriends,
          pendingRequests,
          sentRequests,
          totalFriendRequests: pendingRequests + sentRequests
        }
      });
    } catch (error) {
      logger.error('Error getting friendship stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get friendship stats',
        error: error.message
      });
    }
  }

  // Get nearby users (location-based suggestions)
  async getNearbyUsers(req, res) {
    try {
      const currentUserId = req.user.id;
      const { limit = 10, maxDistance = 50 } = req.query; // maxDistance in km

      const currentUser = await User.findById(currentUserId);
      if (!currentUser || !currentUser.location?.coordinates) {
        return res.status(400).json({
          success: false,
          message: 'User location not available'
        });
      }

      const friendIds = currentUser.friends.map(f => f.userId);
      const sentRequestIds = currentUser.friendRequests.sent.map(r => r.userId);
      const receivedRequestIds = currentUser.friendRequests.received.map(r => r.userId);

      const nearbyUsers = await User.find({
        _id: { $nin: [currentUserId, ...friendIds, ...sentRequestIds, ...receivedRequestIds] },
        isActive: true,
        'privacySettings.profileVisibility': { $in: ['public', 'friends'] },
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: currentUser.location.coordinates.coordinates
            },
            $maxDistance: maxDistance * 1000 // Convert km to meters
          }
        }
      })
      .select('username profile.displayName selectedAvatar location ageGroup pronouns analytics')
      .limit(parseInt(limit));

      const suggestions = nearbyUsers.map(user => ({
        id: user._id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        selectedAvatar: user.selectedAvatar,
        location: user.location?.name || 'Unknown',
        ageGroup: user.ageGroup,
        pronouns: user.pronouns,
        distance: this._calculateDistance(
          currentUser.location.coordinates.coordinates,
          user.location.coordinates.coordinates
        ),
        activityLevel: user.analytics?.totalMoodsLogged || 0,
        lastActive: user.analytics?.lastActiveAt
      }));

      res.json({
        success: true,
        message: 'Nearby users retrieved successfully',
        data: {
          suggestions,
          total: suggestions.length,
          maxDistance: parseInt(maxDistance),
          userLocation: currentUser.location
        }
      });
    } catch (error) {
      logger.error('Error getting nearby users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get nearby users',
        error: error.message
      });
    }
  }

  // Get users with similar interests
  async getSimilarUsers(req, res) {
    try {
      const currentUserId = req.user.id;
      const { limit = 10 } = req.query;

      const currentUser = await User.findById(currentUserId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const friendIds = currentUser.friends.map(f => f.userId);
      const sentRequestIds = currentUser.friendRequests.sent.map(r => r.userId);
      const receivedRequestIds = currentUser.friendRequests.received.map(r => r.userId);

      // Find users with similar characteristics
      const similarUsers = await User.aggregate([
        {
          $match: {
            _id: { $nin: [currentUserId, ...friendIds, ...sentRequestIds, ...receivedRequestIds] },
            isActive: true,
            'privacySettings.profileVisibility': { $in: ['public', 'friends'] }
          }
        },
        {
          $addFields: {
            similarityScore: {
              $add: [
                // Age group match
                { $cond: [{ $eq: ['$ageGroup', currentUser.ageGroup] }, 10, 0] },
                // Avatar preference match
                { $cond: [{ $eq: ['$selectedAvatar', currentUser.selectedAvatar] }, 5, 0] },
                // Activity level similarity
                {
                  $multiply: [
                    {
                      $subtract: [
                        10,
                        {
                          $abs: {
                            $subtract: [
                              { $ifNull: ['$analytics.totalMoodsLogged', 0] },
                              { $ifNull: [currentUser.analytics?.totalMoodsLogged, 0] }
                            ]
                          }
                        }
                      ]
                    },
                    0.5
                  ]
                },
                // Location similarity
                { $cond: [{ $eq: ['$location.city', currentUser.location?.city] }, 8, 0] }
              ]
            }
          }
        },
        {
          $sort: { similarityScore: -1 }
        },
        {
          $limit: parseInt(limit)
        },
        {
          $project: {
            _id: 1,
            username: 1,
            'profile.displayName': 1,
            selectedAvatar: 1,
            location: 1,
            ageGroup: 1,
            pronouns: 1,
            similarityScore: 1,
            'analytics.totalMoodsLogged': 1,
            'analytics.lastActiveAt': 1
          }
        }
      ]);

      const suggestions = similarUsers.map(user => ({
        id: user._id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        selectedAvatar: user.selectedAvatar,
        location: user.location?.name || 'Unknown',
        ageGroup: user.ageGroup,
        pronouns: user.pronouns,
        similarityScore: user.similarityScore,
        activityLevel: user.analytics?.totalMoodsLogged || 0,
        lastActive: user.analytics?.lastActiveAt,
        commonInterests: FriendController._generateCommonInterests(user, currentUser)
      }));

      res.json({
        success: true,
        message: 'Similar users retrieved successfully',
        data: {
          suggestions,
          total: suggestions.length,
          userProfile: {
            ageGroup: currentUser.ageGroup,
            selectedAvatar: currentUser.selectedAvatar,
            location: currentUser.location?.name,
            activityLevel: currentUser.analytics?.totalMoodsLogged || 0
          }
        }
      });
    } catch (error) {
      logger.error('Error getting similar users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get similar users',
        error: error.message
      });
    }
  }

  // Helper method to calculate distance between two points
  _calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export default new FriendController();