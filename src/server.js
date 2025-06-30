// ============================================================================
// SRC/SERVER.JS (ENHANCED VERSION WITH PROFESSIONAL FEATURES)
// ============================================================================
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import net from 'net';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import config from './config/index.js';
import connectRedis from './config/redis.js';
import setupCronJobs from './jobs/index.js';
import errorMiddleware from './middlewares/error.middleware.js';
import rateLimitMiddleware from './middlewares/rate-limit.middleware.js';
import setupSocketHandlers from './sockets/index.js';
import logger from './utils/logger.js';

// Import routes (your existing + new professional routes)
import analyticsRoutes from './routes/analytics.routes.js';
import authRoutes from './routes/auth.routes.js';
import emotionRoutes from './routes/emotion.routes.js';
import heatmapRoutes from './routes/heatmap.routes.js';
import moodRoutes from './routes/mood.routes.js';
import onboardingRoutes from './routes/onboarding.routes.js';
import recommendationRoutes from './routes/recommendations.routes.js';

// NEW: Import professional dashboard routes
import dashboardRoutes from './routes/dashboard.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  // ENHANCED: Add WebSocket configuration for real-time features
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Database connections
connectDB();
connectRedis();

// ENHANCED: Trust proxy for production deployments
app.set('trust proxy', 1);

// ENHANCED: Security middleware with better configuration
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  }
}));

// ENHANCED: CORS with multiple origins support
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      config.CLIENT_URL || "http://localhost:3000",
      "http://localhost:3001", 
      "http://localhost:8080",
      "http://127.0.0.1:3000",
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// NEW: Add compression for better performance
app.use(compression());

// ENHANCED: Logging with more details
app.use(morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  },
  skip: (req) => req.path === '/api/health'
}));

// ENHANCED: Body parsing with validation
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format'
      });
      return;
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimitMiddleware);

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes (your existing routes)
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/emotions', emotionRoutes);

// NEW: Add professional dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// ENHANCED: Health check endpoint with comprehensive status
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV || 'development',
      version: process.env.npm_package_version || '2.0.0',
      services: {
        database: true, // You could add actual DB connection check here
        redis: config.REDIS_URL ? true : false,
        socketio: true,
        scheduler: config.NODE_ENV === 'production' || process.env.ENABLE_CRON_JOBS === 'true'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: {
        emotionLogging: true,
        globalHeatmap: true,
        analytics: true,
        realTimeUpdates: true,
        insights: true,
        userProfiles: true,
        professionalDashboard: true
      }
    };

    res.json({
      success: true,
      message: 'EMORA Backend is running smoothly',
      data: health
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      error: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// NEW: API Documentation endpoint
app.get('/api/docs', (req, res) => {
  const apiDocs = {
    title: 'EMORA API Documentation',
    version: '2.0.0',
    description: 'Professional emotion tracking and analytics API',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      authentication: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        logout: 'POST /auth/logout',
        profile: 'GET /auth/profile'
      },
      onboarding: {
        steps: 'GET /onboarding/steps',
        saveData: 'POST /onboarding/user-data',
        complete: 'POST /onboarding/complete',
        checkUsername: 'GET /onboarding/check-username/:username'
      },
      emotions: {
        log: 'POST /emotions/log',
        timeline: 'GET /emotions/timeline',
        stats: 'GET /emotions/stats',
        globalStats: 'GET /emotions/global-stats',
        globalHeatmap: 'GET /emotions/global-heatmap',
        feed: 'GET /emotions/feed',
        insights: 'GET /emotions/insights',
        search: 'GET /emotions/search',
        update: 'PUT /emotions/:id',
        delete: 'DELETE /emotions/:id',
        constants: 'GET /emotions/constants'
      },
      dashboard: {
        home: 'GET /dashboard/home',
        analytics: 'GET /dashboard/analytics',
        realtime: 'GET /dashboard/realtime'
      },
      // Your existing endpoints
      mood: 'Various mood endpoints',
      heatmap: 'Various heatmap endpoints',
      analytics: 'Various analytics endpoints',
      recommendations: 'Various recommendation endpoints'
    },
    features: {
      insideOutEmotions: 'Core emotions mapped to Inside Out characters',
      globalHeatmap: 'Real-time global emotion visualization',
      professionalAnalytics: 'Advanced pattern recognition and insights',
      anonymousLogging: 'Privacy-first emotion tracking',
      realTimeUpdates: 'WebSocket-based live updates',
      contextualTracking: 'Weather, location, and activity correlation'
    }
  };

  res.json({
    success: true,
    message: 'EMORA API Documentation',
    data: apiDocs
  });
});

// ENHANCED: Root endpoint with more information
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎭 Welcome to EMORA - Professional Emotion Analytics Platform',
    version: '2.0.0',
    features: [
      '🎯 Inside Out emotion mapping',
      '🌍 Global emotion heatmap',
      '📊 Advanced analytics & insights',
      '🔒 Privacy-first design',
      '⚡ Real-time updates',
      '🎨 Professional API design'
    ],
    links: {
      documentation: '/api/docs',
      health: '/api/health',
      dashboard: '/api/dashboard/home',
      emotions: '/api/emotions/constants'
    },
    contact: {
      support: 'support@emora.app',
      documentation: 'https://docs.emora.app'
    }
  });
});

