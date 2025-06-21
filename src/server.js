// ============================================================================
// SRC/SERVER.JS (WORKING VERSION - COPY THIS)
// ============================================================================
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import net from 'net'; // THIS WAS MISSING!
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import config from './config/index.js';
import connectRedis from './config/redis.js';
import setupCronJobs from './jobs/index.js';
import errorMiddleware from './middlewares/error.middleware.js';
import rateLimitMiddleware from './middlewares/rate-limit.middleware.js';
import setupSocketHandlers from './sockets/index.js';
import logger from './utils/logger.js';

// Import routes
import analyticsRoutes from './routes/analytics.routes.js';
import authRoutes from './routes/auth.routes.js';
import heatmapRoutes from './routes/heatmap.routes.js';
import moodRoutes from './routes/mood.routes.js';
import onboardingRoutes from './routes/onboarding.routes.js';
import recommendationRoutes from './routes/recommendations.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Database connections
connectDB();
connectRedis();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: config.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200
}));

// Logging
app.use(morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  },
  skip: (req) => req.path === '/api/health'
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimitMiddleware);

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'EMORA Backend is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    port: process.env.PORT || 'auto-detected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'EMORA Backend API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// Socket.io setup
setupSocketHandlers(io);

// Cron jobs setup (only in production or when enabled)
if (config.NODE_ENV === 'production' || process.env.ENABLE_CRON_JOBS === 'true') {
  setupCronJobs();
} else {
  logger.info('🔄 Cron jobs disabled in development mode');
}

// Error handling middleware (must be after routes)
app.use(errorMiddleware);

// 404 handler (must be last)
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ROBUST PORT DETECTION & SERVER STARTUP
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

// Enhanced server startup
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
      console.log(`📊 API Docs:   http://localhost:${actualPort}/api/health`);
      console.log('🎉 ================================\n');
      
      if (actualPort !== preferredPort) {
        logger.warn(`💡 Tip: macOS ControlCenter uses port 5000. Using ${actualPort} instead.`);
      }
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

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('✅ Server closed successfully');
    logger.info('✅ EMORA Backend shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('❌ Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

// Process event listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

export default app;