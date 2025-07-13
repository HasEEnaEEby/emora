// src/routes/location.routes.js - Integrated with your existing structure
import express from 'express';
import LocationController from '../controllers/location.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
// If you have validation middleware, uncomment this:
// import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// ✅ Basic validation middleware (if you don't have express-validator)
const validateCoordinates = (req, res, next) => {
  const { coordinates } = req.query.coordinates ? req.query : req.body;
  
  if (coordinates) {
    try {
      let parsed = coordinates;
      if (typeof coordinates === 'string') {
        parsed = JSON.parse(coordinates);
      }
      
      if (!Array.isArray(parsed) || parsed.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'Coordinates must be array of [longitude, latitude]'
        });
      }
      
      const [lng, lat] = parsed;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Coordinates must be numbers'
        });
      }
      
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinate range'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates format'
      });
    }
  }
  
  next();
};

const validateConsentLevel = (req, res, next) => {
  const { consentLevel } = req.body;
  
  if (consentLevel) {
    const validLevels = ['none', 'continent', 'country_only', 'region_only', 'city_only', 'full'];
    if (!validLevels.includes(consentLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consent level'
      });
    }
  }
  
  next();
};

// ✅ Location consent management routes
router.put('/consent', 
  authMiddleware, 
  validateConsentLevel,
  validateCoordinates,
  LocationController.updateLocationConsent
);

router.delete('/consent', 
  authMiddleware, 
  LocationController.revokeLocationConsent
);

router.get('/consent', 
  authMiddleware, 
  LocationController.getLocationConsent
);

// ✅ Location-based insights and analytics
router.get('/insights', 
  authMiddleware,
  validateCoordinates,
  LocationController.getLocationInsights
);

// ✅ IP-based location processing (fallback)
router.post('/ip-location', 
  authMiddleware,
  validateConsentLevel,
  LocationController.processIPLocation
);

// ✅ Nearby resources and support
router.get('/nearby-resources', 
  authMiddleware,
  validateCoordinates,
  LocationController.getNearbyResources
);

// ✅ Geocoding utilities
router.get('/reverse-geocode', 
  authMiddleware,
  (req, res, next) => {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required'
      });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude'
      });
    }
    
    next();
  },
  LocationController.reverseGeocode
);

// ✅ Public anonymized statistics (no auth required)
router.get('/stats', 
  (req, res, next) => {
    const { timeRange } = req.query;
    
    if (timeRange && !['24h', '7d', '30d'].includes(timeRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time range. Use 24h, 7d, or 30d'
      });
    }
    
    next();
  },
  LocationController.getLocationStats
);

// ✅ Crisis support endpoints (high priority)
router.post('/crisis-resources', 
  authMiddleware,
  validateCoordinates,
  (req, res, next) => {
    const { urgencyLevel } = req.body;
    
    if (urgencyLevel && !['medium', 'high', 'crisis'].includes(urgencyLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid urgency level'
      });
    }
    
    next();
  },
  LocationController.getCrisisResources
);

// ✅ Location-based mood patterns (for research/insights)
router.get('/mood-patterns', 
  authMiddleware,
  validateCoordinates,
  (req, res, next) => {
    const { radiusKm, timeRange } = req.query;
    
    if (radiusKm) {
      const radius = parseFloat(radiusKm);
      if (isNaN(radius) || radius < 1 || radius > 100) {
        return res.status(400).json({
          success: false,
          message: 'Radius must be between 1-100 km'
        });
      }
    }
    
    if (timeRange && !['24h', '7d', '30d'].includes(timeRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time range'
      });
    }
    
    next();
  },
  LocationController.getMoodPatterns
);

// ✅ Find nearby Emora users (for community features)
router.get('/nearby-community', 
  authMiddleware,
  validateCoordinates,
  (req, res, next) => {
    const { radiusKm } = req.query;
    
    if (radiusKm) {
      const radius = parseFloat(radiusKm);
      if (isNaN(radius) || radius < 1 || radius > 50) {
        return res.status(400).json({
          success: false,
          message: 'Radius must be between 1-50 km'
        });
      }
    }
    
    next();
  },
  LocationController.getNearbyCommunity
);

// ✅ Update location sharing preferences
router.patch('/preferences', 
  authMiddleware,
  (req, res, next) => {
    const { shareLocation, locationShareLevel, allowCommunityDiscovery } = req.body;
    
    if (shareLocation !== undefined && typeof shareLocation !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'shareLocation must be boolean'
      });
    }
    
    if (locationShareLevel) {
      const validLevels = ['none', 'continent', 'country_only', 'region_only', 'city_only', 'full'];
      if (!validLevels.includes(locationShareLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid location share level'
        });
      }
    }
    
    if (allowCommunityDiscovery !== undefined && typeof allowCommunityDiscovery !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'allowCommunityDiscovery must be boolean'
      });
    }
    
    next();
  },
  LocationController.updateLocationPreferences
);

export default router;