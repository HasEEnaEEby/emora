const socketIo = require('socket.io');

class MapSocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.connectedClients = new Map();
    this.roomStats = new Map();
    
    this.initialize();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Store client info
      this.connectedClients.set(socket.id, {
        id: socket.id,
        connectedAt: new Date(),
        rooms: new Set()
      });

      // Handle client joining rooms
      socket.on('joinRoom', (room) => {
        socket.join(room);
        this.connectedClients.get(socket.id).rooms.add(room);
        console.log(`Client ${socket.id} joined room: ${room}`);
        
        // Send current room stats
        this.sendRoomStats(room);
      });

      // Handle client leaving rooms
      socket.on('leaveRoom', (room) => {
        socket.leave(room);
        this.connectedClients.get(socket.id).rooms.delete(room);
        console.log(`Client ${socket.id} left room: ${room}`);
      });

      // Handle emotion submission
      socket.on('submitEmotion', async (data) => {
        try {
          const result = await this.handleEmotionSubmission(socket, data);
          socket.emit('emotionSubmitted', result);
        } catch (error) {
          socket.emit('error', { message: 'Failed to submit emotion', error: error.message });
        }
      });

      // Handle map view updates
      socket.on('updateMapView', (data) => {
        const { bounds, zoom, center } = data;
        socket.emit('mapViewUpdated', { bounds, zoom, center });
      });

      // Handle filter changes
      socket.on('updateFilters', (filters) => {
        const room = this.getClientRoom(socket.id);
        if (room) {
          this.broadcastToRoom(room, 'filtersUpdated', filters);
        }
      });

      // Handle client disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Send initial connection data
      socket.emit('connected', {
        clientId: socket.id,
        timestamp: new Date().toISOString(),
        serverInfo: {
          version: '1.0.0',
          features: ['real-time', 'clustering', 'analytics']
        }
      });
    });
  }

  /**
   * Handle emotion submission and broadcast to relevant clients
   */
  async handleEmotionSubmission(socket, data) {
    const { coordinates, coreEmotion, emotionTypes, intensity, city, country, context } = data;
    const [longitude, latitude] = coordinates;

    // Create emotion document
    const { Emotion } = require('../models/Emotion');
    const emotion = new Emotion({
      userId: socket.id, // For anonymous submissions
      latitude,
      longitude,
      coreEmotion,
      emotionTypes: Array.isArray(emotionTypes) ? emotionTypes : [emotionTypes],
      intensity: parseFloat(intensity),
      city,
      country,
      context,
      timestamp: new Date()
    });

    await emotion.save();

    // Prepare broadcast data
    const broadcastData = {
      id: emotion._id,
      coordinates: [longitude, latitude],
      coreEmotion,
      emotionTypes: emotion.emotionTypes,
      intensity: emotion.intensity,
      city,
      country,
      timestamp: emotion.timestamp,
      clientId: socket.id
    };

    // Broadcast to all connected clients
    this.broadcastToAll('newEmotion', broadcastData);

    // Update global stats
    this.updateGlobalStats();

    // Update regional stats if city/country provided
    if (city || country) {
      this.updateRegionalStats(city, country);
    }

    return {
      success: true,
      emotionId: emotion._id,
      timestamp: emotion.timestamp
    };
  }

  /**
   * Update global statistics and broadcast
   */
  async updateGlobalStats() {
    try {
      const { Emotion } = require('../models/Emotion');
      
      // Get recent stats (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const stats = await Emotion.aggregate([
        {
          $match: {
            timestamp: { $gte: yesterday }
          }
        },
        {
          $group: {
            _id: null,
            totalEmotions: { $sum: 1 },
            avgIntensity: { $avg: "$intensity" },
            coreEmotionStats: {
              $push: {
                coreEmotion: "$coreEmotion",
                intensity: "$intensity"
              }
            }
          }
        }
      ]);

      if (stats.length > 0) {
        const stat = stats[0];
        
        // Calculate dominant emotion
        const emotionCounts = {};
        stat.coreEmotionStats.forEach(emotion => {
          emotionCounts[emotion.coreEmotion] = (emotionCounts[emotion.coreEmotion] || 0) + 1;
        });
        
        const dominantEmotion = Object.entries(emotionCounts)
          .sort(([,a], [,b]) => b - a)[0][0];

        const globalStats = {
          totalEmotions: stat.totalEmotions,
          avgIntensity: Math.round(stat.avgIntensity * 100) / 100,
          dominantEmotion,
          lastUpdated: new Date(),
          activeUsers: this.connectedClients.size
        };

        this.broadcastToAll('globalStatsUpdated', globalStats);
      }
    } catch (error) {
      console.error('Error updating global stats:', error);
    }
  }

  /**
   * Update regional statistics and broadcast
   */
  async updateRegionalStats(city, country) {
    try {
      const { Emotion } = require('../models/Emotion');
      
      const filter = {};
      if (city) filter.city = city;
      if (country) filter.country = country;
      
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      filter.timestamp = { $gte: yesterday };

      const regionalStats = await Emotion.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEmotions: { $sum: 1 },
            avgIntensity: { $avg: "$intensity" },
            dominantEmotion: { $first: "$coreEmotion" }
          }
        }
      ]);

      if (regionalStats.length > 0) {
        const stat = regionalStats[0];
        const regionKey = `${city || 'unknown'}-${country || 'unknown'}`;
        
        const regionalData = {
          region: regionKey,
          totalEmotions: stat.totalEmotions,
          avgIntensity: Math.round(stat.avgIntensity * 100) / 100,
          dominantEmotion: stat.dominantEmotion,
          lastUpdated: new Date()
        };

        this.broadcastToAll('regionalStatsUpdated', regionalData);
      }
    } catch (error) {
      console.error('Error updating regional stats:', error);
    }
  }

  /**
   * Send room-specific statistics
   */
  async sendRoomStats(room) {
    try {
      const { Emotion } = require('../models/Emotion');
      
      // Get room-specific data based on room name
      let filter = {};
      
      if (room.startsWith('region-')) {
        const region = room.replace('region-', '');
        filter.$or = [
          { city: { $regex: region, $options: 'i' } },
          { country: { $regex: region, $options: 'i' } }
        ];
      } else if (room.startsWith('emotion-')) {
        const emotion = room.replace('emotion-', '');
        filter.coreEmotion = emotion;
      }

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      filter.timestamp = { $gte: yesterday };

      const stats = await Emotion.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEmotions: { $sum: 1 },
            avgIntensity: { $avg: "$intensity" },
            dominantEmotion: { $first: "$coreEmotion" }
          }
        }
      ]);

      if (stats.length > 0) {
        const stat = stats[0];
        const roomStats = {
          room,
          totalEmotions: stat.totalEmotions,
          avgIntensity: Math.round(stat.avgIntensity * 100) / 100,
          dominantEmotion: stat.dominantEmotion,
          lastUpdated: new Date()
        };

        this.broadcastToRoom(room, 'roomStatsUpdated', roomStats);
      }
    } catch (error) {
      console.error('Error sending room stats:', error);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    });
  }

  /**
   * Broadcast to specific room
   */
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    });
  }

  /**
   * Get client's current room
   */
  getClientRoom(clientId) {
    const client = this.connectedClients.get(clientId);
    if (client && client.rooms.size > 0) {
      return Array.from(client.rooms)[0];
    }
    return null;
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Get room statistics
   */
  getRoomStats() {
    const stats = {};
    this.io.sockets.adapter.rooms.forEach((sockets, room) => {
      if (room !== room) { // Skip socket ID rooms
        stats[room] = sockets.size;
      }
    });
    return stats;
  }

  /**
   * Send heartbeat to all clients
   */
  sendHeartbeat() {
    this.broadcastToAll('heartbeat', {
      timestamp: new Date().toISOString(),
      connectedClients: this.connectedClients.size,
      serverUptime: process.uptime()
    });
  }

  /**
   * Start periodic updates
   */
  startPeriodicUpdates() {
    // Update global stats every 30 seconds
    setInterval(() => {
      this.updateGlobalStats();
    }, 30000);

    // Send heartbeat every 10 seconds
    setInterval(() => {
      this.sendHeartbeat();
    }, 10000);

    // Update room stats every minute
    setInterval(() => {
      this.roomStats.forEach((stats, room) => {
        this.sendRoomStats(room);
      });
    }, 60000);
  }

  /**
   * Handle server shutdown
   */
  shutdown() {
    this.broadcastToAll('serverShutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });
    
    this.io.close();
  }
}

module.exports = MapSocketService; 