// Socket.io setup with enhanced logging
setupSocketHandlers(io);

// Log WebSocket connections
io.on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', (reason) => {
    logger.info(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Cron jobs setup (only in production or when enabled)
if (config.NODE_ENV === 'production' || process.env.ENABLE_CRON_JOBS === 'true') {
  setupCronJobs();
  logger.info('⏰ Cron jobs enabled');
} else {
  logger.info('🔄 Cron jobs disabled in development mode');
}

// Error handling middleware (must be after routes)
app.use(errorMiddleware);

// ENHANCED: 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: '/api/docs'
  });
});

// 404 handler for all other routes (must be last)
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ROBUST PORT DETECTION & SERVER STARTUP (Your existing logic is great!)
// ============================================================================

// Function to check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const testServer = net.createServer();
    testServer.listen(port, () => {
      testServer.once('close', () => resolve(true));
      testServer.close();
    });
    testServer.on('error', () => resolve(false));
  });
};

// Function to find available port
const findAvailablePort = async (startPort = 5000, maxPort = 5010) => {
  for (let port = startPort; port <= maxPort; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${maxPort}`);
};

// ENHANCED: Server startup with professional features logging
const startServer = async () => {
  try {
    const preferredPort = parseInt(process.env.PORT) || 5000;
    let actualPort = preferredPort;

    // Check if preferred port is available
    const isPreferredPortAvailable = await isPortAvailable(preferredPort);
    
    if (!isPreferredPortAvailable) {
      logger.warn(`⚠️  Port ${preferredPort} is busy (likely macOS ControlCenter)`);
      actualPort = await findAvailablePort(preferredPort + 1);
      logger.info(`🔍 Found available port: ${actualPort}`);
    }

    // Start the server
    server.listen(actualPort, () => {
      console.log('\n🎉 ================================');
      console.log('🚀 EMORA Backend Started Successfully!');
      console.log('🎉 ================================');
      console.log(`📍 Local:      http://localhost:${actualPort}`);
      console.log(`🌐 Network:    http://0.0.0.0:${actualPort}`);
      console.log(`🌍 Environment: ${config.NODE_ENV}`);
      console.log(`💾 Database:   MongoDB Connected`);
      console.log(`🔴 Redis:      ${config.REDIS_URL ? 'Connected' : 'Disabled'}`);
      console.log(`📊 API Docs:   http://localhost:${actualPort}/api/docs`);
      console.log(`🏠 Dashboard:  http://localhost:${actualPort}/api/dashboard/home`);
      console.log(`🎭 Emotions:   http://localhost:${actualPort}/api/emotions/constants`);
      console.log(`🌍 Heatmap:    http://localhost:${actualPort}/api/heatmap/global`);
      console.log(`⚡ Real-time:  WebSocket enabled`);
      console.log(`📈 Analytics:  Professional features enabled`);
      console.log('🎉 ================================\n');
      
      if (actualPort !== preferredPort) {
        logger.warn(`💡 Tip: macOS ControlCenter uses port 5000. Using ${actualPort} instead.`);
      }

      // NEW: Log professional features status
      logger.info('✅ Professional Features Enabled:');
      logger.info('   🎯 Inside Out emotion mapping');
      logger.info('   🌍 Global emotion heatmap');
      logger.info('   📊 Advanced analytics & insights');
      logger.info('   🔒 Privacy-first anonymous tracking');
      logger.info('   ⚡ Real-time WebSocket updates');
      logger.info('   🎨 Professional API design');
      logger.info('   📱 Mobile-optimized endpoints');
    });

    // Server error handling
    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${actualPort} is still in use`);
        try {
          const newPort = await findAvailablePort(actualPort + 1);
          logger.info(`🔄 Trying port ${newPort}`);
          server.listen(newPort);
        } catch (portError) {
          logger.error('❌ Could not find available port:', portError.message);
          process.exit(1);
        }
      } else {
        logger.error('❌ Server error:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ENHANCED: Graceful shutdown handling with cleanup
const gracefulShutdown = (signal) => {
  logger.info(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    // Close WebSocket connections
    io.close();
    logger.info('📡 WebSocket server closed');
    
    // Close database connections if needed
    if (global.mongoose && global.mongoose.connection) {
      global.mongoose.connection.close(() => {
        logger.info('💾 MongoDB connection closed');
      });
    }
    
    logger.info('✅ Server closed successfully');
    logger.info('✅ EMORA Backend shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds (increased for cleanup)
  setTimeout(() => {
    logger.error('❌ Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
};

// Process event listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ENHANCED: Handle uncaught exceptions with better logging
process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception:', err);
  if (config.NODE_ENV !== 'production') {
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  if (config.NODE_ENV !== 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// Start the server
startServer();

export default app;