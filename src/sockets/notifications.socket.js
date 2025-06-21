import logger from '../utils/logger.js';

const notificationSocket = (socket, io) => {
  // Join user-specific notification room
  socket.on('notifications:join', (data) => {
    const { userId } = data;
    if (userId) {
      const room = `user:${userId}`;
      socket.join(room);
      logger.info(`Socket ${socket.id} joined notification room: ${room}`);
      socket.emit('notifications:joined', { room });
    }
  });

  // Leave notification room
  socket.on('notifications:leave', (data) => {
    const { userId } = data;
    if (userId) {
      const room = `user:${userId}`;
      socket.leave(room);
      logger.info(`Socket ${socket.id} left notification room: ${room}`);
    }
  });

  // Mark notification as read
  socket.on('notifications:mark_read', (data) => {
    const { notificationId, userId } = data;
    // You can implement notification read status tracking here
    logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
  });
};

export default notificationSocket;