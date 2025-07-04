import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import heatmapSocket from './heatmap.socket.js';
import notificationSocket from './notifications.socket.js';

// Socket authentication middleware
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    // Update user online status
    await user.setOnlineStatus(true);

    socket.userId = user._id.toString();
    socket.user = user;
    
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};

const setupSocketHandlers = (io) => {
  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`🔌 User ${socket.user.username} connected: ${socket.id}`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Setup existing socket handlers
    heatmapSocket(socket, io);
    notificationSocket(socket, io);

    // Friend-related socket events
    socket.on('friend_status_update', async (data) => {
      try {
        const Friend = (await import('../models/friend.model.js')).default;
        const friends = await Friend.find({
          $or: [
            { requester: socket.userId, status: 'accepted' },
            { recipient: socket.userId, status: 'accepted' }
          ]
        }).populate('requester recipient', '_id');
        
        // Notify all friends about status update
        friends.forEach(friendship => {
          const friendId = friendship.requester._id.toString() === socket.userId 
            ? friendship.recipient._id.toString() 
            : friendship.requester._id.toString();
          
          socket.to(`user:${friendId}`).emit('friend_status_changed', {
            userId: socket.userId,
            username: socket.user.username,
            status: data.status,
            lastActive: new Date()
          });
        });
      } catch (error) {
        logger.error('Error updating friend status:', error);
      }
    });

    // Emotion sharing with friends
    socket.on('share_mood_with_friends', async (data) => {
      try {
        const { emotionId, message } = data;
        const Friend = (await import('../models/friend.model.js')).default;
        
        const friends = await Friend.find({
          $or: [
            { requester: socket.userId, status: 'accepted' },
            { recipient: socket.userId, status: 'accepted' }
          ]
        }).populate('requester recipient', '_id username selectedAvatar');
        
        // Notify friends about mood update
        friends.forEach(friendship => {
          const friendId = friendship.requester._id.toString() === socket.userId 
            ? friendship.recipient._id.toString() 
            : friendship.requester._id.toString();
          
          socket.to(`user:${friendId}`).emit('friend_mood_update', {
            userId: socket.userId,
            username: socket.user.username,
            selectedAvatar: socket.user.selectedAvatar,
            emotionId,
            message,
            timestamp: new Date()
          });
        });
      } catch (error) {
        logger.error('Error sharing mood with friends:', error);
      }
    });

    // Typing indicators for comfort reactions
    socket.on('typing_comfort_reaction', (data) => {
      const { toUserId, isTyping } = data;
      socket.to(`user:${toUserId}`).emit('friend_typing_comfort', {
        fromUserId: socket.userId,
        fromUsername: socket.user.username,
        isTyping
      });
    });

    // Real-time emotion updates
    socket.on('emotion_logged', (emotionData) => {
      // Broadcast to global emotion feed
      socket.broadcast.emit('global_emotion_update', {
        emotion: emotionData,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info(`🔌 User ${socket.user.username} disconnected: ${socket.id}, reason: ${reason}`);
      
      try {
        // Update user offline status
        await socket.user.setOnlineStatus(false);

        // Notify friends about offline status
        const Friend = (await import('../models/friend.model.js')).default;
        const friends = await Friend.find({
          $or: [
            { requester: socket.userId, status: 'accepted' },
            { recipient: socket.userId, status: 'accepted' }
          ]
        }).populate('requester recipient', '_id');

        friends.forEach(friendship => {
          const friendId = friendship.requester._id.toString() === socket.userId 
            ? friendship.recipient._id.toString() 
            : friendship.requester._id.toString();
          
          socket.to(`user:${friendId}`).emit('friend_status_changed', {
            userId: socket.userId,
            username: socket.user.username,
            status: 'offline',
            lastActive: new Date()
          });
        });
      } catch (error) {
        logger.error('Error handling disconnect:', error);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`❌ Socket error for ${socket.user.username}:`, error);
    });
  });

  // Global connection handling
  io.on('connect_error', (error) => {
    logger.error('❌ Socket.IO connection error:', error);
  });

  logger.info('✅ Socket.io handlers initialized with social features');
};

export default setupSocketHandlers;
