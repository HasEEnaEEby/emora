// src/middlewares/error.middleware.js - Fixed version
import logger from '../utils/logger.js';
import { createErrorResponse } from '../utils/response.js';

const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('. Error middleware triggered:', err.stack);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Rate limit error
  if (err.type === 'rate_limit_exceeded') {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    const message = 'Cross-origin request blocked';
    error = { message, statusCode: 403 };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 413 };
  }

  // . ADDED: Timeout errors
  if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
    const message = 'Request timeout - please try again';
    error = { message, statusCode: 408 };
  }

  // . ADDED: Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    const message = 'Database connection error - please try again';
    error = { message, statusCode: 503 };
  }

  // Create error response using the correct function
  const errorResponse = createErrorResponse(
    error.message || 'Internal server error',
    process.env.NODE_ENV === 'development' ? { 
      stack: err.stack,
      type: err.name,
      code: err.code 
    } : null,
    error.statusCode || 500
  );

  return res.status(error.statusCode || 500).json(errorResponse);
};

// Handle 404 errors
export const notFoundMiddleware = (req, res, next) => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  logger.warn(`. 404 - ${message}`);
  
  const errorResponse = createErrorResponse(message, null, 404);
  return res.status(404).json(errorResponse);
};

// Handle async errors
export const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// . ADDED: Timeout middleware for long-running requests
export const timeoutMiddleware = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`. Request timeout after ${timeoutMs}ms: ${req.method} ${req.originalUrl}`);
        res.status(408).json({
          success: false,
          message: 'Request timeout - please try again',
          errorCode: 'REQUEST_TIMEOUT',
          timestamp: new Date().toISOString()
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

// Graceful error handling for uncaught exceptions
export const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (err) => {
    logger.error('💥 Uncaught Exception:', err);
    logger.error('🛑 Shutting down server...');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    logger.error('🛑 Shutting down server...');
    process.exit(1);
  });
};

export default errorMiddleware;