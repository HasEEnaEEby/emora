export const successResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    ...data,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (res, message, statusCode = 500, data = {}) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...data,
    timestamp: new Date().toISOString()
  });
};

export const paginatedResponse = (res, data, pagination, message = 'Data retrieved successfully') => {
  return res.status(200).json({
    status: 'success',
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  });
};