import locationService from '../services/location.service.js';
import logger from '../utils/logger.js';

const locationMiddleware = async (req, res, next) => {
  try {
    // Only get location if not provided in request body
    if (!req.body.location) {
      const location = await locationService.getLocationFromRequest(req);
      req.location = location;
    }
    next();
  } catch (error) {
    logger.error('Location middleware error:', error);
    // Don't fail the request, just continue without location
    next();
  }
};

export default locationMiddleware;