// src/middlewares/location.middleware.js

const locationMiddleware = {
  // Extract location from request
  extractLocation: (req, res, next) => {
    try {
      // Try to get location from body first
      if (req.body.location) {
        req.location = req.body.location;
        return next();
      }

      // Try to get from headers
      const lat = req.headers['x-latitude'] || req.query.lat;
      const lng = req.headers['x-longitude'] || req.query.lng;

      if (lat && lng) {
        req.location = {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        };
        return next();
      }

      // Try to get from IP (placeholder)
      req.location = {
        type: 'Point',
        coordinates: [0, 0], // Default coordinates
        source: 'default'
      };

      next();
    } catch (error) {
      console.error('Location extraction error:', error);
      // Don't fail the request, just continue without location
      next();
    }
  },

  // Validate location data
  validateLocation: (req, res, next) => {
    try {
      const { location } = req.body;

      if (!location) {
        return next(); // Location is optional
      }

      // Validate GeoJSON format
      if (location.type !== 'Point' || !Array.isArray(location.coordinates)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid location format. Expected GeoJSON Point.',
          example: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        });
      }

      const [lng, lat] = location.coordinates;

      // Validate coordinate ranges
      if (lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid longitude. Must be between -180 and 180.'
        });
      }

      if (lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude. Must be between -90 and 90.'
        });
      }

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Location validation failed',
        error: error.message
      });
    }
  },

  // Get location from IP address (placeholder)
  getLocationFromIP: async (req, res, next) => {
    try {
      // This would typically use a service like MaxMind GeoIP
      const ip = req.ip || req.connection.remoteAddress;
      
      // Placeholder implementation
      req.ipLocation = {
        ip,
        country: 'Unknown',
        city: 'Unknown',
        coordinates: [0, 0]
      };

      next();
    } catch (error) {
      console.error('IP location error:', error);
      next();
    }
  }
};

export default locationMiddleware;