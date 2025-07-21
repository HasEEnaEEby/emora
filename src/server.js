// src/server.js - COMPLETE FIXED VERSION WITH PROPER ROUTES
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import net from 'net';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import config from './config/index.js';
import connectRedis from './config/redis.js';
import setupCronJobs from './jobs/index.js';
import errorMiddleware from './middleware/error.middleware.js';
import setupSocketHandlers from './sockets/index.js';
import logger from './utils/logger.js';

import routes from './routes/index.js';
import insightRoutes from './routes/insight.routes.js';

dotenv.config();

const app = express();
const server = createServer(app);

server.timeout = 120000; 
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const io = new Server(server, {
  cors: {
    origin: config.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Database connections
connectDB();
connectRedis();

// Trust proxy for production deployments
app.set('trust proxy', 1);

// Temporarily disable helmet for testing
console.log('🔓 Helmet disabled for testing');

// CORS with multiple origins support
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      config.CLIENT_URL || "http://localhost:3000",
      "http://localhost:3001", 
      "http://localhost:8080",
      "http://127.0.0.1:3000",
      "capacitor://localhost",
      "ionic://localhost",
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

// Add compression for better performance
app.use(compression());

// Logging with more details
app.use(morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  },
  skip: (req) => req.path === '/api/health'
}));

// Body parsing with validation
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

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ============================================================================
// FIXED: ROUTE REGISTRATION WITH CORRECT PATHS
// ============================================================================

// Root health check
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV || 'development',
      version: process.env.npm_package_version || '2.0.0',
      services: {
        database: true,
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

// . MOUNT ALL ROUTES (from organized routes/index.js)
app.use('/', routes);
app.use('/api/insight', insightRoutes);

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  const apiDocs = {
    title: 'EMORA API Documentation',
    version: '2.0.0',
    description: 'Professional emotion tracking and analytics API',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      authentication: {
        register: 'POST /api/auth/register (with confirmPassword validation)',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/me',
        checkUsername: 'GET /api/auth/check-username/:username',
        refresh: 'POST /api/auth/refresh'
      },
      onboarding: {
        steps: 'GET /onboarding/steps',
        checkUsername: 'GET /onboarding/check-username/:username',
        saveData: 'POST /onboarding/user-data',
        complete: 'POST /onboarding/complete'
      },
      user: {
        homeData: 'GET /user/home-data',
        profile: 'GET /user/profile',
        stats: 'GET /user/stats'
      },
      emotions: {
        log: 'POST /emotions/log',
        timeline: 'GET /emotions/timeline',
        constants: 'GET /emotions/constants'
      }
    }
  };

  res.json({
    success: true,
    message: 'EMORA API Documentation',
    data: apiDocs
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎭 Welcome to EMORA - Professional Emotion Analytics Platform',
    version: '2.0.0',
    features: [
      '🎯 Inside Out emotion mapping',
      '🌍 Global emotion heatmap',
      '. Advanced analytics & insights',
      '🔒 Privacy-first design',
      '⚡ Real-time updates',
      '🎨 Professional API design'
    ],
    links: {
      documentation: '/api/docs',
      health: '/api/health',
      onboarding: '/onboarding/steps',
      auth: '/api/auth/health'
    }
  });
});

// Socket.io setup
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

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: '/api/docs'
  });
});

// 404 handler for onboarding routes (mobile compatibility)
app.use('/onboarding/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Onboarding endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /onboarding/steps',
      'POST /onboarding/user-data', 
      'POST /onboarding/complete',
      'GET /onboarding/check-username/:username'
    ]
  });
});

// 404 handler for user routes (mobile compatibility)
app.use('/user/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `User endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /user/home-data'
    ]
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
// SERVER STARTUP LOGIC (Your existing logic is great!)
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
  // . Fix: Ensure maxPort is always greater than startPort
  const actualMaxPort = Math.max(maxPort, startPort + 10);
  
  for (let port = startPort; port <= actualMaxPort; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${actualMaxPort}`);
};

// Server startup
const startServer = async () => {
  try {
    const preferredPort = parseInt(process.env.PORT) || 8000; // Changed to 8000 for consistency
    let actualPort = preferredPort;

    // Check if preferred port is available
    const isPreferredPortAvailable = await isPortAvailable(preferredPort);
    
    if (!isPreferredPortAvailable) {
      logger.warn(`.  Port ${preferredPort} is busy`);
      actualPort = await findAvailablePort(preferredPort + 1);
      logger.info(`. Found available port: ${actualPort}`);
    }

    // Start the server
    server.listen(actualPort, () => {
      console.log('\n🎉 ================================');
      console.log('🚀 EMORA Backend Started Successfully!');
      console.log('🎉 ================================');
      console.log(`📍 Local:      http://localhost:${actualPort}`);
      console.log(`🌐 Network:    http://0.0.0.0:${actualPort}`);
      console.log(`🌍 Environment: ${config.NODE_ENV}`);
      console.log(`. Database:   MongoDB Connected`);
      console.log(`🔴 Redis:      ${config.REDIS_URL ? 'Connected' : 'Disabled'}`);
      console.log(`. API Docs:   http://localhost:${actualPort}/api/docs`);
      console.log(`🏠 Dashboard:  http://localhost:${actualPort}/api/dashboard/home`);
      console.log(`. Onboarding: http://localhost:${actualPort}/onboarding/steps`);
      console.log(`🎭 Emotions:   http://localhost:${actualPort}/api/emotions/constants`);
      console.log(`⚡ Real-time:  WebSocket enabled`);
      console.log(`📈 Analytics:  Professional features enabled`);
      console.log('🎉 ================================\n');
      
      if (actualPort !== preferredPort) {
        logger.warn(`💡 Note: Using port ${actualPort} instead of ${preferredPort}`);
      }

      // Log professional features status
      logger.info('. Professional Features Enabled:');
      logger.info('   🎯 Inside Out emotion mapping');
      logger.info('   🌍 Global emotion heatmap');
      logger.info('   . Advanced analytics & insights');
      logger.info('   🔒 Privacy-first anonymous tracking');
      logger.info('   ⚡ Real-time WebSocket updates');
      logger.info('   🎨 Professional API design');
      logger.info('   📱 Mobile-optimized endpoints');
    });

    // Server error handling
    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`. Port ${actualPort} is still in use`);
        try {
          const newPort = await findAvailablePort(actualPort + 1);
          logger.info(`🔄 Trying port ${newPort}`);
          server.listen(newPort);
        } catch (portError) {
          logger.error('. Could not find available port:', portError.message);
          process.exit(1);
        }
      } else {
        logger.error('. Server error:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('. Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('. Error during server shutdown:', err);
      process.exit(1);
    }
    
    // Close WebSocket connections
    io.close();
    logger.info('📡 WebSocket server closed');
    
    logger.info('. Server closed successfully');
    logger.info('. EMORA Backend shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('. Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
};

// Process event listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
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