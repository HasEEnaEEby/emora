const ComfortReaction = require('../models/comfort-reaction.model');
const Friend = require('../models/friend.model');
const Emotion = require('../models/emotion.model');
const { createError } = require('../utils/response');

class ComfortReactionService {
  async sendComfortReaction(fromUserId, emotionId, reactionType, message = '') {
    try {
      // Get emotion entry and check if it exists
      const emotion = await Emotion.findById(emotionId).populate('user');
      if (!emotion) {
        throw createError('Emotion entry not found', 404);
      }

      const toUserId = emotion.user._id;

      // Check if users are friends (unless it's public)
      if (emotion.privacyLevel !== 'public') {
        const friendship = await Friend.findOne({
          $or: [
            { requester: fromUserId, recipient: toUserId, status: 'accepted' },
            { requester: toUserId, recipient: fromUserId, status: 'accepted' }
          ]
        });

        if (!friendship && emotion.privacyLevel === 'friends') {
          throw createError('Can only react to friends emotions', 403);
        }
      }

      // Check for existing reaction
      const existingReaction = await ComfortReaction.findOne({
        fromUser: fromUserId,
        toUser: toUserId,
        emotionEntry: emotionId
      });

      if (existingReaction) {
        // Update existing reaction
        existingReaction.reactionType = reactionType;
        existingReaction.message = message;
        existingReaction.isRead = false;
        await existingReaction.save();
        await existingReaction.populate('fromUser', 'name profile.avatar');
        return existingReaction;
      }

      // Create new reaction
      const reaction = new ComfortReaction({
        fromUser: fromUserId,
        toUser: toUserId,
        emotionEntry: emotionId,
        reactionType,
        message
      });

      await reaction.save();
      await reaction.populate('fromUser', 'name profile.avatar');

      return reaction;
    } catch (error) {
      throw error;
    }
  }

  async getReactionsForEmotion(emotionId, userId) {
    try {
      // Verify user can see this emotion
      const emotion = await Emotion.findById(emotionId);
      if (!emotion) {
        throw createError('Emotion entry not found', 404);
      }

      if (emotion.user.toString() !== userId && emotion.privacyLevel === 'private') {
        throw createError('Access denied', 403);
      }

      const reactions = await ComfortReaction.find({ emotionEntry: emotionId })
        .populate('fromUser', 'name profile.avatar')
        .sort({ createdAt: -1 });

      return reactions;
    } catch (error) {
      throw error;
    }
  }

  async getUserReactions(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const reactions = await ComfortReaction.find({ toUser: userId })
        .populate('fromUser', 'name profile.avatar')
        .populate('emotionEntry', 'emotionType intensity createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ComfortReaction.countDocuments({ toUser: userId });

      return {
        reactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReactions: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async markReactionsAsRead(userId, reactionIds) {
    try {
      const result = await ComfortReaction.updateMany(
        { 
          _id: { $in: reactionIds },
          toUser: userId,
          isRead: false
        },
        { isRead: true }
      );

      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      throw error;
    }
  }

  async deleteReaction(reactionId, userId) {
    try {
      const reaction = await ComfortReaction.findOneAndDelete({
        _id: reactionId,
        fromUser: userId
      });

      if (!reaction) {
        throw createError('Reaction not found', 404);
      }

      return { message: 'Reaction deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async getUnreadReactionsCount(userId) {
    try {
      const count = await ComfortReaction.countDocuments({
        toUser: userId,
        isRead: false
      });

      return { unreadCount: count };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ComfortReactionService();
