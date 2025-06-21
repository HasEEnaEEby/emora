import heatmapService from '../services/heatmap.service.js';
import logger from '../utils/logger.js';

const heatmapSocket = (socket, io) => {
  // Join heatmap room
  socket.on('heatmap:join', (data) => {
    const { timeRange = '24h', resolution = 'city' } = data;
    const room = `heatmap:${timeRange}:${resolution}`;
    
    socket.join(room);
    logger.info(`Socket ${socket.id} joined heatmap room: ${room}`);
    
    socket.emit('heatmap:joined', { room });
  });

  // Leave heatmap room
  socket.on('heatmap:leave', (data) => {
    const { timeRange = '24h', resolution = 'city' } = data;
    const room = `heatmap:${timeRange}:${resolution}`;
    
    socket.leave(room);
    logger.info(`Socket ${socket.id} left heatmap room: ${room}`);
  });

  // Request real-time heatmap data
  socket.on('heatmap:request', async (data) => {
    try {
      const heatmapData = await heatmapService.getGlobalHeatmap(data);
      socket.emit('heatmap:data', heatmapData);
    } catch (error) {
      logger.error('Error sending heatmap data:', error);
      socket.emit('heatmap:error', { message: 'Failed to get heatmap data' });
    }
  });

  // Handle mood creation events (called from mood service)
  const broadcastMoodUpdate = (moodData) => {
    // Broadcast to all relevant heatmap rooms
    const rooms = [
      'heatmap:1h:city',
      'heatmap:6h:city',
      'heatmap:24h:city',
      'heatmap:7d:city'
    ];

    rooms.forEach(room => {
      io.to(room).emit('heatmap:mood_added', {
        location: moodData.location,
        emotion: moodData.emotion,
        intensity: moodData.intensity,
        timestamp: moodData.timestamp
      });
    });
  };

  // Store the broadcast function on the socket for external use
  socket.broadcastMoodUpdate = broadcastMoodUpdate;
};

export default heatmapSocket;