// src/utils/response.js
/**
 * Utility functions for creating consistent API responses
 */

/**
 * Create a successful response
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @param {object} meta - Optional metadata
 * @returns {object} Formatted success response
 */
export const createResponse = (message, data = null, meta = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {any} errors - Optional error details
 * @param {number} code - Optional error code
 * @returns {object} Formatted error response
 */
export const createErrorResponse = (message, errors = null, code = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors !== null) {
    response.errors = errors;
  }

  if (code !== null) {
    response.code = code;
  }

  return response;
};

/**
 * Send JSON response with consistent formatting
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {object} responseData - Response data
 */
export const sendResponse = (res, statusCode, responseData) => {
  res.status(statusCode).json(responseData);
};

/**
 * Send success response
 * @param {object} res - Express response object
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  sendResponse(res, statusCode, createResponse(message, data));
};

/**
 * Send error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} errors - Error details
 */
export const sendError = (res, message, statusCode = 400, errors = null) => {
  sendResponse(res, statusCode, createErrorResponse(message, errors));
};

/**
 * Main functions for your controllers - these match your import names
 */

/**
 * Success response function (matches your controller imports)
 * @param {object} res - Express response object
 * @param {object} options - Response options {message, data, pagination}
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const successResponse = (res, { message, data = null, pagination = null }, statusCode = 200) => {
  const meta = pagination ? { pagination } : null;
  const responseData = createResponse(message, data, meta);
  sendResponse(res, statusCode, responseData);
};

/**
 * Error response function (matches your controller imports)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} errors - Error details
 */
export const errorResponse = (res, message, statusCode = 400, errors = null) => {
  sendError(res, message, statusCode, errors);
};

/**
 * Create an authentication error response
 * @param {string} message - Custom message or default
 * @returns {object} Formatted auth error response
 */
export const createAuthErrorResponse = (message = 'Authentication required') => {
  return {
    success: false,
    message,
    code: 'AUTH_REQUIRED',
    timestamp: new Date().toISOString()
  };
};

/**
 * Create a validation error response
 * @param {array} validationErrors - Array of validation errors
 * @returns {object} Formatted validation error response
 */
export const createValidationErrorResponse = (validationErrors) => {
  return {
    success: false,
    message: 'Validation failed',
    errors: validationErrors.map(error => ({
      field: error.path || error.param || error.field,
      message: error.msg || error.message,
      value: error.value,
      location: error.location
    })),
    timestamp: new Date().toISOString()
  };
};

/**
 * Create a paginated response
 * @param {string} message - Success message
 * @param {array} data - Array of data items
 * @param {object} pagination - Pagination info
 * @returns {object} Formatted paginated response
 */
export const createPaginatedResponse = (message, data, pagination) => {
  return {
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total || 0,
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      pages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false,
      ...pagination
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Wrap async route handlers with error handling
 * @param {function} fn - Async route handler function
 * @returns {function} Wrapped function with error handling
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Default export for easy importing
 */
export default {
  createResponse,
  createErrorResponse,
  createPaginatedResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  asyncHandler,
  sendResponse,
  sendSuccess,
  sendError,
  successResponse,
  errorResponse
};