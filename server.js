const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const emotionRoutes = require('./routes/emotionRoutes');
const mapRoutes = require('./routes/mapRoutes');
const userRoutes = require('./routes/userRoutes');
const communityRoutes = require('./routes/communityRoutes');
const comfortReactionRoutes = require('./routes/comfortReactionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Import services
const MapSocketService = require('./sockets/mapSocket');
const AIInsightsService = require('./services/aiInsightsService');
const AnalyticsService = require('./services/analyticsService');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket service
const mapSocketService = new MapSocketService(server);

// Initialize AI and Analytics services
const aiInsightsService = new AIInsightsService();
const analyticsService = new AnalyticsService();

// Make services available to routes
app.set('aiInsightsService', aiInsightsService);
app.set('analyticsService', analyticsService);
app.set('mapSocketService', mapSocketService);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emotions', emotionRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/users', userRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/comfort-reactions', comfortReactionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      websocket: mapSocketService.getConnectedClientsCount(),
      ai: 'available',
      analytics: 'available'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// Start periodic updates for WebSocket
mapSocketService.startPeriodicUpdates();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mapSocketService.shutdown();
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mapSocketService.shutdown();
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket service initialized`);
  console.log(`AI Insights service available`);
  console.log(`Analytics service available`);
}); 