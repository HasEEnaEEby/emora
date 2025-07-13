import comfortReactionService from '../services/comfort-reaction.service.js';
import { createResponse } from '../utils/response.js';

class ComfortReactionController {
  async sendComfortReaction(req, res, next) {
    try {
      const { emotionId } = req.params;
      const { reactionType, message } = req.body;
      const fromUserId = req.user.id;

      const reaction = await comfortReactionService.sendComfortReaction(
        fromUserId,
        emotionId,
        reactionType,
        message
      );

      // Emit socket event to the emotion owner using req.io
      req.io.to(`user:${reaction.toUser}`).emit('comfort_reaction_received', {
        reaction,
        fromUser: reaction.fromUser,
        message: `${reaction.fromUser.name} sent you a ${reactionType} reaction`
      });

      res.status(201).json(createResponse(
        'Comfort reaction sent successfully',
        reaction
      ));
    } catch (error) {
      next(error);
    }
  }

  async getReactionsForEmotion(req, res, next) {
    try {
      const { emotionId } = req.params;
      const userId = req.user.id;

      const reactions = await comfortReactionService.getReactionsForEmotion(
        emotionId,
        userId
      );

      res.json(createResponse(
        'Reactions retrieved successfully',
        { reactions, count: reactions.length }
      ));
    } catch (error) {
      next(error);
    }
  }

  async getUserReactions(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user.id;

      const result = await comfortReactionService.getUserReactions(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      res.json(createResponse(
        'User reactions retrieved successfully',
        result
      ));
    } catch (error) {
      next(error);
    }
  }

  async markReactionsAsRead(req, res, next) {
    try {
      const { reactionIds } = req.body;
      const userId = req.user.id;

      const result = await comfortReactionService.markReactionsAsRead(
        userId,
        reactionIds
      );

      res.json(createResponse(
        'Reactions marked as read',
        result
      ));
    } catch (error) {
      next(error);
    }
  }

  async deleteReaction(req, res, next) {
    try {
      const { reactionId } = req.params;
      const userId = req.user.id;

      const result = await comfortReactionService.deleteReaction(
        reactionId,
        userId
      );

      res.json(createResponse(result.message));
    } catch (error) {
      next(error);
    }
  }

  async getUnreadReactionsCount(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await comfortReactionService.getUnreadReactionsCount(userId);

      res.json(createResponse(
        'Unread reactions count retrieved',
        result
      ));
    } catch (error) {
      next(error);
    }
  }
}

export default new ComfortReactionController();