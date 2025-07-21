import EmotionStory from '../models/emotion-story.model.js';
import EmotionStoryContribution from '../models/emotion-story-contribution.model.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';

class EmotionStoryController {
  
  // Create a new emotion story
  async createEmotionStory(req, res) {
    try {
      const currentUserId = req.user.id;
      const { title, description, startDate, endDate, privacy, tags, settings } = req.body;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }

      if (start < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be in the past'
        });
      }

      const story = new EmotionStory({
        title,
        description,
        creator: currentUserId,
        participants: [{ user: currentUserId, status: 'accepted', joinedAt: new Date() }],
        privacy,
        startDate: start,
        endDate: end,
        tags: tags || [],
        settings: settings || {}
      });

      await story.save();
      await story.populate('creator', 'username selectedAvatar profile.displayName');

      res.status(201).json({
        success: true,
        message: 'Emotion story created successfully',
        data: {
          story: {
            id: story._id,
            title: story.title,
            description: story.description,
            creator: {
              id: story.creator._id,
              username: story.creator.username,
              avatar: story.creator.selectedAvatar,
              displayName: story.creator.profile?.displayName || story.creator.username
            },
            startDate: story.startDate,
            endDate: story.endDate,
            privacy: story.privacy,
            tags: story.tags,
            settings: story.settings,
            participantCount: story.participantCount,
            isActive: story.isActive
          }
        }
      });

    } catch (error) {
      logger.error('Error creating emotion story:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create emotion story'
      });
    }
  }

  // Get user's emotion stories
  async getUserEmotionStories(req, res) {
    try {
      const currentUserId = req.user.id;
      const { page = 1, limit = 10, status = 'all' } = req.query;

      let query = {
        $or: [
          { creator: currentUserId },
          { 'participants.user': currentUserId }
        ]
      };

      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const stories = await EmotionStory.find(query)
        .populate('creator', 'username selectedAvatar profile.displayName')
        .populate('participants.user', 'username selectedAvatar profile.displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await EmotionStory.countDocuments(query);

      const formattedStories = stories.map(story => ({
        id: story._id,
        title: story.title,
        description: story.description,
        creator: {
          id: story.creator._id,
          username: story.creator.username,
          avatar: story.creator.selectedAvatar,
          displayName: story.creator.profile?.displayName || story.creator.username
        },
        participants: story.participants.map(p => ({
          user: {
            id: p.user._id,
            username: p.user.username,
            avatar: p.user.selectedAvatar,
            displayName: p.user.profile?.displayName || p.user.username
          },
          status: p.status,
          joinedAt: p.joinedAt
        })),
        startDate: story.startDate,
        endDate: story.endDate,
        privacy: story.privacy,
        tags: story.tags,
        settings: story.settings,
        analytics: story.analytics,
        isActive: story.isActive,
        participantCount: story.participantCount
      }));

      res.json({
        success: true,
        message: 'Emotion stories retrieved successfully',
        data: {
          stories: formattedStories,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('Error getting user emotion stories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get emotion stories'
      });
    }
  }

  // Invite friends to emotion story
  async inviteToEmotionStory(req, res) {
    try {
      const currentUserId = req.user.id;
      const { storyId } = req.params;
      const { friendIds } = req.body;

      const story = await EmotionStory.findById(storyId);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Emotion story not found'
        });
      }

      // Check if user is creator or participant
      if (story.creator.toString() !== currentUserId && !story.isParticipant(currentUserId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only invite friends to stories you created or participate in'
        });
      }

      // Get current user to check friends
      const currentUser = await User.findById(currentUserId);
      const friendIdsSet = new Set(currentUser.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId.toString()));

      // Validate that all invited users are friends
      const validFriendIds = friendIds.filter(id => friendIdsSet.has(id));
      
      if (validFriendIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid friends to invite'
        });
      }

      // Add new participants
      const newParticipants = validFriendIds.map(friendId => ({
        user: friendId,
        status: 'invited'
      }));

      // Filter out already invited participants
      const existingParticipantIds = story.participants.map(p => p.user.toString());
      const uniqueNewParticipants = newParticipants.filter(p => 
        !existingParticipantIds.includes(p.user.toString())
      );

      if (uniqueNewParticipants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'All selected friends are already invited or participating'
        });
      }

      story.participants.push(...uniqueNewParticipants);
      await story.save();

      // Emit socket events to invited friends
      if (req.io) {
        uniqueNewParticipants.forEach(participant => {
          req.io.to(`user:${participant.user}`).emit('emotion_story_invitation', {
            storyId: story._id,
            title: story.title,
            creator: {
              id: currentUser._id,
              username: currentUser.username,
              avatar: currentUser.selectedAvatar,
              displayName: currentUser.profile?.displayName || currentUser.username
            }
          });
        });
      }

      res.json({
        success: true,
        message: 'Friends invited successfully',
        data: {
          invitedCount: uniqueNewParticipants.length,
          storyId: story._id
        }
      });

    } catch (error) {
      logger.error('Error inviting to emotion story:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to invite friends'
      });
    }
  }

  // Respond to emotion story invitation
  async respondToInvitation(req, res) {
    try {
      const currentUserId = req.user.id;
      const { storyId } = req.params;
      const { action } = req.body; // 'accept' or 'decline'

      if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
      }

      const story = await EmotionStory.findById(storyId);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Emotion story not found'
        });
      }

      // Find user's participation
      const participation = story.participants.find(p => 
        p.user.toString() === currentUserId
      );

      if (!participation) {
        return res.status(404).json({
          success: false,
          message: 'You are not invited to this story'
        });
      }

      if (participation.status !== 'invited') {
        return res.status(400).json({
          success: false,
          message: 'You have already responded to this invitation'
        });
      }

      // Update participation status
      participation.status = action === 'accept' ? 'accepted' : 'declined';
      if (action === 'accept') {
        participation.joinedAt = new Date();
      }

      await story.save();

      // Emit socket event to story creator
      if (req.io && action === 'accept') {
        req.io.to(`user:${story.creator}`).emit('emotion_story_invitation_accepted', {
          storyId: story._id,
          participant: {
            id: currentUserId,
            username: req.user.username,
            avatar: req.user.selectedAvatar,
            displayName: req.user.profile?.displayName || req.user.username
          }
        });
      }

      res.json({
        success: true,
        message: `Invitation ${action}ed successfully`,
        data: {
          storyId: story._id,
          action
        }
      });

    } catch (error) {
      logger.error('Error responding to invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to respond to invitation'
      });
    }
  }

  // Add contribution to emotion story
  async addContribution(req, res) {
    try {
      const currentUserId = req.user.id;
      const { storyId } = req.params;
      const { emotion, intensity, message, isAnonymous, context, tags, media } = req.body;

      const story = await EmotionStory.findById(storyId);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Emotion story not found'
        });
      }

      // Check if user can contribute
      if (!story.canContribute(currentUserId)) {
        return res.status(403).json({
          success: false,
          message: 'You cannot contribute to this story'
        });
      }

      // Check if story is active
      if (!story.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This story is no longer active'
        });
      }

      // Check if story requires approval
      const needsApproval = story.settings.requireApproval && story.creator.toString() !== currentUserId;

      const contribution = new EmotionStoryContribution({
        storyId,
        contributor: currentUserId,
        emotion,
        intensity,
        message,
        isAnonymous,
        context,
        tags,
        media,
        isApproved: !needsApproval
      });

      await contribution.save();
      await contribution.populate('contributor', 'username selectedAvatar profile.displayName');

      // Update story analytics
      story.analytics.totalContributions += 1;
      story.analytics.lastActivity = new Date();
      await story.save();

      // Emit socket event to story participants
      if (req.io) {
        const participantIds = story.participants
          .filter(p => p.status === 'accepted')
          .map(p => p.user.toString())
          .filter(id => id !== currentUserId);

        participantIds.forEach(participantId => {
          req.io.to(`user:${participantId}`).emit('emotion_story_contribution_added', {
            storyId: story._id,
            contribution: {
              id: contribution._id,
              emotion: contribution.emotion,
              intensity: contribution.intensity,
              message: contribution.message,
              contributor: isAnonymous ? null : {
                id: contribution.contributor._id,
                username: contribution.contributor.username,
                avatar: contribution.contributor.selectedAvatar,
                displayName: contribution.contributor.profile?.displayName || contribution.contributor.username
              },
              timestamp: contribution.createdAt,
              isAnonymous
            }
          });
        });
      }

      res.status(201).json({
        success: true,
        message: 'Contribution added successfully',
        data: {
          contribution: {
            id: contribution._id,
            emotion: contribution.emotion,
            intensity: contribution.intensity,
            message: contribution.message,
            contributor: isAnonymous ? null : {
              id: contribution.contributor._id,
              username: contribution.contributor.username,
              avatar: contribution.contributor.selectedAvatar,
              displayName: contribution.contributor.profile?.displayName || contribution.contributor.username
            },
            timestamp: contribution.createdAt,
            isAnonymous,
            isApproved: contribution.isApproved
          }
        }
      });

    } catch (error) {
      logger.error('Error adding contribution:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add contribution'
      });
    }
  }

  // Get emotion story contributions
  async getStoryContributions(req, res) {
    try {
      const currentUserId = req.user.id;
      const { storyId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const story = await EmotionStory.findById(storyId);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Emotion story not found'
        });
      }

      // Check if user can view contributions
      if (story.privacy === 'private' && 
          story.creator.toString() !== currentUserId && 
          !story.isParticipant(currentUserId)) {
        return res.status(403).json({
          success: false,
          message: 'You cannot view this story'
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const contributions = await EmotionStoryContribution.find({
        storyId,
        isApproved: true
      })
      .populate('contributor', 'username selectedAvatar profile.displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

      const total = await EmotionStoryContribution.countDocuments({
        storyId,
        isApproved: true
      });

      const formattedContributions = contributions.map(contribution => ({
        id: contribution._id,
        emotion: contribution.emotion,
        intensity: contribution.intensity,
        message: contribution.message,
        contributor: contribution.isAnonymous ? null : {
          id: contribution.contributor._id,
          username: contribution.contributor.username,
          avatar: contribution.contributor.selectedAvatar,
          displayName: contribution.contributor.profile?.displayName || contribution.contributor.username
        },
        timestamp: contribution.createdAt,
        isAnonymous: contribution.isAnonymous,
        context: contribution.context,
        tags: contribution.tags,
        media: contribution.media,
        reactions: contribution.reactions.map(r => ({
          id: r._id,
          type: r.type,
          message: r.message,
          fromUser: r.isAnonymous ? null : {
            id: r.fromUser,
            username: r.fromUser?.username,
            avatar: r.fromUser?.selectedAvatar,
            displayName: r.fromUser?.profile?.displayName || r.fromUser?.username
          },
          timestamp: r.createdAt,
          isAnonymous: r.isAnonymous
        })),
        reactionCount: contribution.reactionCount
      }));

      res.json({
        success: true,
        message: 'Story contributions retrieved successfully',
        data: {
          contributions: formattedContributions,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('Error getting story contributions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get story contributions'
      });
    }
  }
}

export default new EmotionStoryController(); 