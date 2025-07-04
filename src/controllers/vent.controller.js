import { v4 as uuidv4 } from 'uuid';
import Vent from '../models/vent.model.js';
import logger from '../utils/logger.js';
import { createErrorResponse, createResponse } from '../utils/response.js';

class VentController {
  // Create a new vent (anonymous by default)
  createVent = async (req, res) => {
    try {
      const {
        content,
        emotion,
        intensity,
        tags,
        privacy,
        location,
        sessionToken
      } = req.body;

      // Generate anonymous ID
      const anonymousId = `anon_${uuidv4().replace(/-/g, '')}`;
      
      // Get user ID if authenticated
      const userId = req.user?.userId || req.user?.id || null;

      const ventData = {
        anonymousId,
        userId,
        content,
        emotion,
        intensity: intensity || 0.5,
        tags: tags || [],
        privacy: {
          isPublic: privacy?.isPublic ?? true,
          allowReplies: privacy?.allowReplies ?? true,
          allowReactions: privacy?.allowReactions ?? true,
          blurContent: privacy?.blurContent ?? false,
          contentWarning: privacy?.contentWarning || 'none'
        },
        location: location || {},
        sessionToken,
        source: 'api'
      };

      const vent = await Vent.create(ventData);

      // Emit real-time update if WebSocket is available
      if (req.io) {
        req.io.emit('vent_created', {
          vent: {
            id: vent._id,
            content: vent.content,
            emotion: vent.emotion,
            tags: vent.tags,
            createdAt: vent.createdAt,
            reactionCount: 0,
            replyCount: 0
          }
        });
      }

      res.status(201).json(createResponse(
        'Vent created successfully',
        {
          vent: {
            id: vent._id,
            anonymousId: vent.anonymousId,
            content: vent.content,
            emotion: vent.emotion,
            tags: vent.tags,
            privacy: vent.privacy,
            createdAt: vent.createdAt
          }
        }
      ));

    } catch (error) {
      logger.error('Error creating vent:', error);
      res.status(500).json(createErrorResponse(
        'Failed to create vent',
        error.message
      ));
    }
  };

