const Vent = require('../models/vent.model');
const VentReply = require('../models/vent-reply.model');
const VentReaction = require('../models/vent-reaction.model');
const { createError } = require('../utils/response');

class VentService {
  async createVent(userId, ventData) {
    try {
      const { content, emotionType, intensity, isAnonymous = true, tags = [], location } = ventData;

      const ventPayload = {
        content,
        emotionType,
        intensity,
        isAnonymous,
        tags: tags.map(tag => tag.toLowerCase())
      };

      if (!isAnonymous) {
        ventPayload.author = userId;
      }

      if (location && location.latitude && location.longitude) {
        ventPayload.location = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        };
      }

      const vent = new Vent(ventPayload);
      await vent.save();

      return vent;
    } catch (error) {
      throw error;
    }
  }

  async getVents(filters = {}, page = 1, limit = 20) {
    try {
      const { emotionType, tags, intensity, location, radius = 10000 } = filters;
      const skip = (page - 1) * limit;

      let query = { isActive: true };

      if (emotionType) {
        query.emotionType = emotionType;
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags.map(tag => tag.toLowerCase()) };
      }

      if (intensity) {
        if (intensity.min !== undefined) query.intensity = { $gte: intensity.min };
        if (intensity.max !== undefined) query.intensity = { ...query.intensity, $lte: intensity.max };
      }

      if (location && location.latitude && location.longitude) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.longitude, location.latitude]
            },
            $maxDistance: radius
          }
        };
      }

      const vents = await Vent.find(query)
        .populate('author', 'name profile.avatar', null, { skipInvalid: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Vent.countDocuments(query);

      // Remove author info for anonymous vents
      const sanitizedVents = vents.map(vent => {
        if (vent.isAnonymous) {
          delete vent.author;
        }
        return vent;
      });

      return {
        vents: sanitizedVents,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalVents: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async getVentById(ventId, userId) {
    try {
      const vent = await Vent.findOne({ _id: ventId, isActive: true })
        .populate('author', 'name profile.avatar', null, { skipInvalid: true })
        .lean();

      if (!vent) {
        throw createError('Vent not found', 404);
      }

      // Remove author info for anonymous vents
      if (vent.isAnonymous) {
        delete vent.author;
      }

      // Get replies
      const replies = await this.getVentReplies(ventId, 1, 10);

      return {
        ...vent,
        replies: replies.replies
      };
    } catch (error) {
      throw error;
    }
  }

  async addVentReply(userId, ventId, replyData) {
    try {
      const { content, isAnonymous = true, supportType } = replyData;

      // Check if vent exists and is active
      const vent = await Vent.findOne({ _id: ventId, isActive: true });
      if (!vent) {
        throw createError('Vent not found or no longer active', 404);
      }

      const replyPayload = {
        vent: ventId,
        content,
        isAnonymous,
        supportType
      };

      if (!isAnonymous) {
        replyPayload.author = userId;
      }

      const reply = new VentReply(replyPayload);
      await reply.save();

      // Update vent reply count
      await Vent.findByIdAndUpdate(ventId, { $inc: { replyCount: 1 } });

      if (!isAnonymous) {
        await reply.populate('author', 'name profile.avatar');
      }

      return reply;
    } catch (error) {
      throw error;
    }
  }

  async getVentReplies(ventId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const replies = await VentReply.find({ vent: ventId, isActive: true })
        .populate('author', 'name profile.avatar', null, { skipInvalid: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await VentReply.countDocuments({ vent: ventId, isActive: true });

      // Remove author info for anonymous replies
      const sanitizedReplies = replies.map(reply => {
        if (reply.isAnonymous) {
          delete reply.author;
        }
        return reply;
      });

      return {
        replies: sanitizedReplies,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReplies: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async reactToVent(userId, ventId, reactionType) {
    try {
      // Check if vent exists
      const vent = await Vent.findOne({ _id: ventId, isActive: true });
      if (!vent) {
        throw createError('Vent not found', 404);
      }

      // Check for existing reaction
      const existingReaction = await VentReaction.findOne({
        user: userId,
        vent: ventId,
        reactionType
      });

      if (existingReaction) {
        // Remove reaction
        await VentReaction.deleteOne({ _id: existingReaction._id });
        await Vent.findByIdAndUpdate(ventId, { 
          $inc: { [`reactions.${reactionType}`]: -1 } 
        });
        return { action: 'removed', reactionType };
      } else {
        // Add reaction
        const reaction = new VentReaction({
          user: userId,
          vent: ventId,
          reactionType
        });
        await reaction.save();
        
        await Vent.findByIdAndUpdate(ventId, { 
          $inc: { [`reactions.${reactionType}`]: 1 } 
        });
        return { action: 'added', reactionType };
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteVent(userId, ventId) {
    try {
      const vent = await Vent.findOne({ 
        _id: ventId, 
        $or: [{ author: userId }, { isAnonymous: true }]
      });

      if (!vent) {
        throw createError('Vent not found or unauthorized', 404);
      }

      // Soft delete
      vent.isActive = false;
      await vent.save();

      return { message: 'Vent deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async getUserVents(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const vents = await Vent.find({ author: userId, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Vent.countDocuments({ author: userId, isActive: true });

      return {
        vents,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalVents: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new VentService();
