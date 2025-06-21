import logger from '../utils/logger.js';
import heatmapSocket from './heatmap.socket.js';
import notificationSocket from './notifications.socket.js';

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Setup socket handlers
    heatmapSocket(socket, io);
    notificationSocket(socket, io);

    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  logger.info('Socket.io handlers initialized');
};

export default setupSocketHandlers;