  // Get public vent feed
  getVentFeed = async (req, res) => {
    try {
      const { page = 1, limit = 20, emotion, tags, country } = req.query;
      
      const filters = {};
      if (emotion) filters.emotion = emotion;
      if (tags) filters.tags = tags.split(',');
      if (country) filters.country = country;

      const vents = await Vent.getPublicVents(
        parseInt(page),
        parseInt(limit),
        filters
      );

      const total = await Vent.countDocuments({
        'privacy.isPublic': true,
        'moderation.isHidden': false,
        ...filters
      });

      res.json(createResponse(
        'Vent feed retrieved successfully',
        {
          vents: vents.map(vent => ({
            id: vent._id,
            content: vent.content,
            emotion: vent.emotion,
            intensity: vent.intensity,
            tags: vent.tags,
            privacy: vent.privacy,
            location: vent.location,
            reactions: vent.reactions,
            replies: vent.replies,
            analytics: vent.analytics,
            createdAt: vent.createdAt,
            reactionCount: vent.reactionCount,
            replyCount: vent.replyCount
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      ));

    } catch (error) {
      logger.error('Error getting vent feed:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get vent feed',
        error.message
      ));
    }
  };

  // Get regional vents
  getRegionalVents = async (req, res) => {
    try {
      const { country } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const vents = await Vent.getRegionalVents(country, parseInt(page), parseInt(limit));

      const total = await Vent.countDocuments({
        'privacy.isPublic': true,
        'moderation.isHidden': false,
        'location.country': country
      });

      res.json(createResponse(
        'Regional vents retrieved successfully',
        {
          country,
          vents: vents.map(vent => ({
            id: vent._id,
            content: vent.content,
            emotion: vent.emotion,
            tags: vent.tags,
            reactions: vent.reactions,
            replies: vent.replies,
            analytics: vent.analytics,
            createdAt: vent.createdAt,
            reactionCount: vent.reactionCount,
            replyCount: vent.replyCount
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      ));

    } catch (error) {
      logger.error('Error getting regional vents:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get regional vents',
        error.message
      ));
    }
  };

  // Add reaction to vent
  addReaction = async (req, res) => {
    try {
      const { ventId } = req.params;
      const { reactionType, anonymousId } = req.body;

      const vent = await Vent.findById(ventId);
      if (!vent) {
        return res.status(404).json(createErrorResponse('Vent not found'));
      }

      if (!vent.privacy.allowReactions) {
        return res.status(403).json(createErrorResponse('Reactions not allowed on this vent'));
      }

      await vent.addReaction(reactionType, anonymousId);

      // Emit real-time update
      if (req.io) {
        req.io.emit('vent_reaction_added', {
          ventId: vent._id,
          reactionType,
          reactionCount: vent.reactionCount
        });
      }

      res.json(createResponse(
        'Reaction added successfully',
        {
          ventId: vent._id,
          reactionType,
          reactionCount: vent.reactionCount
        }
      ));

    } catch (error) {
      logger.error('Error adding reaction:', error);
      res.status(500).json(createErrorResponse(
        'Failed to add reaction',
        error.message
      ));
    }
  };

  // Add reply to vent
  addReply = async (req, res) => {
    try {
      const { ventId } = req.params;
      const { content, anonymousId } = req.body;

      const vent = await Vent.findById(ventId);
      if (!vent) {
        return res.status(404).json(createErrorResponse('Vent not found'));
      }

      if (!vent.privacy.allowReplies) {
        return res.status(403).json(createErrorResponse('Replies not allowed on this vent'));
      }

      await vent.addReply(content, anonymousId);

      // Emit real-time update
      if (req.io) {
        req.io.emit('vent_reply_added', {
          ventId: vent._id,
          replyCount: vent.replyCount
        });
      }

      res.json(createResponse(
        'Reply added successfully',
        {
          ventId: vent._id,
          replyCount: vent.replyCount
        }
      ));

    } catch (error) {
      logger.error('Error adding reply:', error);
      res.status(500).json(createErrorResponse(
        'Failed to add reply',
        error.message
      ));
    }
  };

  // Flag vent for moderation
  flagVent = async (req, res) => {
    try {
      const { ventId } = req.params;
      const { reason, anonymousId } = req.body;

      const vent = await Vent.findById(ventId);
      if (!vent) {
        return res.status(404).json(createErrorResponse('Vent not found'));
      }

      await vent.flag(reason, anonymousId);

      res.json(createResponse(
        'Vent flagged successfully',
        {
          ventId: vent._id,
          isFlagged: vent.moderation.isFlagged
        }
      ));

    } catch (error) {
      logger.error('Error flagging vent:', error);
      res.status(500).json(createErrorResponse(
        'Failed to flag vent',
        error.message
      ));
    }
  };

  // Get vent statistics
  getVentStats = async (req, res) => {
    try {
      const stats = await Vent.aggregate([
        {
          $match: {
            'privacy.isPublic': true,
            'moderation.isHidden': false
          }
        },
        {
          $group: {
            _id: null,
            totalVents: { $sum: 1 },
            totalReactions: { $sum: '$analytics.reactionCount' },
            totalReplies: { $sum: '$analytics.replyCount' },
            avgReactions: { $avg: '$analytics.reactionCount' },
            avgReplies: { $avg: '$analytics.replyCount' }
          }
        }
      ]);

      const emotionStats = await Vent.aggregate([
        {
          $match: {
            'privacy.isPublic': true,
            'moderation.isHidden': false,
            emotion: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$emotion',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json(createResponse(
        'Vent statistics retrieved successfully',
        {
          overall: stats[0] || {
            totalVents: 0,
            totalReactions: 0,
            totalReplies: 0,
            avgReactions: 0,
            avgReplies: 0
          },
          emotions: emotionStats
        }
      ));

    } catch (error) {
      logger.error('Error getting vent stats:', error);
      res.status(500).json(createErrorResponse(
        'Failed to get vent statistics',
        error.message
      ));
    }
  };

  // Delete vent (only by creator)
  deleteVent = async (req, res) => {
    try {
      const { ventId } = req.params;
      const { anonymousId, sessionToken } = req.body;

      const vent = await Vent.findById(ventId);
      if (!vent) {
        return res.status(404).json(createErrorResponse('Vent not found'));
      }

      // Check if user can delete (creator or authenticated user)
      const canDelete = vent.anonymousId === anonymousId || 
                       vent.sessionToken === sessionToken ||
                       (req.user && vent.userId === req.user.userId);

      if (!canDelete) {
        return res.status(403).json(createErrorResponse('Not authorized to delete this vent'));
      }

      await Vent.findByIdAndDelete(ventId);

      // Emit real-time update
      if (req.io) {
        req.io.emit('vent_deleted', { ventId });
      }

      res.json(createResponse('Vent deleted successfully'));

    } catch (error) {
      logger.error('Error deleting vent:', error);
      res.status(500).json(createErrorResponse(
        'Failed to delete vent',
        error.message
      ));
    }
  };
}

export default new VentController();
