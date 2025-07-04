// src/utils/response.js - Complete Response Utility Functions
/**
 * Utility functions for creating consistent API responses
 * Supports both legacy format (success: true/false) and new format (status: success/error)
 */

/**
 * Create a successful response (legacy format)
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
 * Create an error response (legacy format)
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
 * Create a successful response (new Flutter-compatible format)
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @param {object} meta - Optional metadata
 * @returns {object} Formatted success response
 */
export const createStatusResponse = (message, data = null, meta = null) => {
  const response = {
    status: 'success',
    message
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
 * Create an error response (new Flutter-compatible format)
 * @param {string} message - Error message
 * @param {any} errors - Optional error details
 * @param {string} errorCode - Optional error code
 * @returns {object} Formatted error response
 */
export const createStatusErrorResponse = (message, errors = null, errorCode = null) => {
  const response = {
    status: 'error',
    message
  };

  if (errors !== null) {
    if (Array.isArray(errors)) {
      response.errors = errors;
    } else if (typeof errors === 'string') {
      response.errorCode = errors;
    } else {
      response.errors = errors;
    }
  }

  if (errorCode !== null) {
    response.errorCode = errorCode;
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
 * Send success response (legacy format)
 * @param {object} res - Express response object
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  sendResponse(res, statusCode, createResponse(message, data));
};

/**
 * Send error response (legacy format)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} errors - Error details
 */
export const sendError = (res, message, statusCode = 400, errors = null) => {
  sendResponse(res, statusCode, createErrorResponse(message, errors));
};

/**
 * Success response function (legacy format - matches your current controller imports)
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
 * Error response function (legacy format - matches your current controller imports)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} errors - Error details
 */
export const errorResponse = (res, message, statusCode = 400, errors = null) => {
  sendError(res, message, statusCode, errors);
};

// ========================================
// NEW FLUTTER-COMPATIBLE RESPONSE FUNCTIONS
// ========================================

/**
 * Success response function (new Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {object} options - Response options {message, data, pagination}
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const statusSuccessResponse = (res, { message, data = null, pagination = null }, statusCode = 200) => {
  const meta = pagination ? { pagination } : null;
  const responseData = createStatusResponse(message, data, meta);
  sendResponse(res, statusCode, responseData);
};

/**
 * Error response function (new Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} errors - Error details
 */
export const statusErrorResponse = (res, message, statusCode = 400, errors = null) => {
  const responseData = createStatusErrorResponse(message, errors);
  sendResponse(res, statusCode, responseData);
};

/**
 * Username check specific response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {string} username - Username being checked
 * @param {boolean} isAvailable - Whether username is available
 * @param {string} message - Optional custom message
 */
export const usernameCheckResponse = (res, username, isAvailable, message = null) => {
  return res.status(200).json({
    status: 'success',
    username: username.toLowerCase(),
    isAvailable,
    message: message || (isAvailable ? 'Username is available' : 'Username is already taken')
  });
};

/**
 * Registration success response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {object} user - User object
 * @param {string} token - JWT token
 * @param {number} statusCode - HTTP status code (default: 201)
 */
export const registrationSuccessResponse = (res, user, token, statusCode = 201) => {
  return res.status(statusCode).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user,
      token,
      expiresIn: '7d'
    }
  });
};

/**
 * Login success response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {object} user - User object
 * @param {string} token - JWT token
 */
export const loginSuccessResponse = (res, user, token) => {
  return res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user,
      token,
      expiresIn: '7d'
    }
  });
};

/**
 * Onboarding steps response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {array} steps - Array of onboarding steps
 */
export const onboardingStepsResponse = (res, steps) => {
  return res.status(200).json({
    status: 'success',
    data: steps,
    message: 'Onboarding steps retrieved successfully'
  });
};

/**
 * Save user data response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {object} userData - User data that was saved
 */
export const saveUserDataResponse = (res, userData) => {
  return res.status(200).json({
    status: 'success',
    message: 'User onboarding data saved successfully',
    data: {
      ...userData,
      note: 'Data validated and acknowledged by server, saved locally'
    }
  });
};

/**
 * Complete onboarding response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {object} completedData - Completed onboarding data
 */
export const completeOnboardingResponse = (res, completedData) => {
  return res.status(200).json({
    status: 'success',
    message: 'Anonymous onboarding completed successfully',
    data: {
      ...completedData,
      note: 'Onboarding completed locally, will sync when user registers'
    }
  });
};

/**
 * Validation error response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {array} validationErrors - Array of validation errors
 */
export const validationErrorResponse = (res, validationErrors) => {
  return res.status(400).json({
    status: 'error',
    message: 'Validation failed',
    errors: validationErrors.map(error => ({
      field: error.path || error.param || error.field,
      message: error.msg || error.message,
      value: error.value,
      location: error.location
    }))
  });
};

/**
 * Duplicate key error response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {string} field - Field that has duplicate value
 * @param {string} value - The duplicate value
 */
export const duplicateKeyErrorResponse = (res, field, value) => {
  const messages = {
    username: 'Username is already taken',
    email: 'Email is already registered'
  };
  
  const errorCodes = {
    username: 'USERNAME_EXISTS',
    email: 'EMAIL_EXISTS'
  };

  return res.status(409).json({
    status: 'error',
    message: messages[field] || `${field} already exists`,
    errorCode: errorCodes[field] || 'DUPLICATE_KEY',
    field,
    value
  });
};

/**
 * Authentication error response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {string} message - Custom message or default
 */
export const authErrorResponse = (res, message = 'Authentication required') => {
  return res.status(401).json({
    status: 'error',
    message,
    errorCode: 'AUTH_REQUIRED'
  });
};

/**
 * Not found error response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {string} resource - Resource that was not found
 */
export const notFoundErrorResponse = (res, resource = 'Resource') => {
  return res.status(404).json({
    status: 'error',
    message: `${resource} not found`,
    errorCode: 'NOT_FOUND'
  });
};

/**
 * Server error response (Flutter-compatible format)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {string} errorCode - Optional error code
 */
export const serverErrorResponse = (res, message = 'Internal server error', errorCode = 'INTERNAL_ERROR') => {
  return res.status(500).json({
    status: 'error',
    message,
    errorCode
  });
};

// ========================================
// LEGACY RESPONSE FUNCTIONS (for backward compatibility)
// ========================================

/**
 * Create an authentication error response (legacy format)
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
 * Create a validation error response (legacy format)
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
 * Create a paginated response (legacy format)
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
  // Legacy format functions (for backward compatibility)
  createResponse,
  createErrorResponse,
  createPaginatedResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  sendResponse,
  sendSuccess,
  sendError,
  successResponse,
  errorResponse,
  
  // New Flutter-compatible format functions
  createStatusResponse,
  createStatusErrorResponse,
  statusSuccessResponse,
  statusErrorResponse,
  usernameCheckResponse,
  registrationSuccessResponse,
  loginSuccessResponse,
  onboardingStepsResponse,
  saveUserDataResponse,
  completeOnboardingResponse,
  validationErrorResponse,
  duplicateKeyErrorResponse,
  authErrorResponse,
  notFoundErrorResponse,
  serverErrorResponse,
  
  // Utility functions
  asyncHandler
};